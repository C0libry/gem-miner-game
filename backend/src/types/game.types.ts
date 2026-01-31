export type MatrixItem = { value: string | number; isOpen: boolean };
export type MatrixType = MatrixItem[][];
export type OutputMatrixType = (string | number | null)[][];

export interface ICoordinates {
  x: number;
  y: number;
}

export interface IUser {
  userId: string;
  socketId: string;
  username: string;
  score: number;
}

export enum GameResultStatus {
  Win = 'win',
  Loss = 'loss',
  Drow = 'drow',
}

export enum GameStatus {
  Waiting = 'waiting',
  Started = 'started',
  Finished = 'finished',
}

export interface IGameData {
  status: GameStatus;
  outputMatrix: OutputMatrixType;
  step: number;
  users: Omit<IUser, 'socketId' | 'userId'>[];
  winningScore: number;
  currentPlayerUsername: string;
  winnerUsername?: string;
}
