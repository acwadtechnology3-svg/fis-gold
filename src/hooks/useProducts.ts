import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Product } from "./useGoldsmiths";

export const useProducts = (goldsmithId?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async (goldsmithIdParam?: string) => {
    setLoading(true);
    const targetGoldsmithId = goldsmithIdParam || goldsmithId;

    if (!targetGoldsmithId) {
      // Fetch all active products
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
        toast.error("حدث خطأ في جلب المنتجات");
        setLoading(false);
        return;
      }

      setProducts(data || []);
    } else {
      // Fetch products for specific goldsmith
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("goldsmith_id", targetGoldsmithId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
        toast.error("حدث خطأ في جلب المنتجات");
        setLoading(false);
        return;
      }

      setProducts(data || []);
    }

    setLoading(false);
  };

  const createProduct = async (productData: {
    name: string;
    weight_grams: number;
    karat: number | null;
    price: number;
    making_charge: number;
    quantity: number;
    images: string[];
    description?: string;
    metal_type?: 'gold' | 'silver';
  }, goldsmithIdParam?: string | null) => {
    const targetGoldsmithId = goldsmithIdParam !== undefined ? goldsmithIdParam : goldsmithId;
    
    // If no goldsmithId is provided and we're not in admin mode, show error
    if (!targetGoldsmithId && !goldsmithIdParam) {
      toast.error("معرف الصايغ غير موجود");
      return false;
    }

    const { error } = await supabase.from("products").insert({
      goldsmith_id: targetGoldsmithId || null,
      ...productData,
      metal_type: productData.metal_type || 'gold',
      is_active: true,
    });

    if (error) {
      console.error("Error creating product:", error);
      toast.error("حدث خطأ في إضافة المنتج: " + error.message);
      return false;
    }

    toast.success("تم إضافة المنتج بنجاح");
    fetchProducts();
    return true;
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId);

    if (error) {
      console.error("Error updating product:", error);
      toast.error("حدث خطأ في تحديث المنتج");
      return false;
    }

    toast.success("تم تحديث المنتج بنجاح");
    fetchProducts();
    return true;
  };

  const deleteProduct = async (productId: string) => {
    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      console.error("Error deleting product:", error);
      toast.error("حدث خطأ في حذف المنتج");
      return false;
    }

    toast.success("تم حذف المنتج بنجاح");
    fetchProducts();
    return true;
  };

  return {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};
