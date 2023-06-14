import { WebSocket } from "ws";

export interface IChannels {
  [key: string]: number[];
}

export interface IStoreState {
  clients: WebSocket[];
  channels: IChannels;
  clientsNicks: string[];
}

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}
