import { Injectable } from '@nestjs/common';
import { CreateGameDto } from '../dto/create-game.dto';
import { randomUUID } from 'crypto';
import {
  GameStatus,
  ICoordinates,
  IGameData,
  IUser,
  MatrixType,
  OutputMatrixType,
} from '@/types';

class Game {
  private _status: GameStatus = GameStatus.Waiting;
  private readonly matrix: MatrixType;
  private users: IUser[] = [];
  private step: number = 0;
  private winnerUsername?: string = null;
  public readonly isPublic: boolean;

  constructor(
    height: number,
    width: number,
    private readonly gemQuantity: number,
    isPublic: boolean,
  ) {
    if (gemQuantity % 2 === 0)
      throw new Error('Gem quantity number must be odd.');

    if (gemQuantity > height * width)
      throw new Error('Gems quantity is too match.');

    this.matrix = this.createField(height, width);
    this.addGems();
    this.isPublic = isPublic;
  }

  get status() {
    return this._status;
  }

  getGameData(): IGameData {
    return {
      status: this.status,
      outputMatrix: this.getOutputMatrix(),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      users: this.users.map(({ userId, socketId, ...user }) => user),
      step: this.step,
      winningScore: this.winningScore(),
      currentPlayerUsername: this.currentPlayerUsername(),
      winnerUsername: this.winnerUsername,
    };
  }

  addUser(user: Omit<IUser, 'score'>) {
    this.users.push({ ...user, score: 0 });
  }

  findUserByUserId(userId: string) {
    return this.users.find((user) => user.userId === userId);
  }

  removeUser(userId: string) {
    this.users = this.users.filter((user) => user.userId !== userId);
  }

  hasUsername(username: string): boolean {
    return this.users.some((user) => user.username === username);
  }

  reconnectUser(userId: string, newSocketId: string) {
    const user = this.findUserByUserId(userId);
    if (user) {
      user.socketId = newSocketId;
    }
  }

  start() {
    if (this.status !== GameStatus.Waiting) return;
    this._status = GameStatus.Started;
    return this.getGameData();
  }

  nextStep(coordinates) {
    if (this.status !== GameStatus.Started) return;

    this.openCell(coordinates);

    if (this.isEnd()) {
      this._status = GameStatus.Finished;
      this.winnerUsername = this.currentUser()?.username;
    }

    this.step++;

    return this.getGameData();
  }

  openAll() {
    this.matrix.map((line, h) => {
      line.map((_, w) => {
        this.matrix[h][w].isOpen = true;
      });
    });
  }

  private isEnd() {
    const user = this.currentUser();
    if (!user) return false;
    return user.score >= this.winningScore();
  }

  currentPlayerPersistentId(): string | null {
    return this.currentUser()?.userId ?? null;
  }

  currentPlayerUsername(): string | null {
    return this.currentUser()?.username ?? null;
  }

  currentUserScore(): number {
    return this.currentUser()?.score ?? 0;
  }

  private getOutputMatrix(): OutputMatrixType {
    return this.matrix.map((line) => {
      return line.map((item) => {
        return item.isOpen === true ? item.value : null;
      });
    });
  }

  private createField(height: number, width: number): MatrixType {
    return Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ value: 0, isOpen: false })),
    );
  }

  private addGems() {
    let currentGemQuantity = this.gemQuantity;

    const height = this.matrix.length;
    const width = this.matrix[0].length;

    while (currentGemQuantity) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);

      if (this.matrix[y][x].value !== '💎') {
        this.matrix[y][x].value = '💎';

        this.getAllNeighbors({ x, y }).forEach((coordinates) =>
          this.inc(coordinates),
        );

        currentGemQuantity--;
      }
    }
  }

  winningScore() {
    if (this.users.length === 0) return 0;
    return Math.ceil((this.gemQuantity + 1) / this.users.length);
  }

  currentUser(): IUser | undefined {
    if (this.users.length === 0) return undefined;
    const currentUserIndex = this.step % this.users.length;
    return this.users[currentUserIndex];
  }

  private openCell(coordinates: ICoordinates) {
    const { x, y } = coordinates;
    if (this.matrix[y][x].isOpen === true) return;

    if (this.matrix[y][x].value === '💎') {
      this.matrix[y][x].isOpen = true;
      this.currentUser().score += 1;
      return;
    }

    const stack: ICoordinates[] = [];
    stack.push(coordinates);

    while (stack.length) {
      const { x, y } = stack.pop();

      this.matrix[y][x].isOpen = true;

      if (this.matrix[y][x].value === 0) {
        this.getCrossNeighbors({ x, y }).forEach(
          (coordinates: ICoordinates) => {
            const { x, y } = coordinates;
            const height = this.matrix.length;
            const width = this.matrix[0].length;

            if (y >= 0 && y < height && x >= 0 && x < width) {
              if (this.matrix[y][x].isOpen) return;
              stack.push(coordinates);
            }
          },
        );
      }
    }
  }

  private inc(coordinates: ICoordinates) {
    const { x, y } = coordinates;
    const height = this.matrix.length;
    const width = this.matrix[0].length;

    if (y >= 0 && y < height && x >= 0 && x < width) {
      if (typeof this.matrix[y][x].value === 'number') {
        this.matrix[y][x].value++;
      }
    }
  }

  private getCrossNeighbors(coordinates: ICoordinates): ICoordinates[] {
    const { x, y } = coordinates;
    const directions = [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ];

    return directions.map(([dy, dx]) => ({ x: x + dx, y: y + dy }));
  }

  private getAllNeighbors(coordinates: ICoordinates): ICoordinates[] {
    const { x, y } = coordinates;
    const directions = [
      [-1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, -1],
    ];

    return directions.map(([dy, dx]) => ({ x: x + dx, y: y + dy }));
  }
}

@Injectable()
export class GamesManager {
  games: Map<string, Game> = new Map();

  createNewGame(dto: CreateGameDto) {
    const gameId = randomUUID();

    this.games.set(
      gameId,
      new Game(dto.height, dto.width, dto.gemQuantity, dto.isPublic),
    );

    return gameId;
  }

  findWaitingGame(): string | undefined {
    for (const [gameId, game] of this.games.entries()) {
      if (
        game.isPublic &&
        game.status === GameStatus.Waiting &&
        game.getGameData().users.length < 2
      ) {
        return gameId;
      }
    }
    return undefined;
  }

  findGameByUserId(userId: string): { gameId: string; game: Game } | undefined {
    for (const [gameId, game] of this.games.entries()) {
      if (game.findUserByUserId(userId)) {
        return { gameId, game };
      }
    }
    return undefined;
  }

  reconnectUser(
    userId: string,
    newSocketId: string,
  ): { gameId: string; gameData: IGameData } | undefined {
    const findResult = this.findGameByUserId(userId);
    if (findResult) {
      const { gameId, game } = findResult;
      game.reconnectUser(userId, newSocketId);
      return { gameId, gameData: game.getGameData() };
    }
    return undefined;
  }

  nextStep(gameId: string, coordinates: ICoordinates) {
    const game = this.games.get(gameId);
    if (!game) return null; // Or throw an error

    const gameData = game.nextStep(coordinates);

    return gameData;
  }

  endGame(gameId: string) {
    const game = this.games.get(gameId);
    if (game) {
      game.openAll();
      // maybe do something else before deleting
      this.games.delete(gameId);
    }
  }
}
