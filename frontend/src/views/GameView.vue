<script setup lang="ts">
import axios from 'axios';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { z } from 'zod';

import GameOverModal from '@/components/GameOverModal.vue';
import JoinForm from '@/components/JoinForm.vue';

import { useGameStore } from '@/stores/game';
import { useSocketStore } from '@/stores/socket';
import type { IGameData } from '@/types';

const wsClient = useSocketStore();
const gameStore = useGameStore();

const router = useRouter();
const route = useRoute();
const gameId = route.params.gameId as string;

const hasJoined = ref(false);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const absoluteUrl = ref<string>(window.location.href);

const backendUrl = import.meta.env.VITE_BACKEND_URL;

if (!z.string().uuid().safeParse(gameId).success) {
  router.push('/');
}

watch(
  () => wsClient.isConnected,
  isConnected => {
    if (isConnected) {
      attemptAutoJoin();
    }
  },
  { immediate: true }
);

function handleJoined(initialGameData: IGameData) {
  gameStore.gameData = initialGameData;
  hasJoined.value = true;
  isLoading.value = false;
}

async function attemptAutoJoin() {
  const storedUsername = gameStore.username;
  if (!storedUsername) {
    isLoading.value = false;
    return;
  }

  if (!wsClient.socket?.connected) {
    isLoading.value = false;
    return;
  }

  try {
    const response = await wsClient.socket?.emitWithAck('game:join', {
      gameId,
      username: storedUsername
    });
    if (response && !response.error) {
      handleJoined(response);
    } else {
      isLoading.value = false;
    }
  } catch {
    isLoading.value = false;
    errorMessage.value = 'Could not automatically rejoin the game.';
  }
}

onUnmounted(() => {
  gameStore.gameData = null;
});

function gameStep(item: number | string | null, x: number, y: number) {
  if (item !== null) return;
  if (!gameStore.isMyTurn) return;

  const dto = {
    gameId,
    coordinates: { x, y }
  };

  wsClient.socket?.emit('game:step', dto);
}

function goToHome() {
  gameStore.closeGameOverModal();
  router.push('/');
}

async function playAgain() {
  gameStore.closeGameOverModal();
  const response = await axios.get<string>(`${backendUrl}/game/find`);
  router.push(`/game/${response.data}`);
}

const copyText = async () => {
  await navigator.clipboard.writeText(absoluteUrl.value);
};
</script>

<template>
  <main class="flex flex-col items-center justify-center grow gap-5">
    <GameOverModal
      v-if="gameStore.showGameOverModal && gameStore.gameResult"
      :result="gameStore.gameResult"
      @close="goToHome"
      @play-again="playAgain"
    />

    <div v-if="isLoading">Loading...</div>

    <JoinForm
      v-else-if="!hasJoined"
      :game-id="gameId"
      @joined="handleJoined"
    />

    <div
      v-else-if="hasJoined && gameStore.gameData"
      class="flex flex-col items-center gap-y-10"
    >
      <div class="flex flex-col items-center gap-2 rounded-xl p-10 bg-black min-w-96">
        <div>{{ `Game is ${gameStore.gameData.status}` }}</div>
        <div>
          Players:
          <span
            v-for="(user, index) in gameStore.gameData.users"
            :key="user.username"
            :class="{
              'text-green-400': user.username === gameStore.gameData.currentPlayerUsername
            }"
          >
            {{ user.username }} ({{ user.score }}){{
              index < gameStore.gameData.users.length - 1 ? ', ' : ''
            }}
          </span>
        </div>
        <div v-if="gameStore.gameData.winnerUsername">
          {{ `Winner: ${gameStore.gameData.winnerUsername}` }}
        </div>
        <div>{{ `Winning score: ${gameStore.gameData.winningScore}` }}</div>
        <div>{{ `My score: ${gameStore.myUserData?.score ?? 0}` }}</div>
        <div class="flex items-center gap-2">
          <span>My Turn:</span>
          <span
            :class="gameStore.isMyTurn ? 'bg-green-500' : 'bg-red-500'"
            class="h-4 w-4 rounded-full"
          ></span>
        </div>
        <div
          class="mt-4 flex flex-col items-center"
          v-if="gameStore.gameData.users.length < 2 && gameStore.gameData.status === 'waiting'"
        >
          <p>Waiting for another player...</p>
          <button
            @click="copyText"
            class="bg-gray-800 rounded-md p-3 hover:text-teal-400 mt-2 cursor-pointer"
          >
            Copy Invite Link
          </button>
        </div>
      </div>

      <div v-if="gameStore.gameData.outputMatrix">
        <div class="flex flex-col gap-y-3">
          <div
            v-for="(row, y) in gameStore.gameData.outputMatrix"
            class="flex gap-3"
            :key="y"
          >
            <div
              v-for="(item, x) in row"
              :key="x"
            >
              <button
                :disabled="!gameStore.isMyTurn || item !== null"
                class="rounded-md bg-slate-700 hover:bg-slate-800 min-h-12 min-w-12 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                @click="gameStep(item, x, y)"
              >
                {{ item }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="errorMessage"
      class="text-red-400 text-xl"
    >
      {{ errorMessage }}
    </div>
  </main>
</template>
