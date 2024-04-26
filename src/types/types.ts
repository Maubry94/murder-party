export enum murderRoles {
  murderer = "murderer",
}

export type saveTombstone = {
  x: number;
  y: number;
};

export type endGameData = {
  positionTp: { x: number; y: number };
  labelWinner: string;
};
