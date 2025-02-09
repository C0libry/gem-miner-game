import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { GamesManager } from './entities/game.entity';
import { GameStatus, ICoordinates } from '@/types';

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private gamesManager: GamesManager) {}

  handleConnection(client: Socket) {
    Logger.warn(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    Logger.warn(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('game:join')
  // TODO: Вынести типы параметров методов.
  handleJoinGame(client: Socket, dto: { gameId: string }) {
    const game = this.gamesManager.games.get(dto.gameId);

    // TODO: Написать нормальный обработчик ошибок.
    if (!game) {
      Logger.error('The game not found.');
      return { error: 'The game not found.' };
    }
    if (game.status !== GameStatus.Waiting) {
      Logger.error('The game has already started.');
      return { error: 'The game has already started.' };
    }

    client.join(dto.gameId);
    this.server.to(dto.gameId).emit('game:joined', { playerId: dto.gameId });

    const users = this.server.sockets.adapter.rooms.get(dto.gameId);

    if (users.size === 2) {
      users.forEach((item) => {
        game.addUser({ id: item, score: 0 });
      });
      const gameData = game.start();
      Logger.log(`Game started id: ${dto.gameId}`);
      this.server.to(dto.gameId).emit('game:start', gameData);
    }
    return true;
  }

  @SubscribeMessage('game:step')
  handleNextStep(
    client: Socket,
    dto: { gameId: string; coordinates: ICoordinates },
  ) {
    const game = this.gamesManager.games.get(dto.gameId);

    if (!game) {
      Logger.error('The game not found.');
      return { error: 'The game not found.' };
    }
    if (game.status !== GameStatus.Started) {
      Logger.error('The game not started.');
      return { error: 'The game not started.' };
    }

    if (client.id !== game.currentUserId()) return;

    const gameData = this.gamesManager.nextStep(dto.gameId, dto.coordinates);

    this.server.to(dto.gameId).emit('game:update', gameData);

    if (gameData.status === GameStatus.Finished) {
      Logger.log(`Game finished id: ${dto.gameId}`);

      this.server
        .to(dto.gameId)
        .emit('game:finish', { gameId: dto.gameId, gameData });
    }

    return gameData;
  }
}
