import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { GameResultStatus, type IGameData } from '@/types';

export const useGameStore = defineStore('game', () => {
  const gameData = ref<IGameData | null>(null);
  const username = ref<string | null>(localStorage.getItem('username'));
  const gameResult = ref<GameResultStatus | null>(null);
  const showGameOverModal = ref(false);

  const setUsername = (name: string) => {
    username.value = name;
    localStorage.setItem('username', name);
  };

  const myUserData = computed(() => {
    if (!gameData.value || !username.value) return undefined;
    return gameData.value.users.find(user => user.username === username.value);
  });

  const otherUserData = computed(() => {
    if (!gameData.value || !username.value) return [];
    return gameData.value.users.filter(user => user.username !== username.value);
  });

  const isMyTurn = computed(() => {
    if (!gameData.value || !username.value) return false;
    return gameData.value.currentPlayerUsername === username.value;
  });

  const isWinner = computed(() => {
    if (!gameData.value || !username.value) return false;
    console.log(
      'isWinner',
      gameData.value.winnerUsername,
      username.value,
      gameData.value?.winnerUsername === username.value
    );
    return gameData.value.winnerUsername === username.value;
  });

  function endGame() {
    gameResult.value = isWinner.value ? GameResultStatus.Win : GameResultStatus.Loss;
    showGameOverModal.value = true;
  }

  function closeGameOverModal() {
    showGameOverModal.value = false;
  }

  function clear() {
    gameData.value = null;
    username.value = null;
    gameResult.value = null;
    showGameOverModal.value = false;
  }

  return {
    gameData,
    username,
    gameResult,
    showGameOverModal,
    setUsername,
    myUserData,
    otherUserData,
    isMyTurn,
    isWinner,
    endGame,
    closeGameOverModal,
    clear
  };
});
