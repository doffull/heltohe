import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { installConsoleRingBuffer } from "./lib/clientErrorLogger";
import { enforceLicense } from "./lib/licenseGuard";

installConsoleRingBuffer();

const container = document.getElementById("root")!;

// Verrou de domaine : bloque le montage si le déploiement n'est pas licencié.
if (enforceLicense(container)) {
  createRoot(container).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  );
}
