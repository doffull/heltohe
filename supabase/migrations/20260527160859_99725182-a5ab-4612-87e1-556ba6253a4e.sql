DROP VIEW IF EXISTS public.design_settings_public;

CREATE VIEW public.design_settings_public AS
SELECT
  id,
  settings_key,
  sidebar_bg,
  accent_color,
  sidebar_gradient,
  gradient_intensity,
  show_logo,
  show_stats,
  show_unit_id,
  show_overlays,
  hud_logo,
  unit_id_label,
  custom_unit_id,
  stats_label,
  stats_sub_label,
  background_watermark,
  stats,
  hud_buttons,
  glitch_duration,
  glitch_intensity,
  click_scale,
  logo_style,
  stats_style,
  unit_id_style,
  social_style,
  background_media,
  is_slideshow_active,
  slideshow_speed,
  hero_slides,
  slider_auto_play,
  slider_speed,
  show_slider_overlay,
  slider_grayscale,
  social_links,
  social_display_mode,
  home_sections,
  presets,
  schedules,
  pages,
  created_at,
  updated_at,
  sidebar_image,
  category_columns,
  header_preset,
  header_bg_color,
  header_text_color,
  header_fixed,
  top_banner,
  footer_logo,
  favicon_url,
  header_nav_items,
  site_name,
  site_tagline,
  sidebar_reappear_delay,
  slider_height,
  site_spacing,
  category_layout,
  show_sidebar_product_card,
  show_sidebar_sizes,
  show_sidebar_stats,
  show_sidebar_gallery,
  show_sidebar_product_number,
  sidebar_slider_enabled,
  sidebar_slider_speed,
  sidebar_slider_max_products,
  sidebar_brand_name,
  sidebar_brand_subtitle,
  sidebar_info_text,
  sidebar_product_title,
  sidebar_product_description,
  sidebar_sizes,
  sidebar_image_opacity,
  mobile_sidebar_image,
  mobile_sidebar_media_type,
  stat_bar_filled_color,
  stat_bar_empty_color,
  mannequin_hotspots,
  sidebar_brand_position,
  legal_company_name,
  legal_company_form,
  legal_capital,
  legal_address,
  legal_zip,
  legal_city,
  admin_section_colors,
  techwear_hero,
  logo_size,
  logo_background_shape,
  logo_background_color,
  logo_background_padding,
  show_sidebar_newsletter,
  sidebar_newsletter_title,
  sidebar_newsletter_cta,
  voice_command_enabled,
  voice_onboarding_hint,
  global_product_sizes,
  home_custom_sections,
  home_page_blocks
FROM public.design_settings;

GRANT SELECT ON public.design_settings_public TO anon;
GRANT SELECT ON public.design_settings_public TO authenticated;
GRANT ALL ON public.design_settings_public TO service_role;

DROP POLICY IF EXISTS "Deny popup view updates" ON public.newsletter_popup_views;
CREATE POLICY "Deny popup view updates"
ON public.newsletter_popup_views
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny popup view deletes" ON public.newsletter_popup_views;
CREATE POLICY "Deny popup view deletes"
ON public.newsletter_popup_views
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "Deny visitor session updates" ON public.visitor_sessions;
CREATE POLICY "Deny visitor session updates"
ON public.visitor_sessions
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.security_audit_snapshot() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_users_by_role(public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_newsletter_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_and_create_order(jsonb, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reserve_order_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_order_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_order_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_loyalty_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_award_loyalty_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_create_inventory_on_product_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_popup_converted(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.track_session_heartbeat(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.security_audit_snapshot() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_users_by_role(public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_newsletter_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_and_create_order(jsonb, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.preview_promo_code(text, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_cgv_consent(text, boolean, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.spin_roulette(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.spin_roulette(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_popup_converted(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_session_heartbeat(text) TO anon, authenticated, service_role;