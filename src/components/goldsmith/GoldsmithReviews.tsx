import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useReviews } from "@/hooks/useReviews";
import { useAuth } from "@/contexts/AuthContext";
import { Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

interface GoldsmithReviewsProps {
  goldsmithId: string;
  canReview?: boolean;
  orderId?: string | null;
}

export const GoldsmithReviews = ({
  goldsmithId,
  canReview = false,
  orderId = null,
}: GoldsmithReviewsProps) => {
  const { user } = useAuth();
  const { reviews, loading, fetchReviews, createReview } = useReviews(goldsmithId);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetchReviews(goldsmithId);
  }, [goldsmithId]);

  const handleSubmitReview = async () => {
    if (rating < 1 || rating > 5) {
      toast.error("يرجى اختيار تقييم من 1 إلى 5");
      return;
    }

    const success = await createReview(goldsmithId, orderId, rating, comment);
    if (success) {
      setReviewDialogOpen(false);
      setRating(5);
      setComment("");
    }
  };

  return (
    <>
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gold-gradient">
              <MessageSquare className="w-5 h-5 text-primary" />
              التقييمات ({reviews.length})
            </CardTitle>
            {canReview && user && (
              <Button
                onClick={() => setReviewDialogOpen(true)}
                className="gap-2 bg-gold-gradient"
              >
                <Star className="w-4 h-4" />
                إضافة تقييم
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
          ) : reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد تقييمات بعد
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-primary/20 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{review.user_name}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(review.created_at), "dd MMM yyyy", { locale: ar })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة تقييم</DialogTitle>
            <DialogDescription>
              شاركنا رأيك في هذا الصايغ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>التقييم</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">تعليق (اختياري)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="اكتب تعليقك هنا..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmitReview} className="bg-gold-gradient">
              إرسال التقييم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
