ALTER TABLE public.checkout_config
ADD COLUMN relay_map_settings JSONB NOT NULL DEFAULT '{
  "markerColor": "#3B82F6",
  "selectedMarkerColor": "#EF4444",
  "tileStyle": "standard",
  "defaultZoom": 13,
  "searchRadius": 10
}'::jsonb;