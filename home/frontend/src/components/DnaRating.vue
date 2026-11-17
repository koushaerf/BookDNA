<script setup>
const props = defineProps({
    modelValue: {
        type: Number,
        default: 0
    },
    readonly: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(["update:modelValue"]);

function selectRating(value) {
    if (!props.readonly) {
        emit("update:modelValue", value);
    }
}
</script>

<template>
    <div class="book-rating">
        <button v-for="n in 5" :key="n" type="button" :class="{ active: n <= modelValue }" :disabled="readonly"
            @click="selectRating(n)">
            <svg viewBox="0 0 24 24" width="27" height="27">
                <path d="M12 7v14" />
                <path d="M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13" />
                <path d="M3 18a2 2 0 0 0 2 2h3a4 4 0 0 1 4 2 4 4 0 0 1 4-2h3a2 2 0 0 0 2-2" />
            </svg>
        </button>
    </div>
</template>

<style scoped>
.book-rating {
    display: flex;
    gap: 6px;
}

.book-rating button {
    border: none;
    background: none;
    padding: 0;
    color: #d8c7b8;
    cursor: pointer;
}

.book-rating button.active {
    color: #705448;
}

.book-rating svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.book-rating button:disabled {
    cursor: default;
}
</style>
