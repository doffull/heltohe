import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
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

const container = document.getElementById("root");

function renderStartupError(title: string, detail: string) {
  if (!container) return;
  container.innerHTML = `
    <div role="alert" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Helvetica,Arial,sans-serif;text-align:center">
      <div>
        <h1 style="font-size:14px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 12px">${title}</h1>
        <p style="font-size:13px;opacity:.7;margin:0">${detail}</p>
      </div>
    </div>`;
}

/**
 * Garde-fou de configuration : sans URL/clé backend, le client lève
 * « supabaseUrl is required » avant tout rendu → page blanche totale.
 * On affiche un message lisible au lieu d'un écran vide.
 */
const missingEnv = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].filter(
  (key) => !(import.meta.env as Record<string, string | undefined>)[key],
);

if (!container) {
  console.error("Élément #root introuvable : montage de l'application impossible.");
} else if (missingEnv.length > 0) {
  renderStartupError("Configuration incomplète", `Variables manquantes : ${missingEnv.join(", ")}.`);
} else if (enforceLicense(container)) {
  // App est chargée seulement après la validation de la configuration : un client
  // backend mal configuré ne peut plus interrompre le garde-fou avant son rendu.
  import("./App.tsx")
    .then(({ default: App }) => {
      createRoot(container).render(
        <HelmetProvider>
          <App />
        </HelmetProvider>,
      );
    })
    .catch((error: unknown) => {
      console.error("Échec du démarrage de l'application :", error);
      renderStartupError(
        "Chargement indisponible",
        "Le site n’a pas pu démarrer. Actualisez la page dans quelques instants.",
      );
    });
}
