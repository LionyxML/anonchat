import WebSocket, { WebSocketServer } from "ws";

const clients: WebSocket.WebSocket[] = [];

const clientsNicks: string[] = [];

const channels: { [key: string]: number[] } = {
  help: [],
};

const wss = new WebSocketServer({ port: 6969 }, () =>
  console.log(">>> AnonChat Server Loaded")
);

wss.on("connection", (ws) => {
  console.log("New client connected");
  clients.push(ws);
  clientsNicks.push(`client#${clients.indexOf(ws)}`);

  ws.send(`
  Welcome to the server!
  
  Clients count: ${clients.length}
  Your nickname is ${clientsNicks[clients.indexOf(ws)]}
  
  /list                 - lists all channels
  /nick [new_nickname]  - changes your nickname
  /join [#channel]      - joins #channel creating it if needed
  /part                 - leaves the channel
  /quit                 - exits the server
  `);

  ws.on("message", (message) => {
    const parsedMessage = message.toString().split(" ");

    if (parsedMessage.length === 0) return;

    const isCommand = String(parsedMessage[0]).match(/^\//);

    if (!isCommand) {
      // broadcast to channel
      // error if not inside channel
      return;
    }

    switch (parsedMessage[0].toLowerCase()) {
      case "/join":
        console.log("someone tryed to join");
        break;

      case "/nick":
        if (!parsedMessage[1]) {
          // check for used nickname
          ws.send(`Did you forgot to send a nickname? try "/nick minion$"`);
          break;
        }
        clientsNicks[clients.indexOf(ws)] = parsedMessage[1];
        ws.send(`Your nickname is now ${parsedMessage[1]}`);
        break;

      default:
        return;
    }
  });
});
