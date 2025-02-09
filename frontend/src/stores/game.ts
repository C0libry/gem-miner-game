import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useSocketStore } from './socket';
import type { IGameData, IUser } from '@/types';

export const useGameStore = defineStore('counter', () => {
  const gameData = ref<IGameData | null>(null);

  function myUserData(): IUser | undefined {
    const wsClient = useSocketStore();
    return gameData.value?.users.find((user: IUser) => user.id === wsClient.socket?.id);
  }

  function otherUserData() {
    const wsClient = useSocketStore();
    return gameData.value?.users.filter((user: IUser) => user.id !== wsClient.socket?.id);
  }

  function clear() {
    gameData.value = null;
  }

  return { gameData, myUserData, otherUserData, clear };
});
