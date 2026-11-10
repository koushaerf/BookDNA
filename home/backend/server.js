const express = require("express");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const Fuse = require("fuse.js");
const session = require("express-session");
const app = express();
app.use(express.json());

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || "bookdna-local-development-only",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

//hier ist um checken ob user eingeloggt ist, wenn nicht dann error 401
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Bitte zuerst anmelden"
        });
    }

    next();
}

const db = new sqlite3.Database(
    path.join(__dirname, "database.db"),
    function (err) {
        if (err) {
            console.error("Database connection error:", err.message);
        } else {
            console.log("Connected to SQLite database.");
        }
    }
);
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
    )
`, function (err) {
    if (err) {
        console.error("Fehler beim Erstellen der users-Tabelle:", err.message);
    } else {
        console.log("Users-Tabelle ist bereit.");
    }
});


app.get("/books/id/:id", function (req, res) {
    const bookId = req.params.id;

    db.get(
        "SELECT * FROM books WHERE id = ?",
        [bookId],
        function (err, row) {
            if (err) {
                res.status(500).json({
                    error: err.message
                });
                return;
            }

            if (!row) {
                res.status(404).json({
                    error: "Book not found."
                });
                return;
            }

            res.json(row);
        }
    );
});


app.get("/books", function (req, res) {
    db.all(
        "SELECT * FROM books",
        function (err, rows) {
            if (err) {
                res.status(500).json({
                    error: err.message
                });
                return;
            }

            res.json(rows);
        }
    );
});




app.get("/books/:category", function (req, res) {
    const category = req.params.category;
        if (category === "Bücher im Trend") {
        const sql = `
           SELECT books.*
           FROM books
           INNER JOIN monthly_trending
                ON books.id = monthly_trending.book_id
           GROUP BY books.id
           ORDER BY MAX(monthly_trending.month) DESC,
                    MIN(monthly_trending.rank) ASC`;

        db.all(sql, [], function (err, rows) {
            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json(rows);
        });

        return;
    }
    db.all(
        `
            SELECT *
            FROM books
            WHERE LOWER(kategorie) = LOWER(?)
        `,
        [category],
        function (err, rows) {
            if (err) {
                res.status(500).json({
                    error: err.message
                });
                return;
            }

            res.json(rows);
        }
    );
});


app.get("/search", function (req, res) {
    const text = (req.query.q || "").trim();

    if (!text) {
        res.json([]);
        return;
    }

    db.all(
        "SELECT * FROM books",
        function (err, rows) {
            if (err) {
                res.status(500).json({
                    error: err.message
                });
                return;
            }

            const fuse = new Fuse(rows, {
                keys: ["name", "author", "kategorie"],
                threshold: 0.6
            });

            const searchResults = fuse.search(text);

            const books = searchResults.map(function (result) {
                return result.item;
            });

            res.json(books);
        }
    );
});




app.get("/categories", function (req, res) {
    const sql = `
        SELECT
            kategorie AS name,
            COUNT(*) AS book_count
        FROM books
        WHERE kategorie IS NOT NULL
            AND TRIM(kategorie) != ''
        GROUP BY kategorie

        UNION ALL

        SELECT
            'Bücher im Trend' AS name,
            COUNT(DISTINCT book_id) AS book_count
        FROM monthly_trending

        ORDER BY name
    `;

    db.all(sql, [], function (err, rows) {
        if (err) {
            res.status(500).json({
                error: err.message
            });
            return;
        }

        res.json(rows);
    });

});





// Bücher im Trend - aktuelle und vergangene Monate
app.get("/monthly-trending", function (req, res) {
    const sql = `
        SELECT
            monthly_trending.month,
            monthly_trending.rank,
            books.id AS book_id,
            books.name,
            books.author,
            books.kategorie,
            books.original_category,
            books.beschreibung,
            books.img AS book_img
        FROM monthly_trending
        INNER JOIN books
            ON monthly_trending.book_id = books.id
        ORDER BY monthly_trending.month DESC,
                 monthly_trending.rank ASC
    `;

    db.all(sql, [], function (err, rows) {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
});
app.post("/register", async function (req, res) {
    const { name, email, password } = req.body;

    if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !name.trim() ||
        !email.trim() ||
        password.length < 8
    ) {
        return res.status(400).json({
            error: "Bitte alle Felder ausfüllen. Das Passwort muss mindestens 8 Zeichen haben."
        });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    try {
        const passwordHash = await bcrypt.hash(password, 12);

        db.run(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            [cleanName, cleanEmail, passwordHash],
            function (err) {
                if (err) {
                    if (err.code === "SQLITE_CONSTRAINT") {
                        return res.status(409).json({
                            error: "Diese E-Mail-Adresse ist bereits registriert."
                        });
                    }

                    return res.status(500).json({
                        error: "Fehler bei der Registrierung."
                    });
                }

                res.status(201).json({
                    message: "Registrierung erfolgreich.",
                    user: {
                        id: this.lastID,
                        name: cleanName,
                        email: cleanEmail
                    }
                });
            }
        );
    } catch (err) {
        res.status(500).json({
            error: "Fehler bei der Registrierung."
        });
    }
});

app.post("/login", function (req, res) {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string" ||
        !email.trim() || !password) {
        return res.status(400).json({
            error: "Bitte E-Mail und Passwort eingeben."
        });
    }

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email.trim().toLowerCase()],
        async function (err, user) {
            if (err) {
                return res.status(500).json({
                    error: "Datenbankfehler."
                });
            }

            if (!user) {
                return res.status(401).json({
                    error: "E-Mail oder Passwort ist falsch."
                });
            }

            try {
                const passwordCorrect = await bcrypt.compare(
                    password,
                    user.password_hash
                );

                if (!passwordCorrect) {
                    return res.status(401).json({
                        error: "E-Mail oder Passwort ist falsch."
                    });
                }

                req.session.regenerate(function (err) {
                    if (err) {
                        return res.status(500).json({
                            error: "Fehler beim Erstellen der Sitzung."
                        });
                    }

                    req.session.userId = user.id;

                    req.session.save(function (err) {
                        if (err) {
                            return res.status(500).json({
                                error: "Fehler beim Speichern der Sitzung."
                            });
                        }

                        res.json({
                            message: "Anmeldung erfolgreich.",
                            user: {
                                id: user.id,
                                name: user.name,
                                email: user.email
                            }
                        });
                    });
                });
            } catch (err) {
                res.status(500).json({
                    error: "Fehler bei der Anmeldung."
                });
            }
        }
    );
});

app.get("/me", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Nicht angemeldet."
        });
    }

    db.get(
        "SELECT id, name, email FROM users WHERE id = ?",
        [req.session.userId],
        function (err, user) {
            if (err) {
                return res.status(500).json({
                    error: "Datenbankfehler."
                });
            }

            if (!user) {
                return res.status(401).json({
                    error: "Benutzer nicht gefunden."
                });
            }

            res.json({
                user: user
            });
        }
    );
});

app.post("/logout", function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            return res.status(500).json({
                error: "Fehler beim Abmelden."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Erfolgreich abgemeldet."
        });
    });
});






// Bewertungen laden
app.get("/books/id/:id/reviews", function (req, res) {
    const bookId = req.params.id;

    const sql = `
    SELECT
        reviews.id,
        reviews.rating,
        reviews.comment,
        reviews.created_at,
        users.name AS userName
    FROM reviews
    LEFT JOIN users
        ON reviews.user_id = users.id
    WHERE reviews.book_id = ?
    ORDER BY reviews.id DESC
