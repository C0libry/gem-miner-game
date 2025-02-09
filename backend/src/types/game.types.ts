export type MatrixItem = { value: string | number; isOpen: boolean };
export type MatrixType = MatrixItem[][];
export type OutputMatrixType = (string | number | null)[][];

export interface ICoordinates {
  x: number;
  y: number;
}

export interface IUser {
  id: string;
  score: number;
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
  users: IUser[];
  winnerId?: string;
}
