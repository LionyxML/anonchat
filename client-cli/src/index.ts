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
    console.log(" AnonChat - Server tried to send a message but couldn't :(");
  }

  const { senderNick, message, timestamp } = serverMsg;

  const time = new Date(Number(timestamp)).toLocaleTimeString();
  console.log(`[${time}] [${senderNick}]: ${message}`);
});

ws.on("close", () => {
  console.log("  AnonChat - Disconnected from the server");
  process.exit(0);
});

rl.on("line", (input) => {
  ws.send(input);

  rl.prompt();
  process.stdout.write("\u001B[1A\u001B[2K");
});

rl.on("close", () => {
  console.log(
    "  AnonChat - Exiting the client. Shame on you. Use /quit next time."
  );
  process.exit(0);
});
