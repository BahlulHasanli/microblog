export type Direction = "H" | "V";

export interface WordPosition {
  id: string;
  word: string;
  x: number;
  y: number;
  direction: Direction;
  clue: string;
}

export interface Level {
  id: number;
  words: WordPosition[];
}

export interface CellState {
  letter: string;
  isRevealed: boolean;
  isBombEffect: boolean;
}

export type Grid = (CellState | null)[][];

export enum PowerType {
  MiddleLetter = "MIDDLE",
  SwapReveal = "SWAP",
  Bomb = "BOMB",
}

export interface PowerState {
  type: PowerType;
  uses: number;
  icon: string;
  label: string;
  description: string;
}
