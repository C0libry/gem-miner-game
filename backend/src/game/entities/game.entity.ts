import { Logger } from '@nestjs/common';
import {
  GameStatus,
  ICoordinates,
  IGameData,
  IGameState,
  IUser,
  MatrixType,
  OutputMatrixType,
} from '@/types';
import { CreateGameScheme } from '@/contracts';

export class Game {
  private _status: GameStatus = GameStatus.Waiting;
  private readonly matrix: MatrixType;
  private users: IUser[] = [];
  private step: number = 0;
  private winnerUsername?: string = null;
  public readonly isPublic: boolean;
  private readonly gemQuantity: number;

  constructor(
    height: number,
    width: number,
    gemQuantity: number,
    isPublic: boolean,
    matrix?: MatrixType,
  ) {
    CreateGameScheme.parse({
      height,
      width,
      gemQuantity,
      isPublic,
    });

    this.gemQuantity = gemQuantity;

    if (matrix) {
      this.matrix = matrix;
    } else {
      this.matrix = this.createField(height, width);
      this.addGems();
    }
    this.isPublic = isPublic;
  }

  public getState(): IGameState {
    return {
      status: this._status,
      matrix: this.matrix,
      users: this.users,
      step: this.step,
      winnerUsername: this.winnerUsername,
      isPublic: this.isPublic,
      gemQuantity: this.gemQuantity,
    };
  }

  public static fromState(state: IGameState): Game {
    const height = state.matrix.length;
    const width = state.matrix[0].length;

    const game = new Game(
      height,
      width,
      state.gemQuantity,
      state.isPublic,
      state.matrix,
    );

    game._status = state.status;
    game.users = state.users;
    game.step = state.step;
    game.winnerUsername = state.winnerUsername;

    return game;
  }

  get status() {
    return this._status;
  }

  getGameData(): IGameData {
    return {
      status: this.status,
      outputMatrix: this.getOutputMatrix(),
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

  nextStep(coordinates: ICoordinates) {
    if (this.status !== GameStatus.Started) return;

    this.openCell(coordinates);

    if (this.isEnd()) {
      this._status = GameStatus.Finished;
      this.winnerUsername = this.currentUser()?.username;
    }

    this.step++;

    return this.getGameData();
  }

  private openAll() {
    this.matrix.forEach((line, h) => {
      line.forEach((_, w) => {
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

  private getFreeCells() {
    const height = this.matrix.length;
    const width = this.matrix[0].length;
    const freeCells: Array<ICoordinates> = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.matrix[y][x].value !== '💎') {
          freeCells.push({ x, y });
        }
      }
    }

    return freeCells;
  }

  private addGems() {
    const freeCells = this.getFreeCells();

    if (freeCells.length === 0) {
      Logger.warn('No more space.');
      return;
    }

    const gemsToPlace = Math.min(this.gemQuantity, freeCells.length);

    for (let i = 0; i < gemsToPlace; i++) {
      const index = Math.floor(Math.random() * freeCells.length);
      const { x, y } = freeCells.splice(index, 1)[0];

      this.matrix[y][x].value = '💎';
      this.getAllNeighbors({ x, y }).forEach((coordinates) =>
        this.inc(coordinates),
      );
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
