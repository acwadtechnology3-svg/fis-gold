import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Order } from "./useGoldsmiths";

export const useOrders = (goldsmithId?: string) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async (goldsmithIdParam?: string) => {
    setLoading(true);
    const targetGoldsmithId = goldsmithIdParam || goldsmithId;

    if (targetGoldsmithId) {
      // Fetch orders for goldsmith
      const { data, error } = await supabase
        .from("orders")
        .select("*, product:products(*), goldsmith:goldsmiths(*)")
        .eq("goldsmith_id", targetGoldsmithId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        toast.error("حدث خطأ في جلب الطلبات");
        setLoading(false);
        return;
      }

      setOrders(data || []);
    } else if (user) {
      // Fetch user's orders
      const { data, error } = await supabase
        .from("orders")
        .select("*, product:products(*), goldsmith:goldsmiths(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        toast.error("حدث خطأ في جلب الطلبات");
        setLoading(false);
        return;
      }

      setOrders(data || []);
    }

    setLoading(false);
  };

  const createOrder = async (orderData: {
    goldsmith_id: string;
    product_id: string;
    quantity: number;
    shipping_address: string;
    shipping_phone: string;
    notes?: string;
  }) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return false;
    }

    // Get product to calculate total
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", orderData.product_id)
      .single();

    if (productError || !product) {
      toast.error("المنتج غير موجود");
      return false;
    }

    const totalAmount = (product.price + product.making_charge) * orderData.quantity;

    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      ...orderData,
      total_amount: totalAmount,
      status: "new",
    });

    if (error) {
      console.error("Error creating order:", error);
      toast.error("حدث خطأ في إنشاء الطلب");
      return false;
    }

    toast.success("تم إنشاء الطلب بنجاح");
    fetchOrders();
    return true;
  };

  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "shipped") {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order:", error);
      toast.error("حدث خطأ في تحديث حالة الطلب");
      return false;
    }

    toast.success("تم تحديث حالة الطلب بنجاح");
    fetchOrders();
    return true;
  };

  return {
    orders,
    loading,
    fetchOrders,
    createOrder,
    updateOrderStatus,
  };
};
