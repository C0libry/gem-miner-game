<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { z } from 'zod';

import { useGameStore } from '@/stores/game';
import { useSocketStore } from '@/stores/socket';
import type { IUser } from '@/types';

const wsClient = useSocketStore();
const gaemStore = useGameStore();

const router = useRouter();
const route = useRoute();
const gameId = route.params.gameId;

const errorMessage = ref<string | undefined>(undefined);

const absoluteUrl = ref<string>(window.location.href);
const inputRef = ref(null);

gaemStore.clear();

if (!z.string().uuid().safeParse(gameId).success) {
  router.push('/');
}

joinGame();

async function joinGame() {
  const response = await wsClient.socket?.emitWithAck('game:join', { gameId });
  errorMessage.value = response.error;
}

function gameStep(item: number | string | null, x: number, y: number) {
  if (item !== null) return;

  const dto = {
    gameId,
    coordinates: { x, y }
  };

  wsClient.socket?.emit('game:step', dto);
}

const copyText = async () => {
  await navigator.clipboard.writeText(absoluteUrl.value);
};
</script>

<template>
  <main class="flex flex-col items-center justify-center flex-grow gap-5">
    <div
      class="flex flex-col items-center gap-10 text-2xl"
      v-if="errorMessage"
    >
      <div class="text-red-400">{{ errorMessage }}</div>
      <RouterLink
        class="hover:text-primary-400"
        to="/"
        >Back to home page
      </RouterLink>
    </div>
    <div
      class="flex flex-col items-center gap-10 text-2xl"
      v-else-if="!gaemStore.gameData"
    >
      <div>Waiting for the players</div>
      <button
        @click="copyText"
        class="hover:text-teal-400"
      >
        {{ absoluteUrl }}
      </button>
      <input
        ref="inputRef"
        v-model="absoluteUrl"
        type="text"
        class="hidden"
      />
    </div>

    <!-- TODO: Дополнить игровой интерфейс. Добавить индикатор для отображения очереди хода. -->
    <div
      v-if="gaemStore.gameData"
      class="flex flex-col items-center gap-5 rounded-xl p-10 bg-black min-w-96"
    >
      <div>{{ `Game is ${gaemStore.gameData.status}` }}</div>
      <div>{{ `Current game step: ${gaemStore.gameData.step}` }}</div>
      <div v-if="gaemStore.gameData.winnerId">{{ `winnerId: ${gaemStore.gameData.winnerId}` }}</div>
      <div>{{ `My score: ${gaemStore.myUserData()?.score}` }}</div>
      <div>{{ `Am I a winner: ${gaemStore.gameData.winnerId === wsClient.socket?.id}` }}</div>
    </div>

    <div v-if="gaemStore.gameData?.outputMatrix">
      <div class="flex flex-col gap-y-3">
        <div
          v-for="(row, y) in gaemStore.gameData.outputMatrix"
          class="flex gap-3"
          :key="y"
        >
          <div
            v-for="(item, x) in row"
            :key="x"
          >
            <button
              class="rounded-md bg-slate-700 hover:bg-slate-800 min-h-12 min-w-12 text-white"
              @click="gameStep(item, x, y)"
            >
              {{ item }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
