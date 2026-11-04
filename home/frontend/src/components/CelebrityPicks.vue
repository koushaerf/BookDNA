<script setup>
import { onMounted, ref, computed } from "vue";

const monthlyBooks = ref([]);
const loading = ref(false);
const error = ref("");

const currentMonth = computed(() => {
    if (monthlyBooks.value.length === 0) {
        return "";
    }

    return monthlyBooks.value[0].month;
});

const currentBooks = computed(() => {
    return monthlyBooks.value.filter(
        book => book.month === currentMonth.value
    );
});

async function loadMonthlyBooks() {
    loading.value = true;
    error.value = "";

    try {
        const response = await fetch("/api/monthly-trending");

        if (!response.ok) {
            throw new Error(
                "Die Bücher des Monats konnten nicht geladen werden."
            );
        }

        monthlyBooks.value = await response.json();
    } catch (err) {
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}

onMounted(loadMonthlyBooks);
</script>
<template>
    <section id="monthly-trending" class="celebrity-section">
        <div class="section-header">
            <p class="label">
                BÜCHER IM TREND
            </p>

            <h2>Top 3 Bücher des Monats</h2>

            <p class="section-text">
                Entdecke die aktuell beliebtesten Bücher auf Open Library.
            </p>
        </div>

        <p v-if="loading">
            Bücher werden geladen...
        </p>

        <p v-else-if="error" class="error-message">
            {{ error }}
        </p>

        <p v-else-if="currentBooks.length === 0">
            Keine Bücher gefunden.
        </p>

        <div v-else class="celebrity-grid">
            <article
                v-for="book in currentBooks"
                :key="book.book_id"
                class="celebrity-card"
            >
                <img
                    class="celebrity-image"
                    :src="`/images/${book.book_img}`"
                    :alt="book.name"
                />

                <div class="celebrity-book-info">
                    <p class="celebrity-name">
                        Platz {{ book.rank }}
                    </p>

                    <RouterLink
                        :to="{
                            name: 'book-detail',
                            params: {
                                id: book.book_id
                            }
                        }"
                        class="celebrity-book-link"
                    >
                        {{ book.name }}
                    </RouterLink>

                    <p class="book-author">
                        von {{ book.author }}
                    </p>
                    <p v-if="book.original_category" class="book-category">
                        Kategorie: {{ book.original_category }}
                    </p>
                </div>
            </article>
        </div>
    </section>
</template>