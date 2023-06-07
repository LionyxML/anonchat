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

ws.on("message", (message) => {
  console.log(message.toString());
});

ws.on("close", () => {
  console.log("  AnnonChat - Disconnected from the server");
});

rl.on("line", (input) => {
  ws.send(input);

  rl.prompt();
});

rl.on("close", () => {
  console.log("  AnnonChat - Exiting the client");
  process.exit(0);
});
