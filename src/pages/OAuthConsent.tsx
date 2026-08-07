import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";

// Beta namespace — provide a local typed shim so TS accepts the calls.
type OAuthAPI = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const authOAuth = (supabase.auth as unknown as { oauth: OAuthAPI }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Paramètre authorization_id manquant.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await authOAuth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await authOAuth.approveAuthorization(authorizationId)
        : await authOAuth.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("Aucune URL de redirection renvoyée par le serveur d'autorisation.");
      }
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full border rounded-lg p-6 bg-card">
          <h1 className="text-xl font-bold mb-2">Impossible de traiter la demande</h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>Retour à l'accueil</Button>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement de la demande d'autorisation…
        </div>
      </main>
    );
  }

  const clientName = details.client?.name ?? "Une application externe";
  const redirectUri = details.client?.redirect_uri ?? details.client?.redirect_uris?.[0];
  const scopes: string[] = Array.isArray(details.scopes)
    ? details.scopes
    : typeof details.scope === "string"
      ? details.scope.split(" ").filter(Boolean)
      : [];

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-lg w-full border rounded-lg p-6 bg-card space-y-5">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Connecter {clientName} à HELVETICA-MP</h1>
            <p className="text-sm text-muted-foreground">
              L'application pourra utiliser les outils HELVETICA-MP activés en agissant comme vous.
            </p>
          </div>
        </div>

        {redirectUri && (
          <div className="text-xs text-muted-foreground">
            <div className="font-semibold text-foreground/80 mb-1">Redirection après connexion</div>
            <code className="break-all">{redirectUri}</code>
          </div>
        )}

        <div className="text-sm space-y-2">
          <div className="font-semibold">Ce que {clientName} pourra faire :</div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Consulter votre profil (nom, e-mail).</li>
            <li>Utiliser les outils HELVETICA-MP exposés (commandes, fidélité, favoris) en votre nom.</li>
            {scopes.length > 0 && scopes.map((s) => <li key={s}>Portée demandée : <code>{s}</code></li>)}
          </ul>
          <p className="text-xs text-muted-foreground pt-2">
            Cela ne contourne pas les règles de sécurité HELVETICA-MP : chaque action reste soumise à vos droits d'utilisateur.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
            {busy ? "…" : "Autoriser"}
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">
            Refuser
          </Button>
        </div>
      </div>
    </main>
  );
}
