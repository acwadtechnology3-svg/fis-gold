import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Check, X, Loader2 } from "lucide-react";

interface AdminBuyRequestsTableProps {
    pendingBuys: any[];
    onApprove: (id: string) => Promise<boolean>;
    onReject: (id: string) => Promise<boolean>;
}

export const AdminBuyRequestsTable = ({
    pendingBuys,
    onApprove,
    onReject,
}: AdminBuyRequestsTableProps) => {
    const [processing, setProcessing] = useState<string | null>(null);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setProcessing(id);
        try {
            if (action === 'approve') {
                await onApprove(id);
            } else {
                await onReject(id);
            }
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">المستخدم</TableHead>
                        <TableHead className="text-right">المعدن</TableHead>
                        <TableHead className="text-right">الكمية (جرام)</TableHead>
                        <TableHead className="text-right">السعر (لكل جرام)</TableHead>
                        <TableHead className="text-right">إجمالي المبلغ</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pendingBuys.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                لا توجد طلبات شراء معلقة
                            </TableCell>
                        </TableRow>
                    ) : (
                        pendingBuys.map((buy) => (
                            <TableRow key={buy.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{buy.profiles?.full_name || "مستخدم غير مسجل"}</span>
                                        <span className="text-xs text-muted-foreground">{buy.profiles?.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {buy.metal_type === 'gold' ? (
                                        <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">ذهب</Badge>
                                    ) : (
                                        <Badge className="bg-slate-400/10 text-slate-400 hover:bg-slate-400/20">فضة</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="font-mono">{buy.grams} جم</TableCell>
                                <TableCell className="font-mono">{parseFloat(buy.buy_price_ask).toLocaleString()}</TableCell>
                                <TableCell className="font-bold font-mono">
                                    {parseFloat(buy.buy_amount).toLocaleString()} ج.م
                                </TableCell>
                                <TableCell>
                                    {format(new Date(buy.created_at), "dd MMMM yyyy", { locale: ar })}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                {processing === buy.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <MoreHorizontal className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                className="text-green-600 focus:text-green-700 cursor-pointer"
                                                onClick={() => handleAction(buy.id, 'approve')}
                                            >
                                                <Check className="ml-2 h-4 w-4" />
                                                قبول الطلب
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive cursor-pointer"
                                                onClick={() => handleAction(buy.id, 'reject')}
                                            >
                                                <X className="ml-2 h-4 w-4" />
                                                رفض الطلب
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
