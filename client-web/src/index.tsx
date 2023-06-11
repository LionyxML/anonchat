/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { CssBaseline } from "@suid/material";

render(
  () => (
    <>
      <CssBaseline sx={{ fontFamily: "Space Mono" }} />
      <App />
    </>
  ),
  document.getElementById("root")!
);
