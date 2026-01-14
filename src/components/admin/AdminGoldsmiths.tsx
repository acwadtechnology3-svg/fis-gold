import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useGoldsmiths, Goldsmith } from "@/hooks/useGoldsmiths";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Check, X, Eye, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useActivityLog } from "@/hooks/useActivityLog";

export const AdminGoldsmiths = () => {
  const { goldsmiths, loading, fetchGoldsmiths } = useGoldsmiths();
  const { logActivity } = useActivityLog();
  const [reviewDialog, setReviewDialog] = useState<Goldsmith | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch goldsmiths only when component mounts (lazy loading)
  // Fetch all goldsmiths (no status filter) for admin
  useEffect(() => {
    // Pass undefined to fetch all statuses (admin can see all)
    fetchGoldsmiths(undefined);
  }, []);

  const handleApprove = async (goldsmith: Goldsmith) => {
    setActionLoading(goldsmith.id);
    const { error } = await supabase.rpc("approve_goldsmith", {
      p_goldsmith_id: goldsmith.id,
      p_notes: adminNotes || null,
    });

    if (error) {
      console.error("Error approving goldsmith:", error);
      toast.error("حدث خطأ في الموافقة على الصايغ");
      setActionLoading(null);
      return;
    }

    await logActivity(
      "goldsmith_approved",
      "goldsmith",
      goldsmith.id,
      `تمت الموافقة على صايغ: ${goldsmith.shop_name}`,
      { shop_name: goldsmith.shop_name }
    );

    toast.success("تمت الموافقة على الصايغ بنجاح");
    setReviewDialog(null);
    setAdminNotes("");
    setActionLoading(null);
    fetchGoldsmiths(undefined); // Fetch all for admin
  };

  const handleReject = async (goldsmith: Goldsmith) => {
    setActionLoading(goldsmith.id);
    const { error } = await supabase
      .from("goldsmiths")
      .update({
        status: "rejected",
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", goldsmith.id);

    if (error) {
      console.error("Error rejecting goldsmith:", error);
      toast.error("حدث خطأ في رفض الصايغ");
      setActionLoading(null);
      return;
    }

    await logActivity(
      "goldsmith_rejected",
      "goldsmith",
      goldsmith.id,
      `تم رفض صايغ: ${goldsmith.shop_name}`,
      { shop_name: goldsmith.shop_name, notes: adminNotes }
    );

    toast.success("تم رفض الصايغ");
    setReviewDialog(null);
    setAdminNotes("");
    setActionLoading(null);
    fetchGoldsmiths(undefined); // Fetch all for admin
  };

  const handleSuspend = async (goldsmith: Goldsmith) => {
    setActionLoading(goldsmith.id);
    const { error } = await supabase
      .from("goldsmiths")
      .update({
        status: "suspended",
        admin_notes: adminNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", goldsmith.id);

    if (error) {
      console.error("Error suspending goldsmith:", error);
      toast.error("حدث خطأ في تعليق الصايغ");
      setActionLoading(null);
      return;
    }

    await logActivity(
      "goldsmith_suspended",
      "goldsmith",
      goldsmith.id,
      `تم تعليق صايغ: ${goldsmith.shop_name}`,
      { shop_name: goldsmith.shop_name }
    );

    toast.success("تم تعليق الصايغ");
    setReviewDialog(null);
    setAdminNotes("");
    setActionLoading(null);
    fetchGoldsmiths(undefined); // Fetch all for admin
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      suspended: "outline",
    };

    const labels: Record<string, string> = {
      pending: "قيد المراجعة",
      approved: "معتمد",
      rejected: "مرفوض",
      suspended: "معلق",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <>
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold-gradient">
            <Users className="w-5 h-5 text-primary" />
            إدارة الصايغين ({goldsmiths.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : goldsmiths.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد صايغين</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">اسم المحل</TableHead>
                    <TableHead className="text-right">اسم الصايغ</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">رقم الهاتف</TableHead>
                    <TableHead className="text-right">التقييم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goldsmiths.map((goldsmith) => (
                    <TableRow key={goldsmith.id}>
                      <TableCell className="font-medium">
                        {goldsmith.shop_name}
                      </TableCell>
                      <TableCell>{goldsmith.name}</TableCell>
                      <TableCell>{goldsmith.email}</TableCell>
                      <TableCell>{goldsmith.phone}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-bold">
                            {goldsmith.rating_average.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({goldsmith.rating_count})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(goldsmith.status)}</TableCell>
                      <TableCell>
                        {format(new Date(goldsmith.created_at), "dd MMM yyyy", {
                          locale: ar,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReviewDialog(goldsmith);
                              setAdminNotes(goldsmith.admin_notes || "");
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {goldsmith.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setReviewDialog(goldsmith);
                                  setAdminNotes("");
                                }}
                                className="h-8 w-8 p-0 text-green-500"
                                disabled={actionLoading === goldsmith.id}
                              >
                                {actionLoading === goldsmith.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setReviewDialog(goldsmith);
                                  setAdminNotes("");
                                }}
                                className="h-8 w-8 p-0 text-red-500"
                                disabled={actionLoading === goldsmith.id}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {goldsmith.status === "approved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReviewDialog(goldsmith);
                                setAdminNotes("");
                              }}
                              className="h-8 w-8 p-0 text-yellow-500"
                              disabled={actionLoading === goldsmith.id}
                            >
                              {actionLoading === goldsmith.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "⏸"
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>مراجعة طلب الصايغ</DialogTitle>
            <DialogDescription>
              {reviewDialog?.shop_name} - {reviewDialog?.name}
            </DialogDescription>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{reviewDialog.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                  <p className="font-medium">{reviewDialog.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رقم السجل التجاري</p>
                  <p className="font-medium">{reviewDialog.commercial_registration}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">العنوان</p>
                  <p className="font-medium">{reviewDialog.address}</p>
                </div>
              </div>

              {reviewDialog.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الوصف</p>
                  <p className="text-sm">{reviewDialog.description}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin_notes">ملاحظات الإدارة</Label>
                <Textarea
                  id="admin_notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="أضف ملاحظات..."
                />
              </div>

              {reviewDialog.id_card_image_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">صورة البطاقة</p>
                  <img
                    src={reviewDialog.id_card_image_url}
                    alt="ID Card"
                    className="w-full rounded-lg border border-primary/20"
                  />
                </div>
              )}

              {reviewDialog.commercial_registration_image_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">صورة السجل التجاري</p>
                  <img
                    src={reviewDialog.commercial_registration_image_url}
                    alt="Commercial Registration"
                    className="w-full rounded-lg border border-primary/20"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>
              إلغاء
            </Button>
            {reviewDialog?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(reviewDialog)}
                  disabled={actionLoading === reviewDialog.id}
                >
                  {actionLoading === reviewDialog.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جاري...
                    </>
                  ) : (
                    "رفض"
                  )}
                </Button>
                <Button
                  onClick={() => handleApprove(reviewDialog)}
                  disabled={actionLoading === reviewDialog.id}
                  className="bg-gold-gradient"
                >
                  {actionLoading === reviewDialog.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      جاري...
                    </>
                  ) : (
                    "موافقة"
                  )}
                </Button>
              </>
            )}
            {reviewDialog?.status === "approved" && (
              <Button
                variant="outline"
                onClick={() => handleSuspend(reviewDialog)}
                disabled={actionLoading === reviewDialog.id}
              >
                {actionLoading === reviewDialog.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري...
                  </>
                ) : (
                  "تعليق"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
