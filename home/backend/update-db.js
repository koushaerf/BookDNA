const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
    path.join(__dirname, "database.db")
);

db.all("PRAGMA table_info(quotes);", function (err, rows) {
    if (err) {
        console.error(err.message);
    } else {
        console.log(rows);
    }

    db.close();
});