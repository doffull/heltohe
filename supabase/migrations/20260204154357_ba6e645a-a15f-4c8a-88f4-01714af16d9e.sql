-- Create app_role enum for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subtitle TEXT,
    price NUMERIC(10,2) NOT NULL,
    sale_price NUMERIC(10,2),
    image TEXT NOT NULL,
    category TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    sku TEXT NOT NULL UNIQUE,
    description TEXT,
    material TEXT,
    care_instructions TEXT,
    sizes TEXT[] DEFAULT '{}',
    colors TEXT[] DEFAULT '{}',
    color_options JSONB DEFAULT '[]',
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT NOT NULL,
    customer_city TEXT NOT NULL,
    customer_zip TEXT NOT NULL,
    customer_country TEXT NOT NULL DEFAULT 'France',
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC(10,2) NOT NULL,
    tax NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
    payment_method TEXT,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create design_settings table (singleton pattern)
CREATE TABLE public.design_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settings_key TEXT NOT NULL UNIQUE DEFAULT 'main',
    sidebar_bg TEXT DEFAULT '#0A0A0A',
    accent_color TEXT DEFAULT '#00FF88',
    sidebar_gradient BOOLEAN DEFAULT true,
    gradient_intensity INTEGER DEFAULT 30,
    show_logo BOOLEAN DEFAULT true,
    show_stats BOOLEAN DEFAULT true,
    show_unit_id BOOLEAN DEFAULT true,
    show_overlays BOOLEAN DEFAULT true,
    hud_logo TEXT DEFAULT '/lovable-uploads/logo.png',
    unit_id_label TEXT DEFAULT 'SYSTEM ID',
    custom_unit_id TEXT DEFAULT 'UNITÉ_ALPHA_01',
    stats_label TEXT DEFAULT 'DATA FLUX //',
    stats_sub_label TEXT DEFAULT 'SYSTÈME ACTIF',
    background_watermark TEXT DEFAULT '',
    stats JSONB DEFAULT '[{"label":"WATERPROOFING","value":98},{"label":"THERMAL","value":85},{"label":"ARMOR","value":92}]',
    hud_buttons JSONB DEFAULT '[]',
    glitch_duration INTEGER DEFAULT 300,
    glitch_intensity INTEGER DEFAULT 5,
    click_scale NUMERIC(3,2) DEFAULT 0.97,
    logo_style JSONB DEFAULT '{}',
    stats_style JSONB DEFAULT '{}',
    unit_id_style JSONB DEFAULT '{}',
    social_style JSONB DEFAULT '{}',
    background_media JSONB DEFAULT '[]',
    is_slideshow_active BOOLEAN DEFAULT false,
    slideshow_speed INTEGER DEFAULT 5000,
    hero_slides JSONB DEFAULT '[]',
    slider_auto_play BOOLEAN DEFAULT true,
    slider_speed INTEGER DEFAULT 5000,
    show_slider_overlay BOOLEAN DEFAULT true,
    slider_grayscale BOOLEAN DEFAULT false,
    social_links JSONB DEFAULT '[]',
    social_display_mode TEXT DEFAULT 'icons',
    home_sections JSONB DEFAULT '[]',
    presets JSONB DEFAULT '[]',
    schedules JSONB DEFAULT '[]',
    pages JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Anyone can view categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products (public read, admin write)
CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all products" ON public.products
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert products" ON public.products
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products" ON public.products
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products" ON public.products
    FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update orders" ON public.orders
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for design_settings (public read, admin write)
CREATE POLICY "Anyone can view design settings" ON public.design_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage design settings" ON public.design_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_design_settings_updated_at
    BEFORE UPDATE ON public.design_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

-- Insert default design settings
INSERT INTO public.design_settings (settings_key) VALUES ('main');

-- Insert default categories
INSERT INTO public.categories (title, image, sort_order) VALUES
    ('Homme', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 1),
    ('Femme', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 2),
    ('Enfant', 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400', 3),
    ('Accessoires', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 4);