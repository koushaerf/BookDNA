const fs = require("fs");

const csv = fs.readFileSync("books.csv", "utf8");

const lines = csv.trim().split(/\r?\n/);

const books = lines.slice(1).map(line => {
    const columns = line.split(";");

    return {
        name: columns[0],
        author: columns[1],
        img: columns[4]
    };
});

console.log(books);
console.log("Total books:", books.length);
async function findCover(book) {
    const query = encodeURIComponent(
        book.name + " " + book.author
    );

    const url = `https://openlibrary.org/search.json?q=${query}&limit=5`;

    const response = await fetch(url);
    const data = await response.json();

    const result = data.docs.find(item => item.cover_i);

    if (!result) {
        console.log("No cover found:", book.name);
        return;
    }

    const coverUrl = `https://covers.openlibrary.org/b/id/${result.cover_i}-L.jpg`;

    const imageResponse = await fetch(coverUrl);

    if (!imageResponse.ok) {
        console.log("Download failed:", book.name);
        return;
    }

    const image = Buffer.from(await imageResponse.arrayBuffer());

    const imagePath = `../frontend/public/images/${book.img}`;

    if (fs.existsSync(imagePath)) {
        console.log("Image already exists:", book.img);
        return;
    }

    fs.writeFileSync(imagePath, image);

    console.log("Downloaded:", book.img);
}

async function downloadAllCovers() {
    for (const book of books) {
        try {
            await findCover(book);
        } catch (error) {
            console.log("Error:", book.name, error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

downloadAllCovers();