<template>
    <Navbar />

    <main class="dashboard-page">

        <!-- Begrüßung -->
        <div class="dashboard-welcome">
            <p>MEIN BEREICH</p>
            <h1>Willkommen zurück!</h1>
            <h2>Bereit zum Weiterlesen?</h2>
        </div>

        <div class="book-selection">

        <div class="selection-field">
            <label>Buch auswählen</label>

            <select v-model="selectedBook">
                <option value="">Bitte auswählen</option>

                <option v-for="book in books" :key="book.id":value="book.id">
                    {{ book.name }} - {{ book.author }}
                </option>
            </select>
        </div>


        <div class="selection-field status-field">
            <label>Status</label>

            <select v-model="selectedStatus">
                <option value="planned">Geplant</option>

                <option value="read">Gelesen</option>
            </select>
        </div>


        <div v-if="selectedStatus === 'read'" class="selection-field">
            <label>Lesedatum</label>

            <input
                type="date"
                v-model="readDate"
                :max="new Date().toLocaleDateString('en-CA')"
            />
        </div>


        <button class="add-book-button"  @click="addBook">
            Hinzufügen
        </button>

        </div>

        <!--Lesechallenges-->

        <!-- LESECHALLENGE -->
        

        <section class="dashboard-card challenge-card">

            <div class="challenge-content">

                <!-- LINKE SEITE: LESECHALLENGE -->
                <div class="challenge-info">

                    <h2>Meine Lesechallenge {{ challengeYear }}</h2>


                    <label for="reading-goal">Dein Leseziel:</label>

                    <input id="reading-goal" type="number" v-model.number="challengeGoal"
                        min="1"
                        @change="saveChallenge"
                    />
                    
                   

                    <p>
                        {{ booksReadThisYear }} / {{ challengeGoal }}
                        Bücher gelesen
                    </p>

                    <p>
                        Noch {{ challengeRemaining }} Bücher bis zu deinem Ziel
                    </p>

                    <div class="challenge-track">
                        <div
                            class="challenge-fill"
                            :style="{ width: challengePercent + '%' }"
                        ></div>
                    </div>

                    <p>{{ challengePercent }} % geschafft</p>

                    

                </div>

                <!-- RECHTE SEITE: BILD -->
                <div class="challenge-image">
                    <img :src="readerImage" alt="Lesechallenge" />

                     <div class="reader-badge">
                        <span>Dein Leseabzeichen</span>
                        <strong>{{ readerTitle }}</strong>
                    </div>
                </div>

            </div>

        </section>

            
                

        <!-- MITTLERER BEREICH -->
        <div class="dashboard-middle">

            <!-- ZITATE -->
            <section class="dashboard-card">

                <div class="card-header">
                    <h2>Gespeicherte Zitate</h2>

                    <button class="small-button"@click="showQuote = true">
                        
                        + Zitat
                    </button>
                </div>
                <div class="quotes-list">
                <div v-for="quote in quotes" :key="quote.id" class="saved-quote">
                    <p>„{{ quote.quote }}“</p>
                    <span>— {{ quote.name }} – {{ quote.author }}</span>
                    <button class="delete-quote-button" @click="deleteQuote(quote.id)">
                        Löschen             
                    </button>               
                </div>

                <div v-if="quotes.length === 0" class="saved-quote">
                    <p>Du hast noch keine Zitate gespeichert.</p>
                </div>

                </div>

            </section>


            <!-- LESEGESCHMACK -->
        
            <section class="dashboard-card">

                <h2>Dein Lesegeschmack</h2>

                <p class="taste-description">
                    Basierend auf deinen ausgewählten Büchern
                </p>

                <div
                    v-for="item in tastePercentages"
                    :key="item.category"
                    class="taste-item"
                >
                    <div class="taste-title">
                        <span>{{ getGenreName(item.category) }}</span>
                        <span>{{ item.percentage }}%</span>
                    </div>

                    <div class="taste-bar">
                        <div
                            class="taste-value"
                            :style="{ width: item.percentage + '%' }"
                        ></div>
                    </div>
                </div>

                <p v-if="tastePercentages.length === 0">
                    Du hast noch keine Bücher hinzugefügt.
                </p>

            </section>

        </div>

        <!-- STATISTIK UNTEN -->
        <div class="dashboard-statistics">

            <div
                class="stat-card"
                role="button"
                tabindex="0"
                @click="showBooksPopup = 'read'"
                @keydown.enter="showBooksPopup = 'read'"
                @keydown.space.prevent="showBooksPopup = 'read'"
            >
                <strong>{{ stats.booksRead }}</strong>
                <span>Bücher gelesen</span>
            </div>

            <div
                class="stat-card"
                role="button"
                tabindex="0"
                @click="showBooksPopup = 'planned'"
                @keydown.enter="showBooksPopup = 'planned'"
                @keydown.space.prevent="showBooksPopup = 'planned'"
            >
                <strong>{{ stats.booksPlanned }}</strong>
                <span>Bücher geplant</span>
            </div>


            <div class="stat-card">
                <strong>{{ stats.quotesCount }}</strong>
                <span>Gespeicherte Zitate</span>
            </div>

        </div>

    </main>

    <div v-if="showQuote" class="quote-popup">

        <div class="quote-popup-box">

            <h2>Zitat hinzufügen</h2>
            <label for="quote-book">Buch auswählen:</label>

            <select id="quote-book" v-model="selectedQuoteBook" class="quote-book-select">
                <option value="">Bitte auswählen</option>
            
                <option
                    v-for="book in books"
                    :key="book.id"
                    :value="book.id"
                >
                    {{ book.name }} - {{ book.author }}
                </option>
            </select>

                        <textarea v-model="newQuote" placeholder="Schreibe hier dein Lieblingszitat..."></textarea>

            <div class="quote-popup-buttons">

                <button class="small-button" @click="showQuote = false">
                    Abbrechen
                </button>

                <button class="dashboard-button" @click="addQuote">
                    Hinzufügen
                </button>

            </div>

        </div>

    </div>
        <!-- POPUP FÜR GESPEICHERTE BÜCHER -->
    <div v-if="showBooksPopup" class="quote-popup">

        <div class="quote-popup-box">

            <h2>
                {{ showBooksPopup === 'read'
                    ? 'Meine gelesenen Bücher'
                    : 'Meine geplanten Bücher' }}
            </h2>

            <div class="saved-books-list">

                <div
                    v-for="book in filteredBooks"
                    :key="book.id"
                    class="saved-book-item"
                >
                
                    <div class="saved-book-info">
                        <h3>{{ book.name }}</h3>
                        <p>{{ book.author }}</p>

                         <p v-if="book.status === 'read' && book.read_at">
                            Gelesen im Jahr: {{ book.read_at.slice(0, 4) }}
                         </p>
                    </div>

                    <button v-if="book.status === 'planned'" class="change-status-button" @click="changeBookStatus(book)">
                        Als gelesen markieren
                    </button>

                </div>

                <p v-if="filteredBooks.length === 0">
                    Du hast noch keine Bücher in dieser Liste.
                </p>

            </div>
        

            <button
                class="dashboard-button"
                @click="showBooksPopup = ''"
            >
                Schließen
            </button>

        </div>

    </div>





