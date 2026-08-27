ALTER TABLE public.bot_config
  ADD COLUMN IF NOT EXISTS chat_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS voice_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS ai_default_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS ai_vision_model text NOT NULL DEFAULT 'google/gemini-2.5-pro';