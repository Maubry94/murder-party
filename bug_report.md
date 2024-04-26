## RAPPORT DE BUG

### Souci avec les écouteurs onPlayerEnter et OnPlayerLeave

```javascript
WA.players.onPlayerEnter((player) => {
    console.log(player);
});
```

Il arrive que ces événements ne se déclenchent pas lorsqu'un joueur entre dans la zone, empêchant l'exécution du code. Parfois, le code se déclenche deux fois consécutivement, comptant un joueur deux fois, probablement en raison d'un bug de synchronisation. Si nous décidons de mettre en place un système de comptage des joueurs dans une zone, nous devrons prendre en compte ce bug. Une solution possible serait de créer un système de vérification de la présence des joueurs dans la zone.

```javascript
if (WA.state.playerCount.length === 0) {
    WA.state.saveVariable("playerCount", WA.state.playerCount + 1);
    WA.state.playerList.push(player);
}
WA.players.onPlayerEnter((player) => {
    if (
        !WA.state.playerList.includes(player) &&
        WA.player.playerId === WA.state.playerList[0].playerId
    ) {
        WA.state.saveVariable("playerCount", WA.state.playerCount + 1);
        WA.state.playerList.push(player);
    }
});
```

Bien que cette solution ne soit pas parfaite, elle permet de réduire les erreurs de comptage. Cependant, elle ne résout pas les erreurs lorsque le code ne se déclenche pas et qu'un joueur n'est pas détecté. Ce bug a eu un impact significatif sur nous et nous a empêché d'implémenter le système de rôles qui se base sur le nombre de joueurs pour distribuer correctement les rôles.

Pour démarrer la partie, nous avons utilisé le code suivant :

```javascript
WA.state.onVariableChange("playerCount", (value) => {
    if (value > 5) {
        // lancer la partie
    }
});
```

Ce code ne fonctionne pas correctement en raison du bug de synchronisation du comptage des joueurs.

### Problème avec l'état partagé

Parfois, l'état partagé n'est pas parfaitement synchronisé et certaines valeurs peuvent varier d'un joueur à l'autre.

```javascript
if (WA.state.playerCount.length === 0) {
    WA.state.saveVariable("playerCount", WA.state.playerCount + 1);
    WA.state.playerList.push(player);
}
WA.players.onPlayerEnter((player) => {
    if (
        !WA.state.playerList.includes(player) &&
        WA.player.playerId === WA.state.playerList[0].playerId
    ) {
        WA.state.saveVariable("playerCount", WA.state.playerCount + 1);
        WA.state.playerList.push(player);
    }
});
// Si nous créons une boucle infinie ou un événement qui se déclenche constamment, et que nous utilisons un console.log pour afficher la valeur de 'playerCount', nous observons que le résultat varie pour chaque joueur.
```

Lorsque nous augmentons la valeur de playerCount, il se peut que cette valeur ne soit pas la même pour tous les joueurs. Certains joueurs peuvent avoir une valeur différente de playerCount. Ce bug nous a empêché de démarrer la partie correctement, car le démarrage de la partie dépend du nombre de joueurs présents dans la zone. Pour résoudre ce bug, nous avons utilisé le premier joueur qui entre dans la zone pour démarrer la partie.

```javascript
WA.state.onVariableChange("playerCount", (value) => {
    if (value > 5 && WA.state.playerList[0].playerId === WA.player.playerId) {
        roles = MakeRoles(WA.state.playerList);
        WA.event.broadcast("startGame", roles);
    }
});

WA.event.on("startGame", (roles) => {
    for (let i = 0; i < roles.length; i++) {
        if (WA.state.playerList[i].playerId === WA.player.playerId) {
            WA.state.saveVariable("role", roles[i]);
        }
    }
});
```

Avec ce système, nous avons décidé que le premier joueur qui entre lance la partie et distribue les rôles aux autres joueurs. Comme vous pouvez l'imaginer, ce système a un problème. Si le premier joueur qui entre a un problème de comptage des joueurs, il ne distribuera pas les rôles à tous les joueurs. Nous avons également pris en compte que si le joueur 1 quitte le salon avant que la partie ne commence, son rôle de starter/distributeur de rôles sera attribué à un autre joueur.

```javascript
if (WA.state.playerCount.length === 0) {
    WA.state.saveVariable("playerCount", WA.state.playerCount + 1);
    WA.state.playerList.push(player);
}
WA.players.onPlayerEnter((player) => {
    if (
        !WA.state.playerList.includes(player) &&
        WA.player.playerId === WA.state.playerList[0].playerId
    ) {
        WA.state.saveVariable("playerCount", WA.state.playerCount + 1);
        WA.state.playerList.push(player);
    }
});
WA.players.onPlayerLeave((player) => {
    if (player === WA.state.playerList[0]) {
        WA.state.playerList.shift();
        WA.event.broadcast("sendStarterRole", true);
    }
});
WA.event.on("sendStarterRole", () => {
    console.log("you are the starter");
});
```

:warning: Note :warning: : Tout le code écrit ci-dessus est un exemple de code qui ne fonctionne pas correctement. Il est écrit pour illustrer les problèmes rencontrés et les "solutions" proposées.
