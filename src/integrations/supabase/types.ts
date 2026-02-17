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
        ]
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
          background_media: Json | null
          background_watermark: string | null
          category_columns: number | null
          click_scale: number | null
          created_at: string
          custom_unit_id: string | null
          favicon_url: string | null
          footer_logo: string | null
          glitch_duration: number | null
          glitch_intensity: number | null
          gradient_intensity: number | null
          header_bg_color: string | null
          header_fixed: boolean | null
          header_nav_items: Json | null
          header_preset: string | null
          header_text_color: string | null
          hero_slides: Json | null
          home_sections: Json | null
          hud_buttons: Json | null
          hud_logo: string | null
          id: string
          is_slideshow_active: boolean | null
          logo_style: Json | null
          pages: Json | null
          presets: Json | null
          schedules: Json | null
          settings_key: string
          show_logo: boolean | null
          show_overlays: boolean | null
          show_slider_overlay: boolean | null
          show_stats: boolean | null
          show_unit_id: boolean | null
          sidebar_bg: string | null
          sidebar_gradient: boolean | null
          sidebar_image: string | null
          slider_auto_play: boolean | null
          slider_grayscale: boolean | null
          slider_speed: number | null
          slideshow_speed: number | null
          social_display_mode: string | null
          social_links: Json | null
          social_style: Json | null
          stats: Json | null
          stats_label: string | null
          stats_style: Json | null
          stats_sub_label: string | null
          top_banner: Json | null
          unit_id_label: string | null
          unit_id_style: Json | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          background_media?: Json | null
          background_watermark?: string | null
          category_columns?: number | null
          click_scale?: number | null
          created_at?: string
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_logo?: string | null
          glitch_duration?: number | null
          glitch_intensity?: number | null
          gradient_intensity?: number | null
          header_bg_color?: string | null
          header_fixed?: boolean | null
          header_nav_items?: Json | null
          header_preset?: string | null
          header_text_color?: string | null
          hero_slides?: Json | null
          home_sections?: Json | null
          hud_buttons?: Json | null
          hud_logo?: string | null
          id?: string
          is_slideshow_active?: boolean | null
          logo_style?: Json | null
          pages?: Json | null
          presets?: Json | null
          schedules?: Json | null
          settings_key?: string
          show_logo?: boolean | null
          show_overlays?: boolean | null
          show_slider_overlay?: boolean | null
          show_stats?: boolean | null
          show_unit_id?: boolean | null
          sidebar_bg?: string | null
          sidebar_gradient?: boolean | null
          sidebar_image?: string | null
          slider_auto_play?: boolean | null
          slider_grayscale?: boolean | null
          slider_speed?: number | null
          slideshow_speed?: number | null
          social_display_mode?: string | null
          social_links?: Json | null
          social_style?: Json | null
          stats?: Json | null
          stats_label?: string | null
          stats_style?: Json | null
          stats_sub_label?: string | null
          top_banner?: Json | null
          unit_id_label?: string | null
          unit_id_style?: Json | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          background_media?: Json | null
          background_watermark?: string | null
          category_columns?: number | null
          click_scale?: number | null
          created_at?: string
          custom_unit_id?: string | null
          favicon_url?: string | null
          footer_logo?: string | null
          glitch_duration?: number | null
          glitch_intensity?: number | null
          gradient_intensity?: number | null
          header_bg_color?: string | null
          header_fixed?: boolean | null
          header_nav_items?: Json | null
          header_preset?: string | null
          header_text_color?: string | null
          hero_slides?: Json | null
          home_sections?: Json | null
          hud_buttons?: Json | null
          hud_logo?: string | null
          id?: string
          is_slideshow_active?: boolean | null
          logo_style?: Json | null
          pages?: Json | null
          presets?: Json | null
          schedules?: Json | null
          settings_key?: string
          show_logo?: boolean | null
          show_overlays?: boolean | null
          show_slider_overlay?: boolean | null
          show_stats?: boolean | null
          show_unit_id?: boolean | null
          sidebar_bg?: string | null
          sidebar_gradient?: boolean | null
          sidebar_image?: string | null
          slider_auto_play?: boolean | null
          slider_grayscale?: boolean | null
          slider_speed?: number | null
          slideshow_speed?: number | null
          social_display_mode?: string | null
          social_links?: Json | null
          social_style?: Json | null
          stats?: Json | null
          stats_label?: string | null
          stats_style?: Json | null
          stats_sub_label?: string | null
          top_banner?: Json | null
          unit_id_label?: string | null
          unit_id_style?: Json | null
          updated_at?: string
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
      newsletters: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_subscribed: boolean | null
          preferences: Json | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_subscribed?: boolean | null
          preferences?: Json | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_subscribed?: boolean | null
          preferences?: Json | null
          subscribed_at?: string
          unsubscribed_at?: string | null
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
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          shipping_carrier: string | null
          shipping_cost: number
          status: string
          subtotal: number
          tax: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
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
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string
          shipping_carrier?: string | null
          shipping_cost?: number
          status?: string
          subtotal: number
          tax?: number
          total: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
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
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping_carrier?: string | null
          shipping_cost?: number
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
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
      products: {
        Row: {
          attributes: Json | null
          care_instructions: string | null
          category: string
          color_options: Json | null
          colors: string[] | null
          created_at: string
          description: string | null
          id: string
          image: string
          is_active: boolean | null
          material: string | null
          name: string
          price: number
          sale_price: number | null
          sizes: string[] | null
          sku: string
          stock: number
          subtitle: string | null
          tags: string[] | null
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
          id?: string
          image: string
          is_active?: boolean | null
          material?: string | null
          name: string
          price: number
          sale_price?: number | null
          sizes?: string[] | null
          sku: string
          stock?: number
          subtitle?: string | null
          tags?: string[] | null
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
          id?: string
          image?: string
          is_active?: boolean | null
          material?: string | null
          name?: string
          price?: number
          sale_price?: number | null
          sizes?: string[] | null
          sku?: string
          stock?: number
          subtitle?: string | null
          tags?: string[] | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
      banner_type: ["hero", "promo", "popup", "sidebar"],
      loyalty_tier: ["bronze", "silver", "gold", "platinum"],
      promo_type: ["percentage", "fixed_amount", "free_shipping"],
    },
  },
} as const
