-- 1. Fix orders INSERT policy to prevent user_id spoofing
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR auth.uid() = user_id)
  );

-- 2. Create a public view for design_settings that hides sensitive fields
-- First drop the permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view design settings" ON public.design_settings;

-- Create a restricted public SELECT policy that still allows reading but excludes sensitive columns
-- Since Postgres RLS can't do column-level filtering, we create a view approach
-- Instead, we'll keep the public policy but NULL out sensitive fields via a secure view
CREATE OR REPLACE VIEW public.design_settings_public AS
SELECT
  id, settings_key, sidebar_bg, accent_color, hud_logo, unit_id_label, custom_unit_id,
  stats_label, stats_sub_label, background_watermark, sidebar_image, header_preset,
  header_bg_color, header_text_color, header_fixed, social_display_mode, site_name,
  site_tagline, contact_email, contact_phone, show_logo, show_stats, show_unit_id,
  show_overlays, sidebar_gradient, gradient_intensity, is_slideshow_active, slideshow_speed,
  slider_auto_play, slider_speed, show_slider_overlay, slider_grayscale, glitch_duration,
  glitch_intensity, click_scale, category_columns, sidebar_reappear_delay, slider_height,
  site_spacing, category_layout, stats, hud_buttons, logo_style, stats_style, unit_id_style,
  social_style, background_media, hero_slides, social_links, home_sections, presets, schedules,
  pages, mannequin_hotspots, sidebar_brand_name, sidebar_brand_subtitle, sidebar_info_text,
  sidebar_product_title, sidebar_product_description, mobile_sidebar_image, mobile_sidebar_media_type,
  show_sidebar_product_card, show_sidebar_sizes, show_sidebar_stats, show_sidebar_gallery,
  show_sidebar_product_number, sidebar_slider_enabled, sidebar_slider_speed, sidebar_slider_max_products,
  sidebar_sizes, sidebar_image_opacity, stat_bar_filled_color, stat_bar_empty_color, footer_logo,
  favicon_url, top_banner, header_nav_items, sidebar_brand_position,
  legal_company_name, legal_company_form, legal_capital, legal_address, legal_zip, legal_city,
  legal_siret, legal_rcs, legal_vat, legal_director, legal_rgpd_email, legal_return_email,
  -- Sensitive fields nulled out for public access
  NULL::text AS admin_notification_email,
  NULL::text AS colissimo_sender_name,
  NULL::text AS colissimo_sender_address,
  NULL::text AS colissimo_sender_zip,
  NULL::text AS colissimo_sender_city,
  created_at, updated_at
FROM public.design_settings;

-- Re-add a public SELECT policy (the table is still needed for admin writes)
CREATE POLICY "Anyone can view design settings"
  ON public.design_settings FOR SELECT
  USING (true);