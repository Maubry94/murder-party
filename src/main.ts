/// <reference types="@workadventure/iframe-api-typings" />

import { RemotePlayerMoved } from "@workadventure/iframe-api-typings/play/src/front/Api/Iframe/Players/RemotePlayer";
import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import { saveTombstone } from "./types/types";
import { endGameData } from "./types/types";

console.log("Script started successfully");
await WA.players.configureTracking();

let currentPopup: any = undefined;

enum murderRoles {
  murder = "tueur",
  sheriff = "policier",
  unknown = "inconnu",
}

WA.onInit()
  .then(async () => {
    WA.state.saveVariable("tombstone", []);
    WA.state.saveVariable("countPlayer", 1);
    addAndDropPlayer();
    await attributRole();
    startGame();
    putTombstone();
    killMurder();
    killSheriff();
    grabTouching();

    WA.room.area.onEnter("clock").subscribe(() => {
      const today = new Date();
      const time = today.getHours() + ":" + today.getMinutes();
      currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    });
    WA.room.area.onLeave("clock").subscribe(closePopup);

    //listening event end game
    WA.event.on("event-end-game").subscribe((event) => {
      endGame(event.data as endGameData);
    });

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra()
      .then(() => {
        console.log("Scripting API Extra ready");
      })
      .catch((e) => console.error(e));
  })
  .catch((e) => console.error(e));

function closePopup() {
  if (currentPopup !== undefined) {
    currentPopup.close();
    currentPopup = undefined;
  }
}

const killMurder = () => {
  const tol = 40;
  WA.player.onPlayerMove(async (me) => {
    //console.log(me.x + " " + me.y
    const players = WA.players.list();
    for (const other of players) {
      if (WA.player.tags[1] == "tueur") {
        WA.ui.actionBar.addButton({
          id: "murder" as unknown as string,
          label: "Tuer",
          callback: (event) => {
            if (
              isEnter(other.position.x - tol, other.position.x + tol, me.x) &&
              isEnter(other.position.y - tol, other.position.y + tol, me.y)
            ) {
              other.sendEvent("murder", me);
            }
          },
        });
      }
    }
  });
};

const killSheriff = () => {
  const tol = 100;
  WA.player.onPlayerMove(async (me) => {
    const players = WA.players.list();
    for (const other of players) {
      if (WA.player.tags[1] == "policier") {
        WA.ui.actionBar.addButton({
          id: "sheriff" as unknown as string,
          label: "Arreter",
          callback: (event) => {
            if (
              isEnter(other.position.x - tol, other.position.x + tol, me.x) &&
              isEnter(other.position.y - tol, other.position.y + tol, me.y)
            ) {
              other.sendEvent("sheriff", WA.player.playerId);
              WA.event.on("error").subscribe((event) => {
                WA.ui.actionBar.removeButton("sheriff" as unknown as string);
                WA.player.tags.pop();
              });
            }
          },
        });
      }
    }
  });
};

const grabTouching = () => {
  WA.event.on("murder").subscribe(() => {
    WA.player.getPosition().then((pos) => {
      // save position tombstone in variable
      const indexTomb = WA.state.loadVariable("tombstone") as saveTombstone[];
      indexTomb.push({ x: pos.x, y: pos.y });
      WA.state.saveVariable("tombstone", indexTomb);
      // send event put tomb stone
      WA.event.broadcast("puttombstone", { x: pos.x, y: pos.y });
      WA.player.teleport(100, 100);
    });
  });
  WA.event.on("sheriff").subscribe((event) => {
    if (WA.player.tags[1] == "tueur") {
      console.log("stop game");
    } else {
      // @ts-ignore
      let error = WA.players.get(event.data);
      error?.sendEvent("error", true);
    }
  });
};

const deleteTombstone = () => {
  const posTombs = WA.state.loadVariable("tombstone") as saveTombstone[];
  posTombs.forEach((tomb) => {
    WA.room.setTiles([
      {
        x: Math.round(tomb.x / 32),
        y: Math.round(tomb.y / 32),
        tile: null,
        layer: "rip",
      },
    ]);
  });
  // clear variable
  WA.state.saveVariable("tombstone", []);
};

const attributRole = async () => {
  if (WA.player.playerId % 2) {
    WA.player.tags.push(murderRoles.murder);
  } else {
    WA.player.tags.push(murderRoles.sheriff);
  }
};

const putTombstone = () => {
  WA.event.on("puttombstone").subscribe((e) => {
    makeTombstone(e.data as saveTombstone);
  });
};

const makeTombstone = (tomb: saveTombstone) =>
  WA.room.setTiles([
    {
      x: Math.round(tomb.x / 32),
      y: Math.round(tomb.y / 32),
      tile: 2956,
      layer: "rip",
    },
  ]);

const isEnter = (min: number, max: number, value: number): boolean =>
  value >= min && value <= max;

const addAndDropPlayer = () => {
  WA.players.onPlayerEnters.subscribe((p) => {
    let count = WA.state.loadVariable("countPlayer") as number;
    WA.state.saveVariable("countPlayer", ++count);
  });
  WA.players.onPlayerLeaves.subscribe((p) => {
    let count = WA.state.loadVariable("countPlayer") as number;
    WA.state.saveVariable("countPlayer", --count);
  });
};

const startGame = () => {
  WA.state.onVariableChange("countPlayer").subscribe((c) => {
    let count = c as number;
    if (count > 5) {
    }
  });
};

const triggerEndGame = (winnerName: string, murderWin: boolean) => {
  let position = { x: 500, y: 500 };
  let endGameData = {
    positionTp: position,
    labelWinner: murderWin
      ? "Le tueur " + winnerName + "a gagné la partie !"
      : "Le tueur a été arrêté, les villageois ont gagné !",
  };

  WA.event.broadcast("event-end-game", endGameData);
};

const endGame = (endGameData: endGameData) => {
  deleteTombstone();
  WA.player.teleport(endGameData.positionTp.x, endGameData.positionTp.y);
  WA.ui.banner.openBanner({
    id: "banner-info-end-game",
    text: endGameData.labelWinner,
    bgColor: "#000000",
    textColor: "#ffffff",
    closable: true,
    timeToClose: 0,
  });
};

function informTheRoleOfTheUserUsingBanner(tagsPlayer: string[]) {
  let textBanner: string = "";
  for (const tagPlayer of tagsPlayer) {
    switch (tagPlayer) {
      case murderRoles.murder:
        textBanner =
          "Vous avez le rôle " +
          murderRoles.murder +
          ", procéder à l'élimination de vos collègues en toute discrétion !";
        break;
      case murderRoles.sheriff:
        textBanner =
          "Vous avez le rôle " +
          murderRoles.sheriff +
          ", enquêter afin de débusquer vos collègues tueur.";
        break;
      case murderRoles.unknown:
        textBanner =
          "Vous avez le rôle " +
          murderRoles.unknown +
          ", allez chercher des indices qui vous permettront d'acquérir une arme afin de vous défendre.";
        break;
      default:
        textBanner = "aucun rôle reconnu force à vous";
        break;
    }
  }
}

export {};
