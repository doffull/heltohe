-- Remove sensitive tables from realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.stock_levels;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.stock_transfers;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Fix: update the public view to explicitly exclude admin_notification_email and colissimo fields
DROP VIEW IF EXISTS public.design_settings_public;
CREATE VIEW public.design_settings_public AS
SELECT
  id, settings_key, sidebar_bg, accent_color, sidebar_gradient, gradient_intensity,
  show_logo, show_stats, show_unit_id, show_overlays, hud_logo,
  unit_id_label, stats_label, stats_sub_label, custom_unit_id, background_watermark,
  background_media, is_slideshow_active, slideshow_speed, stats, hud_buttons,
  glitch_duration, glitch_intensity, click_scale, logo_style, stats_style,
  unit_id_style, social_style, hero_slides, social_links, social_display_mode,
  slider_auto_play, slider_speed, show_slider_overlay, slider_grayscale,
  home_sections, pages, presets, schedules, mannequin_hotspots,
  show_sidebar_product_card, show_sidebar_stats, show_sidebar_sizes,
  show_sidebar_gallery, show_sidebar_product_number,
  sidebar_slider_enabled, sidebar_slider_speed, sidebar_slider_max_products,
  sidebar_brand_name, sidebar_brand_subtitle, sidebar_brand_position,
  sidebar_info_text, sidebar_product_title, sidebar_product_description,
  sidebar_sizes, sidebar_image_opacity, mobile_sidebar_image, mobile_sidebar_media_type,
  sidebar_image, sidebar_reappear_delay, slider_height, site_spacing,
  site_name, site_tagline, contact_email, contact_phone,
  favicon_url, footer_logo, top_banner, header_preset, header_bg_color,
  header_text_color, header_fixed, header_nav_items, category_columns, category_layout,
  stat_bar_filled_color, stat_bar_empty_color,
  legal_company_name, legal_company_form, legal_capital, legal_address,
  legal_zip, legal_city, legal_siret, legal_rcs, legal_vat, legal_director,
  legal_rgpd_email, legal_return_email,
  created_at, updated_at
FROM public.design_settings;