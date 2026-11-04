
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const db = new sqlite3.Database(
    path.join(__dirname, "database.db")
);

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function downloadCover(book) {
    if (!book.cover_i) {
        return "";
    }

    const imageName = `openlibrary_${book.cover_i}.jpg`;

    const imagePath = path.join(
        __dirname,
        "../frontend/public/images",
        imageName
    );

    if (!fs.existsSync(imagePath)) {
        const url =`https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Cover download failed: " + book.title);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(imagePath, buffer);

        console.log("Cover heruntergeladen:", imageName);
    }

    return imageName;
}
async function getBookSubjects(book) {
    if (!book.key) {
        return [];
    }

    const response = await fetch(`https://openlibrary.org${book.key}.json`);

    if (!response.ok) {
        throw new Error("Subjects konnten nicht geladen werden: " + book.title);
    }

    const data = await response.json();

    return Array.isArray(data.subjects) ? data.subjects : [];
}
async function getBookDescription(book) {
    if (!book.key) {
        return "Keine Beschreibung verfügbar.";
    }

    const response = await fetch(
        `https://openlibrary.org${book.key}.json`
    );

    if (!response.ok) {
        return "Keine Beschreibung verfügbar.";
    }

    const data = await response.json();

    if (typeof data.description === "string") {
        return data.description;
    }

    if (data.description && typeof data.description.value === "string") {
        return data.description.value;
    }

    return "Keine Beschreibung verfügbar.";
}
function detectCategory(subjects) {
    const text = subjects.join(" ").toLowerCase();

    if (/\bpoetry\b|\bpoems\b/.test(text)) {
        return "Poetry";
    }

    if (/historical fiction|historical novel/.test(text)) {
        return "Historical Fiction";
    }

    if (/coming.of.age|bildungsroman/.test(text)) {
        return "Coming-of-Age";
    }

    if (/classic literature|literary classics/.test(text)) {
        return "Classic";
    }

    if (/\bhistory\b|historical studies/.test(text)) {
        return "History";
    }

    if (/\bnonfiction\b|\bnon-fiction\b/.test(text)) {
        return "Nonfiction";
    }

    return null;
}
async function updateMonthlyBooks() {
    const month = new Date().toISOString().slice(0, 7);

    try {
        const existingMonth = await get(
            "SELECT COUNT(*) AS total FROM monthly_trending WHERE month = ?",
            [month]
        );

        if (existingMonth.total > 0) {
            console.log(
                "Für diesen Monat sind bereits Trending-Bücher gespeichert:",
                month
            );
            return;
        }

        const response = await fetch(
            "https://openlibrary.org/trending/monthly.json?limit=3"
        );

        if (!response.ok) {
            throw new Error("API request failed");
        }

        const data = await response.json();

        if (!Array.isArray(data.works) || data.works.length !== 3) {
            throw new Error("Expected exactly 3 books");
        }

        await run("BEGIN TRANSACTION");

        for (const [index, book] of data.works.entries()) {
            const title = book.title;
            const author = book.author_name?.[0] || "Unbekannt";
            const rank = index + 1;

            let existing = await get(
                `SELECT id FROM books
                 WHERE LOWER(name) = LOWER(?)
                 AND LOWER(author) = LOWER(?)`,
                [title, author]
            );

            let bookId;

            if (existing) {
                bookId = existing.id;
                console.log("Bereits vorhanden:", title);
            } else {
                const imageName = await downloadCover(book);
                const subjects = await getBookSubjects(book);
                console.log("Subjects für", title, ":", subjects.slice(0, 10));
                const category = detectCategory(subjects);
                const originalCategory = subjects.length > 0 ? subjects[0] : null;
                const description = await getBookDescription(book);
                const result = await run(
                    `INSERT INTO books
                    (name, author, kategorie, original_category, beschreibung, img)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        title,
                        author,
                        category,
                        originalCategory,
                        description,
                        imageName
                    ]
                );

                bookId = result.lastID;
                console.log("Neu hinzugefügt:", title);
            }

            await run(
                `INSERT OR IGNORE INTO monthly_trending
                (book_id, month, rank)
                VALUES (?, ?, ?)`,
                [bookId, month, rank]
            );
        }

        await run("COMMIT");
        console.log("Trending-Bücher aktualisiert:", month);

    } catch (error) {
        await run("ROLLBACK").catch(() => {});
        console.error("Fehler:", error.message);
    } finally {
        db.close();
    }
}

updateMonthlyBooks();
