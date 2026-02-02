import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { GamesManager } from './games-manager';
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
    Logger.debug(`Client connected: ${client.id}, userId: ${userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketIdToUserId.get(client.id);
    Logger.debug(`Client disconnected: ${client.id}, userId: ${userId}`);
    this.socketIdToUserId.delete(client.id);
  }

  @SubscribeMessage('game:join')
  async handleJoinGame(
    client: Socket,
    dto: { gameId: string; username: string },
  ) {
    const userId = this.socketIdToUserId.get(client.id);
    if (!userId) return { error: 'Authentication error.' };

    const gameToJoin = await this.gamesManager.getGame(dto.gameId);
    if (!gameToJoin) return { error: 'Game not found.' };

    // TODO: Продумать логику что делать, если этот пользователь находится в другой игре

    const isPlayerInGame = gameToJoin.findUserByUserId(userId);

    if (isPlayerInGame) {
      gameToJoin.reconnectUser(userId, client.id);
      await this.gamesManager.saveGame(dto.gameId, gameToJoin);
      client.join(dto.gameId);
      Logger.debug(`User ${userId} reconnected to game ${dto.gameId}`);
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
    Logger.debug(`User ${userId} (${dto.username}) joined game ${dto.gameId}`);

    if (gameToJoin.getGameData().users.length === 2) {
      const gameData = gameToJoin.start();
      Logger.debug(`Game started id: ${dto.gameId}`);
      await this.gamesManager.saveGame(dto.gameId, gameToJoin);
      this.server.to(dto.gameId).emit('game:start', gameData);
    } else {
      await this.gamesManager.saveGame(dto.gameId, gameToJoin);
    }
    return gameToJoin.getGameData();
  }

  @SubscribeMessage('game:step')
  async handleNextStep(
    client: Socket,
    dto: { gameId: string; coordinates: ICoordinates },
  ) {
    const userId = this.socketIdToUserId.get(client.id);
    if (!userId) return { error: 'Authentication error.' };

    const game = await this.gamesManager.getGame(dto.gameId);
    if (!game) return { error: 'Game not found.' };

    if (game.status !== GameStatus.Started) {
      return { error: 'The game has not started.' };
    }

    if (userId !== game.currentPlayerPersistentId()) {
      return { error: 'Not your turn.' };
    }

    game.nextStep(dto.coordinates);

    await this.gamesManager.saveGame(dto.gameId, game);

    const gameData = game.getGameData();
    this.server.to(dto.gameId).emit('game:update', gameData);

    if (gameData.status === GameStatus.Finished) {
      Logger.debug(`Game finished id: ${dto.gameId}`);

      this.server
        .to(dto.gameId)
        .emit('game:finish', { gameId: dto.gameId, gameData });

      await this.gamesManager.endGame(dto.gameId);
    }
    return gameData;
  }
}
