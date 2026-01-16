import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Deposit } from "@/hooks/usePortfolio";

interface InvestmentLogsProps {
    deposits: Deposit[];
    isLoading: boolean;
}

const getPackageDuration = (packageType: string): number => {
    switch (packageType) {
        case "1_year":
            return 1;
        case "2_years":
            return 2;
        case "3_years":
            return 3;
        default:
            return 1;
    }
};

const getPackageLabel = (packageType: string): string => {
    switch (packageType) {
        case "1_year":
            return "سنة واحدة";
        case "2_years":
            return "سنتان";
        case "3_years":
            return "3 سنوات";
        default:
            return packageType;
    }
};

const getMaturityDate = (approvedAt: string | null, packageType: string): Date | null => {
    if (!approvedAt) return null;
    const approvedDate = new Date(approvedAt);
    const years = getPackageDuration(packageType);
    return new Date(approvedDate.setFullYear(approvedDate.getFullYear() + years));
};

const InvestmentLogs = ({ deposits, isLoading }: InvestmentLogsProps) => {
    const approvedDeposits = deposits.filter(d => d.status === "approved");

    if (isLoading) {
        return (
            <Card className="glass-dark border-primary/20">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        سجل الاستثمارات
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (approvedDeposits.length === 0) {
        return (
            <Card className="glass-dark border-primary/20">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        سجل الاستثمارات
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>لا توجد استثمارات حتى الآن</p>
                        <p className="text-sm mt-2">ابدأ بإيداع مبلغ للاستثمار في الذهب</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass-dark border-primary/20">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    سجل الاستثمارات ({approvedDeposits.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {approvedDeposits.map((deposit) => {
                        const maturityDate = getMaturityDate(deposit.approved_at, deposit.package_type);
                        const now = new Date();
                        const isMatured = maturityDate && maturityDate <= now;
                        const daysRemaining = maturityDate
                            ? Math.ceil((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            : null;

                        return (
                            <div
                                key={deposit.id}
                                className="p-4 rounded-lg bg-secondary/30 border border-primary/10 hover:border-primary/30 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-gold-gradient text-lg">
                                            {deposit.amount.toLocaleString("ar-EG")} ج.م
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {deposit.gold_grams?.toFixed(4)} جرام ذهب
                                        </p>
                                    </div>
                                    <Badge variant={isMatured ? "default" : "secondary"} className={isMatured ? "bg-green-500" : ""}>
                                        {getPackageLabel(deposit.package_type)}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span>تاريخ الموافقة:</span>
                                        <span className="font-medium text-foreground">
                                            {deposit.approved_at
                                                ? new Date(deposit.approved_at).toLocaleDateString("ar-EG")
                                                : "-"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4 text-primary" />
                                        <span>تاريخ السحب:</span>
                                        <span className={`font-medium ${isMatured ? "text-green-500" : "text-foreground"}`}>
                                            {maturityDate
                                                ? maturityDate.toLocaleDateString("ar-EG")
                                                : "-"}
                                        </span>
                                    </div>
                                </div>

                                {!isMatured && daysRemaining !== null && daysRemaining > 0 && (
                                    <div className="mt-3 pt-3 border-t border-primary/10">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">المتبقي للسحب:</span>
                                            <Badge variant="outline" className="border-primary/30">
                                                {daysRemaining} يوم
                                            </Badge>
                                        </div>
                                        <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gold-gradient transition-all"
                                                style={{
                                                    width: `${Math.max(0, 100 - (daysRemaining / (getPackageDuration(deposit.package_type) * 365) * 100))}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {isMatured && (
                                    <div className="mt-3 pt-3 border-t border-green-500/20">
                                        <div className="flex items-center gap-2 text-green-500">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="text-sm font-medium">متاح للسحب الآن!</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default InvestmentLogs;
