import { Inject, Injectable } from '@nestjs/common';
import { CreateGameDto } from './dto/create-game.dto';
import { randomUUID } from 'crypto';
import { GameStatus, IGameState } from '@/types';
import { DRIZZLE_PROVIDER_TOKEN } from '@/db/drizzle.provider';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';
import { and, eq, lt } from 'drizzle-orm';
import { Game } from './entities/game.entity';

@Injectable()
export class GamesManager {
  constructor(
    @Inject(DRIZZLE_PROVIDER_TOKEN)
    private db: BetterSQLite3Database<typeof schema>,
  ) {}

  async createNewGame(dto: CreateGameDto): Promise<string> {
    const gameId = randomUUID();
    const game = new Game(dto.height, dto.width, dto.gemQuantity, dto.isPublic);
    const gameState = game.getState();

    await this.db.insert(schema.games).values({
      id: gameId,
      status: game.status,
      isPublic: game.isPublic,
      playerCount: gameState.users.length,
      gameState,
    });

    return gameId;
  }

  async findWaitingGame(): Promise<string | undefined> {
    const result = await this.db
      .select({ id: schema.games.id })
      .from(schema.games)
      .where(
        and(
          eq(schema.games.isPublic, true),
          eq(schema.games.status, GameStatus.Waiting),
          lt(schema.games.playerCount, 2),
        ),
      )
      .get();

    return result?.id;
  }

  async getGame(gameId: string): Promise<Game | undefined> {
    const result = await this.db
      .select()
      .from(schema.games)
      .where(eq(schema.games.id, gameId))
      .get();

    if (!result) return undefined;

    return Game.fromState(result.gameState as IGameState);
  }

  async saveGame(gameId: string, game: Game): Promise<void> {
    const gameState = game.getState();
    await this.db
      .update(schema.games)
      .set({
        status: game.status,
        playerCount: gameState.users.length,
        gameState,
      })
      .where(eq(schema.games.id, gameId));
  }

  async endGame(gameId: string) {
    await this.db.delete(schema.games).where(eq(schema.games.id, gameId));
  }
}
