import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Deposit } from "@/hooks/usePortfolio";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { TrendingUp } from "lucide-react";

interface DepositsTableProps {
  deposits: Deposit[];
  isLoading: boolean;
}

const packageLabels: Record<string, string> = {
  "1_year": "سنة واحدة",
  "2_years": "سنتين",
  "3_years": "3 سنوات",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة", variant: "secondary" },
  approved: { label: "مؤكد", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
};

const DepositsTable = ({ deposits, isLoading }: DepositsTableProps) => {
  if (isLoading) {
    return (
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold-gradient">
            <TrendingUp className="h-5 w-5 text-primary" />
            الإيداعات
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
          <TrendingUp className="h-5 w-5 text-primary" />
          الإيداعات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deposits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد إيداعات حتى الآن</p>
            <p className="text-sm">ابدأ استثمارك الآن!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الباقة</TableHead>
                  <TableHead>الذهب (جرام)</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="font-medium">
                      {deposit.amount.toLocaleString("ar-EG")} ج.م
                    </TableCell>
                    <TableCell>{packageLabels[deposit.package_type] || deposit.package_type}</TableCell>
                    <TableCell>
                      {deposit.gold_grams 
                        ? deposit.gold_grams.toLocaleString("ar-EG", { maximumFractionDigits: 4 })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[deposit.status]?.variant || "secondary"}>
                        {statusConfig[deposit.status]?.label || deposit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(deposit.created_at), "dd MMM yyyy", { locale: ar })}
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

export default DepositsTable;
