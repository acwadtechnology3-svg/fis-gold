import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminWithdrawal } from "@/hooks/useAdminData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowUpFromLine, Check, X } from "lucide-react";

interface AdminWithdrawalsTableProps {
  withdrawals: AdminWithdrawal[];
  onApprove: (withdrawalId: string) => Promise<boolean>;
  onReject: (withdrawalId: string, notes: string) => Promise<boolean>;
}

export const AdminWithdrawalsTable = ({
  withdrawals,
  onApprove,
  onReject,
}: AdminWithdrawalsTableProps) => {
  const [approveDialog, setApproveDialog] = useState<AdminWithdrawal | null>(null);
  const [rejectDialog, setRejectDialog] = useState<AdminWithdrawal | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!approveDialog) return;
    setLoading(true);
    const success = await onApprove(approveDialog.id);
    if (success) {
      setApproveDialog(null);
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    setLoading(true);
    const success = await onReject(rejectDialog.id, rejectNotes);
    if (success) {
      setRejectDialog(null);
      setRejectNotes("");
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">مطلوب</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">معلق</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">موافق عليه</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">مكتمل</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "cash":
        return <Badge variant="secondary">نقدي</Badge>;
      case "gold":
        return <Badge className="bg-primary/10 text-primary">ذهب</Badge>;
      case "silver":
        return <Badge className="bg-slate-500/10 text-slate-400">فضة</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const otherWithdrawals = withdrawals.filter((w) => w.status !== "pending");

  return (
    <>
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold-gradient">
            <ArrowUpFromLine className="w-5 h-5 text-primary" />
            السحوبات ({withdrawals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد سحوبات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الجرامات</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">تفاصيل الدفع</TableHead>
                  <TableHead className="text-right">الرسوم</TableHead>
                  <TableHead className="text-right">الصافي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...pendingWithdrawals, ...otherWithdrawals].map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">{withdrawal.user_name}</TableCell>
                    <TableCell>{getTypeBadge(withdrawal.withdrawal_type)}</TableCell>
                    <TableCell>
                      {withdrawal.grams
                        ? `${withdrawal.grams.toLocaleString("ar-EG", { maximumFractionDigits: 4 })} جرام`
                        : "-"}
                    </TableCell>
                    <TableCell>{withdrawal.amount.toLocaleString("ar-EG")} ج.م</TableCell>
                    <TableCell className="max-w-[200px]">
                      {withdrawal.notes ? (
                        <div className="text-sm text-muted-foreground truncate" title={withdrawal.notes}>
                          {withdrawal.notes}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {withdrawal.fee_amount ? `${withdrawal.fee_amount.toLocaleString("ar-EG")} ج.م` : "-"}
                    </TableCell>
                    <TableCell>
                      {withdrawal.net_amount ? `${withdrawal.net_amount.toLocaleString("ar-EG")} ج.م` : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    <TableCell>
                      {format(new Date(withdrawal.created_at), "dd MMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {(withdrawal.status === "pending" || withdrawal.status === "requested") && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => setApproveDialog(withdrawal)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setRejectDialog(withdrawal)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الموافقة على السحب</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-muted-foreground">
              هل تريد الموافقة على سحب {approveDialog?.grams
                ? `${approveDialog.grams.toLocaleString("ar-EG", { maximumFractionDigits: 4 })} جرام ${approveDialog.withdrawal_type === "gold" ? "ذهب" : approveDialog.withdrawal_type === "silver" ? "فضة" : ""}`
                : `${approveDialog?.amount.toLocaleString("ar-EG")} ج.م`}؟
            </p>
            {approveDialog?.notes && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-semibold mb-1">تفاصيل الدفع:</p>
                <p className="text-sm text-muted-foreground">{approveDialog.notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>
              إلغاء
            </Button>
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? "جاري الموافقة..." : "موافقة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض السحب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>سبب الرفض</Label>
              <Textarea
                placeholder="أدخل سبب الرفض"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              {loading ? "جاري الرفض..." : "رفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
