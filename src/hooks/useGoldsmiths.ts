import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Goldsmith {
  id: string;
  user_id: string;
  name: string;
  shop_name: string;
  address: string;
  phone: string;
  email: string;
  national_id: string | null;
  city: string | null;
  commercial_registration: string;
  tax_card_number: string | null;
  id_card_image_url: string | null;
  commercial_registration_image_url: string | null;
  tax_card_image_url: string | null;
  logo_url: string | null;
  shop_photo_url: string | null;
  description: string | null;
  years_experience: number | null;
  product_types: string[] | null;
  payment_method: string | null;
  bank_account: string | null;
  vodafone_cash_number: string | null;
  company_account: string | null;
  terms_accepted: boolean;
  data_accuracy_accepted: boolean;
  review_accepted: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  admin_notes: string | null;
  rating_average: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface Product {
  id: string;
  goldsmith_id: string | null;
  name: string;
  weight_grams: number;
  karat: number | null;
  price: number;
  making_charge: number;
  quantity: number;
  images: string[];
  description: string | null;
  is_active: boolean;
  metal_type?: 'gold' | 'silver';
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  goldsmith_id: string;
  product_id: string | null;
  quantity: number;
  total_amount: number;
  status: "new" | "processing" | "shipped" | "completed" | "cancelled";
  shipping_address: string | null;
  shipping_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  shipped_at: string | null;
  completed_at: string | null;
  product?: Product;
  goldsmith?: Goldsmith;
  user_name?: string;
}

export interface Review {
  id: string;
  user_id: string;
  goldsmith_id: string;
  order_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export const useGoldsmiths = () => {
  const { user } = useAuth();
  const [goldsmiths, setGoldsmiths] = useState<Goldsmith[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentGoldsmith, setCurrentGoldsmith] = useState<Goldsmith | null>(null);

  const fetchGoldsmiths = async (status?: string): Promise<void> => {
    setLoading(true);
    let query = supabase.from("goldsmiths").select("*");

    if (status) {
      query = query.eq("status", status);
    } else {
      // If status is undefined, fetch all statuses (admin can see all via RLS policy)
      // The RLS policy will filter based on user permissions
      // For regular users: only approved
      // For admins: all statuses
      query = query; // No status filter - let RLS handle it
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching goldsmiths:", error);
      toast.error("حدث خطأ في جلب بيانات الصايغين: " + error.message);
      setLoading(false);
      return;
    }

    setGoldsmiths(data || []);
    setLoading(false);
  };

  const fetchMyGoldsmith = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("goldsmiths")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching my goldsmith:", error);
      setLoading(false);
      return;
    }

    setCurrentGoldsmith(data);
    setLoading(false);
  };

  const createGoldsmithApplication = async (data: any) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return false;
    }

    // Prepare data for insert
    const insertData = {
      user_id: user.id,
      name: data.name,
      shop_name: data.shop_name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      national_id: data.national_id || null,
      city: data.city || null,
      commercial_registration: data.commercial_registration,
      tax_card_number: data.tax_card_number || null,
      id_card_image_url: data.id_card_image_url || null,
      commercial_registration_image_url: data.commercial_registration_image_url || null,
      tax_card_image_url: data.tax_card_image_url || null,
      logo_url: data.logo_url || null,
      shop_photo_url: data.shop_photo_url || null,
      description: data.description || null,
      years_experience: data.years_experience || null,
      product_types: data.product_types || null,
      payment_method: data.payment_method || null,
      bank_account: data.bank_account || null,
      vodafone_cash_number: data.vodafone_cash_number || null,
      company_account: data.company_account || null,
      terms_accepted: data.terms_accepted || false,
      data_accuracy_accepted: data.data_accuracy_accepted || false,
      review_accepted: data.review_accepted || false,
      status: "pending" as const,
    };

    const { error } = await supabase.from("goldsmiths").insert(insertData);

    if (error) {
      console.error("Error creating goldsmith application:", error);
      toast.error("حدث خطأ في تقديم الطلب: " + error.message);
      return false;
    }

    toast.success("تم استلام طلبك بنجاح، سيتم مراجعته خلال 48 ساعة");
    return true;
  };

  const updateGoldsmith = async (updates: Partial<Goldsmith>) => {
    if (!currentGoldsmith) return false;

    const { error } = await supabase
      .from("goldsmiths")
      .update(updates)
      .eq("id", currentGoldsmith.id);

    if (error) {
      console.error("Error updating goldsmith:", error);
      toast.error("حدث خطأ في تحديث البيانات");
      return false;
    }

    toast.success("تم تحديث البيانات بنجاح");
    fetchMyGoldsmith();
    return true;
  };

  useEffect(() => {
    if (user) {
      fetchMyGoldsmith();
    }
  }, [user]);

  return {
    goldsmiths,
    currentGoldsmith,
    loading,
    fetchGoldsmiths,
    fetchMyGoldsmith,
    createGoldsmithApplication,
    updateGoldsmith,
  };
};
