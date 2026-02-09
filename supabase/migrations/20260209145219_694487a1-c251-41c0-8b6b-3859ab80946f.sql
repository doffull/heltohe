
-- Create pages table for custom pages and category pages
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'custom', -- 'custom' | 'category'
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  meta_title TEXT,
  meta_description TEXT,
  seo_keywords TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  menu_link TEXT, -- optional: where to link in nav (e.g. '/boutique/homme' or '/homme')
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view published pages" ON public.pages
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage pages" ON public.pages
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update timestamp
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create a page when a category is inserted
CREATE OR REPLACE FUNCTION public.auto_create_category_page()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pages (title, slug, type, category_id, is_published, sections)
  VALUES (
    NEW.title,
    COALESCE(NEW.slug, lower(replace(NEW.title, ' ', '-'))),
    'category',
    NEW.id,
    true,
    '[]'::jsonb
  )
  ON CONFLICT (slug) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_create_category_page_trigger
  AFTER INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_category_page();
