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
}

const BuyGoldDialog = ({ open, onOpenChange, onSuccess }: BuyGoldDialogProps) => {
    const [amount, setAmount] = useState<string>("");
    const [grams, setGrams] = useState<string>("");
    const [duration, setDuration] = useState<number>(365);
    const [isLoading, setIsLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const { user } = useAuth();
    const { toast } = useToast();
    const { data: prices } = useMetalPrices();
    const { refetchAll } = usePortfolio();

    const currentPrice = prices?.gold?.buy_price_per_gram || prices?.gold?.price_per_gram || 0;

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
        if (currentPrice > 0 && val) {
            setGrams((parseFloat(val) / currentPrice).toFixed(4));
        } else {
            setGrams("");
        }
    };

    const handleGramsChange = (val: string) => {
        setGrams(val);
        if (currentPrice > 0 && val) {
            setAmount((parseFloat(val) * currentPrice).toFixed(2));
        } else {
            setAmount("");
        }
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
            const { data: snapshot, error: snapshotError } = await supabase
                .from('gold_price_snapshots' as any)
                .insert({
                    metal_type: 'gold',
                    buy_price_gram: currentPrice,
                    sell_price_gram: prices?.gold?.sell_price_per_gram || 0,
                    currency: 'EGP',
                    source: 'user_buy_action',
                    valid_until: new Date(Date.now() + 5 * 60000).toISOString()
                } as any)
                .select()
                .single();

            if (snapshotError) throw snapshotError;

            // 2. Call wallet-api
            const { data: result, error: apiError } = await supabase.functions.invoke('wallet-api', {
                body: {
                    action: 'buy_gold',
                    amount: parseFloat(amount),
                    duration_days: duration,
                    snapshot_id: (snapshot as any).id,
                    idempotency_key: crypto.randomUUID()
                }
            });

            if (apiError || !result?.success) {
                throw new Error(apiError?.message || result?.error || "فشلت العملية");
            }

            toast({
                title: "تم الشراء بنجاح",
                description: `تم شراء ${grams} جرام ذهب`,
            });

            onSuccess();
            refetchAll();
            onOpenChange(false);
            setAmount("");
            setGrams("");

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border/50 sm:max-w-[425px]" aria-describedby="buy-gold-desc">
                <DialogHeader>
                    <DialogTitle className="text-xl text-gold-gradient text-center">شراء ذهب</DialogTitle>
                    <p id="buy-gold-desc" className="sr-only">استخدم رصيد محفظتك لشراء الذهب</p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">

                    {/* Wallet Balance Info */}
                    <div className="bg-secondary/30 rounded-lg p-4 flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">رصيد المحفظة:</span>
                        <span className="font-bold text-primary">{walletBalance.toLocaleString()} ج.م</span>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>المبلغ (ج.م)</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    className="pl-20 bg-background/50 border-primary/20 focus:border-primary"
                                    placeholder="0.00"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                    EGP
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center text-muted-foreground">
                            <Calculator className="w-4 h-4" />
                        </div>

                        <div className="space-y-2">
                            <Label>الوزن (جرام)</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={grams}
                                    onChange={(e) => handleGramsChange(e.target.value)}
                                    className="pl-20 bg-background/50 border-primary/20 focus:border-primary"
                                    placeholder="0.0000"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                    GRAMS
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Label>مدة الاستثمار</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {[365, 730, 1095].map((d) => (
                                <div
                                    key={d}
                                    onClick={() => setDuration(d)}
                                    className={`cursor-pointer rounded-lg border p-2 text-center text-sm transition-all ${duration === d
                                        ? "bg-primary/20 border-primary text-primary"
                                        : "bg-secondary/20 border-transparent hover:border-primary/50"
                                        }`}
                                >
                                    {d / 365} سنة
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-muted/30 p-3 rounded-md text-xs text-muted-foreground text-center">
                        سعر الجرام الحالي: <span className="text-foreground font-bold">{currentPrice.toLocaleString()} ج.م</span>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-gold-gradient hover:bg-gold-gradient-hover text-black font-bold h-12 text-lg shadow-gold"
                        disabled={isLoading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > walletBalance}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                                جاري الشراء...
                            </>
                        ) : (
                            "تأكيد الشراء"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default BuyGoldDialog;
