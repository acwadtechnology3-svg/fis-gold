import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { usePortfolio } from "@/hooks/usePortfolio";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calculator } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface BuyGoldDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    metalType?: "gold" | "silver";
}

const BuyGoldDialog = ({ open, onOpenChange, onSuccess, metalType = "gold" }: BuyGoldDialogProps) => {
    const [amount, setAmount] = useState<string>("");
    const [grams, setGrams] = useState<string>("");
    const [duration, setDuration] = useState<number>(365);
    const [isLoading, setIsLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const { user } = useAuth();
    const { toast } = useToast();
    const { data: prices } = useMetalPrices();
    const { refetchAll } = usePortfolio();

    // Get price based on selected metal
    const metalPriceData = metalType === 'gold' ? prices?.gold : prices?.silver;
    // For buying, we use the buy_price_per_gram (User buys at Dealer's Sell Price, wait)
    // In standard terms:
    // Dealer Sell Price = User Buy Price
    // Dealer Buy Price = User Sell Price
    // The hook `useMetalPrices` returns `buy_price_per_gram` (Dealer Buy) and `sell_price_per_gram` (Dealer Sell).
    // So user buys at `sell_price_per_gram`.
    const currentPrice = metalPriceData?.sell_price_per_gram || 0;

    // Fallback for older data structure if needed, or just 0
    const displayPrice = currentPrice > 0 ? currentPrice : 0;

    useEffect(() => {
        const fetchBalance = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('wallet_accounts' as any)
                .select('available_balance')
                .eq('user_id', user.id)
                .maybeSingle();
            if (data) setWalletBalance((data as any).available_balance);
        };
        fetchBalance();
    }, [user, open]);

    // Correctly calculate grams/amount when inputs change
    const handleAmountChange = (val: string) => {
        setAmount(val);
        if (displayPrice > 0 && val) {
            setGrams((parseFloat(val) / displayPrice).toFixed(4));
        } else {
            setGrams("");
        }
    };

    const handleGramsChange = (val: string) => {
        setGrams(val);
        if (displayPrice > 0 && val) {
            setAmount((parseFloat(val) * displayPrice).toFixed(2));
        } else {
            setAmount("");
        }
    };

    const setPercentageAmount = (percentage: number) => {
        const value = (walletBalance * percentage) / 100;
        handleAmountChange(value.toFixed(2));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !amount || parseFloat(amount) <= 0) return;

        if (parseFloat(amount) > walletBalance) {
            toast({
                variant: "destructive",
                title: "رصيد غير كافي",
                description: "يرجى شحن محفظتك أولاً",
            });
            return;
        }

        setIsLoading(true);

        try {
            // 1. Create a price snapshot
            // Note: DB expects 'gold' or 'silver' in metal_type if column exists, 
            // but the table `gold_price_snapshots` defaults metal_type to 'gold'.
            // We should ensure metal_type is passed if the column exists. 
            // Based on valid_until usage, I'll include it.
            const snapshotData = {
                metal_type: metalType,
                buy_price_gram: metalPriceData?.buy_price_per_gram || 0, // Dealer Buy
                sell_price_gram: metalPriceData?.sell_price_per_gram || 0, // Dealer Sell (User Buy)
                currency: 'EGP',
                source: 'user_buy_action',
                valid_until: new Date(Date.now() + 5 * 60000).toISOString(),
                price_id: metalPriceData ? undefined : undefined // If linked to price table, but optional usually
            };

            const { data: snapshot, error: snapshotError } = await supabase
                .from('gold_price_snapshots' as any)
                .insert(snapshotData as any)
                .select()
                .single();

            if (snapshotError) throw snapshotError;

            // 2. Call buy_asset RPC
            const { data: result, error: apiError } = await supabase.rpc('buy_asset', {
                p_user_id: user.id,
                p_snapshot_id: (snapshot as any).id,
                p_amount: parseFloat(amount),
                p_duration_days: duration,
                p_idempotency_key: crypto.randomUUID(),
                p_metal_type: metalType
            });

            if (apiError) throw apiError;

            // Check success flag in response (it returns a table)
            // RPC returns setof record or table, supabase js returns array of objects usually for table return
            // But if single row expected, maybe access first element.
            // Function definition: RETURNS TABLE(success boolean, message text...)
            // So result is [ { success: true, message: "..." } ]

            const response = Array.isArray(result) ? result[0] : result;

            if (!response?.success) {
                throw new Error(response?.message || "فشلت العملية");
            }

            toast({
                title: "تم الشراء بنجاح",
                description: `تم شراء ${grams} جرام ${metalType === 'gold' ? 'ذهب' : 'فضة'}`,
            });

            onSuccess();
            refetchAll();
            onOpenChange(false);
            setAmount("");
            setGrams("");
            setDuration(365); // Reset duration

        } catch (error: any) {
            console.error('Buy error:', error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message || "حدث خطأ أثناء الشراء",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const metalName = metalType === 'gold' ? 'ذهب' : 'فضة';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border/50 sm:max-w-[425px]" aria-describedby="buy-gold-desc">
                <DialogHeader>
                    <DialogTitle className="text-xl text-gold-gradient text-center">شراء {metalName}</DialogTitle>
                    <p id="buy-gold-desc" className="sr-only">استخدم رصيد محفظتك لشراء {metalName}</p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">

                    {/* Wallet Balance Info */}
                    <div className="bg-secondary/30 rounded-lg p-4 flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">رصيد المحفظة:</span>
                        <span className="font-bold text-primary">{walletBalance.toLocaleString()} ج.م</span>
                    </div>

                    {!metalPriceData && (
                        <div className="text-destructive text-sm text-center">
                            عفواً، سعر {metalName} غير متاح حالياً
                        </div>
                    )}

                    {/* Quick Percentage Selection */}
                    <div className="space-y-3">
                        <Label className="text-xs text-muted-foreground">تحديد سريع للمبلغ</Label>
                        <div className="flex justify-between gap-2">
                            {[10, 25, 50, 100].map((percent) => (
                                <Button
                                    key={percent}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPercentageAmount(percent)}
                                    className="flex-1 text-xs border-primary/20 hover:bg-primary/10 hover:text-primary"
                                >
                                    {percent}%
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Amount Input */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">المبلغ (ج.م)</Label>
                            <div className="relative">
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    placeholder="0.00"
                                    className="pl-16 bg-secondary/30 border-border/50 focus:border-primary/50 text-left ltr"
                                    dir="ltr"
                                />
                                <div className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">EGP</div>
                            </div>
                        </div>

                        {/* Grams Input */}
                        <div className="space-y-2">
                            <Label htmlFor="grams">الوزن (جرام)</Label>
                            <div className="relative">
                                <Input
                                    id="grams"
                                    type="number"
                                    value={grams}
                                    onChange={(e) => handleGramsChange(e.target.value)}
                                    placeholder="0.0000"
                                    className="pl-16 bg-secondary/30 border-border/50 focus:border-primary/50 text-left ltr"
                                    dir="ltr"
                                />
                                <div className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">GRAM</div>
                            </div>
                        </div>
                    </div>

                    {/* Live Price Display */}
                    <div className="flex items-center justify-between text-xs px-2 opacity-80">
                        <span className="text-muted-foreground">سعر الجرام الحالي:</span>
                        <span className="font-mono text-primary">{displayPrice.toLocaleString()} ج.م</span>
                    </div>

                    {/* Duration Slider - Only show for Gold if applicable, or both? Usually Duration is for Gold contracts. 
                        If Silver is just 'buy spot', maybe allow duration or hide?
                        Assuming standard logic for both for now. 
                    */}
                    <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-center">
                            <Label>مدة الاستثمار</Label>
                            <span className="text-sm font-bold text-primary">{duration} يوم</span>
                        </div>
                        <Slider
                            value={[duration]}
                            onValueChange={(vals) => setDuration(vals[0])}
                            min={90}
                            max={365}
                            step={1}
                            className="py-4"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                            <span>3 شهور</span>
                            <span>سنة</span>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-gold-gradient hover:bg-gold-gradient-hover text-black font-bold h-12 text-lg shadow-gold transition-all hover:scale-[1.02]"
                        disabled={isLoading || !amount || parseFloat(amount) <= 0 || !metalPriceData}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                جاري التنفيذ...
                            </>
                        ) : (
                            <>
                                <Calculator className="mr-2 h-5 w-5" />
                                تأكيد الشراء
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default BuyGoldDialog;
