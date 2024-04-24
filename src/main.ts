/// <reference types="@workadventure/iframe-api-typings" />

import { RemotePlayer } from "@workadventure/iframe-api-typings/play/src/front/Api/Iframe/Players/RemotePlayer";
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

console.log("Script started successfully");

let currentPopup: any = undefined;

enum murderRoles {
  murder = "tueur",
  sheriff = "policier",
  unknown = "inconnu",
}

// Waiting for the API to be ready
WA.onInit()
  .then(() => {
    console.log("Scripting API ready");
    console.log("Player tags: ", WA.player.tags);

    WA.room.area.onEnter("clock").subscribe(() => {
      const today = new Date();
      const time = today.getHours() + ":" + today.getMinutes();
      currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    });

    WA.room.area.onLeave("clock").subscribe(closePopup);

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra()
      .then(() => {
        console.log("Scripting API Extra ready");
      })
      .catch((e) => console.error(e));

    WA.player.tags.push(murderRoles.murder);

    informTheRoleOfTheUserUsingBanner(WA.player.tags);
  })
  .catch((e) => console.error(e))
  .then(async () => {
    await WA.players.configureTracking();
    setTimeout(() => {
      const players = WA.players.list();

      for (const player of players) {
        addBtnForKillingUser(player as RemotePlayer);
      }
    }, 2000);
  });

function closePopup() {
  if (currentPopup !== undefined) {
    currentPopup.close();
    currentPopup = undefined;
  }
}

function addBtnForKillingUser(user: RemotePlayer) {
  WA.ui.actionBar.addButton({
    id: ("-" + user.playerId) as unknown as string,
    label: "Tuer " + user.name,
    callback: (event) => {
      //TODO: prevenir les autres users
      // rajouter une pierre tombale a la position du joueur mort

      WA.ui.actionBar.removeButton(("-" + user.playerId) as unknown as string);
    },
  });
}

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

  WA.ui.banner.openBanner({
    id: "banner-info-murder-text",
    text: textBanner,
    bgColor: "#003eff9c",
    textColor: "#ffffff",
    closable: true,
    timeToClose: 0,
  });
}

export {};
