import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { usePortfolio } from "@/hooks/usePortfolio";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SellAssetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    metalType?: "gold" | "silver";
}

interface Position {
    id: string;
    grams: number;
    buy_amount: number;
    buy_price_ask: number;
    created_at: string;
    metal_type: string;
    status: string;
    lock_until: string;
}

const SellAssetDialog = ({ open, onOpenChange, onSuccess, metalType = "gold" }: SellAssetDialogProps) => {
    const [positions, setPositions] = useState<Position[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSelling, setIsSelling] = useState<string | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();
    const { data: prices } = useMetalPrices();
    const { refetchAll } = usePortfolio();

    // Get sell price (Dealer Buy Price)
    const metalPriceData = metalType === 'gold' ? prices?.gold : prices?.silver;
    // For selling, user sells at Dealer's Buy Price (`buy_price_per_gram`)
    const currentSellPrice = metalPriceData?.buy_price_per_gram || 0;

    useEffect(() => {
        if (open && user) {
            fetchPositions();
        }
    }, [open, user, metalType]);

    const fetchPositions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('gold_positions' as any)
                .select('*')
                .eq('user_id', user?.id)
                .eq('metal_type', metalType)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPositions(data || []);
        } catch (error) {
            console.error("Error fetching positions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSell = async (position: Position) => {
        if (!user || currentSellPrice <= 0) return;

        setIsSelling(position.id);
        try {
            // 1. Create a price snapshot for the sell price
            const snapshotData = {
                metal_type: metalType,
                buy_price_gram: currentSellPrice, // User Sells at this price
                sell_price_gram: metalPriceData?.sell_price_per_gram || 0,
                currency: 'EGP',
                source: 'user_sell_action',
                valid_until: new Date(Date.now() + 5 * 60000).toISOString()
            };

            const { data: snapshot, error: snapshotError } = await supabase
                .from('gold_price_snapshots' as any)
                .insert(snapshotData as any)
                .select()
                .single();

            if (snapshotError) throw snapshotError;

            // 2. Call sell_asset RPC
            const { data: result, error: apiError } = await supabase.rpc('sell_asset', {
                p_user_id: user.id,
                p_position_id: position.id,
                p_snapshot_id: (snapshot as any).id,
                p_idempotency_key: crypto.randomUUID()
            });

            if (apiError) throw apiError;

            const response = Array.isArray(result) ? result[0] : result;

            if (!response?.success) {
                throw new Error(response?.message || "فشلت عملية البيع");
            }

            toast({
                title: "تم البيع بنجاح",
                description: `تم بيع ${position.grams} جرام ${metalType === 'gold' ? 'ذهب' : 'فضة'} بسعر ${response.net_amount.toLocaleString()} ج.م`,
            });

            // Remove from list or refresh
            setPositions(prev => prev.filter(p => p.id !== position.id));
            refetchAll();
            onSuccess();

            // If no positions left, close? keeping open for now.

        } catch (error: any) {
            console.error('Sell error:', error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message || "حدث خطأ أثناء البيع",
            });
        } finally {
            setIsSelling(null);
        }
    };

    const metalName = metalType === 'gold' ? 'ذهب' : 'فضة';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border/50 sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl text-gold-gradient text-center">بيع {metalName}</DialogTitle>
                    <DialogDescription className="text-center">
                        اختر السبائك/العقود التي تريد بيعها بالسعر الحالي
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Price Info */}
                    <div className="bg-secondary/30 p-3 rounded-md text-center">
                        <span className="text-muted-foreground text-sm">سعر البيع الحالي: </span>
                        {currentSellPrice > 0 ? (
                            <span className="font-bold text-primary text-lg">{currentSellPrice.toLocaleString()} ج.م / جرام</span>
                        ) : (
                            <span className="text-destructive font-bold">غير متاح</span>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : positions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            لا توجد سبائك {metalName} متاحة للبيع في محفظتك
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {positions.map((pos) => {
                                const currentValue = pos.grams * currentSellPrice;
                                const pl = currentValue - pos.buy_amount;
                                const isPositive = pl >= 0;
                                const isLocked = new Date(pos.lock_until) > new Date();

                                return (
                                    <Card key={pos.id} className="border-border/50 bg-card/50">
                                        <CardContent className="p-4 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold text-lg">{pos.grams} جرام</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        تاريخ الشراء: {format(new Date(pos.created_at), "dd MMM yyyy", { locale: ar })}
                                                    </div>
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-mono font-bold text-primary">
                                                        {currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ج.م
                                                    </div>
                                                    <div className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'} flex items-center justify-end gap-1`}>
                                                        {isPositive ? '+' : ''}{pl.toLocaleString(undefined, { maximumFractionDigits: 2 })} ج.م
                                                        <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Note about lock if applicable - but user can usually force sell? My RPC logic checks 'active' or 'matured'. It doesn't block locked, but usually there's a fee? 
                                                My RPC logic had `v_is_early_exit`. I didn't implement fee logic yet to keep it simple as requested. 
                                                So enabling sell button always. 
                                            */}

                                            <Button
                                                onClick={() => handleSell(pos)}
                                                disabled={!!isSelling || currentSellPrice <= 0}
                                                variant={isPositive ? "default" : "secondary"}
                                                className={`w-full ${isPositive ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                            >
                                                {isSelling === pos.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    "بيع الآن"
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SellAssetDialog;
