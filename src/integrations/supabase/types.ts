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
      activity_log: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string
          gold_grams: number | null
          gold_price_at_deposit: number | null
          id: string
          notes: string | null
          package_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          created_at?: string
          gold_grams?: number | null
          gold_price_at_deposit?: number | null
          id?: string
          notes?: string | null
          package_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string
          gold_grams?: number | null
          gold_price_at_deposit?: number | null
          id?: string
          notes?: string | null
          package_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goldsmiths: {
        Row: {
          address: string
          admin_notes: string | null
          approved_at: string | null
          bank_account: string | null
          city: string | null
          commercial_registration: string
          commercial_registration_image_url: string | null
          company_account: string | null
          created_at: string
          data_accuracy_accepted: boolean | null
          description: string | null
          email: string
          id: string
          id_card_image_url: string | null
          logo_url: string | null
          name: string
          national_id: string | null
          payment_method: string | null
          phone: string
          product_types: string[] | null
          rating_average: number | null
          rating_count: number | null
          review_accepted: boolean | null
          shop_name: string
          shop_photo_url: string | null
          status: string
          tax_card_image_url: string | null
          tax_card_number: string | null
          terms_accepted: boolean | null
          updated_at: string
          user_id: string
          vodafone_cash_number: string | null
          years_experience: number | null
        }
        Insert: {
          address: string
          admin_notes?: string | null
          approved_at?: string | null
          bank_account?: string | null
          city?: string | null
          commercial_registration: string
          commercial_registration_image_url?: string | null
          company_account?: string | null
          created_at?: string
          data_accuracy_accepted?: boolean | null
          description?: string | null
          email: string
          id?: string
          id_card_image_url?: string | null
          logo_url?: string | null
          name: string
          national_id?: string | null
          payment_method?: string | null
          phone: string
          product_types?: string[] | null
          rating_average?: number | null
          rating_count?: number | null
          review_accepted?: boolean | null
          shop_name: string
          shop_photo_url?: string | null
          status?: string
          tax_card_image_url?: string | null
          tax_card_number?: string | null
          terms_accepted?: boolean | null
          updated_at?: string
          user_id: string
          vodafone_cash_number?: string | null
          years_experience?: number | null
        }
        Update: {
          address?: string
          admin_notes?: string | null
          approved_at?: string | null
          bank_account?: string | null
          city?: string | null
          commercial_registration?: string
          commercial_registration_image_url?: string | null
          company_account?: string | null
          created_at?: string
          data_accuracy_accepted?: boolean | null
          description?: string | null
          email?: string
          id?: string
          id_card_image_url?: string | null
          logo_url?: string | null
          name?: string
          national_id?: string | null
          payment_method?: string | null
          phone?: string
          product_types?: string[] | null
          rating_average?: number | null
          rating_count?: number | null
          review_accepted?: boolean | null
          shop_name?: string
          shop_photo_url?: string | null
          status?: string
          tax_card_image_url?: string | null
          tax_card_number?: string | null
          terms_accepted?: boolean | null
          updated_at?: string
          user_id?: string
          vodafone_cash_number?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      metal_prices: {
        Row: {
          buy_price_per_gram: number
          buy_price_per_ounce: number
          created_at: string
          id: string
          metal_type: string
          price_per_gram: number
          price_per_ounce: number
          sell_price_per_gram: number
          sell_price_per_ounce: number
          source: string
          updated_at: string
        }
        Insert: {
          buy_price_per_gram: number
          buy_price_per_ounce: number
          created_at?: string
          id?: string
          metal_type: string
          price_per_gram: number
          price_per_ounce: number
          sell_price_per_gram: number
          sell_price_per_ounce: number
          source?: string
          updated_at?: string
        }
        Update: {
          buy_price_per_gram?: number
          buy_price_per_ounce?: number
          created_at?: string
          id?: string
          metal_type?: string
          price_per_gram?: number
          price_per_ounce?: number
          sell_price_per_gram?: number
          sell_price_per_ounce?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string
          goldsmith_id: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          shipped_at: string | null
          shipping_address: string | null
          shipping_phone: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          goldsmith_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_phone?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          goldsmith_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_phone?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_goldsmith_id_fkey"
            columns: ["goldsmith_id"]
            isOneToOne: false
            referencedRelation: "goldsmiths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          goldsmith_id: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          karat: number | null
          making_charge: number | null
          metal_type: string
          name: string
          price: number
          quantity: number
          updated_at: string
          weight_grams: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          goldsmith_id?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          karat?: number | null
          making_charge?: number | null
          metal_type?: string
          name: string
          price: number
          quantity?: number
          updated_at?: string
          weight_grams: number
        }
        Update: {
          created_at?: string
          description?: string | null
          goldsmith_id?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          karat?: number | null
          making_charge?: number | null
          metal_type?: string
          name?: string
          price?: number
          quantity?: number
          updated_at?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_goldsmith_id_fkey"
            columns: ["goldsmith_id"]
            isOneToOne: false
            referencedRelation: "goldsmiths"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          id_back_url: string | null
          id_front_url: string | null
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
          wallet_number: string | null
          wallet_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          wallet_number?: string | null
          wallet_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          wallet_number?: string | null
          wallet_type?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          goldsmith_id: string
          id: string
          order_id: string | null
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          goldsmith_id: string
          id?: string
          order_id?: string | null
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          goldsmith_id?: string
          id?: string
          order_id?: string | null
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_goldsmith_id_fkey"
            columns: ["goldsmith_id"]
            isOneToOne: false
            referencedRelation: "goldsmiths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          deposit_id: string | null
          fee_amount: number | null
          fee_percentage: number | null
          gold_price_at_withdrawal: number | null
          id: string
          net_amount: number | null
          notes: string | null
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
          withdrawal_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          deposit_id?: string | null
          fee_amount?: number | null
          fee_percentage?: number | null
          gold_price_at_withdrawal?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          withdrawal_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          deposit_id?: string | null
          fee_amount?: number | null
          fee_percentage?: number | null
          gold_price_at_withdrawal?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          withdrawal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_goldsmith: {
        Args: { p_goldsmith_id: string; p_notes?: string }
        Returns: undefined
      }
      create_default_admin: { Args: never; Returns: string }
      get_latest_metal_prices: {
        Args: never
        Returns: {
          buy_price_per_gram: number
          buy_price_per_ounce: number
          metal_type: string
          price_per_gram: number
          price_per_ounce: number
          sell_price_per_gram: number
          sell_price_per_ounce: number
          source: string
          updated_at: string
        }[]
      }
      get_user_portfolio: {
        Args: { p_user_id: string }
        Returns: {
          approved_deposits: number
          completed_withdrawals: number
          pending_deposits: number
          pending_withdrawals: number
          total_gold_grams: number
          total_invested: number
        }[]
      }
      get_user_portfolio_admin: {
        Args: { p_user_id: string }
        Returns: {
          approved_deposits: number
          completed_withdrawals: number
          pending_deposits: number
          pending_withdrawals: number
          total_gold_grams: number
          total_invested: number
        }[]
      }
      grant_admin_role: { Args: { _user_id: string }; Returns: undefined }
      grant_admin_role_by_email: {
        Args: { _email: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_goldsmith: { Args: { p_user_id: string }; Returns: boolean }
      log_admin_activity: {
        Args: {
          p_action_type: string
          p_description?: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
