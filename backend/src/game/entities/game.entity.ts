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
  private readonly users: IUser[] = [];
  private step: number = 0;
  private winnerId?: string = null;

  constructor(
    height: number,
    width: number,
    private readonly gemQuantity: number,
  ) {
    if (gemQuantity % 2 === 0)
      throw new Error('Gem quantity number must be odd.');

    if (gemQuantity > height * width)
      throw new Error('Gems quantity is too match.');

    this.matrix = this.createField(height, width);
    this.addGems();
  }

  get status() {
    return this._status;
  }

  getGameData(): IGameData {
    return {
      status: this.status,
      outputMatrix: this.getOutputMatrix(),
      users: this.users,
      step: this.step,
      winningScore: this.winningScore(),
      currentPlayerId: this.currentUserId(),
      winnerId: this.winnerId,
    };
  }

  addUser(user: IUser) {
    this.users.push(user);
  }

  start() {
    if (this.status !== GameStatus.Waiting) return;
    this._status = GameStatus.Started;
    return this.getGameData();
  }

  nextStep(coordinates) {
    if (this._status !== GameStatus.Started) return;

    this.openCell(coordinates);

    if (this.isEnd()) {
      this._status = GameStatus.Finished;
      this.winnerId = this.currentUser().id;
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
    return this.currentUser().score >= this.winningScore();
  }

  currentUserId(): string {
    return this.currentUser().id;
  }

  currentUserScore(): number {
    return this.currentUser().score;
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
    return Math.ceil((this.gemQuantity + 1) / this.users.length);
  }

  private currentUser(): IUser {
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

    this.games.set(gameId, new Game(dto.height, dto.width, dto.gemQuantity));

    return gameId;
  }

  nextStep(gameId: string, coordinates: ICoordinates) {
    const game = this.games.get(gameId);

    const gameData = game.nextStep(coordinates);

    return gameData;
  }

  endGame(gameId: string, game: Game) {
    game.openAll();
    this.games.delete(gameId);
  }
}
