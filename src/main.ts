/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import { saveTombstone, endGameData, PlayerRoles } from "./types/types";
import { PlayerRole, PlayerStatus, GameStatus } from "./enums/enums";

console.log("Script started successfully");
WA.players.configureTracking();
const MIN_PLAYERS = 2;
let timerIframe: any = undefined;
const suspenseStartAudio = WA.sound.loadSound("/sounds/suspense-start.mp3");
const soundConfig = {
  volume: 0.25,
  loop: false,
  rate: 1,
  detune: 1,
  delay: 0,
  seek: 0,
  mute: false
};

let currentPopup: any = undefined;

enum murderRoles {
  murder = "tueur",
  sheriff = "policier",
  unknown = "inconnu",
}

WA.onInit()
  .then(async () => {
    WA.state.saveVariable("tombstone", []);
    setFirstConnected();

    try {
      addAndDropPlayer();
      handleGameStatusChange();
      let gameStatus = getGameStatus();
      if(gameStatus === GameStatus.STARTED) {
        setCurrentPlayerRole();
      }
      playSound();
      addAndDropPlayer();
      putTombstone();
      killMurder();
      killSheriff();
      grabTouching();
    }
    catch(e) {
      console.error(e);
    }

    // end code
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
      id: "register-btn",
      label: "end game",
      callback: (event) => {
        triggerEndGame("mathieu", true);
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

const killMurder = () => {
  const tol = 40;
  WA.player.onPlayerMove(async (me) => {
    //console.log(me.x + " " + me.y
    const players = WA.players.list();
    for (const other of players) {
      if (WA.player.state.playerRole == PlayerRole.MURDERER) {
        WA.ui.actionBar.addButton({
          id: "murder" as unknown as string,
          label: "Tuer",
          callback: (event) => {
            if (
              isEnter(other.position.x - tol, other.position.x + tol, me.x) &&
              isEnter(other.position.y - tol, other.position.y + tol, me.y)
            ) {
              other.sendEvent("murder", me);
              playKillMurderSound();
              other.sendEvent("playsound", "murder");
            }
          },
        });
      }
    }
  });
}

const killSheriff = () => {
  const tol = 100;
  WA.player.onPlayerMove(async (me) => {
    const players = WA.players.list();
    for (const other of players) {
      if (WA.player.state.playerRole == PlayerRole.DETECTIVE) {
        WA.ui.actionBar.addButton({
          id: "sheriff" as unknown as string,
          label: "Arreter",
          callback: (event) => {
            if (
              isEnter(other.position.x - tol, other.position.x + tol, me.x) &&
              isEnter(other.position.y - tol, other.position.y + tol, me.y)
            ) {
              other.sendEvent("sheriff", WA.player.playerId);
              playKillSheriffSound();
              other.sendEvent("playsound", "sheriff");
              WA.event.on("error").subscribe((event) => {
                WA.ui.actionBar.removeButton("sheriff" as unknown as string);
                WA.player.tags.pop();
              });
            } else {
              playReloadSound();
            }
          },
        });
      }
    }
  });
}

const grabTouching = () => {
  WA.event.on("murder").subscribe(() => {
    WA.player.getPosition().then((pos) => {
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
  let text: string = "";
  let isMurder = false;
  for (const tagPlayer of tagsPlayer) {
    switch (tagPlayer) {
      case murderRoles.murder:
        text =
          "Vous avez le rôle " +
          murderRoles.murder +
          ", procéder à l'élimination de vos collègues en toute discrétion !";
        isMurder = true;
        break;
      case murderRoles.sheriff:
        text =
          "Vous avez le rôle " +
          murderRoles.sheriff +
          ", enquêter afin de débusquer vos collègues tueur.";
        break;
      case murderRoles.unknown:
        text =
          "Vous avez le rôle " +
          murderRoles.unknown +
          ", allez chercher des indices qui vous permettront d'acquérir une arme afin de vous défendre.";
        break;
      default:
        text = "aucun rôle reconnu force à vous";
        break;
    }
  }

  WA.ui.displayActionMessage({
    message: text + " (SPACE) to close.",
    callback: () => { },
  });
}

const playKillMurderSound = () => {
  const killSound = WA.sound.loadSound("../public/sounds/soundEffectMurderKill.ogg");
  killSound.play(getConfigSound())
  killSound.stop()
}

const playKillSheriffSound = () => {
  const killSound = WA.sound.loadSound("../public/sounds/soundEffectSherrifKill.ogg");
  killSound.play(getConfigSound());
  killSound.stop();
}

const playReloadSound = () => {
  const killSound = WA.sound.loadSound("../public/sounds/gun_empty.mp3");
  killSound.play(getConfigSound());
  killSound.stop();
}

const playSound = () => {
  WA.event.on("playsound").subscribe((e) => {
    if (e.data == "murder") {
      playKillMurderSound();
    }
    else if (e.data == "sheriff") {
      playKillSheriffSound();
    }
  })
}

const getConfigSound = () => {
  return {
    volume: 0.5,
    loop: false,
    rate: 1,
    detune: 1,
    delay: 0,
    seek: 0,
    mute: false
  }
}

function getRandomInt(max: number) {
  return Math.floor(Math.random() * (max - 1));
}

function getGameStatus() {
  // if game status is not defined, we set it to WAITING
  if (!WA.state.hasVariable('gameStatus')) {
    console.error('Game status not defined, cannot start game')
    throw new Error('Game status not defined, cannot start game');
  }
  if (!WA.state.gameStatus) {
    // WA.state.saveVariable('gameStatus', GameStatus.WAITING);
    WA.state.gameStatus = GameStatus.WAITING;
    console.log('Game status set to :', WA.state.gameStatus);
    return GameStatus.WAITING;
  }
  console.log('Game status : ', WA.state.gameStatus)
  return WA.state.gameStatus;
}

function setFirstConnected() {
  // identify first connected player, only the first connected player will define the MURDERER and DETECTIVE
  if (WA.state.hasVariable('firstConnected') && !WA.state.firstConnected) {
    WA.state.saveVariable('firstConnected', WA.player.uuid)
    console.log('Defining first connected value to : ', WA.state.firstConnected);
  }
}
function showRulePopup() {
  // let roleNote: any;
  // roleNote = await WA.ui.website.open({
  //     url: './src/modals/StartAnnouncement.html',
  //     position: {
  //         vertical: "middle",
  //         horizontal: "middle",
  //     },
  //     size: {
  //         height: "30vh",
  //         width: "50vw",
  //     },
  //     margin: {
  //         top: "10vh",
  //     },
  // });
  WA.ui.modal.openModal({
    title: "WorkAdventure rules",
    src: 'http://localhost:5173' + '/src/modals/StartAnnouncement.html',
    allow: "fullscreen",
    allowApi: true,
    position: "center",
  });
}

function handleGameStatusChange() {
  WA.state.onVariableChange('gameStatus').subscribe(async (status) => {
    if (status === GameStatus.WAITING) {
      console.log('Waiting for players to join the game');
      showRulePopup();
      await initPlayerRoles();
    } else if (status === GameStatus.INIT) {
      setCurrentPlayerRole();
      console.log('Game initialized');

      timerIframe = await WA.ui.website.open({
        url: "/src/iframes/timer.html",
        position: {
          vertical: "top",
          horizontal: "middle",
        },
        margin: {
          top: "30px",
        },
        size: {
          height: "123px",
          width: "123px",
        },
        allowApi: true
      });
    } else if (status === GameStatus.STARTED) {
      console.log('Game is starting, attributing role of current player !');
      timerIframe.close();
      suspenseStartAudio.play(soundConfig);
      setInterval(() => {
        suspenseStartAudio.stop();
      }, 4000);
      console.log('Game started');
    } else if (status === GameStatus.FINISHED) {
      console.log('Game finished');
    } else if (status === GameStatus.STOPPED) {
      console.log('Game stopped');
    }
  });
}

async function initPlayerRoles() {
  // first time defining murderers and detectives, first we get the index of the players that will be designated. Then we assign the role in player.state.playerRole
  // if roles are not already set
  console.log('====== INIT ROLES ======');
  console.log('first connected : ', WA.state.firstConnected)
  console.log('hasVariable role :', WA.state.hasVariable('roles'));
  console.log('player count : ', WA.state.playerCount)
  if (WA.state.firstConnected === WA.player.uuid && WA.state.hasVariable('roles') && WA.state.playerCount === 1) {
    WA.controls.disablePlayerControls();
    let nb_players = 0;
    let playerRoles = {} as PlayerRoles;
    console.log('load variable :', WA.state.loadVariable('playerCount'));
    console.log('wa state playerCount : ', WA.state.playerCount);
    const playerCountSub = WA.state.onVariableChange('playerCount').subscribe(async (e) => {
      nb_players = e as number;
      console.log('On variable change playerCount :', nb_players);
      if (nb_players > MIN_PLAYERS) {
        console.log('Enough players are connected, game is starting soon.');
        playerRoles = WA.state.roles as PlayerRoles;
        let keys = Object.keys(playerRoles);
        console.log('keys : ', keys)
        let nb_murderer = Math.ceil(nb_players * 0.1);
        let nb_detective = Math.ceil(nb_players * 0.1);
        console.log('Nb players: ', nb_players);
        console.log('Nb murderer: ', nb_murderer);
        console.log('Nb detective: ', nb_detective);
        for (let i = 0; i < nb_murderer; i++) {
          let idx_murderer = getRandomInt(nb_players);
          console.log('IDX MURDERER :', idx_murderer);
          console.log('KEYS INDEX MURDERER : ', keys[idx_murderer]);
          console.log('PLAYER ROLES KEYS INDEX MURDERER : ', playerRoles[keys[idx_murderer]]["role"]);
          while (playerRoles[keys[idx_murderer]].role !== PlayerRole.INNOCENT) {
            idx_murderer = getRandomInt(nb_players);
          }
          playerRoles[keys[idx_murderer]].role = PlayerRole.MURDERER;
          console.log('Attribution d\'un murderer : ', playerRoles);
        }
        for (let i = 0; i < nb_detective; i++) {
          let idx_detective = getRandomInt(nb_players);
          console.log('IDX DETECTIVE :', idx_detective);
          console.log('KEYS INDEX DETECTIVE : ', keys[idx_detective]);
          console.log('PLAYER ROLES KEYS INDEX DETECTIVE : ', playerRoles[keys[idx_detective]]["role"]);
          while (playerRoles[keys[idx_detective]].role !== PlayerRole.INNOCENT) {
            idx_detective = getRandomInt(nb_players);
          }
          playerRoles[keys[idx_detective]].role = PlayerRole.DETECTIVE;
          console.log('Attribution d\'un detective : ', playerRoles);
        }
        await WA.state.saveVariable('roles', playerRoles).then(() => {
          initGame(playerCountSub);
        });
      }
    });
  }
  setCurrentPlayerRole();
  // hook le timer de Aubry
}

function initGame(sub: any) {
  WA.state.saveVariable('gameStatus', GameStatus.INIT).then(() => {
    console.log('Game status set to INIT');
    sub.unsubscribe();
    WA.controls.restorePlayerControls();
  });
}

function setCurrentPlayerRole() {
  WA.event.on('shareRoomRoles').subscribe((event) => {
    console.log('First player broadcasting room roles state');
    let data = event.data;
    console.log('Event data : ', data)
    WA.player.state.playerRole = PlayerRole.INNOCENT;
    for (const [key, value] of Object.entries(data)) {
      console.log(`KEY : ${key} -- VALUE : ${JSON.stringify(value)}`);
      console.log('looping through WA.state.roles : ', data[key].uuid);
      // @ts-ignore
      if (WA.player.uuid === key) {
        console.log('WA state role[key].role', data[key].role);
        console.log('WA state role[key]', data[key]);
        // @ts-ignore
        WA.player.state.playerRole = data[key].role;
        console.log('Changing current player\'s role to : ', WA.player.state.playerRole);
        break;
      }
    }
    
    console.log(`Player name : ${WA.player.name}`);
    console.log(`Player role : ${WA.player.state.playerRole}`);
    console.log(`Player UUID : ${WA.player.uuid}`);
  })
  if(WA.state.firstConnected === WA.player.uuid) {
    WA.event.broadcast('shareRoomRoles', WA.state.roles);
  }
  // attribution du role du joueur courant
  // if (WA.state.roles) {
  //   let playerRoles = WA.state.roles as PlayerRoles;
  //   WA.player.state.playerRole = PlayerRole.INNOCENT;
  //   for (const [key, value] of Object.entries(playerRoles)) {
  //     console.log(`KEY : ${key} -- VALUE : ${JSON.stringify(value)}`);
  //     console.log('looping through WA.state.roles : ', playerRoles[key].uuid);
  //     // @ts-ignore
  //     if (WA.player.uuid === key) {
  //       console.log('WA state role[key].role', playerRoles[key].role);
  //       console.log('WA state role[key]', playerRoles[key]);
  //       // @ts-ignore
  //       WA.player.state.playerRole = playerRoles[key].role;
  //       console.log('Changing current player\'s role to : ', WA.player.state.playerRole);
  //       break;
  //     }
  //   }
  // }
  // if (WA.player.state.playerRole === PlayerRole.DETECTIVE) {
  //     WA.player.setOutlineColor(255, 128, 0);
  // }
}

function addAndDropPlayer() {
  if (!WA.state.roles) {
    let playerRoles = {} as PlayerRoles;
    playerRoles[WA.player.uuid as string] = {
      uuid: WA.player.uuid as string,
      role: PlayerRole.INNOCENT,
      status: PlayerStatus.ALIVE
    }
    WA.state.saveVariable('roles', playerRoles);
    WA.state.saveVariable('playerCount', 1);
    console.log('1rst player added to the room');
  }
  WA.players.onPlayerEnters.subscribe((player) => {
    let playerRoles = {} as PlayerRoles;
    if (WA.state.roles) {
      playerRoles = WA.state.roles as PlayerRoles;
    }
    let count = WA.state.playerCount as number;
    if(!(Object.keys(playerRoles).includes(player.uuid))) {
      console.log(`Player ${player.name} entered the room`);
      WA.state.saveVariable('playerCount', ++count);
      playerRoles[player.uuid] = {
        uuid: player.uuid,
        role: PlayerRole.INNOCENT,
        status: PlayerStatus.ALIVE
      };
      WA.state.saveVariable('roles', playerRoles);
      console.log('new player role saved : ', WA.state.roles)
    }
  });
  WA.players.onPlayerLeaves.subscribe((player) => {
    let playerRoles = {} as PlayerRoles;
    if (WA.state.roles) {
      playerRoles = WA.state.roles as PlayerRoles;
    }
    if(Object.keys(playerRoles).includes(player.uuid)) {
      console.log(`Player ${player.name} left the room`);
      let count = WA.state.playerCount as number;
      WA.state.saveVariable('playerCount', --count);
      delete playerRoles[player.uuid];
      WA.state.saveVariable('roles', playerRoles);
    }
  });
}

export { };