`;

    db.all(sql, [bookId], function (err, reviews) {
        if (err) {
            res.status(500).json({
                error: "Bewertungen konnten nicht geladen werden."
            });
            return;
        }

        res.json(reviews);
    });
});


// Neue Bewertung erhalten
app.post("/books/id/:id/reviews", function (req, res) {
    const bookId = req.params.id;
    const rating = req.body.rating;
    const comment = req.body.comment;
    const userId = req.session.userId;



    if (!userId) {
        return res.status(401).json({
            error: "Bitte melde dich an, um eine Bewertung abzugeben."
        });
    }




    //Wegen SQL injection 
    const sql = `
    INSERT INTO reviews (book_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?)
`;

    db.run(sql, [bookId, userId, rating, comment], function (err) {
        if (err) {
            console.error(err.message);

            return res.status(500).json({
                message: "Die Bewertung konnte nicht gespeichert werden."
            });
            
        }

        res.status(201).json({
            message: "Bewertung gespeichert."
        });
    });
});


// Route zum Abrufen der Bücher eines Benutzers

app.get("/dashboard/books", requireLogin, function (req, res) {
    const userId = req.session.userId;

    const sql = `
        SELECT
            user_books.id,
            user_books.book_id,
            user_books.status,
            user_books.read_at,
            books.name,
            books.author,
            books.kategorie,
            books.img
        FROM user_books
        INNER JOIN books
            ON user_books.book_id = books.id
        WHERE user_books.user_id = ?
    `;

    db.all(sql, [userId], function (err, rows) {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
});



// Route zum Hinzufügen eines Buches zu den Büchern eines Benutzers
app.post("/dashboard/books", requireLogin, function (req, res) {
    const userId = req.session.userId;
    const { book_id, status, read_at } = req.body; // read_at ist optional und wird nur verwendet, wenn der Status "gelesen" ist

    if (!Number.isInteger(book_id) || book_id <= 0 ||
        !["planned", "read"].includes(status)) {
        return res.status(400).json({
            error: "Ungültiges Buch oder Status."
        });
    }

    const readAt = status === "read" ? read_at : null; // nur das Lesedatum speichern, wenn der Status "gelesen" ist

    db.get(
        "SELECT id FROM books WHERE id = ?",
        [book_id],
        function (err, book) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (!book) {
                return res.status(404).json({
                    error: "Buch nicht gefunden."
                });
            }

            db.get(
                "SELECT id FROM user_books WHERE user_id = ? AND book_id = ?",
                [userId, book_id],
                function (err, existing) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    if (existing) {
                        return res.status(409).json({
                            error: "Dieses Buch ist bereits in deiner Liste."
                        });
                    }

                    db.run(
                        `INSERT INTO user_books
                         (user_id, book_id, status, read_at)
                         VALUES (?, ?, ?, ?)`,
                        [userId, book_id, status, readAt],
                        function (err) {
                            if (err) {
                                return res.status(500).json({
                                    error: err.message
                                });
                            }

                            res.status(201).json({
                                message: "Buch erfolgreich hinzugefügt.",
                                id: this.lastID
                            });
                        }
                    );
                }
            );
        }
    );
});

// Route zum Abrufen von Statistiken für das Dashboard
app.get("/dashboard/stats", requireLogin, function (req, res) {
    const userId = req.session.userId;

    const sql = `
        SELECT
            (SELECT COUNT(*)
             FROM user_books
             WHERE user_id = ? AND status = 'read') AS booksRead,

            (SELECT COUNT(*)
             FROM user_books
             WHERE user_id = ? AND status = 'planned') AS booksPlanned,

            (SELECT COUNT(*)
             FROM quotes
             WHERE user_id = ?) AS quotesCount
    `;

    db.get(sql, [userId, userId, userId], function (err, row) {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(row);
    });
});



// Route zum Abrufen der Challenge-Statistiken für das Dashboard
app.get("/dashboard/challenge", requireLogin, function (req, res) {
    const userId = req.session.userId;
    const year = new Date().getFullYear();// Aktuelles Jahr
    // SQL-Abfrage, um die Anzahl der gelesenen Bücher und das Ziel für die Lesechallenge abzurufen
    const sql = `
        SELECT
            (SELECT COUNT(*)
            FROM user_books
            WHERE user_id = ?
            AND status = 'read'
            AND substr(read_at, 1, 4) = ?) AS booksRead,
            COALESCE(
                (SELECT goal
                FROM reading_challenges
                WHERE user_id = ? AND year = ?),
                20
            ) AS goal
    `;
    // Ausführen der SQL-Abfrage
    db.get(sql, [userId, String(year),userId, year], function (err, row) {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }
        // Rückgabe der Challenge-Statistiken als JSON
        res.json({
            year: year,
            booksRead: row.booksRead,
            goal: row.goal // Rückgabe des Ziels für die Lesechallenge
        });
    });
});

// Leseziel speichern
// Route zum Speichern des Leseziels für die Challenge
app.put("/dashboard/challenge", requireLogin, function (req, res) {
    const userId = req.session.userId;
    const year = new Date().getFullYear();
    const goal = req.body.goal;

    if (!Number.isInteger(goal) || goal < 1) {
    return res.status(400).json({
        error: "Ungültiges Leseziel."
    });
    }
    // SQL-Abfrage, um das Leseziel in der Datenbank zu speichern oder zu aktualisieren
    const sql = `
        INSERT INTO reading_challenges (user_id, year, goal)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, year)
        DO UPDATE SET goal = excluded.goal
    `;

    db.run(sql, [userId, year, goal], function (err) {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json({ year: year, goal: goal });
    });
});




// Zitat speichern
app.post("/dashboard/quotes", requireLogin, function (req, res) {
    const userId = req.session.userId;
    const { book_id, quote } = req.body;

    if (!Number.isInteger(book_id) || !quote || !quote.trim()) {
        return res.status(400).json({
            error: "Bitte Buch und Zitat eingeben."
        });
    }

    const sql = `
        INSERT INTO quotes (book_id, quote, user_id)
        VALUES (?, ?, ?)
    `;

    db.run(sql, [book_id, quote.trim(), userId], function (err) {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.status(201).json({
            message: "Zitat gespeichert."
        });
    });
});



// Gespeicherte Zitate laden
app.get("/dashboard/quotes", requireLogin, function (req, res) {
    const userId = req.session.userId;

    const sql = `
        SELECT
            quotes.id,
            quotes.quote,
            books.name,
            books.author
        FROM quotes
        INNER JOIN books ON quotes.book_id = books.id
        WHERE quotes.user_id = ?
        ORDER BY quotes.id DESC
    `;

    db.all(sql, [userId], function (err, rows) {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
});



// Route zum Löschen eines gespeicherten Zitats
app.delete("/dashboard/quotes/:id", requireLogin, function (req, res) {
    const userId = req.session.userId;
    const quoteId = Number(req.params.id);
    // Überprüfen, ob die quoteId eine gültige positive Zahl ist
    if (!Number.isInteger(quoteId) || quoteId <= 0) {
        return res.status(400).json({
            error: "Ungültige Zitat-ID."
        });
    }
    // SQL-Abfrage zum Löschen des Zitats, das dem Benutzer gehört
    const sql = `
        DELETE FROM quotes
        WHERE id = ? AND user_id = ?
    `;
    // Ausführen der SQL-Abfrage
    db.run(sql, [quoteId, userId], function (err) {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }
        // Überprüfen, ob ein Zitat gelöscht wurde
        if (this.changes === 0) {
            return res.status(404).json({
                error: "Zitat nicht gefunden."
            });
        }

        res.json({
            message: "Zitat erfolgreich gelöscht."
        });
    });
});


// Lesegeschmack des Benutzers laden
app.get("/dashboard/taste", requireLogin, function (req, res) {
    const userId = req.session.userId;
    // SQL-Abfrage, um die Anzahl der Bücher pro Kategorie für den Benutzer zu zählen
    const sql = `
        SELECT
            books.kategorie AS category,
            COUNT(*) AS count
        FROM user_books
        INNER JOIN books ON user_books.book_id = books.id
        WHERE user_books.user_id = ?
        AND books.kategorie IS NOT NULL
        AND TRIM(books.kategorie) != ''
        GROUP BY books.kategorie
        ORDER BY count DESC
    `;
    // Ausführen der SQL-Abfrage
    db.all(sql, [userId], function (err, rows) {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(rows);
    });
});



// Geplantes Buch als gelesen markieren
app.put("/dashboard/books/:id/read", requireLogin, function (req, res) {
    const userId = req.session.userId;
    const bookId = Number(req.params.id);

    if (!Number.isInteger(bookId) || bookId <= 0) {
        return res.status(400).json({ error: "Ungültige Buch-ID." });
    }

    const readDate = new Date().toISOString().slice(0, 10);

    const sql = `
        UPDATE user_books
        SET status = 'read', read_at = ?
        WHERE id = ? AND user_id = ? AND status = 'planned'
    `;

    db.run(sql, [readDate, bookId, userId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                error: "Geplantes Buch nicht gefunden."
            });
        }

        res.json({ message: "Buch als gelesen markiert." });
    });
});




// Server starten
app.listen(3000, function () {
    console.log("Server läuft auf Port 3000");
});



