<script setup lang="ts">
import { ref } from 'vue';

import { useGameStore } from '@/stores/game';
import { useSocketStore } from '@/stores/socket';

const props = defineProps<{
  gameId: string;
}>();

const emit = defineEmits(['joined']);

const wsClient = useSocketStore();
const gameStore = useGameStore();

const username = ref(gameStore.username ?? '');
const errorMessage = ref<string | undefined>(undefined);
const isLoading = ref(false);

async function joinGame() {
  if (!username.value) {
    errorMessage.value = 'Please enter a username.';
    return;
  }
  if (!wsClient.socket?.connected) {
    errorMessage.value = 'Connecting to server... please wait and try again.';
    wsClient.connect(); // Attempt to connect again
    return;
  }

  isLoading.value = true;
  errorMessage.value = undefined;

  gameStore.setUsername(username.value);

  try {
    const response = await wsClient.socket.emitWithAck('game:join', {
      gameId: props.gameId,
      username: username.value
    });

    if (response.error) {
      errorMessage.value = response.error;
    } else {
      emit('joined', response);
    }
  } catch (e) {
    errorMessage.value = 'Failed to connect to the server.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-5">
    <h1 class="text-3xl">Join Game</h1>
    <form
      class="bg-black flex flex-col gap-5 rounded-xl p-10 min-w-96"
      @submit.prevent="joinGame"
    >
      <div class="flex flex-col gap-2">
        <label
          for="username"
          class="text-lg"
          >Enter your username</label
        >
        <input
          class="rounded-md bg-slate-800 hover:bg-slate-700 text-white py-2 px-4"
          name="username"
          v-model="username"
          placeholder="Player123"
          type="text"
          required
        />
      </div>
      <button
        type="submit"
        class="rounded-md bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 disabled:opacity-50"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Joining...' : 'Join' }}
      </button>
    </form>
    <div
      v-if="errorMessage"
      class="text-red-400 mt-4 text-xl"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>
