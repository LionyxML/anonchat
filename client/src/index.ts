import WebSocket from "ws";
import * as readline from "node:readline";

const ws = new WebSocket("ws://localhost:6969");

const rl = readline.createInterface({
  input: process.stdin,
});

ws.on("open", () => {
  console.log("  AnonChat - Connected to the server\n");

  rl.prompt();
});

ws.on("message", (byteMsg) => {
  let serverMsg = { senderNick: "", message: "", timestamp: "" };

  try {
    serverMsg = JSON.parse(byteMsg.toString());
  } catch {
    console.log(" AnnonChat - Server tried to send a message but couldn't :(");
  }

  const { senderNick, message, timestamp } = serverMsg;

  const time = new Date(Number(timestamp)).toLocaleTimeString();
  console.log(`[${time}] [${senderNick}]: ${message}`);
});

ws.on("close", () => {
  console.log("  AnnonChat - Disconnected from the server");
  process.exit(0);
});

rl.on("line", (input) => {
  ws.send(input);

  rl.prompt();
});

rl.on("close", () => {
  console.log("  AnnonChat - Exiting the client");
  process.exit(0);
});
