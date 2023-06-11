import WebSocket, { WebSocketServer } from "ws";
import { createStore } from "./store";

const SERVER_NAME = "AnnonChat";
const SERVER_NICK = "SERVER";

interface IChannels {
  [key: string]: number[];
}

interface IStoreState {
  clients: WebSocket[];
  channels: IChannels;
  clientsNicks: string[];
}

const store = createStore<IStoreState>(() => ({
  clients: [],
  channels: {
    help: [],
  },
  clientsNicks: [],
}));

const formatClientMsg = (senderNick: string, message: string) =>
  JSON.stringify({
    senderNick,
    message,
    timestamp: Date.now().toString(),
  });

const currentUserChannels = (client: number): Array<string | null> => {
  const { channels } = store.getState();

  return Object.keys(channels)
    .map((chan) => (channels[chan].includes(client) ? chan : null))
    .filter(Boolean);
};

const broadcastChannelMessage = (
  message: string,
  channel: string,
  wsClient: WebSocket,
  isServerMessage = false
) => {
  const { getState } = store;

  const senderNick =
    getState().clientsNicks[getState().clients.indexOf(wsClient)];
  const channelClients = getState().channels[channel];
  const channelMessage = formatClientMsg(
    isServerMessage ? SERVER_NICK : senderNick,
    message
  );

  for (const clientNumber of channelClients) {
    getState().clients[clientNumber].send(channelMessage);
  }
};

const checkChannelExistence = (
  allChannels: IChannels,
  channelName: string
): boolean => Object.keys(allChannels).includes(channelName);

const createChannel = (channelName: string) => {
  const { setState } = store;

  setState((state: IStoreState) => ({
    ...state,
    channels: {
      ...state.channels,
      [channelName]: [],
    },
  }));
};

const addClient = (ws: WebSocket) => {
  const { setState } = store;

  setState((state: IStoreState) => ({
    ...state,
    clients: [...state.clients, ws],
  }));
};

const addClientNick = (nick: string) => {
  const { setState } = store;

  setState((state: IStoreState) => ({
    ...state,
    clientsNicks: [...state.clientsNicks, nick],
  }));
};

const addUserToChannel = (channelName: string, clientId: number) => {
  const { setState } = store;

  setState((state: IStoreState) => {
    return {
      ...state,
      channels: {
        ...state.channels,
        ...{
          [channelName]: [...(state.channels[channelName] || {}), clientId],
        },
      },
    };
  });
};

const removeUserFromChannel = (channelName: string, clientId: number) => {
  const { setState, getState } = store;

  const newChannelUserList = [...getState().channels[channelName]].filter(
    (channelVisitorId) => channelVisitorId !== clientId
  );

  setState((state: IStoreState) => {
    return {
      ...state,
      channels: {
        ...state.channels,
        ...{
          [channelName]: [...newChannelUserList],
        },
      },
    };
  });
};

const changeNick = (clientId: number, nickName: string) => {
  const { setState, getState } = store;

  const newClientsNicks = [...getState().clientsNicks];

  newClientsNicks.splice(clientId, 1);
  newClientsNicks.splice(clientId, 0, nickName);

  setState((state: IStoreState) => {
    return {
      ...state,
      clientsNicks: [...newClientsNicks],
    };
  });
};

const wss = new WebSocketServer({ port: 6969 }, () =>
  console.log(">>> AnonChat Server Loaded")
);

wss.on("connection", (ws) => {
  const { getState } = store;
  console.log("New client connected");

  addClient(ws);

  addClientNick(`client#${getState().clients.indexOf(ws)}`);

  ws.send(
    formatClientMsg(
      SERVER_NICK,
      `
  |
  | Welcome to the server ${SERVER_NAME}!
  |
  | Clients count: ${getState().clients.length}
  | Your nickname is ${getState().clientsNicks[getState().clients.indexOf(ws)]}
  |
  | /channels             - lists all channels
  | /nick [new_nickname]  - changes your nickname
  | /join [#channel]      - joins #channel creating it if needed
  | /part                 - leaves the channel
  | /quit                 - exits the server
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

    switch (parsedMessage[0].toLowerCase()) {
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

        break;
      }

      case "/quit":
        // just send message
        // send a message of quiting to channel
        // on disconnect: free nickname, channels and ws clients array
        break;

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
            .clientsNicks.map((nick: string) => nick.toLowerCase())
            .includes(nickName.toLowerCase())
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

        if (!(userCurrentChannel === "undefined"))
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
