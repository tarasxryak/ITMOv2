import "@fontsource-variable/comfortaa"
import "@fontsource-variable/exo-2"
import "@fontsource-variable/onest"
import "@fontsource-variable/tektur"
import "@fontsource-variable/unbounded"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