</template>


<script setup>
import { ref, onMounted , computed } from "vue";
import Navbar from "../components/Navbar.vue";
import { getGenreName } from "../Utils/kategorieName.js"; // Importiere die Funktion getGenreName aus genreNames.js
const selectedStatus = ref("planned");
const showQuote = ref(false);
const newQuote = ref("");
const selectedQuoteBook = ref("");
const quotes = ref([]);
// ist die Variable für den Lesegeschmack, die die Prozentsätze der verschiedenen Genres enthält
const taste = ref([]);
//Speichert, welche Bücherliste geöffnet ist
const showBooksPopup = ref("");


// Prozentanteil der Buchkategorien berechnen
const tastePercentages = computed(function () {
    let total = 0;
// Berechne die Gesamtanzahl der Bücher in allen Kategorien
    for (const item of taste.value) {
        total += item.count;
    }
// Wenn die Gesamtanzahl 0 ist, gibt es keine Daten, daher wird ein leeres Array zurückgegeben
    if (total === 0) {
        return [];
    }
// Berechne den Prozentsatz jeder Kategorie und runde ihn auf die nächste ganze Zahl
    return taste.value.map(function (item) {
        return {
            category: item.category,
            percentage: Math.round((item.count / total) * 100)
        };
    });
});


// ist die Variable für die Statistik, die die Anzahl der gelesenen Bücher, geplanten Bücher und gespeicherten Zitate enthält
const stats = ref({
    booksRead: 0,
    booksPlanned: 0,
    quotesCount: 0
});

