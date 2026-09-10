-- Create messages table for contact form
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a message (with email validation)
CREATE POLICY "Anyone can submit messages"
ON public.messages
FOR INSERT
WITH CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update messages (mark as read)
CREATE POLICY "Admins can update messages"
ON public.messages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));