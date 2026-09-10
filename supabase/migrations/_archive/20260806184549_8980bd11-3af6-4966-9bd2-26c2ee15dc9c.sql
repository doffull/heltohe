CREATE OR REPLACE VIEW public.design_settings_public
WITH (security_invoker=on) AS
 SELECT id, settings_key, sidebar_bg, accent_color, sidebar_gradient, gradient_intensity,
    show_logo, show_stats, show_unit_id, show_overlays, hud_logo, unit_id_label, custom_unit_id,
    stats_label, stats_sub_label, background_watermark, stats, hud_buttons, glitch_duration,
    glitch_intensity, click_scale, logo_style, stats_style, unit_id_style, social_style,
    background_media, is_slideshow_active, slideshow_speed, hero_slides, slider_auto_play,
    slider_speed, show_slider_overlay, slider_grayscale, social_links, social_display_mode,
    home_sections, presets, schedules, pages, created_at, updated_at, sidebar_image,
    category_columns, header_preset, header_bg_color, header_text_color, header_fixed,
    top_banner, footer_logo, favicon_url, header_nav_items, site_name, site_tagline,
    sidebar_reappear_delay, slider_height, site_spacing, category_layout,
    show_sidebar_product_card, show_sidebar_sizes, show_sidebar_stats, show_sidebar_gallery,
    show_sidebar_product_number, sidebar_slider_enabled, sidebar_slider_speed,
    sidebar_slider_max_products, sidebar_brand_name, sidebar_brand_subtitle, sidebar_info_text,
    sidebar_product_title, sidebar_product_description, sidebar_sizes, sidebar_image_opacity,
    mobile_sidebar_image, mobile_sidebar_media_type, stat_bar_filled_color, stat_bar_empty_color,
    mannequin_hotspots, sidebar_brand_position, legal_company_name, legal_company_form,
    legal_capital, legal_address, legal_zip, legal_city, admin_section_colors, techwear_hero,
    logo_size, logo_background_shape, logo_background_color, logo_background_padding,
    show_sidebar_newsletter, sidebar_newsletter_title, sidebar_newsletter_cta,
    voice_command_enabled, voice_onboarding_hint, global_product_sizes, home_custom_sections,
    home_page_blocks, color_display_mode, home_texts, seo_indexable, seo_noimageindex,
    seo_default_title, seo_default_description, seo_og_image, maintenance_enabled,
    maintenance_title, maintenance_message, maintenance_until, maintenance_image,
    maintenance_bg, maintenance_admin_bypass, legal_siret, legal_rcs, legal_vat, legal_director,
    legal_rgpd_email, legal_return_email, contact_email, contact_phone,
    collab_settings, shop_hover_effect
   FROM public.design_settings;

GRANT SELECT ON public.design_settings_public TO anon, authenticated;