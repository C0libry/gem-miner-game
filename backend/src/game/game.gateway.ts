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
import { AuthService } from '@/auth/auth.service';

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private socketIdToUserId: Map<string, string> = new Map();

  constructor(
    private gamesManager: GamesManager,
    private authService: AuthService,
  ) {}

  async handleConnection(client: Socket) {
    const { userId, userSecret } = client.handshake.auth;

    if (!(await this.authService.authenticate(userId, userSecret))) {
      Logger.error(
        `Authentication failed for userId: ${userId}. Disconnecting client: ${client.id}`,
      );
      client.emit('auth:failed');
      client.disconnect(true);
      return;
    }

    this.socketIdToUserId.set(client.id, userId);
    Logger.warn(`Client connected: ${client.id}, userId: ${userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketIdToUserId.get(client.id);
    Logger.warn(`Client disconnected: ${client.id}, userId: ${userId}`);
    this.socketIdToUserId.delete(client.id);
  }

  @SubscribeMessage('game:join')
  // TODO: Вынести типы параметров методов.
  handleJoinGame(client: Socket, dto: { gameId: string; username: string }) {
    const userId = this.socketIdToUserId.get(client.id);
    if (!userId) {
      return { error: 'Authentication error.' };
    }

    const gameToJoin = this.gamesManager.games.get(dto.gameId);
    if (!gameToJoin) {
      return { error: 'The game not found.' };
    }

    this.removeUser(userId, dto);

    const isPlayerInGame = gameToJoin.findUserByUserId(userId);

    // If player is already in this game, it's a reconnect.
    if (isPlayerInGame) {
      gameToJoin.reconnectUser(userId, client.id);
      client.join(dto.gameId);
      Logger.log(`User ${userId} reconnected to game ${dto.gameId}`);
      return gameToJoin.getGameData();
    }

    // Logic for a new player joining.
    if (gameToJoin.status !== GameStatus.Waiting) {
      return { error: 'The game has already started.' };
    }
    if (gameToJoin.hasUsername(dto.username)) {
      return { error: 'This username is already taken in this game.' };
    }
    if (gameToJoin.getGameData().users.length >= 2) {
      return { error: 'This game is full.' };
    }

    client.join(dto.gameId);
    gameToJoin.addUser({ userId, socketId: client.id, username: dto.username });
    this.server.to(dto.gameId).emit('game:joined', { username: dto.username });
    Logger.log(`User ${userId} (${dto.username}) joined game ${dto.gameId}`);

    if (gameToJoin.getGameData().users.length === 2) {
      const gameData = gameToJoin.start();
      Logger.log(`Game started id: ${dto.gameId}`);
      this.server.to(dto.gameId).emit('game:start', gameData);
    }
    return gameToJoin.getGameData();
  }

  @SubscribeMessage('game:step')
  handleNextStep(
    client: Socket,
    dto: { gameId: string; coordinates: ICoordinates },
  ) {
    const userId = this.socketIdToUserId.get(client.id);
    if (!userId) {
      return { error: 'Authentication error.' };
    }

    const game = this.gamesManager.games.get(dto.gameId);

    if (!game) {
      return { error: 'The game not found.' };
    }

    if (game.status !== GameStatus.Started) {
      return { error: 'The game not started.' };
    }

    if (userId !== game.currentPlayerPersistentId()) {
      return { error: 'Not your turn.' };
    }

    const gameData = this.gamesManager.nextStep(dto.gameId, dto.coordinates);
    if (!gameData) {
      return { error: 'Invalid step.' };
    }

    this.server.to(dto.gameId).emit('game:update', gameData);

    if (gameData.status === GameStatus.Finished) {
      Logger.log(`Game finished id: ${dto.gameId}`);

      this.server
        .to(dto.gameId)
        .emit('game:finish', { gameId: dto.gameId, gameData });

      this.gamesManager.endGame(dto.gameId);
    }

    return gameData;
  }

  removeUser(userId: string, dto: { gameId: string; username: string }) {
    const oldGameData = this.gamesManager.findGameByUserId(userId);
    if (oldGameData && oldGameData.gameId !== dto.gameId) {
      Logger.warn(
        `User ${userId} is leaving old game ${oldGameData.gameId} to join ${dto.gameId}`,
      );
      oldGameData.game.removeUser(userId);

      this.server.to(oldGameData.gameId).emit('game:opponent_left', { userId });
    }
  }
}
