import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Plug, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ToolSpec = {
  name: string;
  title: string;
  description: string;
  auth: 'public' | 'user';
  input: { key: string; type: string; required?: boolean; description: string }[];
  output: string;
};

const TOOLS: ToolSpec[] = [
  {
    name: 'list_products',
    title: 'Liste des produits',
    description: 'Retourne les produits actifs du catalogue HELVETICA-MP (filtrable par catégorie, recherche, prix).',
    auth: 'public',
    input: [
      { key: 'query', type: 'string?', description: 'Recherche texte sur le nom / SKU.' },
      { key: 'categorySlug', type: 'string?', description: 'Slug de catégorie (ex. "homme").' },
      { key: 'limit', type: 'number (1-100)', description: 'Nombre max de résultats.' },
    ],
    output: '{ products: Product[] }',
  },
  {
    name: 'get_product',
    title: "Détail d'un produit",
    description: "Toutes les informations d'un produit par UUID ou SKU.",
    auth: 'public',
    input: [{ key: 'idOrSku', type: 'string', required: true, description: 'UUID ou SKU.' }],
    output: '{ product: Product }',
  },
  {
    name: 'list_boutiques',
    title: 'Boutiques physiques',
    description: 'Liste des boutiques HELVETICA-MP actives (adresse, ville, GPS).',
    auth: 'public',
    input: [],
    output: '{ boutiques: Boutique[] }',
  },
  {
    name: 'list_my_orders',
    title: 'Mes commandes',
    description: "Commandes de l'utilisateur connecté, les plus récentes d'abord.",
    auth: 'user',
    input: [
      { key: 'limit', type: 'number (1-50)', description: 'Défaut 10.' },
      { key: 'status', type: 'string?', description: 'pending, shipped, delivered, cancelled…' },
    ],
    output: '{ orders: Order[] }',
  },
  {
    name: 'get_my_order',
    title: "Détail d'une commande",
    description: "Détail complet (articles, suivi, montants) d'une commande de l'utilisateur.",
    auth: 'user',
    input: [{ key: 'orderNumber', type: 'string', required: true, description: 'Numéro de commande.' }],
    output: '{ order: Order }',
  },
  {
    name: 'my_loyalty',
    title: 'Mon programme de fidélité',
    description: "Points, palier et historique de l'utilisateur connecté.",
    auth: 'user',
    input: [],
    output: '{ points: number, tier: string, history: Entry[] }',
  },
  {
    name: 'list_wishlist',
    title: 'Ma liste de souhaits',
    description: 'Produits favoris de l’utilisateur connecté.',
    auth: 'user',
    input: [],
    output: '{ items: WishlistItem[] }',
  },
  {
    name: 'add_to_wishlist',
    title: 'Ajouter aux favoris',
    description: 'Ajoute un produit à la wishlist (idempotent).',
    auth: 'user',
    input: [{ key: 'productId', type: 'uuid', required: true, description: 'UUID du produit.' }],
    output: '{ item: WishlistItem }',
  },
  {
    name: 'remove_from_wishlist',
    title: 'Retirer des favoris',
    description: 'Retire un produit de la wishlist.',
    auth: 'user',
    input: [{ key: 'productId', type: 'uuid', required: true, description: 'UUID du produit.' }],
    output: '{ removed: boolean }',
  },
  {
    name: 'list_my_addresses',
    title: 'Mes adresses',
    description: "Adresses de livraison enregistrées de l'utilisateur.",
    auth: 'user',
    input: [],
    output: '{ addresses: Address[] }',
  },
];

const PROJECT_REF = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? '';
const MCP_URL = PROJECT_REF ? `https://${PROJECT_REF}.supabase.co/functions/v1/mcp` : '';

type TestState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'ok'; message: string; details?: string }
  | { status: 'error'; message: string; details?: string };

