import { defineStore } from 'pinia';
import { Socket, io } from 'socket.io-client';
import { onUnmounted, ref } from 'vue';

import { useGameStore } from './game';
import type { IGameData } from '@/types';

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<Socket | null>(null);

  function connect() {
    if (socket.value) return;

    socket.value = io('http://localhost:4005');

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

    socket.value.on('game:update', (data: IGameData) => {
      console.warn('game:update:', data);
      const gameStore = useGameStore();
      gameStore.gameData = data;
    });

    socket.value.on('game:finish', (data: { gameid: string; gameData: IGameData }) => {
      console.warn('game:finish:', { winnerId: data.gameData.winnerId, id: socket.value?.id });
      const gameStore = useGameStore();
      gameStore.gameData = data.gameData;
      if (data.gameData.winnerId === socket.value?.id) {
        alert(`You have won.`);
      } else {
        alert(`You have lost.`);
      }
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
