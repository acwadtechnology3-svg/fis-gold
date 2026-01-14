import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Review } from "./useGoldsmiths";

export const useReviews = (goldsmithId?: string) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReviews = async (goldsmithIdParam?: string) => {
    setLoading(true);
    const targetGoldsmithId = goldsmithIdParam || goldsmithId;

    if (!targetGoldsmithId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("reviews")
      .select("*, user:profiles(full_name)")
      .eq("goldsmith_id", targetGoldsmithId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      toast.error("حدث خطأ في جلب التقييمات");
      setLoading(false);
      return;
    }

    const reviewsWithNames = data?.map((review: any) => ({
      ...review,
      user_name: review.user?.full_name || "مستخدم",
    }));

    setReviews(reviewsWithNames || []);
    setLoading(false);
  };

  const createReview = async (
    goldsmithId: string,
    orderId: string | null,
    rating: number,
    comment?: string
  ) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return false;
    }

    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      goldsmith_id: goldsmithId,
      order_id: orderId,
      rating,
      comment: comment || null,
    });

    if (error) {
      console.error("Error creating review:", error);
      if (error.code === "23505") {
        toast.error("لقد قمت بتقييم هذا الصايغ من قبل");
      } else {
        toast.error("حدث خطأ في إضافة التقييم");
      }
      return false;
    }

    toast.success("تم إضافة التقييم بنجاح");
    fetchReviews(goldsmithId);
    return true;
  };

  const updateReview = async (reviewId: string, rating: number, comment?: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({
        rating,
        comment: comment || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (error) {
      console.error("Error updating review:", error);
      toast.error("حدث خطأ في تحديث التقييم");
      return false;
    }

    toast.success("تم تحديث التقييم بنجاح");
    if (goldsmithId) {
      fetchReviews(goldsmithId);
    }
    return true;
  };

  return {
    reviews,
    loading,
    fetchReviews,
    createReview,
    updateReview,
  };
};
