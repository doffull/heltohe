export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address: string
          address_line2: string | null
          city: string
          country: string | null
          created_at: string
          customer_id: string
          first_name: string | null
          id: string
          is_default: boolean | null
          label: string | null
          last_name: string | null
          phone: string | null
          updated_at: string
          zip: string
        }
        Insert: {
          address: string
          address_line2?: string | null
          city: string
          country?: string | null
          created_at?: string
          customer_id: string
          first_name?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          zip: string
        }
        Update: {
          address?: string
          address_line2?: string | null
          city?: string
          country?: string | null
          created_at?: string
          customer_id?: string
          first_name?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_access_log: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip_hash: string | null
          route: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          route?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          route?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_config: {
        Row: {
          admin_notification_email: string | null
          colissimo_sender_address: string | null
          colissimo_sender_city: string | null
          colissimo_sender_name: string | null
          colissimo_sender_zip: string | null
          config_key: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          admin_notification_email?: string | null
          colissimo_sender_address?: string | null
          colissimo_sender_city?: string | null
          colissimo_sender_name?: string | null
          colissimo_sender_zip?: string | null
          config_key?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          admin_notification_email?: string | null
          colissimo_sender_address?: string | null
          colissimo_sender_city?: string | null
          colissimo_sender_name?: string | null
          colissimo_sender_zip?: string | null
          config_key?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      banner_analytics: {
        Row: {
          banner_id: string
          banner_type: string
          created_at: string
          event: string
          id: string
          meta: Json | null
          session_hash: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          banner_id: string
          banner_type: string
          created_at?: string
          event: string
          id?: string
          meta?: Json | null
          session_hash?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          banner_id?: string
          banner_type?: string
          created_at?: string
          event?: string
          id?: string
          meta?: Json | null
          session_hash?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          button_text: string | null
          created_at: string
          description: string | null
          display_delay: number | null
          ends_at: string | null
          id: string
          image: string | null
          is_active: boolean | null
          link: string | null
          position: number | null
          starts_at: string | null
          subtitle: string | null
          title: string | null
          type: Database["public"]["Enums"]["banner_type"]
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          created_at?: string
          description?: string | null
          display_delay?: number | null
          ends_at?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          link?: string | null
          position?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["banner_type"]
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          created_at?: string
          description?: string | null
          display_delay?: number | null
          ends_at?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          link?: string | null
          position?: number | null
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["banner_type"]
          updated_at?: string
        }
        Relationships: []
      }
      bot_config: {
        Row: {
          bot_avatar: string | null
          bot_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          suggestions: Json | null
          system_prompt: string
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          bot_avatar?: string | null
          bot_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          suggestions?: Json | null
          system_prompt?: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          bot_avatar?: string | null
          bot_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          suggestions?: Json | null
          system_prompt?: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      boutiques: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string
          id: string
          image: string | null
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          postal_code: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          country?: string
          created_at?: string
          id?: string
          image?: string | null
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          postal_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          image?: string | null
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          postal_code?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          size: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          size?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          size?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          cover_mode: string | null
          created_at: string
          display_size: string | null
          id: string
          image: string | null
          meta_description: string | null
          meta_title: string | null
          parent_id: string | null
          seo_keywords: string | null
          slug: string | null
          sort_order: number | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_mode?: string | null
          created_at?: string
          display_size?: string | null
          id?: string
          image?: string | null
          meta_description?: string | null
          meta_title?: string | null
          parent_id?: string | null
          seo_keywords?: string | null
          slug?: string | null
          sort_order?: number | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_mode?: string | null
          created_at?: string
          display_size?: string | null
          id?: string
          image?: string | null
          meta_description?: string | null
          meta_title?: string | null
          parent_id?: string | null
          seo_keywords?: string | null
          slug?: string | null
          sort_order?: number | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "page_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      category_hero_settings: {
        Row: {
          category_id: string
          config: Json
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_hero_settings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cgv_consents: {
        Row: {
          accepted: boolean
          created_at: string
          id: string
          ip_hash: string | null
          session_hash: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          accepted: boolean
          created_at?: string
          id?: string
          ip_hash?: string | null
          session_hash?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
          version: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          id?: string
          ip_hash?: string | null
          session_hash?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          bot_response: string | null
          created_at: string | null
          id: string
          session_id: string | null
          user_message: string | null
        }
        Insert: {
          bot_response?: string | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          user_message?: string | null
        }
        Update: {
          bot_response?: string | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          user_message?: string | null
        }
        Relationships: []
      }
      checkout_config: {
        Row: {
          checkout_message: string | null
          config_key: string
          created_at: string
          free_shipping_threshold: number
          home_delivery_enabled: boolean
          id: string
          payment_methods: Json
          relay_enabled: boolean
          relay_map_settings: Json
          shipping_home_price: number
          shipping_relay_price: number
          updated_at: string
        }
        Insert: {
          checkout_message?: string | null
          config_key?: string
          created_at?: string
          free_shipping_threshold?: number
          home_delivery_enabled?: boolean
          id?: string
          payment_methods?: Json
          relay_enabled?: boolean
          relay_map_settings?: Json
          shipping_home_price?: number
          shipping_relay_price?: number
          updated_at?: string
        }
        Update: {
          checkout_message?: string | null
          config_key?: string
          created_at?: string
          free_shipping_threshold?: number
          home_delivery_enabled?: boolean
          id?: string
          payment_methods?: Json
          relay_enabled?: boolean
          relay_map_settings?: Json
          shipping_home_price?: number
          shipping_relay_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      click_events: {
        Row: {
          clicked_at: string
          element_label: string | null
          element_selector: string | null
          id: string
          path: string
          session_id: string
          x: number | null
          y: number | null
        }
        Insert: {
          clicked_at?: string
          element_label?: string | null
          element_selector?: string | null
          id?: string
          path: string
          session_id: string
          x?: number | null
          y?: number | null
        }
        Update: {
          clicked_at?: string
          element_label?: string | null
          element_selector?: string | null
          id?: string
          path?: string
          session_id?: string
          x?: number | null
          y?: number | null
        }
        Relationships: []
      }
      client_error_logs: {
        Row: {
          component_stack: string | null
          console_tail: Json | null
          created_at: string
          extra: Json | null
          id: string
          label: string | null
          message: string | null
          pixel_ratio: number | null
          source: string
          stack: string | null
          url: string | null
          user_agent: string | null
          viewport: string | null
        }
        Insert: {
          component_stack?: string | null
          console_tail?: Json | null
          created_at?: string
          extra?: Json | null
          id?: string
          label?: string | null
          message?: string | null
          pixel_ratio?: number | null
          source: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          viewport?: string | null
        }
        Update: {
          component_stack?: string | null
          console_tail?: Json | null
          created_at?: string
          extra?: Json | null
          id?: string
          label?: string | null
          message?: string | null
          pixel_ratio?: number | null
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          viewport?: string | null
        }
        Relationships: []
      }
      colissimo_bordereaux: {
        Row: {
          bordereau_date: string
          created_at: string | null
          id: string
          package_count: number
          pdf_base64: string | null
          tracking_numbers: Json | null
        }
        Insert: {
          bordereau_date: string
          created_at?: string | null
          id?: string
          package_count?: number
          pdf_base64?: string | null
          tracking_numbers?: Json | null
        }
        Update: {
          bordereau_date?: string
          created_at?: string | null
          id?: string
          package_count?: number
          pdf_base64?: string | null
          tracking_numbers?: Json | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          loyalty_points: number | null
          loyalty_tier: Database["public"]["Enums"]["loyalty_tier"] | null
          phone: string | null
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"] | null
          phone?: string | null
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"] | null
          phone?: string | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      design_settings: {
        Row: {
          accent_color: string | null
          admin_notification_email: string | null
          admin_section_colors: Json
          background_media: Json | null
          background_watermark: string | null
          category_columns: number | null
          category_layout: Json | null
          click_scale: number | null
          colissimo_sender_address: string | null
          colissimo_sender_city: string | null
          colissimo_sender_name: string | null
          colissimo_sender_zip: string | null
          color_display_mode: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          custom_unit_id: string | null
          favicon_url: string | null
          footer_logo: string | null
          glitch_duration: number | null
          glitch_intensity: number | null
          global_product_sizes: Json
          gradient_intensity: number | null
          header_bg_color: string | null
          header_fixed: boolean | null
          header_nav_items: Json | null
          header_preset: string | null
          header_text_color: string | null
          hero_slides: Json | null
          home_custom_sections: Json
          home_page_blocks: Json
          home_sections: Json | null
          home_texts: Json
          hud_buttons: Json | null
          hud_logo: string | null
          id: string
          is_slideshow_active: boolean | null
          legal_address: string | null
          legal_capital: string | null
          legal_city: string | null
          legal_company_form: string | null
          legal_company_name: string | null
          legal_director: string | null
          legal_rcs: string | null
          legal_return_email: string | null
          legal_rgpd_email: string | null
          legal_siret: string | null
          legal_vat: string | null
          legal_zip: string | null
          logo_background_color: string | null
          logo_background_padding: number | null
          logo_background_shape: string | null
          logo_size: number | null
          logo_style: Json | null
          mannequin_hotspots: Json
          mobile_sidebar_image: string | null
          mobile_sidebar_media_type: string | null
          pages: Json | null
          presets: Json | null
          product_grid_layout: string
          schedules: Json | null
          security_overlay: Json
          settings_json: Json
          settings_key: string
          show_logo: boolean | null
          show_overlays: boolean | null
          show_sidebar_gallery: boolean | null
          show_sidebar_newsletter: boolean | null
          show_sidebar_product_card: boolean | null
          show_sidebar_product_number: boolean | null
          show_sidebar_sizes: boolean | null
          show_sidebar_stats: boolean | null
          show_slider_overlay: boolean | null
          show_stats: boolean | null
          show_unit_id: boolean | null
          sidebar_bg: string | null
          sidebar_brand_name: string | null
          sidebar_brand_position: string | null
          sidebar_brand_subtitle: string | null
          sidebar_gradient: boolean | null
          sidebar_image: string | null
          sidebar_image_opacity: number | null
          sidebar_info_text: string | null
          sidebar_newsletter_cta: string | null
          sidebar_newsletter_title: string | null
          sidebar_product_description: string | null
          sidebar_product_title: string | null
          sidebar_reappear_delay: number | null
          sidebar_sizes: Json | null
          sidebar_slider_enabled: boolean | null
          sidebar_slider_max_products: number | null
          sidebar_slider_speed: number | null
          site_name: string | null
          site_spacing: string | null
          site_tagline: string | null
          slider_auto_play: boolean | null
          slider_grayscale: boolean | null
          slider_height: string | null
          slider_speed: number | null
          slideshow_speed: number | null
          social_display_mode: string | null
          social_links: Json | null
          social_style: Json | null
          stat_bar_empty_color: string | null
          stat_bar_filled_color: string | null
          stats: Json | null
          stats_label: string | null
          stats_style: Json | null
          stats_sub_label: string | null
          techwear_hero: Json
          top_banner: Json | null
          unit_id_label: string | null
          unit_id_style: Json | null
          updated_at: string
          voice_command_enabled: boolean | null
          voice_onboarding_hint: boolean
        }
        Insert: {
          accent_color?: string | null
          admin_notification_email?: string | null
          admin_section_colors?: Json
          background_media?: Json | null
          background_watermark?: string | null
          category_columns?: number | null
          category_layout?: Json | null
          click_scale?: number | null
          colissimo_sender_address?: string | null
          colissimo_sender_city?: string | null
          colissimo_sender_name?: string | null
          colissimo_sender_zip?: string | null
          color_display_mode?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_logo?: string | null
          glitch_duration?: number | null
          glitch_intensity?: number | null
          global_product_sizes?: Json
          gradient_intensity?: number | null
          header_bg_color?: string | null
          header_fixed?: boolean | null
          header_nav_items?: Json | null
          header_preset?: string | null
          header_text_color?: string | null
          hero_slides?: Json | null
          home_custom_sections?: Json
          home_page_blocks?: Json
          home_sections?: Json | null
          home_texts?: Json
          hud_buttons?: Json | null
          hud_logo?: string | null
          id?: string
          is_slideshow_active?: boolean | null
          legal_address?: string | null
          legal_capital?: string | null
          legal_city?: string | null
          legal_company_form?: string | null
          legal_company_name?: string | null
          legal_director?: string | null
          legal_rcs?: string | null
          legal_return_email?: string | null
          legal_rgpd_email?: string | null
          legal_siret?: string | null
          legal_vat?: string | null
          legal_zip?: string | null
          logo_background_color?: string | null
          logo_background_padding?: number | null
          logo_background_shape?: string | null
          logo_size?: number | null
          logo_style?: Json | null
          mannequin_hotspots?: Json
          mobile_sidebar_image?: string | null
          mobile_sidebar_media_type?: string | null
          pages?: Json | null
          presets?: Json | null
          product_grid_layout?: string
          schedules?: Json | null
          security_overlay?: Json
          settings_json?: Json
          settings_key?: string
          show_logo?: boolean | null
          show_overlays?: boolean | null
          show_sidebar_gallery?: boolean | null
          show_sidebar_newsletter?: boolean | null
          show_sidebar_product_card?: boolean | null
          show_sidebar_product_number?: boolean | null
          show_sidebar_sizes?: boolean | null
          show_sidebar_stats?: boolean | null
          show_slider_overlay?: boolean | null
          show_stats?: boolean | null
          show_unit_id?: boolean | null
          sidebar_bg?: string | null
          sidebar_brand_name?: string | null
          sidebar_brand_position?: string | null
          sidebar_brand_subtitle?: string | null
          sidebar_gradient?: boolean | null
          sidebar_image?: string | null
          sidebar_image_opacity?: number | null
          sidebar_info_text?: string | null
          sidebar_newsletter_cta?: string | null
          sidebar_newsletter_title?: string | null
          sidebar_product_description?: string | null
          sidebar_product_title?: string | null
          sidebar_reappear_delay?: number | null
          sidebar_sizes?: Json | null
          sidebar_slider_enabled?: boolean | null
          sidebar_slider_max_products?: number | null
          sidebar_slider_speed?: number | null
          site_name?: string | null
          site_spacing?: string | null
          site_tagline?: string | null
          slider_auto_play?: boolean | null
          slider_grayscale?: boolean | null
          slider_height?: string | null
          slider_speed?: number | null
          slideshow_speed?: number | null
          social_display_mode?: string | null
          social_links?: Json | null
          social_style?: Json | null
          stat_bar_empty_color?: string | null
          stat_bar_filled_color?: string | null
          stats?: Json | null
          stats_label?: string | null
          stats_style?: Json | null
          stats_sub_label?: string | null
          techwear_hero?: Json
          top_banner?: Json | null
          unit_id_label?: string | null
          unit_id_style?: Json | null
          updated_at?: string
          voice_command_enabled?: boolean | null
          voice_onboarding_hint?: boolean
        }
        Update: {
          accent_color?: string | null
          admin_notification_email?: string | null
          admin_section_colors?: Json
          background_media?: Json | null
          background_watermark?: string | null
          category_columns?: number | null
          category_layout?: Json | null
          click_scale?: number | null
          colissimo_sender_address?: string | null
          colissimo_sender_city?: string | null
          colissimo_sender_name?: string | null
          colissimo_sender_zip?: string | null
          color_display_mode?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_logo?: string | null
          glitch_duration?: number | null
          glitch_intensity?: number | null
          global_product_sizes?: Json
          gradient_intensity?: number | null
          header_bg_color?: string | null
          header_fixed?: boolean | null
          header_nav_items?: Json | null
          header_preset?: string | null
          header_text_color?: string | null
          hero_slides?: Json | null
          home_custom_sections?: Json
          home_page_blocks?: Json
          home_sections?: Json | null
          home_texts?: Json
          hud_buttons?: Json | null
          hud_logo?: string | null
          id?: string
          is_slideshow_active?: boolean | null
          legal_address?: string | null
          legal_capital?: string | null
          legal_city?: string | null
          legal_company_form?: string | null
          legal_company_name?: string | null
          legal_director?: string | null
          legal_rcs?: string | null
          legal_return_email?: string | null
          legal_rgpd_email?: string | null
          legal_siret?: string | null
          legal_vat?: string | null
          legal_zip?: string | null
          logo_background_color?: string | null
          logo_background_padding?: number | null
          logo_background_shape?: string | null
          logo_size?: number | null
          logo_style?: Json | null
          mannequin_hotspots?: Json
          mobile_sidebar_image?: string | null
          mobile_sidebar_media_type?: string | null
          pages?: Json | null
          presets?: Json | null
          product_grid_layout?: string
          schedules?: Json | null
          security_overlay?: Json
          settings_json?: Json
          settings_key?: string
          show_logo?: boolean | null
          show_overlays?: boolean | null
          show_sidebar_gallery?: boolean | null
          show_sidebar_newsletter?: boolean | null
          show_sidebar_product_card?: boolean | null
          show_sidebar_product_number?: boolean | null
          show_sidebar_sizes?: boolean | null
          show_sidebar_stats?: boolean | null
          show_slider_overlay?: boolean | null
          show_stats?: boolean | null
          show_unit_id?: boolean | null
          sidebar_bg?: string | null
          sidebar_brand_name?: string | null
          sidebar_brand_position?: string | null
          sidebar_brand_subtitle?: string | null
          sidebar_gradient?: boolean | null
          sidebar_image?: string | null
          sidebar_image_opacity?: number | null
          sidebar_info_text?: string | null
          sidebar_newsletter_cta?: string | null
          sidebar_newsletter_title?: string | null
          sidebar_product_description?: string | null
          sidebar_product_title?: string | null
          sidebar_reappear_delay?: number | null
          sidebar_sizes?: Json | null
          sidebar_slider_enabled?: boolean | null
          sidebar_slider_max_products?: number | null
          sidebar_slider_speed?: number | null
          site_name?: string | null
          site_spacing?: string | null
          site_tagline?: string | null
          slider_auto_play?: boolean | null
          slider_grayscale?: boolean | null
          slider_height?: string | null
          slider_speed?: number | null
          slideshow_speed?: number | null
          social_display_mode?: string | null
          social_links?: Json | null
          social_style?: Json | null
          stat_bar_empty_color?: string | null
          stat_bar_filled_color?: string | null
          stats?: Json | null
          stats_label?: string | null
          stats_style?: Json | null
          stats_sub_label?: string | null
          techwear_hero?: Json
          top_banner?: Json | null
          unit_id_label?: string | null
          unit_id_style?: Json | null
          updated_at?: string
          voice_command_enabled?: boolean | null
          voice_onboarding_hint?: boolean
        }
        Relationships: []
      }
      home_fab_buttons: {
        Row: {
          action_type: string
          action_value: string
          badge: string | null
          created_at: string
          icon: string
          id: string
          is_active: boolean
          label: string
          position_desktop: Json
          position_mobile: Json
          sort_order: number
          updated_at: string
          variant: string
          visible_desktop: boolean
          visible_mobile: boolean
        }
        Insert: {
          action_type?: string
          action_value?: string
          badge?: string | null
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          label: string
          position_desktop?: Json
          position_mobile?: Json
          sort_order?: number
          updated_at?: string
          variant?: string
          visible_desktop?: boolean
          visible_mobile?: boolean
        }
        Update: {
          action_type?: string
          action_value?: string
          badge?: string | null
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          label?: string
          position_desktop?: Json
          position_mobile?: Json
          sort_order?: number
          updated_at?: string
          variant?: string
          visible_desktop?: boolean
          visible_mobile?: boolean
        }
        Relationships: []
      }
      inventory: {
        Row: {
          channel: string
          created_at: string
          id: string
          name: string
          product_id: string
          sku: string
          threshold: number
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          name: string
          product_id: string
          sku: string
          threshold?: number
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          sku?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_required: number
          reward_type: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_required: number
          reward_type?: string
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number
          reward_type?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
        }
        Relationships: []
      }
      newsletter_popup_views: {
        Row: {
          converted: boolean
          converted_at: string | null
          id: string
          popup_id: string
          session_id: string | null
          viewed_at: string
        }
        Insert: {
          converted?: boolean
          converted_at?: string | null
          id?: string
          popup_id: string
          session_id?: string | null
          viewed_at?: string
        }
        Update: {
          converted?: boolean
          converted_at?: string | null
          id?: string
          popup_id?: string
          session_id?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      newsletter_popups: {
        Row: {
          bg_color: string | null
          created_at: string
          cta_label: string
          delay_seconds: number
          display_trigger: string
          frequency_days: number
          id: string
          image_url: string | null
          interval_seconds: number
          is_active: boolean
          max_per_session: number
          name: string
          sort_order: number
          subtitle: string | null
          text_color: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          created_at?: string
          cta_label?: string
          delay_seconds?: number
          display_trigger?: string
          frequency_days?: number
          id?: string
          image_url?: string | null
          interval_seconds?: number
          is_active?: boolean
          max_per_session?: number
          name: string
          sort_order?: number
          subtitle?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          created_at?: string
          cta_label?: string
          delay_seconds?: number
          display_trigger?: string
          frequency_days?: number
          id?: string
          image_url?: string | null
          interval_seconds?: number
          is_active?: boolean
          max_per_session?: number
          name?: string
          sort_order?: number
          subtitle?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletters: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_subscribed: boolean | null
          popup_id: string | null
          preferences: Json | null
          referrer_path: string | null
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_subscribed?: boolean | null
          popup_id?: string | null
          preferences?: Json | null
          referrer_path?: string | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_subscribed?: boolean | null
          popup_id?: string | null
          preferences?: Json | null
          referrer_path?: string | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notification_config: {
        Row: {
          config_key: string
          created_at: string
          email_templates: Json
          id: string
          notification_channels: Json
          notify_on_all_validated: boolean
          notify_on_identity_verified: boolean
          notify_on_payment_verified: boolean
          sms_from_number: string | null
          sms_templates: Json
          updated_at: string
        }
        Insert: {
          config_key?: string
          created_at?: string
          email_templates?: Json
          id?: string
          notification_channels?: Json
          notify_on_all_validated?: boolean
          notify_on_identity_verified?: boolean
          notify_on_payment_verified?: boolean
          sms_from_number?: string | null
          sms_templates?: Json
          updated_at?: string
        }
        Update: {
          config_key?: string
          created_at?: string
          email_templates?: Json
          id?: string
          notification_channels?: Json
          notify_on_all_validated?: boolean
          notify_on_identity_verified?: boolean
          notify_on_payment_verified?: boolean
          sms_from_number?: string | null
          sms_templates?: Json
          updated_at?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          order_id: string
          recipient: string
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          order_id: string
          recipient: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          order_id?: string
          recipient?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      order_preparations: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          prepared_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          prepared_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          prepared_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string
          customer_city: string
          customer_country: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          customer_zip: string
          id: string
          items: Json
          loyalty_awarded_at: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          shipping_carrier: string | null
          shipping_cost: number
          status: string
          stock_consumed_at: string | null
          stock_reserved_at: string | null
          subtotal: number
          tax: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
          validation_flags: Json
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_city: string
          customer_country?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          customer_zip: string
          id?: string
          items?: Json
          loyalty_awarded_at?: string | null
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string
          shipping_carrier?: string | null
          shipping_cost?: number
          status?: string
          stock_consumed_at?: string | null
          stock_reserved_at?: string | null
          subtotal: number
          tax?: number
          total: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          validation_flags?: Json
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_city?: string
          customer_country?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          customer_zip?: string
          id?: string
          items?: Json
          loyalty_awarded_at?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping_carrier?: string | null
          shipping_cost?: number
          status?: string
          stock_consumed_at?: string | null
          stock_reserved_at?: string | null
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
          validation_flags?: Json
        }
        Relationships: []
      }
      page_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          layout: Json
          name: string
          preview_image: string | null
          slug: string
          theme: Json
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout?: Json
          name: string
          preview_image?: string | null
          slug: string
          theme?: Json
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          layout?: Json
          name?: string
          preview_image?: string | null
          slug?: string
          theme?: Json
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          duration_ms: number | null
          id: string
          path: string
          session_id: string
          title: string | null
          viewed_at: string
        }
        Insert: {
          duration_ms?: number | null
          id?: string
          path: string
          session_id: string
          title?: string | null
          viewed_at?: string
        }
        Update: {
          duration_ms?: number | null
          id?: string
          path?: string
          session_id?: string
          title?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_published: boolean | null
          menu_link: string | null
          meta_description: string | null
          meta_title: string | null
          sections: Json
          seo_keywords: string | null
          slug: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          menu_link?: string | null
          meta_description?: string | null
          meta_title?: string | null
          sections?: Json
          seo_keywords?: string | null
          slug: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          menu_link?: string | null
          meta_description?: string | null
          meta_title?: string | null
          sections?: Json
          seo_keywords?: string | null
          slug?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_looks: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          product_ids: string[]
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          product_ids?: string[]
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          product_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      product_styles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_active: boolean
          name: string
          product_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          product_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          product_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          attributes: Json | null
          care_instructions: string | null
          category: string
          color_options: Json | null
          colors: string[] | null
          created_at: string
          description: string | null
          gallery_images: string[]
          id: string
          image: string
          is_active: boolean | null
          material: string | null
          model_height: string | null
          model_name: string | null
          model_size_worn: string | null
          name: string
          price: number
          promo_ends_at: string | null
          sale_price: number | null
          sizes: string[] | null
          sku: string
          stock: number
          subtitle: string | null
          tags: string[] | null
          template_id: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attributes?: Json | null
          care_instructions?: string | null
          category: string
          color_options?: Json | null
          colors?: string[] | null
          created_at?: string
          description?: string | null
          gallery_images?: string[]
          id?: string
          image: string
          is_active?: boolean | null
          material?: string | null
          model_height?: string | null
          model_name?: string | null
          model_size_worn?: string | null
          name: string
          price: number
          promo_ends_at?: string | null
          sale_price?: number | null
          sizes?: string[] | null
          sku: string
          stock?: number
          subtitle?: string | null
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attributes?: Json | null
          care_instructions?: string | null
          category?: string
          color_options?: Json | null
          colors?: string[] | null
          created_at?: string
          description?: string | null
          gallery_images?: string[]
          id?: string
          image?: string
          is_active?: boolean | null
          material?: string | null
          model_height?: string | null
          model_name?: string | null
          model_size_worn?: string | null
          name?: string
          price?: number
          promo_ends_at?: string | null
          sale_price?: number | null
          sizes?: string[] | null
          sku?: string
          stock?: number
          subtitle?: string | null
          tags?: string[] | null
          template_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "page_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_purchase: number | null
          starts_at: string | null
          type: Database["public"]["Enums"]["promo_type"]
          updated_at: string
          usage_count: number | null
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_purchase?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["promo_type"]
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_purchase?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["promo_type"]
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          operation: string
          role: string
          target_user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          operation: string
          role: string
          target_user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          operation?: string
          role?: string
          target_user_id?: string
        }
        Relationships: []
      }
      roulette_config: {
        Row: {
          auto_open_delay_ms: number
          auto_open_on_landing: boolean
          button_label: string
          config_key: string
          cooldown_hours: number
          created_at: string
          enabled: boolean
          fab_label: string
          game_type: string
          id: string
          notify_admin_email: string | null
          notify_admin_on_win: boolean
          require_email: boolean
          reward_validity_days: number
          show_after_dismiss_hours: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          auto_open_delay_ms?: number
          auto_open_on_landing?: boolean
          button_label?: string
          config_key?: string
          cooldown_hours?: number
          created_at?: string
          enabled?: boolean
          fab_label?: string
          game_type?: string
          id?: string
          notify_admin_email?: string | null
          notify_admin_on_win?: boolean
          require_email?: boolean
          reward_validity_days?: number
          show_after_dismiss_hours?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          auto_open_delay_ms?: number
          auto_open_on_landing?: boolean
          button_label?: string
          config_key?: string
          cooldown_hours?: number
          created_at?: string
          enabled?: boolean
          fab_label?: string
          game_type?: string
          id?: string
          notify_admin_email?: string | null
          notify_admin_on_win?: boolean
          require_email?: boolean
          reward_validity_days?: number
          show_after_dismiss_hours?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      roulette_segments: {
        Row: {
          code_prefix: string
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          label: string
          max_discount: number | null
          max_wins_per_day: number | null
          min_purchase: number
          probability_weight: number
          reward_type: string
          reward_value: number
          sort_order: number
          text_color: string
          updated_at: string
        }
        Insert: {
          code_prefix?: string
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          max_discount?: number | null
          max_wins_per_day?: number | null
          min_purchase?: number
          probability_weight?: number
          reward_type: string
          reward_value?: number
          sort_order?: number
          text_color?: string
          updated_at?: string
        }
        Update: {
          code_prefix?: string
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          max_discount?: number | null
          max_wins_per_day?: number | null
          min_purchase?: number
          probability_weight?: number
          reward_type?: string
          reward_value?: number
          sort_order?: number
          text_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      roulette_spins: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip_hash: string | null
          promo_code: string | null
          promo_code_id: string | null
          segment_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          segment_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          segment_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roulette_spins_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_spins_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "roulette_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_spins_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "roulette_segments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_history: {
        Row: {
          action: string
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          inventory_id: string
          location_id: string | null
          note: string | null
          quantity_after: number | null
          quantity_before: number | null
          size: string | null
        }
        Insert: {
          action: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_id: string
          location_id?: string | null
          note?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          size?: string | null
        }
        Update: {
          action?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_id?: string
          location_id?: string | null
          note?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_history_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_history_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          color: string | null
          created_at: string
          id: string
          inventory_id: string
          last_synced_at: string | null
          location_id: string
          quantity: number
          reserved: number
          size: string | null
          stocked_at: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          inventory_id: string
          last_synced_at?: string | null
          location_id: string
          quantity?: number
          reserved?: number
          size?: string | null
          stocked_at?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          inventory_id?: string
          last_synced_at?: string | null
          location_id?: string
          quantity?: number
          reserved?: number
          size?: string | null
          stocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string
          from_location_id: string
          id: string
          inventory_id: string
          notes: string | null
          quantity: number
          status: string
          to_location_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          from_location_id: string
          id?: string
          inventory_id: string
          notes?: string | null
          quantity: number
          status?: string
          to_location_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          from_location_id?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity?: number
          status?: string
          to_location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          country: string | null
          device: string | null
          id: string
          ip_hash: string | null
          landing_path: string | null
          last_seen_at: string
          referrer: string | null
          session_id: string
          started_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          device?: string | null
          id?: string
          ip_hash?: string | null
          landing_path?: string | null
          last_seen_at?: string
          referrer?: string | null
          session_id: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          device?: string | null
          id?: string
          ip_hash?: string | null
          landing_path?: string | null
          last_seen_at?: string
          referrer?: string | null
          session_id?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      wp_sync_logs: {
        Row: {
          correlation_id: string | null
          created_at: string
          details: Json | null
          direction: string
          failed: number
          id: string
          message: string | null
          status: string
          succeeded: number
          total: number
          triggered_by: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          details?: Json | null
          direction: string
          failed?: number
          id?: string
          message?: string | null
          status: string
          succeeded?: number
          total?: number
          triggered_by?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          details?: Json | null
          direction?: string
          failed?: number
          id?: string
          message?: string | null
          status?: string
          succeeded?: number
          total?: number
          triggered_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      bot_config_public: {
        Row: {
          bot_avatar: string | null
          bot_name: string | null
          id: string | null
          is_active: boolean | null
          suggestions: Json | null
          welcome_message: string | null
        }
        Insert: {
          bot_avatar?: string | null
          bot_name?: string | null
          id?: string | null
          is_active?: boolean | null
          suggestions?: Json | null
          welcome_message?: string | null
        }
        Update: {
          bot_avatar?: string | null
          bot_name?: string | null
          id?: string | null
          is_active?: boolean | null
          suggestions?: Json | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      design_settings_public: {
        Row: {
          accent_color: string | null
          admin_section_colors: Json | null
          background_media: Json | null
          background_watermark: string | null
          category_columns: number | null
          category_layout: Json | null
          click_scale: number | null
          color_display_mode: string | null
          created_at: string | null
          custom_unit_id: string | null
          favicon_url: string | null
          footer_logo: string | null
          glitch_duration: number | null
          glitch_intensity: number | null
          global_product_sizes: Json | null
          gradient_intensity: number | null
          header_bg_color: string | null
          header_fixed: boolean | null
          header_nav_items: Json | null
          header_preset: string | null
          header_text_color: string | null
          hero_slides: Json | null
          home_custom_sections: Json | null
          home_page_blocks: Json | null
          home_sections: Json | null
          home_texts: Json | null
          hud_buttons: Json | null
          hud_logo: string | null
          id: string | null
          is_slideshow_active: boolean | null
          legal_address: string | null
          legal_capital: string | null
          legal_city: string | null
          legal_company_form: string | null
          legal_company_name: string | null
          legal_zip: string | null
          logo_background_color: string | null
          logo_background_padding: number | null
          logo_background_shape: string | null
          logo_size: number | null
          logo_style: Json | null
          mannequin_hotspots: Json | null
          mobile_sidebar_image: string | null
          mobile_sidebar_media_type: string | null
          pages: Json | null
          presets: Json | null
          schedules: Json | null
          settings_key: string | null
          show_logo: boolean | null
          show_overlays: boolean | null
          show_sidebar_gallery: boolean | null
          show_sidebar_newsletter: boolean | null
          show_sidebar_product_card: boolean | null
          show_sidebar_product_number: boolean | null
          show_sidebar_sizes: boolean | null
          show_sidebar_stats: boolean | null
          show_slider_overlay: boolean | null
          show_stats: boolean | null
          show_unit_id: boolean | null
          sidebar_bg: string | null
          sidebar_brand_name: string | null
          sidebar_brand_position: string | null
          sidebar_brand_subtitle: string | null
          sidebar_gradient: boolean | null
          sidebar_image: string | null
          sidebar_image_opacity: number | null
          sidebar_info_text: string | null
          sidebar_newsletter_cta: string | null
          sidebar_newsletter_title: string | null
          sidebar_product_description: string | null
          sidebar_product_title: string | null
          sidebar_reappear_delay: number | null
          sidebar_sizes: Json | null
          sidebar_slider_enabled: boolean | null
          sidebar_slider_max_products: number | null
          sidebar_slider_speed: number | null
          site_name: string | null
          site_spacing: string | null
          site_tagline: string | null
          slider_auto_play: boolean | null
          slider_grayscale: boolean | null
          slider_height: string | null
          slider_speed: number | null
          slideshow_speed: number | null
          social_display_mode: string | null
          social_links: Json | null
          social_style: Json | null
          stat_bar_empty_color: string | null
          stat_bar_filled_color: string | null
          stats: Json | null
          stats_label: string | null
          stats_style: Json | null
          stats_sub_label: string | null
          techwear_hero: Json | null
          top_banner: Json | null
          unit_id_label: string | null
          unit_id_style: Json | null
          updated_at: string | null
          voice_command_enabled: boolean | null
          voice_onboarding_hint: boolean | null
        }
        Insert: {
          accent_color?: string | null
          admin_section_colors?: Json | null
          background_media?: Json | null
          background_watermark?: string | null
          category_columns?: number | null
          category_layout?: Json | null
          click_scale?: number | null
          color_display_mode?: string | null
          created_at?: string | null
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_logo?: string | null
          glitch_duration?: number | null
          glitch_intensity?: number | null
          global_product_sizes?: Json | null
          gradient_intensity?: number | null
          header_bg_color?: string | null
          header_fixed?: boolean | null
          header_nav_items?: Json | null
          header_preset?: string | null
          header_text_color?: string | null
          hero_slides?: Json | null
          home_custom_sections?: Json | null
          home_page_blocks?: Json | null
          home_sections?: Json | null
          home_texts?: Json | null
          hud_buttons?: Json | null
          hud_logo?: string | null
          id?: string | null
          is_slideshow_active?: boolean | null
          legal_address?: string | null
          legal_capital?: string | null
          legal_city?: string | null
          legal_company_form?: string | null
          legal_company_name?: string | null
          legal_zip?: string | null
          logo_background_color?: string | null
          logo_background_padding?: number | null
          logo_background_shape?: string | null
          logo_size?: number | null
          logo_style?: Json | null
          mannequin_hotspots?: Json | null
          mobile_sidebar_image?: string | null
          mobile_sidebar_media_type?: string | null
          pages?: Json | null
          presets?: Json | null
          schedules?: Json | null
          settings_key?: string | null
          show_logo?: boolean | null
          show_overlays?: boolean | null
          show_sidebar_gallery?: boolean | null
          show_sidebar_newsletter?: boolean | null
          show_sidebar_product_card?: boolean | null
          show_sidebar_product_number?: boolean | null
          show_sidebar_sizes?: boolean | null
          show_sidebar_stats?: boolean | null
          show_slider_overlay?: boolean | null
          show_stats?: boolean | null
          show_unit_id?: boolean | null
          sidebar_bg?: string | null
          sidebar_brand_name?: string | null
          sidebar_brand_position?: string | null
          sidebar_brand_subtitle?: string | null
          sidebar_gradient?: boolean | null
          sidebar_image?: string | null
          sidebar_image_opacity?: number | null
          sidebar_info_text?: string | null
          sidebar_newsletter_cta?: string | null
          sidebar_newsletter_title?: string | null
          sidebar_product_description?: string | null
          sidebar_product_title?: string | null
          sidebar_reappear_delay?: number | null
          sidebar_sizes?: Json | null
          sidebar_slider_enabled?: boolean | null
          sidebar_slider_max_products?: number | null
          sidebar_slider_speed?: number | null
          site_name?: string | null
          site_spacing?: string | null
          site_tagline?: string | null
          slider_auto_play?: boolean | null
          slider_grayscale?: boolean | null
          slider_height?: string | null
          slider_speed?: number | null
          slideshow_speed?: number | null
          social_display_mode?: string | null
          social_links?: Json | null
          social_style?: Json | null
          stat_bar_empty_color?: string | null
          stat_bar_filled_color?: string | null
          stats?: Json | null
          stats_label?: string | null
          stats_style?: Json | null
          stats_sub_label?: string | null
          techwear_hero?: Json | null
          top_banner?: Json | null
          unit_id_label?: string | null
          unit_id_style?: Json | null
          updated_at?: string | null
          voice_command_enabled?: boolean | null
          voice_onboarding_hint?: boolean | null
        }
        Update: {
          accent_color?: string | null
          admin_section_colors?: Json | null
          background_media?: Json | null
          background_watermark?: string | null
          category_columns?: number | null
          category_layout?: Json | null
          click_scale?: number | null
          color_display_mode?: string | null
          created_at?: string | null
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_logo?: string | null
          glitch_duration?: number | null
          glitch_intensity?: number | null
          global_product_sizes?: Json | null
          gradient_intensity?: number | null
          header_bg_color?: string | null
          header_fixed?: boolean | null
          header_nav_items?: Json | null
          header_preset?: string | null
          header_text_color?: string | null
          hero_slides?: Json | null
          home_custom_sections?: Json | null
          home_page_blocks?: Json | null
          home_sections?: Json | null
          home_texts?: Json | null
          hud_buttons?: Json | null
          hud_logo?: string | null
          id?: string | null
          is_slideshow_active?: boolean | null
          legal_address?: string | null
          legal_capital?: string | null
          legal_city?: string | null
          legal_company_form?: string | null
          legal_company_name?: string | null
          legal_zip?: string | null
          logo_background_color?: string | null
          logo_background_padding?: number | null
          logo_background_shape?: string | null
          logo_size?: number | null
          logo_style?: Json | null
          mannequin_hotspots?: Json | null
          mobile_sidebar_image?: string | null
          mobile_sidebar_media_type?: string | null
          pages?: Json | null
          presets?: Json | null
          schedules?: Json | null
          settings_key?: string | null
          show_logo?: boolean | null
          show_overlays?: boolean | null
          show_sidebar_gallery?: boolean | null
          show_sidebar_newsletter?: boolean | null
          show_sidebar_product_card?: boolean | null
          show_sidebar_product_number?: boolean | null
          show_sidebar_sizes?: boolean | null
          show_sidebar_stats?: boolean | null
          show_slider_overlay?: boolean | null
          show_stats?: boolean | null
          show_unit_id?: boolean | null
          sidebar_bg?: string | null
          sidebar_brand_name?: string | null
          sidebar_brand_position?: string | null
          sidebar_brand_subtitle?: string | null
          sidebar_gradient?: boolean | null
          sidebar_image?: string | null
          sidebar_image_opacity?: number | null
          sidebar_info_text?: string | null
          sidebar_newsletter_cta?: string | null
          sidebar_newsletter_title?: string | null
          sidebar_product_description?: string | null
          sidebar_product_title?: string | null
          sidebar_reappear_delay?: number | null
          sidebar_sizes?: Json | null
          sidebar_slider_enabled?: boolean | null
          sidebar_slider_max_products?: number | null
          sidebar_slider_speed?: number | null
          site_name?: string | null
          site_spacing?: string | null
          site_tagline?: string | null
          slider_auto_play?: boolean | null
          slider_grayscale?: boolean | null
          slider_height?: string | null
          slider_speed?: number | null
          slideshow_speed?: number | null
          social_display_mode?: string | null
          social_links?: Json | null
          social_style?: Json | null
          stat_bar_empty_color?: string | null
          stat_bar_filled_color?: string | null
          stats?: Json | null
          stats_label?: string | null
          stats_style?: Json | null
          stats_sub_label?: string | null
          techwear_hero?: Json | null
          top_banner?: Json | null
          unit_id_label?: string | null
          unit_id_style?: Json | null
          updated_at?: string | null
          voice_command_enabled?: boolean | null
          voice_onboarding_hint?: boolean | null
        }
        Relationships: []
      }
      roulette_config_public: {
        Row: {
          auto_open_delay_ms: number | null
          auto_open_on_landing: boolean | null
          button_label: string | null
          config_key: string | null
          cooldown_hours: number | null
          enabled: boolean | null
          fab_label: string | null
          game_type: string | null
          id: string | null
          require_email: boolean | null
          reward_validity_days: number | null
          show_after_dismiss_hours: number | null
          subtitle: string | null
          title: string | null
        }
        Insert: {
          auto_open_delay_ms?: number | null
          auto_open_on_landing?: boolean | null
          button_label?: string | null
          config_key?: string | null
          cooldown_hours?: number | null
          enabled?: boolean | null
          fab_label?: string | null
          game_type?: string | null
          id?: string | null
          require_email?: boolean | null
          reward_validity_days?: number | null
          show_after_dismiss_hours?: number | null
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          auto_open_delay_ms?: number | null
          auto_open_on_landing?: boolean | null
          button_label?: string | null
          config_key?: string | null
          cooldown_hours?: number | null
          enabled?: boolean | null
          fab_label?: string | null
          game_type?: string | null
          id?: string | null
          require_email?: boolean | null
          reward_validity_days?: number | null
          show_after_dismiss_hours?: number | null
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      roulette_segments_public: {
        Row: {
          color: string | null
          description: string | null
          icon: string | null
          id: string | null
          is_active: boolean | null
          label: string | null
          reward_type: string | null
          sort_order: number | null
          text_color: string | null
        }
        Insert: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          reward_type?: string | null
          sort_order?: number | null
          text_color?: string | null
        }
        Update: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          reward_type?: string | null
          sort_order?: number | null
          text_color?: string | null
        }
        Relationships: []
      }
      user_roles_with_email: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_loyalty_points: { Args: { p_order_id: string }; Returns: Json }
      consume_order_stock: { Args: { p_order_id: string }; Returns: Json }
      find_user_by_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      get_newsletter_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_users_by_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      mark_popup_converted: {
        Args: { p_popup_id: string; p_session_id: string }
        Returns: undefined
      }
      preview_promo_code: {
        Args: { p_code: string; p_subtotal: number }
        Returns: Json
      }
      record_cgv_consent: {
        Args: {
          p_accepted: boolean
          p_session_hash?: string
          p_url?: string
          p_user_agent?: string
          p_version: string
        }
        Returns: string
      }
      redeem_loyalty_reward: { Args: { p_reward_id: string }; Returns: Json }
      release_order_stock: { Args: { p_order_id: string }; Returns: Json }
      reserve_order_stock: { Args: { p_order_id: string }; Returns: Json }
      security_audit_snapshot: { Args: never; Returns: Json }
      spin_roulette:
        | { Args: { p_email?: string }; Returns: Json }
        | { Args: { p_email?: string; p_ip_hash?: string }; Returns: Json }
      track_session_heartbeat: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      validate_and_create_order: {
        Args: {
          p_delivery_mode: string
          p_items: Json
          p_order_data: Json
          p_promo_code: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "stock_manager"
        | "preparator"
        | "auditor"
        | "order_validator"
      banner_type: "hero" | "promo" | "popup" | "sidebar"
      loyalty_tier: "bronze" | "silver" | "gold" | "platinum"
      promo_type: "percentage" | "fixed_amount" | "free_shipping"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "stock_manager",
        "preparator",
        "auditor",
        "order_validator",
      ],
      banner_type: ["hero", "promo", "popup", "sidebar"],
      loyalty_tier: ["bronze", "silver", "gold", "platinum"],
      promo_type: ["percentage", "fixed_amount", "free_shipping"],
    },
  },
} as const
