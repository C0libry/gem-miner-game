import { defineStore } from 'pinia';
import { Socket, io } from 'socket.io-client';
import { onUnmounted, ref } from 'vue';

import { useGameStore } from './game';
import type { IGameData } from '@/types';

const getCredentials = () => {
  let userId = localStorage.getItem('userId');
  let userSecret = localStorage.getItem('userSecret');

  if (!userId || !userSecret) {
    userId = crypto.randomUUID();
    userSecret = crypto.randomUUID();
    localStorage.setItem('userId', userId);
    localStorage.setItem('userSecret', userSecret);
  }
  return { userId, userSecret };
};

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<Socket | null>(null);

  function connect() {
    if (socket.value?.connected) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const { userId, userSecret } = getCredentials();

    socket.value = io(backendUrl, {
      auth: {
        userId,
        userSecret
      }
    });

    socket.value.on('connect', () => {
      console.log('🔥 Socket.IO connected');
    });

    socket.value.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    socket.value.on('connect_error', error => {
      console.error('🚨 Socket.IO error:', error);
    });

    socket.value.on('game:start', (data: IGameData) => {
      console.warn('game:start:', data);
      const gameStore = useGameStore();
      gameStore.gameData = data;
    });

    socket.value.on('game:reconnect', (data: IGameData) => {
      console.warn('game:reconnect:', data);
      const gameStore = useGameStore();
      gameStore.gameData = data;
    });

    socket.value.on('game:update', (data: IGameData) => {
      console.warn('game:update:', data);
      const gameStore = useGameStore();
      gameStore.gameData = data;
    });

    socket.value.on('game:finish', (data: { gameid: string; gameData: IGameData }) => {
      console.warn('game:finish:', data);
      const gameStore = useGameStore();
      gameStore.gameData = data.gameData;
      gameStore.endGame();
    });
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return { socket, connect, disconnect };
});