// ist die Variable für das aktuelle Datum, die im Format "YYYY-MM-DD" gespeichert wird
const readDate = ref(new Date().toLocaleDateString("en-CA"));

const challengeYear = new Date().getFullYear();

const challengeGoal = ref(null);
// ist die Variable für den Titel des Lesers, die basierend auf der Anzahl der gelesenen Bücher berechnet wird
const readerTitle = computed(() => {
    const count = booksReadThisYear.value;

    if (count <= 5) {
        return "📖 Einsteiger";
    } else if (count <= 10) {
        return "🐛 Bücherwurm";
    } else if (count <= 20) {
        return "🤓 Leseprofi";
    } else {
        return "🏆 Legende ";
    }
});

// ist die Variable für das Bild des Lesers, die basierend auf der Anzahl der gelesenen Bücher berechnet wird
const readerImage = computed(() => {
    const count = booksReadThisYear.value;

    if (count <= 5) {
        return "/images/pooh.png";
    } else if (count <= 10) {
        return "/images/explorer.png";
    } else if (count <= 20) {
        return "/images/nerd.png";
    } else {
        return "/images/legend.png";
    }
});




const booksReadThisYear = ref(0);

const challengePercent = computed(() => {
    const goal = Number(challengeGoal.value);

    if (!Number.isFinite(goal) || goal <= 0) {
        return 0;
    }

    return Math.min(
        100,
        Math.round((booksReadThisYear.value / goal) * 100)
    );
});

const challengeRemaining = computed(() => {
    return Math.max(
        0,
        (Number(challengeGoal.value) || 0) - booksReadThisYear.value
    );
});

const books = ref([]);
const selectedBook = ref("");

// Gespeicherte Bücher des Benutzers
const savedBooks = ref([]);


// Bücher nach Lesestatus filtern
const filteredBooks = computed(function () {
    return savedBooks.value.filter(function (book) {
        return book.status === showBooksPopup.value;
    });
});

async function loadBooks() {
    const response = await fetch("/api/books");
    books.value = await response.json();
}

// Status eines gespeicherten Buches ändern
// Geplantes Buch als gelesen markieren
async function changeBookStatus(book) {
    try {
        const response = await fetch("/api/dashboard/books/" + book.id + "/read", {
            method: "PUT"
        });

        if (!response.ok) {
            throw new Error("Status konnte nicht geändert werden.");
        }

        await loadSavedBooks();
        await loadStats();
        await loadChallenge();

    } catch (err) {
        console.error(err);
        alert("Fehler beim Ändern des Buchstatus.");
    }
}

// Gespeicherte Bücher des Benutzers laden
async function loadSavedBooks() {
    try {
        const response = await fetch("/api/dashboard/books");

        if (!response.ok) {
            throw new Error("Bücher konnten nicht geladen werden.");
        }

        savedBooks.value = await response.json();

    } catch (err) {
        console.error(err);
    }
}


// Funktion zum Hinzufügen eines Buches
async function addBook() {
    if (!selectedBook.value) {
        alert("Bitte wähle ein Buch aus.");
        return;
    }

    try {
        const response = await fetch("/api/dashboard/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({
                book_id: Number(selectedBook.value),
                status: selectedStatus.value,
                read_at: selectedStatus.value === "read" ? readDate.value : null  // nur das Lesedatum senden, wenn der Status "gelesen" ist
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Fehler beim Hinzufügen.");
            return;
        }

        alert("Buch erfolgreich hinzugefügt!");

        await loadStats();// um die Statistikdaten vom Server zu laden und in der stats Variable zu speichern
        await loadChallenge();// um die Lesechallenge-Daten vom Server zu laden und in der booksReadThisYear Variable zu speichern
        await loadQuotes();// um die Zitate vom Server zu laden und in der quotes Variable zu speichern
        selectedBook.value = "";
        selectedStatus.value = "planned";

        await loadTaste(); // um den Lesegeschmack des Benutzers vom Server zu laden und in der taste Variable zu speichern

    } catch (err) {
        console.error(err);
        alert("Verbindung zum Server fehlgeschlagen.");
    }
}


