// Umbenannt: monthlyBooks zu topBooks, loadMonthlyBooks zu loadTopBooks
// und /api/monthly-trending zu /api/community-top.
// Die Funktionalität bleibt unverändert.
<script setup>
import { onMounted, ref } from "vue";

const topBooks = ref([]);
const loading = ref(false);
const error = ref("");

async function loadTopBooks() {
    loading.value = true;
    error.value = "";

    try {
        const response = await fetch("/api/community-top");

        if (!response.ok) {
            throw new Error(
                "Die Bücher konnten nicht geladen werden."
            );
        }

        topBooks.value = await response.json();

    } catch (err) {
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}

onMounted(loadTopBooks);
</script>

<template>
    <section id="community-top" class="celebrity-section">

        <div class="section-header">
            <p class="label">
                COMMUNITY FAVORITES
            </p>

            <h2>Top 3 Bücher unserer Community</h2>

            <p class="section-text">
                Die beliebtesten Bücher, bewertet von unseren Nutzern.
            </p>
        </div>

        <p v-if="loading">
            Bücher werden geladen...
        </p>

        <p v-else-if="error" class="error-message">
            {{ error }}
        </p>

        <p v-else-if="topBooks.length === 0">
            Noch keine Bewertungen vorhanden.
        </p>

        <div v-else class="celebrity-grid">

            <article v-for="(book, index) in topBooks" :key="book.book_id" class="celebrity-card">
                <img class="celebrity-image" :src="`/images/${book.book_img}`" :alt="book.name" />

                <div class="celebrity-book-info">

                    <p class="celebrity-name">
                        Platz {{ index + 1 }}
                    </p>

                    <RouterLink :to="{
                        name: 'book-detail',
                        params: {
                            id: book.book_id
                        }
                    }" class="celebrity-book-link">
                        {{ book.name }}
                    </RouterLink>

                    <p class="book-author">
                        von {{ book.author }}
                    </p>

                    <p class="book-rating">
                        {{ book.average_rating }} / 5
                        ({{ book.review_count }} Bewertungen)
                    </p>

                </div>
            </article>

        </div>
    </section>
</template>
