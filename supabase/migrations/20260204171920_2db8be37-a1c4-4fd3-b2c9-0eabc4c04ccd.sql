-- Create loyalty tier enum
CREATE TYPE public.loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Create promo code type enum
CREATE TYPE public.promo_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping');

-- Create banner type enum
CREATE TYPE public.banner_type AS ENUM ('hero', 'promo', 'popup', 'sidebar');

-- ============================================
-- TABLE: customers (profils clients)
-- ============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier loyalty_tier DEFAULT 'bronze',
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer profile"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer profile"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer profile"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all customers"
  ON public.customers FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- TABLE: addresses (adresses de livraison)
-- ============================================
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  label TEXT DEFAULT 'Domicile',
  first_name TEXT,
  last_name TEXT,
  address TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT DEFAULT 'France',
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own addresses"
  ON public.addresses FOR ALL
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all addresses"
  ON public.addresses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- TABLE: cart_items (paniers persistants)
-- ============================================
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  size TEXT,
  color TEXT,
  quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, product_id, size, color)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- TABLE: wishlists (favoris)
-- ============================================
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wishlist"
  ON public.wishlists FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- TABLE: promo_codes (codes promo)
-- ============================================
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  type promo_type NOT NULL DEFAULT 'percentage',
  value NUMERIC NOT NULL,
  min_purchase NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
  ON public.promo_codes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- TABLE: banners (bannières marketing)
-- ============================================
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type banner_type NOT NULL DEFAULT 'hero',
  title TEXT,
  subtitle TEXT,
  description TEXT,
  image TEXT,
  link TEXT,
  button_text TEXT,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
  ON public.banners FOR SELECT
  USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "Admins can manage banners"
  ON public.banners FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- TABLE: newsletters (abonnés newsletter)
-- ============================================
CREATE TABLE public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  is_subscribed BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}',
  subscribed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletters FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage newsletter subscribers"
  ON public.newsletters FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- TABLE: loyalty_rewards (récompenses fidélité)
-- ============================================
CREATE TABLE public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'discount',
  value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards"
  ON public.loyalty_rewards FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage rewards"
  ON public.loyalty_rewards FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- TABLE: loyalty_transactions (historique points)
-- ============================================
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'earned', 'spent', 'expired', 'bonus'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own loyalty transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage loyalty transactions"
  ON public.loyalty_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- TRIGGERS: Auto-update updated_at
-- ============================================
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_addresses_customer_id ON public.addresses(customer_id);
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_banners_type ON public.banners(type);
CREATE INDEX idx_loyalty_transactions_customer_id ON public.loyalty_transactions(customer_id);