// Funktion zum Hinzufügen eines Zitats
async function addQuote() {
    if (!selectedQuoteBook.value || !newQuote.value.trim()) {
        alert("Bitte Buch und Zitat eingeben.");
        return;
    }

    try {
        const response = await fetch("/api/dashboard/quotes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                book_id: Number(selectedQuoteBook.value),
                quote: newQuote.value
            })
        });

        if (response.status === 401) {
            alert("Bitte zuerst anmelden.");
            return;
        }

        if (!response.ok) {
            throw new Error("Zitat konnte nicht gespeichert werden.");
        }

        alert("Zitat erfolgreich gespeichert!");

        newQuote.value = "";
        selectedQuoteBook.value = "";
        showQuote.value = false;

        await loadStats(); // um die Statistikdaten vom Server zu laden und in der stats Variable zu speichern
        await loadQuotes(); // um die Zitate vom Server zu laden und in der quotes Variable zu speichern

    } catch (err) {
        console.error(err);
        alert("Fehler beim Speichern des Zitats.");
    }
}


// Gespeichertes Zitat löschen
async function deleteQuote(quoteId) {
    const confirmed = confirm("Möchtest du dieses Zitat wirklich löschen?");

    if (!confirmed) {
        return;
    }
    // Sende eine DELETE-Anfrage an den Server, um das Zitat zu löschen
    try {
        const response = await fetch("/api/dashboard/quotes/" + quoteId, {
            method: "DELETE"
        });
        // Überprüfen, ob die Antwort erfolgreich war
        if (!response.ok) {
            throw new Error("Zitat konnte nicht gelöscht werden.");
        }

        await loadQuotes();
        await loadStats();

    } catch (err) {
        console.error(err);
        alert("Fehler beim Löschen des Zitats.");
    }
}


// um die Statistikdaten vom Server zu laden und in der stats Variable zu speichern
async function loadStats() {
    try {
        const response = await fetch("/api/dashboard/stats", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Statistiken konnten nicht geladen werden.");
        }

        stats.value = await response.json();

    } catch (err) {
        console.error(err);
    }
}

// um die Zitate vom Server zu laden und in der quotes Variable zu speichern
async function loadQuotes() {
    try {
        const response = await fetch("/api/dashboard/quotes");

        if (!response.ok) {
            throw new Error("Zitate konnten nicht geladen werden.");
        }

        quotes.value = await response.json();
        console.log("Geladene Zitate:", quotes.value);

    } catch (err) {
        console.error(err);
    }
}

// Lesegeschmack des Benutzers laden
async function loadTaste() {
    try {
        const response = await fetch("/api/dashboard/taste");

        if (!response.ok) {
            throw new Error("Lesegeschmack konnte nicht geladen werden.");
        }

        taste.value = await response.json();

    } catch (err) {
        console.error(err);
    }
}


// um die Lesechallenge-Daten vom Server zu laden und in der booksReadThisYear Variable zu speichern
async function loadChallenge() {
    try {
        const response = await fetch("/api/dashboard/challenge");// Fetch the challenge data from the server

        if (!response.ok) {
            throw new Error("Lesechallenge konnte nicht geladen werden.");
        }

        const data = await response.json();// Parse the response as JSON

        booksReadThisYear.value = data.booksRead;// Update the booksReadThisYear variable with the data from the server
        challengeGoal.value = data.goal;// Update the challengeGoal variable with the data from the server

    } catch (err) {
        console.error(err);
    }
}



// um die Lesechallenge-Daten auf dem Server zu speichern
async function saveChallenge() {
    try {
        const response = await fetch("/api/dashboard/challenge", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                goal: Number(challengeGoal.value)
            })
        });

        if (!response.ok) {
            throw new Error("Leseziel konnte nicht gespeichert werden.");
        }

    } catch (err) {
        console.error(err);
    }
}


//um die Bücher und Statistiken beim Laden der Seite zu initialisieren
function initializeDashboard() {
    loadBooks();
    loadStats();
    loadChallenge();
    loadQuotes();
    loadTaste();
    loadSavedBooks();
}
//um die initializeDashboard Funktion beim Laden der Komponente aufzurufen
onMounted(initializeDashboard);


</script>
<style scoped>

/* DASHBOARD */

.dashboard-page {
    max-width: 1250px;
    margin: 0 auto;
    padding: 55px 70px 100px;
}


/* WELCOME */

.dashboard-welcome {
    text-align: center;
    margin-bottom: 40px;
}

.dashboard-welcome > p {
    margin: 0 0 10px;

    color: #c07854;
    font-size: 13px;
    font-weight: bold;
    letter-spacing: 2px;
}

.dashboard-welcome h1 {
    margin: 0;

    color: #88571a;
    font-size: 42px;
}

