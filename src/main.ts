/// <reference types="@workadventure/iframe-api-typings" />

import { RemotePlayerMoved } from "@workadventure/iframe-api-typings/play/src/front/Api/Iframe/Players/RemotePlayer";
import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import { saveTombstone } from "./types/types";

console.log('Script started successfully');
await WA.players.configureTracking();

let currentPopup: any = undefined;

enum murderRoles {
  murder = "tueur",
  sheriff = "policier",
  unknown = "inconnu",
}

WA.onInit().then(async () => {
    // set variable tombstone position
    WA.state.saveVariable("tombstone", [])
    // set variable count player 
    WA.state.saveVariable("countPlayer", 0)
    addAndDropPlayer()
    await attributRole()
    makeTombstone()
    killMurder()
    killSheriff()
    grabTouching()
    //WA.room.getTiledMap().then(console.log)

    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date()
        const time = today.getHours() + ":" + today.getMinutes()
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, [])
    })

    WA.room.area.onLeave('clock').subscribe(closePopup)

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready')
    }).catch(e => console.error(e));

}).catch(e => console.error(e))

function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

const killMurder = () => {
    const tol = 40;
    WA.player.onPlayerMove(async (me) => {
        //console.log(me.x + " " + me.y)
        const players = WA.players.list()
        for (const other of players) {
            if (WA.player.tags[1] == "tueur") {
                WA.ui.actionBar.addButton({
                    id: ("murder") as unknown as string,
                    label: "Tuer",
                    callback: (event) => {
                        if (enter(other.position.x - tol, other.position.x + tol, me.x) &&
                            enter(other.position.y - tol, other.position.y + tol, me.y)) {
                            other.sendEvent("murder", me)
                        }
                    },
                });
            }
        }
    })
}

const killSheriff = () => {
    const tol = 100;
    WA.player.onPlayerMove(async (me) => {
        const players = WA.players.list()
        for (const other of players) {
            if (WA.player.tags[1] == "policier") {
                WA.ui.actionBar.addButton({
                    id: ("sheriff") as unknown as string,
                    label: "Arreter",
                    callback: (event) => {
                        if (enter(other.position.x - tol, other.position.x + tol, me.x) &&
                            enter(other.position.y - tol, other.position.y + tol, me.y)) {
                            other.sendEvent("sheriff", WA.player.playerId)
                            WA.event.on("error").subscribe((event) => {
                                WA.ui.actionBar.removeButton(("sheriff") as unknown as string);
                                WA.player.tags.pop()
                            })
                        }
                    },
                })
            }
        }
    })
}

const grabTouching = () => {
    WA.event.on("murder").subscribe(() => {
        WA.player.getPosition().then((pos) => {
            const indexTomb = WA.state.loadVariable("tombstone") as object[]
            indexTomb.push({ x: 120, y: 120 })
            WA.state.saveVariable("tombstone", indexTomb)
            WA.event.broadcast("placetombstone", { x: pos.x, y: pos.y })
            WA.player.teleport(100, 100)
        })
    })
    WA.event.on("sheriff").subscribe((event) => {
        if (WA.player.tags[1] == "tueur") {
            console.log("stop game")
        } else {
            // @ts-ignore
            let error = WA.players.get(event.data)
            error?.sendEvent("error", true)
        }
    })
}

const deleteTombstone = () => {
    const posTombs = WA.state.loadVariable("tombstone") as saveTombstone[]
    posTombs.forEach((tomb) => {
        WA.room.setTiles([
            {x: Math.round(tomb.x/32), y: Math.round(tomb.y/32), tile: null, layer: "rip"}
        ])
    })
}

const attributRole = async () => {
    if (WA.player.playerId % 2) {
        WA.player.tags.push(murderRoles.murder)
    } else {
        WA.player.tags.push(murderRoles.sheriff)
    }
}

const makeTombstone = () => {
    WA.event.on("placetombstone").subscribe((event) => {
        WA.room.setTiles([
            // @ts-ignore
            {x: Math.round(event.data.x/32), y: Math.round(event.data.y/32), tile: 2956, layer: "rip"}
        ])
    })
}

const enter = (min: number, max: number, value: number): boolean  => { 
    return (value >= min && value <= max);
}

const addAndDropPlayer = () => {
    WA.players.onPlayerEnters.subscribe((p) => {
        let count = WA.state.loadVariable("countPlayer") as number
        WA.state.saveVariable("countPlayer", count++)
    })
    WA.players.onPlayerLeaves.subscribe((p) => {
        let count = WA.state.loadVariable("countPlayer") as number
        WA.state.saveVariable("countPlayer", count--)
    })
}

const startGame = () => {
    WA.state.onVariableChange("countPlayer").subscribe((c) => {
        let count = c as number
        if (count > 5) {
            
        }
    })
}

export {};
