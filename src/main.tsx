import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { installConsoleRingBuffer } from "./lib/clientErrorLogger";
import { enforceLicense } from "./lib/licenseGuard";

installConsoleRingBuffer();

// Ouvre la connexion vers l'origine des médias au plus tôt : sur iOS/Safari,
// la négociation TLS tardive est la principale cause d'images lentes à charger.
try {
  const mediaOrigin = new URL(import.meta.env.VITE_SUPABASE_URL as string).origin;
  for (const rel of ["preconnect", "dns-prefetch"]) {
    const link = document.createElement("link");
    link.rel = rel;
    link.href = mediaOrigin;
    if (rel === "preconnect") link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
} catch {
  /* origine média indisponible : rien à précharger */
}

const container = document.getElementById("root")!;


// Verrou de domaine : bloque le montage si le déploiement n'est pas licencié.
if (enforceLicense(container)) {
  createRoot(container).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  );
}
