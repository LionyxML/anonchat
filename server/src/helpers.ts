import { IStoreState, IChannels } from "./index.d";
import { store } from ".";
import { SERVER_NICK } from "./config";
import WebSocket from "ws";

export const formatClientMsg = (senderNick: string, message: string) =>
  JSON.stringify({
    senderNick,
    message,
    timestamp: Date.now().toString(),
  });

export const currentUserChannels = (client: number): Array<string | null> => {
  const { channels } = store.getState();

  return Object.keys(channels)
    .map((chan) => (channels[chan].includes(client) ? chan : null))
    .filter(Boolean);
};

export const broadcastChannelMessage = (
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
    getState().clients[clientNumber] &&
      getState().clients[clientNumber].send(channelMessage);
  }
};

export const checkChannelExistence = (
  allChannels: IChannels,
  channelName: string
): boolean => Object.keys(allChannels).includes(channelName);

export const createChannel = (channelName: string) => {
  const { setState } = store;

  setState((state: IStoreState) => ({
    ...state,
    channels: {
      ...state.channels,
      [channelName]: [],
    },
  }));
};

export const addClient = (ws: WebSocket) => {
  const { setState } = store;

  setState((state: IStoreState) => ({
    ...state,
    clients: [...state.clients, ws],
  }));
};

export const addClientNick = (nick: string) => {
  const { setState } = store;

  setState((state: IStoreState) => ({
    ...state,
    clientsNicks: [...state.clientsNicks, nick],
  }));
};

export const addUserToChannel = (channelName: string, clientId: number) => {
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

export const removeUserFromChannel = (
  channelName: string,
  clientId: number
) => {
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

export const removeUserFromServer = (clientId: number) => {
  const currentState = { ...store.getState() };
  const newState = {
    ...currentState,
    clients: currentState.clients
      .splice(0, clientId)
      .concat(currentState.clients.splice(clientId + 1)),
    clientsNicks: currentState.clientsNicks
      .splice(0, clientId)
      .concat(currentState.clientsNicks.splice(clientId + 1)),
  };

  store.setState(() => ({ ...newState }));
};

export const changeNick = (clientId: number, nickName: string) => {
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