.dashboard-welcome h2 {
    margin: 8px 0 0;

    color: #694f44;
    font-size: 20px;
    font-weight: normal;
}


/* ALLGEMEINE CARDS */

.dashboard-card {
    padding: 28px;

    background-color: rgba(255, 250, 244, 0.94);

    border: 1px solid #d8c6b8;
    border-radius: 20px;

    box-shadow: 0 6px 18px rgba(51, 37, 31, 0.08);
}

.dashboard-card h2 {
    margin: 0;

    color: #694f44;
    font-size: 22px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    margin-bottom: 25px;
}

/* BUCHAUSWAHL */

.book-selection {
    display: flex;
    align-items: flex-end;
    gap: 15px;

    margin-bottom: 25px;
    padding: 20px 25px;

    background-color: rgba(255, 250, 244, 0.94);

    border: 1px solid #d8c6b8;
    border-radius: 18px;

    box-shadow: 0 6px 18px rgba(51, 37, 31, 0.08);
}


.selection-field {
    display: flex;
    flex-direction: column;
    gap: 7px;

    flex: 1;
}


.status-field {
    flex: 0 0 200px;
}


.selection-field label {
    color: #694f44;
    font-size: 14px;
    font-weight: bold;
}


.selection-field select, .selection-field input {
    height: 44px;
    padding: 0 14px;

    background-color: #fffaf4;

    border: 1px solid #d8c6b8;
    border-radius: 10px;

    color: #5c4b42;
    font-size: 14px;

    cursor: pointer;
}


.selection-field select:focus {
    outline: 2px solid #c07854;
}


.add-book-button {
    height: 44px;
    padding: 0 20px;

    border: none;
    border-radius: 10px;

    background-color: #694f44;
    color: white;

    cursor: pointer;
}


.add-book-button:hover {
    background-color: #5d4037;
}

/* challenge  */
   

.challenge-card {
    margin-bottom: 25px;
}

.challenge-content {
    display: flex;
    align-items: center;
    gap: 35px;
}

.challenge-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: #694f44;
    font-size: 18px;
}

.challenge-image {
    flex: 0 0 35%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 15px;
}

.challenge-image img {
    width: 100%;
    max-height: 250px;
    object-fit: contain;
    

    -webkit-mask-image: radial-gradient(
        ellipse 65% 65% at center,
        black 45%,
        transparent 100%
    );

    mask-image: radial-gradient(
        ellipse 65% 65% at center,
        black 45%,
        transparent 100%
    );
}
.challenge-track {
    width: 100%;
    height: 14px;
    background-color: #eadfd5;
    border-radius: 20px;
    overflow: hidden;
    margin-top: 18px;
}

.challenge-fill {
    height: 100%;
    background-color: #c07854;
    border-radius: 20px;
    transition: width 0.25s ease;
}

.challenge-card input {
    width: 95px;
    height: 42px;
    padding: 0 12px;
    border: 1px solid #d8c6b8;
    border-radius: 10px;
    background-color: #fffaf4;
    color: #5c4b42;
}



/* MITTLERER BEREICH */

.dashboard-middle {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 25px;

    margin-bottom: 25px;
}


/* ZITATE */

.saved-quote {
    margin-bottom: 15px;
    padding: 18px;

    background-color: #f3e9df;
    border-radius: 14px;
}

.saved-quote:last-child {
    margin-bottom: 0;
}

.saved-quote p {
    margin: 0 0 8px;

    color: #5c4b42;

    font-size: 16px;
    font-style: italic;
    line-height: 1.5;
}

.saved-quote span {
    color: #88571a;

    font-size: 14px;
    font-weight: bold;
}


/* LESEGESCHMACK */

.taste-description {
    margin: 8px 0 25px;

    color: #5c4b42;
    font-size: 14px;
}

.taste-item {
    margin-bottom: 20px;
}

.taste-title {
    display: flex;
    justify-content: space-between;

    margin-bottom: 7px;

    color: #694f44;
    font-size: 14px;
}

.taste-bar {
    height: 9px;

    overflow: hidden;

    background-color: #eadfd5;
    border-radius: 20px;
}

.taste-value {
    height: 100%;

    background-color: #c07854;
    border-radius: 20px;
}


/* STATISTIK */

.dashboard-statistics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 25px;
}

