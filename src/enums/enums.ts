export const enum GameStatus {
    STOPPED = 'stopped',
    STARTED = 'started',
    FINISHED = 'finished',
    WAITING = 'waiting',
    INIT = 'init',
}

export const enum PlayerRole {
    INNOCENT = 'innocent',
    DETECTIVE = 'detective',
    MURDERER = 'murderer',
}

export const enum PlayerStatus {
    ALIVE = 'alive',
    DEAD = 'dead',
}

WA.player.onPlayerMove((player) => {
    // ici
})