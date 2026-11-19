
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "database.db");
const csvPath = path.join(__dirname, "books_de.csv");

function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                value += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            row.push(value);
            value = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && text[i + 1] === "\n") i++;
            row.push(value);
            rows.push(row);
            row = [];
            value = "";
        } else {
            value += char;
        }
    }

    if (inQuotes) {
        throw new Error("Ungültige CSV-Datei: Anführungszeichen nicht geschlossen.");
    }

    if (value || row.length) {
        row.push(value);
        rows.push(row);
    }

    return rows.filter(row => row.some(value => value.trim() !== ""));
}

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function get(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function close(db) {
    return new Promise((resolve, reject) => {
        db.close(err => err ? reject(err) : resolve());
    });
}

async function main() {
    const csv = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
    const rows = parseCSV(csv);
    const header = rows.shift();

    const expected = [
        "id", "name", "author", "kategorie",
        "beschreibung", "img", "original_category"
    ];

    if (JSON.stringify(header) !== JSON.stringify(expected)) {
        throw new Error("CSV-Spalten stimmen nicht überein.");
    }

    if (rows.length !== 132) {
        throw new Error(`Erwartet: 132 Bücher. Gefunden: ${rows.length}`);
    }

    const ids = new Set();

    for (const row of rows) {
        if (row.length !== 7) {
            throw new Error("Ungültige Spaltenanzahl in der CSV.");
        }

        const id = Number(row[0]);

        if (!Number.isSafeInteger(id) || id <= 0 || ids.has(id)) {
            throw new Error(`Ungültige oder doppelte ID: ${row[0]}`);
        }

        ids.add(id);

        if (!row[1].trim() || !row[3].trim() || !row[4].trim()) {
            throw new Error(`Fehlende Buchdaten bei ID ${id}`);
        }
    }

    const db = new sqlite3.Database(dbPath);
    let transactionStarted = false;

    try {
        await run(db, "BEGIN IMMEDIATE TRANSACTION");
        transactionStarted = true;

        const count = await get(db, "SELECT COUNT(*) AS total FROM books");

        if (count.total !== 132) {
            throw new Error(`Datenbank enthält ${count.total} statt 132 Bücher.`);
        }

        let updated = 0;

        for (const row of rows) {
            const [id, name, author, kategorie, beschreibung, img] = row;

            const existing = await get(
                db,
                "SELECT id, author, img FROM books WHERE id = ?",
                [Number(id)]
            );

            if (!existing) {
                throw new Error(`Buch-ID ${id} fehlt in der Datenbank.`);
            }

            if (existing.author !== author || existing.img !== img) {
                throw new Error(`Autor oder Bild stimmt bei ID ${id} nicht überein.`);
            }

            updated += await run(
                db,
                `UPDATE books
                 SET name = ?, kategorie = ?, beschreibung = ?
                 WHERE id = ?`,
                [name, kategorie, beschreibung, Number(id)]
            );
        }

        await run(db, "COMMIT");
        transactionStarted = false;

        console.log(`Erfolgreich: ${updated} Bücher aktualisiert.`);
    } catch (err) {
        if (transactionStarted) {
            await run(db, "ROLLBACK");
        }
        throw err;
    } finally {
        await close(db);
    }
}

main().catch(err => {
    console.error("Update fehlgeschlagen:", err.message);
    process.exitCode = 1;
});
