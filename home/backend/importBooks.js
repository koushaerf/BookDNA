
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("database.db");

const csv = fs.readFileSync("books.csv", "utf8");
const lines = csv.trim().split(/\r?\n/);

const books = lines.slice(1).map(line => {
    const columns = line.split(";");

    return {
        name: columns[0].trim(),
        author: columns[1].trim(),
        kategorie: columns[2].trim(),
        beschreibung: columns[3].trim(),
        img: columns[4].trim()
    };
});

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function importBooks() {
    let added = 0;
    let skipped = 0;
    let transactionStarted = false;

    try {
        await run("BEGIN TRANSACTION");
        transactionStarted = true;

        for (const book of books) {
            const existing = await get(
                `SELECT id FROM books
                 WHERE LOWER(name) = LOWER(?)
                 AND LOWER(author) = LOWER(?)`,
                [book.name, book.author]
            );

            if (existing) {
                skipped++;
                console.log("Already exists:", book.name);
                continue;
            }

            await run(
                `INSERT INTO books
                 (name, author, kategorie, beschreibung, img)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    book.name,
                    book.author,
                    book.kategorie,
                    book.beschreibung,
                    book.img
                ]
            );

            added++;
            console.log("Added:", book.name);
        }

        await run("COMMIT");
        transactionStarted = false;

        console.log("Import completed!");
        console.log("Added:", added);
        console.log("Skipped:", skipped);
    } catch (error) {
        console.error("Import failed:", error.message);

        if (transactionStarted) {
            await run("ROLLBACK");
        }
    } finally {
        db.close();
    }
}

importBooks();
