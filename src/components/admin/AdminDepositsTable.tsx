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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminDeposit } from "@/hooks/useAdminData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowDownToLine, Check, X, Eye } from "lucide-react";

interface AdminDepositsTableProps {
  deposits: AdminDeposit[];
  onApprove: (depositId: string) => Promise<boolean>;
  onReject: (depositId: string, notes: string) => Promise<boolean>;
}

export const AdminDepositsTable = ({
  deposits,
  onApprove,
  onReject,
}: AdminDepositsTableProps) => {
  const [approveDialog, setApproveDialog] = useState<AdminDeposit | null>(null);
  const [rejectDialog, setRejectDialog] = useState<AdminDeposit | null>(null);
  const [viewProofDialog, setViewProofDialog] = useState<string | null>(null);
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
      case "initiated":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">جديد</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">معلق</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">موافق عليه</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingDeposits = deposits.filter((d) => d.status === "pending");
  const otherDeposits = deposits.filter((d) => d.status !== "pending");

  return (
    <>
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold-gradient">
            <ArrowDownToLine className="w-5 h-5 text-primary" />
            الإيداعات ({deposits.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deposits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد إيداعات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الباقة</TableHead>
                  <TableHead className="text-right">جرامات الذهب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">إثبات الدفع</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...pendingDeposits, ...otherDeposits].map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="font-medium">{deposit.user_name}</TableCell>
                    <TableCell>{deposit.amount.toLocaleString("ar-EG")} ج.م</TableCell>
                    <TableCell>{deposit.package_type || "-"}</TableCell>
                    <TableCell>{deposit.gold_grams?.toFixed(3) || "-"}</TableCell>
                    <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                    <TableCell>
                      {format(new Date(deposit.created_at), "dd MMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {deposit.payment_proof_url ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:bg-blue-50"
                          onClick={() => setViewProofDialog(deposit.payment_proof_url!)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(deposit.status === "pending" || deposit.status === "initiated") && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => setApproveDialog(deposit)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setRejectDialog(deposit)}
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
            <DialogTitle>الموافقة على الإيداع</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              هل تريد الموافقة على إيداع بقيمة{" "}
              <span className="font-bold text-primary">
                {approveDialog?.amount.toLocaleString("ar-EG")} ج.م
              </span>
              ؟
            </p>
            <p className="text-sm text-muted-foreground">
              سيتم إضافة المبلغ إلى رصيد المحفظة الداخلية للمستخدم.
            </p>
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
            <DialogTitle>رفض الإيداع</DialogTitle>
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

      {/* View Payment Proof Dialog */}
      <Dialog open={!!viewProofDialog} onOpenChange={() => setViewProofDialog(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>إثبات الدفع</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {viewProofDialog && (
              <img
                src={viewProofDialog}
                alt="Payment proof"
                className="w-full h-auto rounded-lg border border-primary/20"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewProofDialog(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
