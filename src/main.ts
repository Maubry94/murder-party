/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import {PlayerRole} from "./enum/playerRole";
import {PlayerStatus} from "./enum/playerStatus";
import {GameStatus} from "./enum/gameStatus";

console.log('Script started successfully');

let currentPopup: any = undefined;
const MIN_PLAYERS = 2;

await WA.players.configureTracking();
// Waiting for the API to be ready
WA.onInit().then(async () => {
    console.log('Host', window.location.host)
    console.log('Scripting API ready');
    console.log('Player tags: ', WA.player.tags)
    console.log('Player uuid: ', WA.player.uuid)
    console.log('First connected value before test: ', WA.state.firstConnected);
    setFirstConnected();
    try {
        let gameStatus = getGameStatus();
        addAndDropPlayer();
        if (gameStatus === GameStatus.WAITING) {
            WA.controls.disablePlayerControls();
            showRulePopup();
            await initPlayerRoles();
        }
        if(gameStatus === GameStatus.STARTED) {
            await initPlayerRoles();
        }
    }
    catch(e) {
        console.error(e);
    }

    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date();
        const time = today.getHours() + ":" + today.getMinutes();
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    })

    WA.room.area.onLeave('clock').subscribe(closePopup)

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

function getGameStatus() {
    // if game status is not defined, we set it to WAITING
    if (!WA.state.hasVariable('gameStatus')) {
        console.error('Game status not defined, cannot start game')
        throw new Error('Game status not defined, cannot start game');
    }
    if(!WA.state.gameStatus) {
        WA.state.saveVariable('gameStatus', GameStatus.WAITING);
        console.log('Game status set to :', WA.state.gameStatus);
        return GameStatus.WAITING;
    }
    console.log('Game status : ', WA.state.gameStatus)
    return WA.state.gameStatus;
}

function setFirstConnected() {
    // identify first connected player, only the first connected player will define the MURDERER and DETECTIVE
    if(WA.state.hasVariable('firstConnected') && !WA.state.firstConnected) {
        WA.state.saveVariable('firstConnected', WA.player.uuid)
        console.log('Defining first connected value to : ', WA.state.firstConnected);
    }
}
function showRulePopup() {
    // let roleNote: any;
    // roleNote = await WA.ui.website.open({
    //     url: './src/modal/StartAnnouncement.html',
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
        src: 'http://localhost:5173'+'/src/modal/StartAnnouncement.html',
        allow: "fullscreen",
        allowApi: true,
        position: "center",
    });
}
async function initPlayerRoles() {
    // first time defining murderers and detectives, first we get the index of the players that will be designated. Then we assign the role in player.state.playerRole
    // if roles are not already set
    if (WA.state.firstConnected === WA.player.uuid && WA.state.hasVariable('roles') && WA.state.playerCount === 1) {
        let nb_players = 0;
        let playerRoles = {};
        console.log('load variable :',WA.state.loadVariable('playerCount'));
        console.log('wa state playerCount : ',WA.state.playerCount);
        const playerCountSub = WA.state.onVariableChange('playerCount').subscribe(async (e) => {
            nb_players = e as number;
            console.log('On variable change playerCount :', nb_players);
            if (nb_players > MIN_PLAYERS) {
                WA.state.saveVariable('gameStatus', GameStatus.INIT);
                console.log('Enough players are connected, game is starting soon.');
                playerRoles = WA.state.roles as Object;
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
                await WA.state.saveVariable('roles', playerRoles);

                startGame(playerCountSub);
            }
        });
    }
    // attribution du role du joueur courant
    if (WA.state.roles) {
        WA.player.state.playerRole = PlayerRole.INNOCENT;
        for(const [key, value] of Object.entries(WA.state.roles)) {
            if(WA.player.uuid === WA.state.roles[key].uuid) {
                WA.player.state.playerRole = WA.state.roles[key].role;
                console.log('Changing current player\'s role to : ', WA.player.state.playerRole);
                break;
            }
        }
    }
    if (WA.player.state.playerRole === PlayerRole.DETECTIVE) {
        WA.player.setOutlineColor(255, 128, 0);
    }
    console.log(`Player name : ${WA.player.name}`);
    console.log(`Player role : ${WA.player.state.playerRole}`);
    // hook le timer de Aubry
}
function addAndDropPlayer() {
    if (!WA.state.roles) {
        let playerRoles = {};
        playerRoles[WA.player.uuid] = {
            uuid: WA.player.uuid,
            role: PlayerRole.INNOCENT,
            status: PlayerStatus.ALIVE
        }
        WA.state.saveVariable('roles', playerRoles);
        WA.state.saveVariable('playerCount', 1);
        console.log('1rst player added to the room');
    }
    WA.players.onPlayerEnters.subscribe((player) => {
        let playerRoles = {};
        if (WA.state.roles) {
            playerRoles = WA.state.roles;
            console.log('old roles : ', WA.state.roles)
        }
        console.log(`Player ${player.name} entered the room`);
        let count = WA.state.playerCount as number;
        WA.state.saveVariable('playerCount', ++count);
        playerRoles[player.uuid] = {
            uuid: player.uuid,
            role: PlayerRole.INNOCENT,
            status: PlayerStatus.ALIVE
        };
        WA.state.saveVariable('roles', playerRoles);
        console.log('new player role saved : ', WA.state.roles)
    });
    WA.players.onPlayerLeaves.subscribe((player) => {
        let playerRoles = {};
        if (WA.state.roles) {
            playerRoles = WA.state.roles;
        }
        console.log(`Player ${player.name} left the room`);
        let count = WA.state.playerCount as number;
        WA.state.saveVariable('playerCount', --count);
        delete playerRoles[player.uuid];
        WA.state.saveVariable('roles', playerRoles);
    });
}
function startGame(sub) {
    sub.unsubscribe();
    WA.state.saveVariable('gameStatus', GameStatus.STARTED);
    WA.controls.restorePlayerControls();
    // fermer popup
    console.log('Game started');
}
function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}
function getRandomInt(max:number){
    return Math.floor(Math.random() * (max-1));
}
function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export {};
