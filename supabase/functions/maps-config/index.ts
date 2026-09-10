// Fournit la clé Google Maps "navigateur" au site.
// Les clés Maps JavaScript sont publiques par conception : la sécurité est
// assurée par la restriction HTTP referrer (helvetica-mp.com) configurée
// dans Google Cloud Console, pas par le secret de la clé.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const key = Deno.env.get('GOOGLE_API_KEY');
  if (!key) {
    return new Response(JSON.stringify({ error: 'Clé Google Maps non configurée' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ key }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
