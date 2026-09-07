import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import obfuscator from "javascript-obfuscator";

/**
 * Build protégé : obfusque le JS émis (uniquement quand PROTECT=1),
 * utilisé par `bun run build:protected` avant livraison à un tiers.
 */
const protectPlugin = () => ({
  name: "lvtk-protect",
  apply: "build" as const,
  enforce: "post" as const,
  generateBundle(_options: unknown, bundle: Record<string, any>) {
    for (const file of Object.values(bundle)) {
      if (file.type !== "chunk" || !file.fileName.endsWith(".js")) continue;
      file.code = obfuscator
        .obfuscate(file.code, {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.4,
          deadCodeInjection: false,
          debugProtection: false,
          identifierNamesGenerator: "mangled-shuffled",
          numbersToExpressions: true,
          selfDefending: true,
          simplify: true,
          splitStrings: true,
          splitStringsChunkLength: 8,
          stringArray: true,
          stringArrayEncoding: ["base64"],
          stringArrayThreshold: 0.7,
          target: "browser",
          transformObjectKeys: false,
          unicodeEscapeSequence: false,
        })
        .getObfuscatedCode();
    }
  },
});

/**
 * Injecte le domaine du site dans index.html à la place de `%VITE_SITE_URL%`.
 *
 * Vite sait déjà substituer les `%VITE_*%`, mais laisse le marqueur brut dans la
 * page — avec un simple avertissement — quand la variable n'est pas définie. Or
 * `.env` est ignoré par git : un clone neuf ou une CI sans variable produirait un
 * `og:url` valant littéralement `%VITE_SITE_URL%/`. Ce plugin passe avant le cœur
 * de Vite et applique le même repli que `src/lib/site.ts`.
 */
const siteUrlHtmlPlugin = () => ({
  name: "lvtk-site-url-html",
  enforce: "pre" as const,
  transformIndexHtml(html: string) {
    const siteUrl = (process.env.VITE_SITE_URL || "https://helvetica-mp.com").replace(/\/+$/, "");
    return html.replaceAll("%VITE_SITE_URL%", siteUrl);
  },
});

const BACKEND_PUBLIC_FALLBACKS = {
  VITE_SUPABASE_URL: "https://hzjzqdlyehclnpeqkier.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_E7HZqc2XeZCzTCsse1l1gg_jHGHVoJl",
  VITE_SUPABASE_PROJECT_ID: "hzjzqdlyehclnpeqkier",
} as const;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: Object.fromEntries(
      Object.entries(BACKEND_PUBLIC_FALLBACKS).map(([key, fallback]) => [
        `import.meta.env.${key}`,
        JSON.stringify(env[key] || fallback),
      ]),
    ),
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      siteUrlHtmlPlugin(),
      react(),
      mode === "development" && componentTagger(),
      mcpPlugin(),
      process.env.PROTECT === "1" && protectPlugin(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
