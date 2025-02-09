<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';

import { useSocketStore } from './stores/socket';

const wsClient = useSocketStore();

onMounted(async () => {
  wsClient.connect();
});
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-start">
    <header class="w-full">
      <nav class="flex items-center justify-center gap-20 p-8 bg-black">
        <RouterLink
          class="hover:text-primary-400"
          to="/"
          >Home
        </RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
