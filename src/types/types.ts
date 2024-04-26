import { PlayerRole } from "../enums/enums";

export type saveTombstone = {
  x: number;
  y: number;
};

export type endGameData = {
  positionTp: { x: number; y: number };
  labelWinner: string;
};

export type PlayerRoles = {
  [key: string]: {
    uuid: string,
    role: PlayerRole,
    status: string
  };
};