export default function AdminAgentIntegrations() {
  const [test, setTest] = useState<TestState>({ status: 'idle' });

  async function runTest() {
    setTest({ status: 'running' });
    try {
      if (!MCP_URL) {
        setTest({ status: 'error', message: 'URL MCP indisponible (project ref manquant).' });
        return;
      }

      // On interroge la découverte OAuth (endpoint public) : appeler directement
      // tools/list avec un jeton de session applicative renverrait toujours 401,
      // ce qui est le comportement attendu du serveur MCP mais pollue les logs.
      const res = await fetch(`${MCP_URL}/.well-known/oauth-protected-resource`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const text = await res.text();

      if (!res.ok) {
        setTest({
          status: 'error',
          message: `HTTP ${res.status} — ${res.statusText}`,
          details: text.slice(0, 800),
        });
        return;
      }

      let payload: any = null;
      try { payload = JSON.parse(text); } catch { /* ignore */ }

      setTest({
        status: 'ok',
        message: 'Serveur MCP en ligne — OAuth actif ✅',
        details:
          `Ressource : ${payload?.resource ?? MCP_URL}\n` +
          `Serveur d’autorisation : ${payload?.authorization_servers?.[0] ?? '—'}\n` +
          `${TOOLS.length} outil(s) déclarés.\n` +
          'Seuls les clients OAuth enregistrés (Claude, ChatGPT, Cursor…) peuvent appeler les outils : ajoutez l’URL MCP ci-dessus dans votre client IA, puis approuvez la connexion sur l’écran de consentement.',
      });
    } catch (err: any) {
      setTest({ status: 'error', message: err?.message ?? 'Erreur réseau.' });
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Plug className="w-6 h-6 text-primary" /> Agent integrations (MCP)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exposez la boutique aux assistants IA (Claude, ChatGPT, Cursor…) via MCP. 10 outils sont
          disponibles — 3 en lecture publique, 7 sécurisés par OAuth Supabase.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Point de connexion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-xs bg-muted rounded px-2 py-1 break-all">{MCP_URL || '—'}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(MCP_URL);
                toast.success('URL MCP copiée');
              }}
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Copier
            </Button>
            <a
              href="https://modelcontextprotocol.io/clients"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
            >
              Clients compatibles <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={runTest} disabled={test.status === 'running'}>
              {test.status === 'running' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Test en cours…</>
              ) : (
                <>Tester l’accès OAuth</>
              )}
            </Button>
            {test.status === 'ok' && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>
            )}
            {test.status === 'error' && (
              <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Échec</Badge>
            )}
          </div>

          {test.status === 'ok' && (
            <Alert>
              <AlertTitle>{test.message}</AlertTitle>
              {test.details && (
                <AlertDescription>
                  <pre className="text-xs whitespace-pre-wrap mt-2">{test.details}</pre>
                </AlertDescription>
              )}
            </Alert>
          )}
          {test.status === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>{test.message}</AlertTitle>
              {test.details && (
                <AlertDescription>
                  <pre className="text-xs whitespace-pre-wrap mt-2">{test.details}</pre>
                </AlertDescription>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {TOOLS.map((t) => (
          <Card key={t.name}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <code className="text-[11px] text-muted-foreground">{t.name}</code>
                </div>
                <Badge variant={t.auth === 'user' ? 'default' : 'secondary'}>
                  {t.auth === 'user' ? 'OAuth utilisateur' : 'Public'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t.description}</p>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Entrée
                </div>
                {t.input.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">Aucun paramètre.</p>
                ) : (
                  <ul className="text-xs space-y-1">
                    {t.input.map((i) => (
                      <li key={i.key} className="flex flex-wrap gap-x-2">
                        <code className="text-primary">{i.key}</code>
                        <span className="text-muted-foreground">{i.type}</span>
                        {i.required && <Badge variant="outline" className="h-4 text-[9px] px-1">requis</Badge>}
                        <span className="text-muted-foreground w-full pl-4">— {i.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Sortie
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded block">{t.output}</code>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
