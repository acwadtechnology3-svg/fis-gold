import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

interface WalletCardProps {
    balance: number;
    isLoading: boolean;
}

const WalletCard = ({ balance, isLoading }: WalletCardProps) => {
    return (
        <Card className="glass-dark border-primary/20 hover:border-primary/40 transition-colors shadow-gold">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gold-gradient">
                        <Wallet className="h-5 w-5 text-primary-foreground" />
                    </div>
                    المحفظة النقدية
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-10 w-32 bg-muted animate-pulse rounded" />
                ) : (
                    <div className="text-center">
                        <p className="text-3xl font-bold text-gold-gradient">
                            {balance.toLocaleString("ar-EG", { maximumFractionDigits: 2 })}
                            <span className="text-lg font-normal text-muted-foreground mr-2">ج.م</span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            الرصيد المتاح للسحب أو الشراء
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default WalletCard;
