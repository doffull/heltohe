import { defineConfig } from "vite";
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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
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
}));
