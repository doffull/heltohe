
-- Table de configuration du chatbot Helvetica
CREATE TABLE public.bot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt text NOT NULL DEFAULT 'Tu es Helvetica, l''expert mode de LVTK6.',
  suggestions jsonb DEFAULT '[]'::jsonb,
  bot_name text DEFAULT 'Helvetica',
  bot_avatar text,
  welcome_message text DEFAULT 'Bonjour ! Je suis Helvetica, votre expert mode LVTK6. Comment puis-je vous aider ?',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bot config"
  ON public.bot_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage bot config"
  ON public.bot_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table de logs des conversations
CREATE TABLE public.chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_message text,
  bot_response text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert chat logs"
  ON public.chat_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view chat logs"
  ON public.chat_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bot_config_updated_at
  BEFORE UPDATE ON public.bot_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
