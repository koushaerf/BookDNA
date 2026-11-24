const genreNames = {
    Classic: "Klassiker",
    History: "Geschichte",
    Poetry: "Lyrik",
    "Historical Fiction": "Historischer Roman",
    "Coming-of-Age": "Entwicklungsroman",
    Nonfiction: "Sachbuch"
};

export function getGenreName(category) {
    return genreNames[category] || category;
}