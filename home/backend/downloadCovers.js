
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const coverResults = [];
const csvPath = path.join(__dirname, "books_de.csv");

const csv = fs.readFileSync(csvPath, "utf8");

const books = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true
});

console.log("Anzahl Bücher:", books.length);

async function findGermanCover(book) {
    const query = encodeURIComponent(
        `${book.name} ${book.author}`
    );

    const searchUrl =
        `https://openlibrary.org/search.json?q=${query}&limit=5`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const work = data.docs.find(item =>
        item.key?.startsWith("/works/")
    );

    if (!work) {
        console.log("Kein Buch gefunden:", book.name);
        return;
    }

    const editionsUrl =
        `https://openlibrary.org${work.key}/editions.json?limit=300`;

    const editionsResponse = await fetch(editionsUrl);

    if (!editionsResponse.ok) {
        throw new Error(`HTTP ${editionsResponse.status}`);
    }

    const editionsData = await editionsResponse.json();

    const germanEditions = editionsData.entries.filter(edition =>
        edition.languages?.some(lang =>
            lang.key === "/languages/ger"
        ) &&
        edition.covers?.some(id => id > 0)
    );

    coverResults.push({
        id: book.id,
        name: book.name,
        img: book.img,
        covers: germanEditions.map(edition => ({
            title: edition.title,
            coverId: edition.covers.find(id => id > 0)
        }))
    });

    console.log("--------------------");
    console.log("Buch:", book.name);
    console.log("Deutsche Cover gefunden:", germanEditions.length);

    for (const edition of germanEditions) {
        console.log(
            "Titel:", edition.title,
            "| Cover-ID:", edition.covers.find(id => id > 0)
        );
    }
}


async function main() {
    let checked = 0;

    for (const book of books) {
        try {
            await findGermanCover(book);
        } catch (error) {
            console.log(
                "Fehler bei:",
                book.name,
                error.message
            );
        }

        checked++;
        console.log(`Fortschritt: ${checked}/${books.length}`);

        await new Promise(resolve =>
            setTimeout(resolve, 1500)
        );
    }

    console.log("Suche abgeschlossen!");
    const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
        <meta charset="UTF-8">
        <title>BookDNA – Deutsche Buchcover</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 30px;
                background: #f5f5f5;
            }

            .book {
                background: white;
             padding: 20px;
                margin-bottom: 25px;
                border-radius: 10px;
            }

            .covers {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
            }

            .cover {
                width: 150px;
            }

            .cover img {
                width: 140px;
                height: 200px;
                object-fit: contain;
            }
        </style>
    </head>
    <body>
        <h1>BookDNA – Deutsche Buchcover</h1>

        ${coverResults.map(book => `
            <div class="book">
                <h2>${book.name}</h2>
                <div class="covers">
                    ${book.covers.map(cover => `
                        <div class="cover">
                            <label>
                                <input
                                    type="radio"
                                    name="book-${book.id}"
                                    value="${cover.coverId}"
                                    onchange="selectCover('${book.id}', '${book.img}', '${cover.coverId}')"
                                >
                                <img src="https://covers.openlibrary.org/b/id/${cover.coverId}-M.jpg">
                                <p>${cover.title}</p>
                                <small>Cover-ID: ${cover.coverId}</small>
                            </label>
                        </div>
                    `).join("")}
                </div>
            </div>
        `).join("")}
        <button onclick="downloadSelections()">
            Auswahl speichern
        </button>

        <script>
            const selections = {};

            function selectCover(bookId, filename, coverId) {
                selections[bookId] = {
                    filename: filename,
                    coverId: Number(coverId)
                };
            }

            function downloadSelections() {
                const blob = new Blob(
                    [JSON.stringify(selections, null, 2)],
                    { type: "application/json" }
                );

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");

                link.href = url;
                link.download = "selected-covers.json";
                link.click();

                URL.revokeObjectURL(url);
            }
        </script>
    </body>
    </html>
    `;

    fs.writeFileSync(
        path.join(__dirname, "cover-preview.html"),
        html,
        "utf8"
    );

    console.log("Vorschau erstellt: cover-preview.html");

}


async function replaceSelectedCovers() {
    const selectionPath = path.join(__dirname, "selected-covers.json");
    const imageDir = path.join(__dirname, "../frontend/public/images");
    const backupDir = path.join(__dirname, "cover-backups");

    const selections = JSON.parse(
        fs.readFileSync(selectionPath, "utf8")
    );

    fs.mkdirSync(backupDir, { recursive: true });

    for (const [bookId, selection] of Object.entries(selections)) {
        try {
            const book = books.find(b => String(b.id) === bookId);

            if (!book || book.img !== selection.filename) {
                console.log("Ungültige Auswahl:", bookId);
                continue;
            }

            const coverId = Number(selection.coverId);

            if (!Number.isSafeInteger(coverId) || coverId <= 0) {
                console.log("Ungültige Cover-ID:", bookId);
                continue;
            }

            const imagePath = path.join(imageDir, book.img);
            const backupPath = path.join(backupDir, book.img);

            const url =
                `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`;

            const response = await fetch(url);

            if (!response.ok) {
                console.log("Download fehlgeschlagen:", book.name);
                continue;
            }

            const image = Buffer.from(await response.arrayBuffer());

            if (image.length < 1000) {
                console.log("Bild zu klein:", book.name);
                continue;
            }

            if (fs.existsSync(imagePath) && !fs.existsSync(backupPath)) {
                fs.copyFileSync(imagePath, backupPath);
            }

            fs.writeFileSync(imagePath, image);

            console.log("Ersetzt:", book.name);

        } catch (error) {
            console.log("Fehler:", bookId, error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("Alle ausgewählten Cover verarbeitet!");
}

replaceSelectedCovers().catch(console.error);
