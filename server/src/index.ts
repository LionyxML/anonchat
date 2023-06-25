import { WebSocketServer } from "ws";
import { createStore } from "./store";
import { ExtendedWebSocket, IStoreState } from "./index.d";
import {
  addClient,
  addClientNick,
  addUserToChannel,
  broadcastChannelMessage,
  changeNick,
  checkChannelExistence,
  createChannel,
  currentUserChannels,
  formatClientMsg,
  heartbeat,
  listChannelUsers,
  removeUserFromChannel,
  removeUserFromServer,
} from "./helpers";
import { SERVER_NAME, SERVER_NICK, SERVER_PORT } from "./config";
import { IncomingMessage } from "http";

export const store = createStore<IStoreState>(() => ({
  clients: [],
  channels: {
    help: [],
  },
  clientsNicks: [],
}));

const wss = new WebSocketServer({ port: Number(SERVER_PORT) }, () =>
  console.log(`>>> ${SERVER_NAME} Server Loaded...`)
);

wss.on("connection", (ws: ExtendedWebSocket, req: IncomingMessage) => {
  ws.isAlive = true;

  const clientIP = String(
    req.headers["x-forwarded-for"] || req.socket.remoteAddress
  );
  ws.on("error", console.error);
  ws.on("pong", () => heartbeat(ws, clientIP));

  const { getState } = store;

  console.log(`>>> New client connected: ${clientIP}`);

  addClient(ws);
  addClientNick(`client_${getState().clients.indexOf(ws)}`);

  ws.send(
    formatClientMsg(
      SERVER_NICK,
      `
  |
  | Welcome to the server ${SERVER_NAME}!
  |
  | Clients count: ${getState().clientsNicks.length}
  | Your nickname is ${getState().clientsNicks[getState().clients.indexOf(ws)]}
  |
  | /channels             - lists all channels
  | /join [#channel]      - joins #channel creating it if needed
  | /nick [new_nickname]  - changes your nickname
  | /part                 - leaves the channel
  | /quit                 - exits the server
  | /users                - list all users inside current channel 
  |
  `
    )
  );

  ws.on("message", (message) => {
    const parsedMessage = message.toString().split(" ");

    if (parsedMessage.length === 0) return;

    const isCommand = String(parsedMessage[0]).match(/^\//);
    const clientId = getState().clients.indexOf(ws);
    const clientNick = getState().clientsNicks[clientId];
    const userCurrentChannels = currentUserChannels(clientId);
    const userCurrentChannel = String(userCurrentChannels[0]);

    if (!isCommand) {
      if (userCurrentChannels.length === 0) {
        ws.send(
          formatClientMsg(
            SERVER_NICK,
            "Error: you're not inside any channel. Try /join #channel_name"
          )
        );
        return;
      }

      if (message.toString().trim() === "") return;

      broadcastChannelMessage(message.toString(), userCurrentChannel, ws);

      return;
    }

    switch (String(parsedMessage[0]).toLowerCase()) {
      case "/part": {
        if (userCurrentChannel === "undefined") {
          ws.send(
            formatClientMsg(
              SERVER_NICK,
              "Error: You're not in any channel. There's nowhere to part of."
            )
          );
          break;
        }

        removeUserFromChannel(userCurrentChannel, clientId);

        ws.send(
          formatClientMsg(
            SERVER_NICK,
            `You left the channel #${userCurrentChannel}`
          )
        );

        broadcastChannelMessage(
          `${clientNick} left ${userCurrentChannel}`,
          userCurrentChannel,
          ws,
          true
        );

        break;
      }

      case "/join": {
        if (userCurrentChannels.length > 0) {
          ws.send(
            formatClientMsg(
              SERVER_NICK,
              `Error: You alread joined: ${userCurrentChannels.join(", ")}`
            )
          );
          ws.send(formatClientMsg(SERVER_NICK, `Try /part before /join`));
          break;
        }

        if (!parsedMessage[1]) {
          ws.send(
            formatClientMsg(
              SERVER_NICK,
              `Did you forget to add a channel name? Try "/join #help"`
            )
          );
          break;
        }

        if (!parsedMessage[1].match(/^#/)) {
          ws.send(
            formatClientMsg(
              SERVER_NICK,
              `Did you forget to prefix the channel name with #? Try "/join #help"`
            )
          );
          break;
        }

        const channelName = parsedMessage[1].split("#")[1].toLowerCase();

        if (!channelName) {
          ws.send(
            formatClientMsg(
              SERVER_NICK,
              `Did you forget to provide a name to your channel? Try "/join #help"`
            )
          );
          break;
        }

        if (!checkChannelExistence(getState().channels, channelName)) {
          createChannel(channelName);
        }

        addUserToChannel(channelName, clientId);

        broadcastChannelMessage(
          `${clientNick} just joined #${channelName}!`,
          channelName,
          ws,
          true
        );
        listChannelUsers(channelName, ws);

        break;
      }

      case "/quit":
        if (userCurrentChannel !== "undefined")
          broadcastChannelMessage(
            `${clientNick} has disconnected...`,
            userCurrentChannel,
            ws,
            true
          );
        ws.send(formatClientMsg(SERVER_NICK, "You are now disconnected. Bye!"));
        ws.close();

        removeUserFromServer(clientId);
        break;

      case "/channels":
        ws.send(
          formatClientMsg(
            SERVER_NICK,
            `Server channels: ${Object.keys(store.getState().channels)
              .map((chan: string) => `#${chan}`)
              .join(", ")}`
          )
        );
        break;

      case "/users": {
        if (userCurrentChannels.length === 0) {
          ws.send(
            formatClientMsg(
              SERVER_NICK,
              "Error: You're not inside any channel. Try /join #channel_name"
            )
          );
          break;
        }

        listChannelUsers(userCurrentChannel, ws);
        break;
      }

      case "/nick": {
        const nickName = parsedMessage[1];

        if (!nickName) {
          ws.send(
            formatClientMsg(
              SERVER_NICK,
              `Did you forget to send a nickname? Try "/nick Dory"`
            )
          );
          break;
        }

        if (
          getState()
            .clientsNicks.map((nick: string) => String(nick).toLowerCase())
            .includes(String(nickName).toLowerCase())
        ) {
          ws.send(
            formatClientMsg(
              SERVER_NICK,
              `This nick is already taken, choose another one.`
            )
          );
          break;
        }

        changeNick(clientId, nickName);

        if (userCurrentChannel !== "undefined")
          broadcastChannelMessage(
            `${clientNick} changed its nickname to: ${nickName}!`,
            userCurrentChannel,
            ws,
            true
          );

        ws.send(
          formatClientMsg(SERVER_NICK, `Your nickname is now: ${nickName}`)
        );
        break;
      }

      default:
        ws.send(formatClientMsg(SERVER_NICK, `Command not recognized!`));
        break;
    }
  });
});

const { getState } = store;

const interval = setInterval(() => {
  const clientsArray = Array.from(wss.clients) as ExtendedWebSocket[];
  for (const ws of clientsArray) {
    if (ws.isAlive === false) {
      changeNick(getState().clients.indexOf(ws), "no_longer_online");
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);

wss.on("close", () => {
  clearInterval(interval);
});

// TODO:
//       - periodical heartbeat to each client and cleanup
//       - periodical empty channel cleanup
//       - configurable max client limit
//       - configurable server password
