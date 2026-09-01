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
    PostgrestVersion: "14.5"
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
      auth_email_templates: {
        Row: {
          draft: Json
          key: string
          published: Json | null
          published_at: string | null
          updated_at: string
        }
        Insert: {
          draft?: Json
          key: string
          published?: Json | null
          published_at?: string | null
          updated_at?: string
        }
        Update: {
          draft?: Json
          key?: string
          published?: Json | null
          published_at?: string | null
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
          ai_default_model: string
          ai_vision_model: string
          bot_avatar: string | null
          bot_name: string | null
          chat_model: string
          created_at: string | null
          id: string
          is_active: boolean | null
          suggestions: Json | null
          system_prompt: string
          updated_at: string | null
          voice_model: string
          welcome_message: string | null
        }
        Insert: {
          ai_default_model?: string
          ai_vision_model?: string
          bot_avatar?: string | null
          bot_name?: string | null
          chat_model?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          suggestions?: Json | null
          system_prompt?: string
          updated_at?: string | null
          voice_model?: string
          welcome_message?: string | null
        }
        Update: {
          ai_default_model?: string
          ai_vision_model?: string
          bot_avatar?: string | null
          bot_name?: string | null
          chat_model?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          suggestions?: Json | null
          system_prompt?: string
          updated_at?: string | null
          voice_model?: string
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
          cover_bg: string | null
          cover_mode: string | null
          cover_position: string
          cover_zoom: number
          created_at: string
          display_size: string | null
          icon: string | null
          icon_image: string | null
          id: string
          image: string | null
          include_children: boolean
          meta_description: string | null
          meta_title: string | null
          parent_id: string | null
          seo_keywords: string | null
          slug: string | null
          sort_order: number | null
          template_id: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          cover_bg?: string | null
          cover_mode?: string | null
          cover_position?: string
          cover_zoom?: number
          created_at?: string
          display_size?: string | null
          icon?: string | null
          icon_image?: string | null
          id?: string
          image?: string | null
          include_children?: boolean
          meta_description?: string | null
          meta_title?: string | null
          parent_id?: string | null
          seo_keywords?: string | null
          slug?: string | null
          sort_order?: number | null
          template_id?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          cover_bg?: string | null
          cover_mode?: string | null
          cover_position?: string
          cover_zoom?: number
          created_at?: string
          display_size?: string | null
          icon?: string | null
          icon_image?: string | null
          id?: string
          image?: string | null
          include_children?: boolean
          meta_description?: string | null
          meta_title?: string | null
          parent_id?: string | null
          seo_keywords?: string | null
          slug?: string | null
          sort_order?: number | null
          template_id?: string | null
          title?: string
          updated_at?: string
          visibility?: string
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
          auto_colissimo_label: boolean
          checkout_message: string | null
          config_key: string
          created_at: string
          free_shipping_relay_only: boolean
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
          auto_colissimo_label?: boolean
          checkout_message?: string | null
          config_key?: string
          created_at?: string
          free_shipping_relay_only?: boolean
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
          auto_colissimo_label?: boolean
          checkout_message?: string | null
          config_key?: string
          created_at?: string
          free_shipping_relay_only?: boolean
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
      crm_contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_conversations: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          last_message_at: string
          order_id: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          order_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          order_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_message_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          recipient_email: string
          sender_email: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction?: string
          id?: string
          recipient_email: string
          sender_email: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          recipient_email?: string
          sender_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "crm_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_email_log: {
        Row: {
          created_at: string
          customer_email: string
          email_type: string
          error: string | null
          id: string
          order_id: string | null
          provider_id: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          email_type: string
          error?: string | null
          id?: string
          order_id?: string | null
          provider_id?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          email_type?: string
          error?: string | null
          id?: string
          order_id?: string | null
          provider_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_email_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          loyalty_points: number | null
          loyalty_tier: Database["public"]["Enums"]["loyalty_tier"] | null
          orders_count: number
          phone: string | null
          source: string
          total_spent: number | null
          updated_at: string
          user_id: string | null
          wc_created_at: string | null
          wc_id: number | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"] | null
          orders_count?: number
          phone?: string | null
          source?: string
          total_spent?: number | null
          updated_at?: string
          user_id?: string | null
          wc_created_at?: string | null
          wc_id?: number | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          loyalty_points?: number | null
          loyalty_tier?: Database["public"]["Enums"]["loyalty_tier"] | null
          orders_count?: number
          phone?: string | null
          source?: string
          total_spent?: number | null
          updated_at?: string
          user_id?: string | null
          wc_created_at?: string | null
          wc_id?: number | null
          zip?: string | null
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
          collab_settings: Json
          color_display_mode: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          custom_unit_id: string | null
          favicon_url: string | null
          footer_config: Json
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
          legal_pages: Json
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
          maintenance_admin_bypass: boolean
          maintenance_bg: string | null
          maintenance_enabled: boolean
          maintenance_image: string | null
          maintenance_message: string | null
          maintenance_title: string | null
          maintenance_until: string | null
          mannequin_hotspots: Json
          mobile_sidebar_image: string | null
          mobile_sidebar_media_type: string | null
          pages: Json | null
          presets: Json | null
          product_grid_layout: string
          schedules: Json | null
          security_overlay: Json
          seo_default_description: string | null
          seo_default_title: string | null
          seo_indexable: boolean
          seo_noimageindex: boolean
          seo_og_image: string | null
          settings_json: Json
          settings_key: string
          shop_hover_effect: Json
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
          collab_settings?: Json
          color_display_mode?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_config?: Json
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
          legal_pages?: Json
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
          maintenance_admin_bypass?: boolean
          maintenance_bg?: string | null
          maintenance_enabled?: boolean
          maintenance_image?: string | null
          maintenance_message?: string | null
          maintenance_title?: string | null
          maintenance_until?: string | null
          mannequin_hotspots?: Json
          mobile_sidebar_image?: string | null
          mobile_sidebar_media_type?: string | null
          pages?: Json | null
          presets?: Json | null
          product_grid_layout?: string
          schedules?: Json | null
          security_overlay?: Json
          seo_default_description?: string | null
          seo_default_title?: string | null
          seo_indexable?: boolean
          seo_noimageindex?: boolean
          seo_og_image?: string | null
          settings_json?: Json
          settings_key?: string
          shop_hover_effect?: Json
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
          collab_settings?: Json
          color_display_mode?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_config?: Json
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
          legal_pages?: Json
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
          maintenance_admin_bypass?: boolean
          maintenance_bg?: string | null
          maintenance_enabled?: boolean
          maintenance_image?: string | null
          maintenance_message?: string | null
          maintenance_title?: string | null
          maintenance_until?: string | null
          mannequin_hotspots?: Json
          mobile_sidebar_image?: string | null
          mobile_sidebar_media_type?: string | null
          pages?: Json | null
          presets?: Json | null
          product_grid_layout?: string
          schedules?: Json | null
          security_overlay?: Json
          seo_default_description?: string | null
          seo_default_title?: string | null
          seo_indexable?: boolean
          seo_noimageindex?: boolean
          seo_og_image?: string | null
          settings_json?: Json
          settings_key?: string
          shop_hover_effect?: Json
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
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
      mannequins: {
        Row: {
          age_range: string
          created_at: string
          fit_notes: string | null
          gender: string
          height_cm: number | null
          id: string
          image_url: string
          is_active: boolean
          morphology: string
          name: string
          skin_tone: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          age_range?: string
          created_at?: string
          fit_notes?: string | null
          gender?: string
          height_cm?: number | null
          id?: string
          image_url: string
          is_active?: boolean
          morphology?: string
          name: string
          skin_tone?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          age_range?: string
          created_at?: string
          fit_notes?: string | null
          gender?: string
          height_cm?: number | null
          id?: string
          image_url?: string
          is_active?: boolean
          morphology?: string
          name?: string
          skin_tone?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          auto_replied_at: string | null
          auto_reply: string | null
          created_at: string
          email: string
          id: string
          is_read: boolean | null
          message: string
          name: string
        }
        Insert: {
          auto_replied_at?: string | null
          auto_reply?: string | null
          created_at?: string
          email: string
          id?: string
          is_read?: boolean | null
          message: string
          name: string
        }
        Update: {
          auto_replied_at?: string | null
          auto_reply?: string | null
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean | null
          message?: string
          name?: string
        }
        Relationships: []
      }
      messaging_config: {
        Row: {
          config_key: string
          created_at: string
          default_from_email: string | null
          default_from_name: string | null
          id: string
          provider: string
          signature: string | null
          updated_at: string
        }
        Insert: {
          config_key?: string
          created_at?: string
          default_from_email?: string | null
          default_from_name?: string | null
          id?: string
          provider?: string
          signature?: string | null
          updated_at?: string
        }
        Update: {
          config_key?: string
          created_at?: string
          default_from_email?: string | null
          default_from_name?: string | null
          id?: string
          provider?: string
          signature?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_campaign_sends: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          error_message: string | null
          id: string
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "newsletter_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_campaigns: {
        Row: {
          content: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          failed_count: number
          id: string
          image_url: string | null
          preheader: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          unsubscribed_count: number
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          failed_count?: number
          id?: string
          image_url?: string | null
          preheader?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          unsubscribed_count?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          failed_count?: number
          id?: string
          image_url?: string | null
          preheader?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          unsubscribed_count?: number
          updated_at?: string
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
          confirm_token: string
          confirmed_at: string | null
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
          unsubscribe_token: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirm_token?: string
          confirmed_at?: string | null
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
          unsubscribe_token?: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirm_token?: string
          confirmed_at?: string | null
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
          unsubscribe_token?: string
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
      order_tracking_events: {
        Row: {
          carrier: string | null
          created_at: string
          event_at: string
          id: string
          label: string
          location: string | null
          notified_at: string | null
          order_id: string
          status_code: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          event_at?: string
          id?: string
          label: string
          location?: string | null
          notified_at?: string | null
          order_id: string
          status_code: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          event_at?: string
          id?: string
          label?: string
          location?: string | null
          notified_at?: string | null
          order_id?: string
          status_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          is_test: boolean
          items: Json
          label_generated_at: string | null
          label_path: string | null
          label_url: string | null
          loyalty_awarded_at: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          shipping_carrier: string | null
          shipping_cost: number
          source: string
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
          wc_created_at: string | null
          wc_id: number | null
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
          is_test?: boolean
          items?: Json
          label_generated_at?: string | null
          label_path?: string | null
          label_url?: string | null
          loyalty_awarded_at?: string | null
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string
          shipping_carrier?: string | null
          shipping_cost?: number
          source?: string
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
          wc_created_at?: string | null
          wc_id?: number | null
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
          is_test?: boolean
          items?: Json
          label_generated_at?: string | null
          label_path?: string | null
          label_url?: string | null
          loyalty_awarded_at?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping_carrier?: string | null
          shipping_cost?: number
          source?: string
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
          wc_created_at?: string | null
          wc_id?: number | null
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
      payment_gateway_secrets: {
        Row: {
          gateway: string
          last4: string | null
          secret_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          gateway: string
          last4?: string | null
          secret_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          gateway?: string
          last4?: string | null
          secret_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      paypal_config: {
        Row: {
          brand_name: string | null
          button_style: Json
          client_id_live: string | null
          client_id_sandbox: string | null
          config_key: string
          created_at: string
          currency: string
          enable_card_fields: boolean
          enable_messaging: boolean
          enable_pay_later: boolean
          enable_paypal_button: boolean
          enable_venmo: boolean
          enable_wallets: boolean
          enabled: boolean
          environment: string
          id: string
          intent: string
          locale: string
          messaging_placements: Json
          updated_at: string
          webhook_id: string | null
        }
        Insert: {
          brand_name?: string | null
          button_style?: Json
          client_id_live?: string | null
          client_id_sandbox?: string | null
          config_key?: string
          created_at?: string
          currency?: string
          enable_card_fields?: boolean
          enable_messaging?: boolean
          enable_pay_later?: boolean
          enable_paypal_button?: boolean
          enable_venmo?: boolean
          enable_wallets?: boolean
          enabled?: boolean
          environment?: string
          id?: string
          intent?: string
          locale?: string
          messaging_placements?: Json
          updated_at?: string
          webhook_id?: string | null
        }
        Update: {
          brand_name?: string | null
          button_style?: Json
          client_id_live?: string | null
          client_id_sandbox?: string | null
          config_key?: string
          created_at?: string
          currency?: string
          enable_card_fields?: boolean
          enable_messaging?: boolean
          enable_pay_later?: boolean
          enable_paypal_button?: boolean
          enable_venmo?: boolean
          enable_wallets?: boolean
          enabled?: boolean
          environment?: string
          id?: string
          intent?: string
          locale?: string
          messaging_placements?: Json
          updated_at?: string
          webhook_id?: string | null
        }
        Relationships: []
      }
      paypal_transactions: {
        Row: {
          amount: number
          capture_id: string | null
          created_at: string
          currency: string
          environment: string
          funding_source: string | null
          id: string
          order_id: string | null
          payer_email: string | null
          payer_name: string | null
          paypal_order_id: string
          raw: Json
          refunded_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          capture_id?: string | null
          created_at?: string
          currency?: string
          environment?: string
          funding_source?: string | null
          id?: string
          order_id?: string | null
          payer_email?: string | null
          payer_name?: string | null
          paypal_order_id: string
          raw?: Json
          refunded_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          capture_id?: string | null
          created_at?: string
          currency?: string
          environment?: string
          funding_source?: string | null
          id?: string
          order_id?: string | null
          payer_email?: string | null
          payer_name?: string | null
          paypal_order_id?: string
          raw?: Json
          refunded_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paypal_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean
          resource_id: string | null
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed?: boolean
          resource_id?: string | null
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          resource_id?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      payplug_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_message: string | null
          id: string
          is_live: boolean
          order_id: string | null
          payplug_payment_id: string
          raw: Json
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          failure_message?: string | null
          id?: string
          is_live?: boolean
          order_id?: string | null
          payplug_payment_id: string
          raw?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_message?: string | null
          id?: string
          is_live?: boolean
          order_id?: string | null
          payplug_payment_id?: string
          raw?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payplug_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_campaigns: {
        Row: {
          background: Json
          created_at: string
          delay_seconds: number
          display_trigger: string
          ends_at: string | null
          format: string
          frequency_days: number
          id: string
          idle_seconds: number
          is_active: boolean
          layers: Json
          max_views: number
          name: string
          priority: number
          scroll_percent: number
          starts_at: string | null
          targeting: Json
          type: string
          updated_at: string
          visit_count: number
        }
        Insert: {
          background?: Json
          created_at?: string
          delay_seconds?: number
          display_trigger?: string
          ends_at?: string | null
          format?: string
          frequency_days?: number
          id?: string
          idle_seconds?: number
          is_active?: boolean
          layers?: Json
          max_views?: number
          name: string
          priority?: number
          scroll_percent?: number
          starts_at?: string | null
          targeting?: Json
          type?: string
          updated_at?: string
          visit_count?: number
        }
        Update: {
          background?: Json
          created_at?: string
          delay_seconds?: number
          display_trigger?: string
          ends_at?: string | null
          format?: string
          frequency_days?: number
          id?: string
          idle_seconds?: number
          is_active?: boolean
          layers?: Json
          max_views?: number
          name?: string
          priority?: number
          scroll_percent?: number
          starts_at?: string | null
          targeting?: Json
          type?: string
          updated_at?: string
          visit_count?: number
        }
        Relationships: []
      }
      popup_events: {
        Row: {
          campaign_id: string
          created_at: string
          event: string
          id: string
          meta: Json
          session_id: string | null
          url: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event: string
          id?: string
          meta?: Json
          session_id?: string | null
          url?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event?: string
          id?: string
          meta?: Json
          session_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "popup_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "popup_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category_order: {
        Row: {
          category_slug: string
          created_at: string
          position: number
          product_id: string
          updated_at: string
        }
        Insert: {
          category_slug: string
          created_at?: string
          position?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          category_slug?: string
          created_at?: string
          position?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_order_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      product_review_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          comment: string
          created_at: string
          helpful_count: number
          id: string
          is_verified_purchase: boolean
          order_id: string | null
          product_id: string
          rating: number
          size_purchased: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          comment: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id: string
          rating: number
          size_purchased?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          comment?: string
          created_at?: string
          helpful_count?: number
          id?: string
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id?: string
          rating?: number
          size_purchased?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          categories: string[]
          category: string
          color_options: Json | null
          colors: string[] | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          gallery_images: string[]
          hover_image: string | null
          id: string
          image: string
          is_active: boolean | null
          limited_edition: boolean
          limited_edition_color: string | null
          limited_edition_label: string | null
          limited_edition_position: string | null
          limited_edition_text_color: string | null
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
          sold_out_badge: boolean
          sold_out_label: string | null
          status: string
          stock: number
          subtitle: string | null
          tags: string[] | null
          template_id: string | null
          title_logo: string | null
          tryon_mode: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attributes?: Json | null
          care_instructions?: string | null
          categories?: string[]
          category: string
          color_options?: Json | null
          colors?: string[] | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          gallery_images?: string[]
          hover_image?: string | null
          id?: string
          image: string
          is_active?: boolean | null
          limited_edition?: boolean
          limited_edition_color?: string | null
          limited_edition_label?: string | null
          limited_edition_position?: string | null
          limited_edition_text_color?: string | null
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
          sold_out_badge?: boolean
          sold_out_label?: string | null
          status?: string
          stock?: number
          subtitle?: string | null
          tags?: string[] | null
          template_id?: string | null
          title_logo?: string | null
          tryon_mode?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attributes?: Json | null
          care_instructions?: string | null
          categories?: string[]
          category?: string
          color_options?: Json | null
          colors?: string[] | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          gallery_images?: string[]
          hover_image?: string | null
          id?: string
          image?: string
          is_active?: boolean | null
          limited_edition?: boolean
          limited_edition_color?: string | null
          limited_edition_label?: string | null
          limited_edition_position?: string | null
          limited_edition_text_color?: string | null
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
          sold_out_badge?: boolean
          sold_out_label?: string | null
          status?: string
          stock?: number
          subtitle?: string | null
          tags?: string[] | null
          template_id?: string | null
          title_logo?: string | null
          tryon_mode?: string
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
      role_permissions: {
        Row: {
          allowed_routes: string[]
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed_routes?: string[]
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed_routes?: string[]
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
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
      seo_redirects: {
        Row: {
          created_at: string
          id: string
          new_path: string
          notes: string | null
          old_path: string
          old_url: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_path?: string
          notes?: string | null
          old_path: string
          old_url: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          new_path?: string
          notes?: string | null
          old_path?: string
          old_url?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tryon_looks: {
        Row: {
          base_product_id: string | null
          created_at: string
          id: string
          items: Json
          mannequin_id: string | null
          result_image: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_product_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          mannequin_id?: string | null
          result_image?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_product_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          mannequin_id?: string | null
          result_image?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tryon_looks_mannequin_id_fkey"
            columns: ["mannequin_id"]
            isOneToOne: false
            referencedRelation: "mannequins"
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
      woocommerce_config: {
        Row: {
          config_key: string
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          store_info: Json | null
          store_url: string | null
          sync_customers: boolean
          sync_orders: boolean
          sync_stats: boolean
          updated_at: string
        }
        Insert: {
          config_key?: string
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          store_info?: Json | null
          store_url?: string | null
          sync_customers?: boolean
          sync_orders?: boolean
          sync_stats?: boolean
          updated_at?: string
        }
        Update: {
          config_key?: string
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          store_info?: Json | null
          store_url?: string | null
          sync_customers?: boolean
          sync_orders?: boolean
          sync_stats?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      woocommerce_stats: {
        Row: {
          created_at: string
          data: Json
          fetched_at: string
          id: string
          period: string
          report: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          fetched_at?: string
          id?: string
          period?: string
          report: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          fetched_at?: string
          id?: string
          period?: string
          report?: string
          updated_at?: string
        }
        Relationships: []
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
      checkout_config_public: {
        Row: {
          checkout_message: string | null
          config_key: string | null
          free_shipping_relay_only: boolean | null
          free_shipping_threshold: number | null
          home_delivery_enabled: boolean | null
          id: string | null
          payment_methods: Json | null
          relay_enabled: boolean | null
          relay_map_settings: Json | null
          shipping_home_price: number | null
          shipping_relay_price: number | null
        }
        Insert: {
          checkout_message?: string | null
          config_key?: string | null
          free_shipping_relay_only?: boolean | null
          free_shipping_threshold?: number | null
          home_delivery_enabled?: boolean | null
          id?: string | null
          payment_methods?: never
          relay_enabled?: boolean | null
          relay_map_settings?: Json | null
          shipping_home_price?: number | null
          shipping_relay_price?: number | null
        }
        Update: {
          checkout_message?: string | null
          config_key?: string | null
          free_shipping_relay_only?: boolean | null
          free_shipping_threshold?: number | null
          home_delivery_enabled?: boolean | null
          id?: string | null
          payment_methods?: never
          relay_enabled?: boolean | null
          relay_map_settings?: Json | null
          shipping_home_price?: number | null
          shipping_relay_price?: number | null
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
          collab_settings: Json | null
          color_display_mode: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          custom_unit_id: string | null
          favicon_url: string | null
          footer_config: Json | null
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
          legal_director: string | null
          legal_pages: Json | null
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
          maintenance_admin_bypass: boolean | null
          maintenance_bg: string | null
          maintenance_enabled: boolean | null
          maintenance_image: string | null
          maintenance_message: string | null
          maintenance_title: string | null
          maintenance_until: string | null
          mannequin_hotspots: Json | null
          mobile_sidebar_image: string | null
          mobile_sidebar_media_type: string | null
          pages: Json | null
          presets: Json | null
          schedules: Json | null
          seo_default_description: string | null
          seo_default_title: string | null
          seo_indexable: boolean | null
          seo_noimageindex: boolean | null
          seo_og_image: string | null
          settings_key: string | null
          shop_hover_effect: Json | null
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
          collab_settings?: Json | null
          color_display_mode?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_config?: Json | null
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
          legal_director?: string | null
          legal_pages?: Json | null
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
          maintenance_admin_bypass?: boolean | null
          maintenance_bg?: string | null
          maintenance_enabled?: boolean | null
          maintenance_image?: string | null
          maintenance_message?: string | null
          maintenance_title?: string | null
          maintenance_until?: string | null
          mannequin_hotspots?: Json | null
          mobile_sidebar_image?: string | null
          mobile_sidebar_media_type?: string | null
          pages?: Json | null
          presets?: Json | null
          schedules?: Json | null
          seo_default_description?: string | null
          seo_default_title?: string | null
          seo_indexable?: boolean | null
          seo_noimageindex?: boolean | null
          seo_og_image?: string | null
          settings_key?: string | null
          shop_hover_effect?: Json | null
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
          collab_settings?: Json | null
          color_display_mode?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_config?: Json | null
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
          legal_director?: string | null
          legal_pages?: Json | null
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
          maintenance_admin_bypass?: boolean | null
          maintenance_bg?: string | null
          maintenance_enabled?: boolean | null
          maintenance_image?: string | null
          maintenance_message?: string | null
          maintenance_title?: string | null
          maintenance_until?: string | null
          mannequin_hotspots?: Json | null
          mobile_sidebar_image?: string | null
          mobile_sidebar_media_type?: string | null
          pages?: Json | null
          presets?: Json | null
          schedules?: Json | null
          seo_default_description?: string | null
          seo_default_title?: string | null
          seo_indexable?: boolean | null
          seo_noimageindex?: boolean | null
          seo_og_image?: string | null
          settings_key?: string | null
          shop_hover_effect?: Json | null
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
      paypal_config_public: {
        Row: {
          brand_name: string | null
          button_style: Json | null
          client_id: string | null
          config_key: string | null
          currency: string | null
          enable_card_fields: boolean | null
          enable_messaging: boolean | null
          enable_pay_later: boolean | null
          enable_paypal_button: boolean | null
          enable_venmo: boolean | null
          enable_wallets: boolean | null
          enabled: boolean | null
          environment: string | null
          intent: string | null
          locale: string | null
          messaging_placements: Json | null
        }
        Insert: {
          brand_name?: string | null
          button_style?: Json | null
          client_id?: never
          config_key?: string | null
          currency?: string | null
          enable_card_fields?: boolean | null
          enable_messaging?: boolean | null
          enable_pay_later?: boolean | null
          enable_paypal_button?: boolean | null
          enable_venmo?: boolean | null
          enable_wallets?: boolean | null
          enabled?: boolean | null
          environment?: string | null
          intent?: string | null
          locale?: string | null
          messaging_placements?: Json | null
        }
        Update: {
          brand_name?: string | null
          button_style?: Json | null
          client_id?: never
          config_key?: string | null
          currency?: string | null
          enable_card_fields?: boolean | null
          enable_messaging?: boolean | null
          enable_pay_later?: boolean | null
          enable_paypal_button?: boolean | null
          enable_venmo?: boolean | null
          enable_wallets?: boolean | null
          enabled?: boolean | null
          environment?: string | null
          intent?: string | null
          locale?: string | null
          messaging_placements?: Json | null
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
      can_user_review_product: { Args: { p_product_id: string }; Returns: Json }
      consume_order_stock: { Args: { p_order_id: string }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_customer_profile: { Args: never; Returns: Json }
      find_user_by_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      get_newsletter_stats: { Args: never; Returns: Json }
      get_order_receipt: {
        Args: { p_email?: string; p_order_number: string }
        Returns: Json
      }
      get_product_review_stats: {
        Args: { p_product_id: string }
        Returns: Json
      }
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
      moderate_review: {
        Args: { p_action: string; p_reply?: string; p_review_id: string }
        Returns: Json
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      preview_promo_code: {
        Args: { p_code: string; p_subtotal: number }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
      submit_product_review: {
        Args: {
          p_comment: string
          p_product_id: string
          p_rating: number
          p_title: string
        }
        Returns: Json
      }
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
      vote_review_helpful: { Args: { p_review_id: string }; Returns: Json }
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
