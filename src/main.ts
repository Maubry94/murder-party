/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import { RemotePlayerInterface } from "@workadventure/iframe-api-typings";
import { murderRoles, saveTombstone, endGameData } from "./types/types";

console.log("Script started successfully");

let currentPopup: any = undefined;

WA.onInit()
  .then(async () => {
    await WA.players.configureTracking();
    WA.state.saveVariable("tombstone", []);
    playSound();
    await attributRole();
    putTombstone();
    murdererKill();
    playersInteraction();

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

    WA.ui.actionBar.addButton({
      id: "clear-btn",
      label: "Nettoyer",
      callback: (event) => {
        triggerEndGame();
      },
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

const murdererKill = () => {
  const tol = 40;
  WA.player.onPlayerMove(async (me) => {
    const players = WA.players.list();
    for (const other of players) {
      WA.ui.actionBar.addButton({
        id: "murderer" as unknown as string,
        label: "Tuer",
        callback: (event) => {
          if (
            isEnter(other.position.x - tol, other.position.x + tol, me.x) &&
            isEnter(other.position.y - tol, other.position.y + tol, me.y)
          ) {
            other.sendEvent("murderer", me);
            playmurdererKillSound();
            other.sendEvent("playsound", "murderer");
          }
        },
      });
    }
  });
}

const playersInteraction = () => {
  WA.event.on("murderer").subscribe(() => {
    WA.player.getPosition().then((pos) => {
      // send event to put tomb stone
      WA.event.broadcast("puttombstone", { x: pos.x, y: pos.y });
      WA.player.teleport(100, 100);
    });
  });
};

const deleteTombstone = () => {
  const posTombs = WA.state.tombstone as saveTombstone[];
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
  WA.state.saveVariable("tombstone", [])
};

const attributRole = async () => {
  WA.player.tags.push(murderRoles.murderer);
};

const putTombstone = () => {
  WA.event.on("puttombstone").subscribe((e) => {
    const pos = e.data as saveTombstone
    const indexTomb = WA.state.loadVariable("tombstone") as saveTombstone[];
    // save position tombstone in variable
    indexTomb.push({ x: pos.x, y: pos.y });
    WA.state.saveVariable("tombstone", indexTomb);
    makeTombstone(pos);
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

const triggerEndGame = () => {
  let position = { x: 130, y: 130 };
  let endGameData = {
    positionTp: position,
  };

  WA.event.broadcast("event-end-game", endGameData);
};

const endGame = (endGameData: endGameData) => {
  deleteTombstone();
  WA.player.teleport(endGameData.positionTp.x, endGameData.positionTp.y);
};

const playmurdererKillSound = () => {
  const killSound = WA.sound.loadSound("/sounds/murdererKill.ogg");
  killSound.play(configSound())
  killSound.stop()
}

const playSound = () => {
  WA.event.on("playsound").subscribe((event) => {
    playmurdererKillSound();
  })
}

const configSound = () => {
  var config = {
      volume : 0.5,
      loop : false,
      rate : 1,
      detune : 1,
      delay : 0,
      seek : 0,
      mute : false
  }
  return config;
}

const countPlayerIterator = (iterPlayer: IterableIterator<RemotePlayerInterface>) => {
  let count: number = 0;
  for (const player of iterPlayer) {
    count++
  }
  return count;
}
export {};
