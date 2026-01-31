<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';

import { useGameStore } from './stores/game';
import { useSocketStore } from './stores/socket';

const wsClient = useSocketStore();
const gameStore = useGameStore();

onMounted(async () => {
  wsClient.connect();
});
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-start">
    <header class="w-full relative z-100">
      <nav class="flex items-center justify-center gap-20 p-8 bg-black">
        <RouterLink
          class="hover:text-primary-400"
          to="/"
          >Home
        </RouterLink>
      </nav>
      <div
        v-if="gameStore.username"
        class="absolute top-1/2 right-8 -translate-y-1/2 text-white bg-gray-800 px-4 py-2 rounded-lg"
      >
        <span>User: </span>
        <span class="font-bold text-green-600">{{ gameStore.username }}</span>
      </div>
    </header>

    <RouterView />
  </div>
</template>
