<script setup lang="ts">
import { GameResultStatus } from '@/types';

const props = defineProps<{
  result: GameResultStatus;
}>();

const emit = defineEmits(['close', 'play-again']);

const title = props.result === GameResultStatus.Win ? 'You Won!' : 'You Lost!';
const message =
  props.result === GameResultStatus.Win
    ? 'Congratulations! You beat your opponent.'
    : 'Better luck next time!';

function goHome() {
  // For now, both buttons will just close the modal and the view will handle navigation
  emit('close');
}

function playAgain() {
  emit('play-again');
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
    <div class="bg-slate-800 rounded-xl p-8 shadow-lg text-center flex flex-col gap-6">
      <h2
        class="text-4xl font-bold"
        :class="{
          'text-green-400': result === GameResultStatus.Win,
          'text-red-400': result === GameResultStatus.Loss
        }"
      >
        {{ title }}
      </h2>
      <p class="text-lg text-slate-300">{{ message }}</p>
      <div class="flex justify-center gap-4 mt-4">
        <button
          @click="playAgain"
          class="px-6 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-semibold"
        >
          Play Again
        </button>
        <button
          @click="goHome"
          class="px-6 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold"
        >
          Go Home
        </button>
      </div>
    </div>
  </div>
</template>
