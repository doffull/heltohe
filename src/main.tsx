import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installConsoleRingBuffer } from "./lib/clientErrorLogger";

installConsoleRingBuffer();

createRoot(document.getElementById("root")!).render(<App />);
