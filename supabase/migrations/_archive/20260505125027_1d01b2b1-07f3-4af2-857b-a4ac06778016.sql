
-- Switch the public view back to security_invoker so it respects caller RLS.
ALTER VIEW public.design_settings_public SET (security_invoker = true);

-- Drop the restrictive policy that blocked all non-admin reads, and add a
-- permissive SELECT policy. Column-level GRANTs keep sensitive fields private.
DROP POLICY IF EXISTS "Restrict design_settings reads to admins" ON public.design_settings;
DROP POLICY IF EXISTS "Deny anon design_settings" ON public.design_settings;

CREATE POLICY "Public can read design_settings safe columns"
  ON public.design_settings FOR SELECT TO anon, authenticated
  USING (true);

-- Lock down columns: revoke all, then grant only the non-sensitive ones.
REVOKE SELECT ON public.design_settings FROM anon, authenticated;

GRANT SELECT (
  id, settings_key, sidebar_bg, accent_color, sidebar_gradient, gradient_intensity,
  show_logo, show_stats, show_unit_id, show_overlays, hud_logo, unit_id_label,
  custom_unit_id, stats_label, stats_sub_label, background_watermark, stats,
  hud_buttons, glitch_duration, glitch_intensity, click_scale, logo_style,
  stats_style, unit_id_style, social_style, background_media, is_slideshow_active,
  slideshow_speed, hero_slides, slider_auto_play, slider_speed, show_slider_overlay,
  slider_grayscale, social_links, social_display_mode, home_sections, presets,
  schedules, pages, sidebar_image, category_columns, header_preset, header_bg_color,
  header_text_color, header_fixed, top_banner, footer_logo, favicon_url,
  header_nav_items, site_name, site_tagline, contact_email, contact_phone,
  slider_height, site_spacing, category_layout, show_sidebar_product_card,
  show_sidebar_sizes, show_sidebar_stats, show_sidebar_gallery,
  show_sidebar_product_number, sidebar_slider_enabled, sidebar_slider_speed,
  sidebar_slider_max_products, sidebar_brand_name, sidebar_brand_subtitle,
  sidebar_info_text, sidebar_product_title, sidebar_product_description,
  sidebar_sizes, sidebar_image_opacity, mobile_sidebar_image,
  mobile_sidebar_media_type, stat_bar_filled_color, stat_bar_empty_color,
  sidebar_reappear_delay, mannequin_hotspots, sidebar_brand_position,
  legal_company_name, legal_company_form, legal_capital, legal_address, legal_zip,
  legal_city, legal_siret, legal_rcs, legal_vat, legal_director,
  legal_rgpd_email, legal_return_email, created_at, updated_at
) ON public.design_settings TO anon, authenticated;
