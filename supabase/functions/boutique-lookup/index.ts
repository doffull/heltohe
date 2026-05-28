// Boutique lookup via Google Places API (New) through the Lovable connector gateway.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

interface Candidate {
  placeId: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  image: string | null;
}

function extractComponent(components: any[], type: string): string {
  const c = components?.find((c) => c.types?.includes(type));
  return c?.longText || c?.shortText || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Google Maps connector not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query } = await req.json().catch(() => ({}));
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'query (min 3 chars) required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents,places.photos',
      },
      body: JSON.stringify({
        textQuery: query.trim(),
        languageCode: 'fr',
        regionCode: 'FR',
        maxResultCount: 5,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Places API error', res.status, text);
      return new Response(JSON.stringify({ error: 'Places API failed', detail: text }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const candidates: Candidate[] = (data.places || []).map((p: any) => {
      const streetNum = extractComponent(p.addressComponents, 'street_number');
      const route = extractComponent(p.addressComponents, 'route');
      const street = `${streetNum} ${route}`.trim();
      return {
        placeId: p.id,
        name: p.displayName?.text || query,
        address: street || (p.formattedAddress?.split(',')[0] || ''),
        postalCode: extractComponent(p.addressComponents, 'postal_code'),
        city: extractComponent(p.addressComponents, 'locality')
          || extractComponent(p.addressComponents, 'postal_town'),
        country: extractComponent(p.addressComponents, 'country') || 'France',
        lat: p.location?.latitude || 0,
        lng: p.location?.longitude || 0,
        image: null,
      };
    });

    return new Response(JSON.stringify({ candidates }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
