import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Withdrawal } from "@/hooks/usePortfolio";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowDownCircle } from "lucide-react";

interface WithdrawalsTableProps {
  withdrawals: Withdrawal[];
  isLoading: boolean;
}

const typeLabels: Record<string, string> = {
  cash: "نقدي",
  gold: "ذهب",
  silver: "فضة",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", variant: "secondary" },
  processing: { label: "قيد التنفيذ", variant: "outline" },
  completed: { label: "مكتمل", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

const WithdrawalsTable = ({ withdrawals, isLoading }: WithdrawalsTableProps) => {
  if (isLoading) {
    return (
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold-gradient">
            <ArrowDownCircle className="h-5 w-5 text-primary" />
            السحوبات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-dark border-primary/20 shadow-gold">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold-gradient">
          <ArrowDownCircle className="h-5 w-5 text-primary" />
          السحوبات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowDownCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد سحوبات حتى الآن</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة السحب</TableHead>
                  <TableHead>الرسوم</TableHead>
                  <TableHead>الصافي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإيصال</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">
                      {(withdrawal.amount ?? 0).toLocaleString("ar-EG")} ج.م
                    </TableCell>
                    <TableCell>{typeLabels[withdrawal.withdrawal_type] || withdrawal.withdrawal_type}</TableCell>
                    <TableCell className="text-destructive">
                      {withdrawal.fee_amount
                        ? `-${withdrawal.fee_amount.toLocaleString("ar-EG")} ج.م`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {withdrawal.net_amount
                        ? withdrawal.net_amount.toLocaleString("ar-EG") + " ج.م"
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[withdrawal.status]?.variant || "secondary"}>
                        {statusConfig[withdrawal.status]?.label || withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(withdrawal.created_at), "dd MMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {withdrawal.proof_image ? (
                        <a
                          href={withdrawal.proof_image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          <ArrowDownCircle className="h-4 w-4" />
                          عرض
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WithdrawalsTable;
