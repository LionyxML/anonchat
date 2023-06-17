/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { CssBaseline, ThemeProvider, createTheme } from "@suid/material";
import { createSignal } from "solid-js";

const [theme, setTheme] = createSignal(
  createTheme({
    palette: {
      mode: "dark",
    },
  })
);

render(
  () => (
    <>
      <ThemeProvider theme={theme()}>
        <CssBaseline sx={{ fontFamily: "Space Mono" }} />
        <App />
      </ThemeProvider>
    </>
  ),
  document.getElementById("root")!
);