.stat-card {
    padding: 22px;

    text-align: center;

    background-color: rgba(255, 250, 244, 0.94);

    border: 1px solid #d8c6b8;
    border-radius: 18px;

    box-shadow: 0 6px 18px rgba(51, 37, 31, 0.08);
}

.stat-card[role="button"] {
    cursor: pointer;
    transition: transform 0.2s ease;
}

.stat-card[role="button"]:hover {
    transform: translateY(-4px);
}

.stat-card[role="button"]:focus-visible {
    outline: 2px solid #c07854;
    outline-offset: 3px;
}

.stat-card strong {
    display: block;

    margin-bottom: 5px;

    color: #88571a;
    font-size: 34px;
}

.stat-card span {
    color: #5c4b42;
    font-size: 14px;
}


/* BUTTONS */

.small-button {
    padding: 8px 13px;

    border: none;
    border-radius: 8px;

    background-color: #ead7cb;
    color: #694f44;

    cursor: pointer;
}

.small-button:hover {
    background-color: #dfc5b6;
}

.dashboard-button {
    padding: 10px 18px;

    border: none;
    border-radius: 8px;

    background-color: #694f44;
    color: white;

    cursor: pointer;
}

.dashboard-button:hover {
    background-color: #5d4037;
}


/* RESPONSIVE */

@media (max-width: 900px) {

    .dashboard-page {
        padding: 40px 20px;
    }

    .dashboard-middle,
    .dashboard-statistics {
        grid-template-columns: 1fr;
    }

    .last-book-content {
        align-items: flex-start;
    }

    .reading-progress {
        align-items: flex-start;
    }
}


.quote-popup {
    position: fixed;
    inset: 0;

    display: flex;
    justify-content: center;
    align-items: center;

    background-color: rgba(0, 0, 0, 0.45);

    z-index: 1000;
}

.quote-popup-box {
    width: 450px;
    max-width: 90%;

    padding: 30px;

    background-color: #fffaf4;

    border-radius: 20px;

    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.quote-popup-box h2 {
    margin-top: 0;

    color: #694f44;
}

.quote-popup-box textarea {
    width: 100%;
    height: 130px;

    padding: 15px;

    border: 1px solid #d8c6b8;
    border-radius: 10px;

    resize: vertical;

    font-family: inherit;
    font-size: 15px;
}

.quote-popup-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 10px;

    margin-top: 20px;
}

.challenge-info label {
    display: inline-block;
    margin-top: 15px;
    margin-right:15px;
}
.challenge-info h2 {
    margin-bottom: 15px;
}

.quotes-list {
    max-height: 300px;
    overflow-y: auto;
    padding-right: 8px;
}

.delete-quote-button {
    background-color: #6b5046;
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 24px;
    font-size: 14px;
    cursor: pointer;
    margin-top: 10px;
    margin-left: 15px;
}

.delete-quote-button:hover {
    background-color: #543e36;
}

.quote-book-select {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid #dfc9bd;
    border-radius: 12px;
    background-color: white;
    color: #4a3b35;
    font-size: 15px;
    box-sizing: border-box;
    cursor: pointer;
    margin-bottom: 15px;
}

.quote-popup-box {
    width: 700px;
    max-width: 90%;
    padding: 30px;
    box-sizing: border-box;

    background-color: #fffaf4;
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

/* GESPEICHERTE BÜCHER LISTE */
.saved-books-list {
    max-height: 350px;
    overflow-y: auto;
    margin: 20px 0;
}

.change-status-button {
    background-color: #694f44;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.2s ease;
}

.change-status-button:hover {
    background-color: #88571a;
}

.saved-book-info {
    flex: 1;
    min-width: 0;
}

.saved-book-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 12px;
    margin-bottom: 10px;
    background-color: #f3e9df;
    border-radius: 12px;
}


.saved-book-item h3 {
    margin: 0 0 5px;
    color: #694f44;
}

.saved-book-item p {
    margin: 0;
    color: #5c4b42;
}

/* LESEABZEICHEN */

.reader-badge {
    background-color: #ead7cb;
    border: 2px solid #c07854;
    border-radius: 18px;
    padding: 14px 30px;
    text-align: center;
    box-shadow: 0 4px 12px rgba(105, 79, 68, 0.15);
}
/* LESEABZEICHEN TEXT */
.reader-badge span {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #694f44;
    margin-bottom: 6px;
}

.reader-badge strong {
    display: block;
    font-size: 25px;
    font-weight: bold;
    color: #88571a;
}
</style>