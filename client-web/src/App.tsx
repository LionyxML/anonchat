import {
  AppBar,
  Box,
  Grid,
  IconButton,
  TextField,
  Toolbar,
  Typography,
} from "@suid/material";
import { createSignal, onCleanup, onMount, on } from "solid-js";

let chatAreaBottomRef;
let socket;
const url = import.meta.env.VITE_SERVER_URL || "ws://localhost:6969";

const connectWebSocket = (setSocketState, setMessages) => {
  socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    setSocketState(WebSocket.OPEN);
    setMessages((state) => [...state, "Connected!"]);
  });

  socket.addEventListener("message", (event) => {
    setMessages((state) => [...state, event.data]);
    chatAreaBottomRef?.scrollIntoView(false);
  });

  socket.addEventListener("close", () => {
    setSocketState(WebSocket.CLOSED);
    setMessages((state) => [
      ...state,
      "Connection Closed! Trying to reconnect...",
    ]);
    setTimeout(() => connectWebSocket(setSocketState, setMessages), 3000);
  });
};

const getConnectionStatus = (socketState) => {
  if (socketState === WebSocket.CONNECTING)
    return <span title="Connecting">🟡</span>;
  if (socketState === WebSocket.OPEN) return <span title="Connected">🟢</span>;
  if (socketState === WebSocket.CLOSED)
    return <span title="Disconnected">🔴</span>;
};

const Message = ({ message }) => {
  let msg;
  try {
    msg = JSON.parse(message);
  } catch {
    msg = message;
  }

  return typeof msg === "object" && msg !== null ? (
    <Grid sx={{ display: "flex", fontSize: "14px" }}>
      <Box
        sx={{
          border: 0,
          borderRadius: 2,
          p: 1,
          m: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {new Date(Number(msg?.timestamp)).toLocaleTimeString()}
      </Box>
      <Box
        sx={{
          border: 1,
          borderRadius: 2,
          p: 1,
          m: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {msg?.senderNick}
      </Box>
      <Box
        sx={{
          p: 0,
          m: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg?.message}
      </Box>
    </Grid>
  ) : (
    <Grid>
      <Typography
        sx={{ opacity: 0.3, fontSize: "14px", fontFamily: "Space Mono" }}
      >
        {msg}
      </Typography>
    </Grid>
  );
};

export default function App() {
  const [socketState, setSocketState] = createSignal(WebSocket.CONNECTING);
  const [messages, setMessages] = createSignal([]);

  onMount(() => {
    setMessages((messages) => [
      ...messages,
      `Connecting... ${import.meta.env.VITE_SERVER_URL}`,
    ]);
    connectWebSocket(setSocketState, setMessages);
  });

  // onCleanup(() => {
  //   if (socket && socket.readyState === WebSocket.OPEN) {
  //     socket.close();
  //   }
  // });

  const onKeyPress = (e) => {
    if (e.key === "Enter") {
      const msg = String(e.target.value).trim();
      if (msg) {
        socket.send(msg);
        chatAreaBottomRef.scrollIntoView(false);
      }
      e.target.value = "";
    }
  };

  return (
    <Grid
      sx={{
        height: "100vh",
        paddingTop: 0,
        fontFamily: "Space Mono",
      }}
    >
      <Grid>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
            >
              {">_"}
            </IconButton>
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, fontFamily: "Space Mono" }}
            >
              {`AnonChat - ${
                import.meta.env["VITE_APP_SERVER_NAME"] || "Anonymous Server"
              } `}
              {getConnectionStatus(socketState())}
            </Typography>
          </Toolbar>
        </AppBar>
      </Grid>
      <Grid
        sx={{
          p: 3,
          height: "82vh",
          overflowY: "auto",
        }}
      >
        {messages().map((message) => (
          <Message message={message} />
        ))}
        <div ref={chatAreaBottomRef} style={{ opacity: 0 }}>
          _
        </div>
      </Grid>
      <Grid sx={{ p: 3, position: "fixed", bottom: 0, width: "100%" }}>
        <TextField
          fullWidth
          placeholder="Interact here..."
          onKeyPress={onKeyPress}
          autoFocus
        />
      </Grid>
    </Grid>
  );
}
