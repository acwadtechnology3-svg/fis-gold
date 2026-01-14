import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

interface NewWithdrawalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const NewWithdrawalDialog = ({ open, onOpenChange, onSuccess }: NewWithdrawalDialogProps) => {
    const [metalType, setMetalType] = useState<"gold" | "silver">("gold");
    const [grams, setGrams] = useState("");
    const [withdrawalMethod, setWithdrawalMethod] = useState("");
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [availableGrams, setAvailableGrams] = useState({ gold: 0, silver: 0 });
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    // Fetch available grams when dialog opens
    useEffect(() => {
        const fetchAvailableGrams = async () => {
            if (!user || !open) return;
            
            setLoadingAvailable(true);
            try {
                const { data, error } = await supabase
                    .rpc("get_available_grams", { p_user_id: user.id });
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    setAvailableGrams({
                        gold: Number(data[0].available_gold_grams) || 0,
                        silver: Number(data[0].available_silver_grams) || 0,
                    });
                }
            } catch (error) {
                console.error("Error fetching available grams:", error);
            } finally {
                setLoadingAvailable(false);
            }
        };

        fetchAvailableGrams();
    }, [user, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!grams || !metalType || !withdrawalMethod) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "يرجى ملء جميع الحقول",
            });
            return;
        }

        const gramsNum = parseFloat(grams);
        if (isNaN(gramsNum) || gramsNum <= 0) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "عدد الجرامات يجب أن يكون أكبر من 0",
            });
            return;
        }

        // Check available grams
        const available = metalType === "gold" ? availableGrams.gold : availableGrams.silver;
        if (gramsNum > available) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: `لا يمكنك سحب ${gramsNum} جرام. المتاح: ${available.toFixed(4)} جرام`,
            });
            return;
        }

        if (!user) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "يجب تسجيل الدخول أولاً",
            });
            return;
        }

        setIsLoading(true);

        // Get current metal price to calculate amount
        const { data: pricesData } = await supabase
            .rpc("get_latest_metal_prices");

        const metalPrice = pricesData?.find((p: any) => p.metal_type === metalType);
        const sellPricePerGram = metalPrice?.sell_price_per_gram || 0;
        const calculatedAmount = gramsNum * sellPricePerGram;

        const { error } = await supabase.from("withdrawals").insert({
            user_id: user.id,
            withdrawal_type: metalType,
            grams: gramsNum,
            amount: calculatedAmount, // Keep amount for backward compatibility
            notes: notes || withdrawalMethod,
            status: 'pending'
        });

        setIsLoading(false);

        if (error) {
            console.error("Withdrawal error:", error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message || "حدث خطأ أثناء إرسال طلب السحب",
            });
        } else {
            toast({
                title: "تم إرسال الطلب",
                description: "سيتم مراجعة طلبك في أقرب وقت",
            });
            setGrams("");
            setMetalType("gold");
            setWithdrawalMethod("");
            setNotes("");
            onOpenChange(false);
            onSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border/50">
                <DialogHeader>
                    <DialogTitle className="text-xl text-gold-gradient">طلب سحب (بيع المعادن)</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Metal Type Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="metalType">نوع المعدن *</Label>
                        <Select value={metalType} onValueChange={(value: "gold" | "silver") => {
                            setMetalType(value);
                            setGrams(""); // Reset grams when metal type changes
                        }}>
                            <SelectTrigger className="bg-secondary/30 border-border/50">
                                <SelectValue placeholder="اختر نوع المعدن" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gold">ذهب</SelectItem>
                                <SelectItem value="silver">فضة</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Available Grams Display */}
                    <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">المتاح لديك:</span>
                            {loadingAvailable ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <span className="text-lg font-bold text-gold-gradient">
                                    {metalType === "gold" 
                                        ? `${availableGrams.gold.toFixed(4)} جرام ذهب`
                                        : `${availableGrams.silver.toFixed(4)} جرام فضة`}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Grams Input */}
                    <div className="space-y-2">
                        <Label htmlFor="grams">عدد الجرامات المراد سحبها *</Label>
                        <Input
                            id="grams"
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            max={metalType === "gold" ? availableGrams.gold : availableGrams.silver}
                            placeholder="0.0000"
                            value={grams}
                            onChange={(e) => setGrams(e.target.value)}
                            className="bg-secondary/30 border-border/50"
                            dir="ltr"
                        />
                        <p className="text-xs text-muted-foreground">
                            الحد الأقصى: {metalType === "gold" ? availableGrams.gold.toFixed(4) : availableGrams.silver.toFixed(4)} جرام
                        </p>
                    </div>

                    {/* Withdrawal Method */}
                    <div className="space-y-2">
                        <Label htmlFor="withdrawalMethod">طريقة الاستلام *</Label>
                        <Select value={withdrawalMethod} onValueChange={setWithdrawalMethod}>
                            <SelectTrigger className="bg-secondary/30 border-border/50">
                                <SelectValue placeholder="اختر طريقة الاستلام" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                                <SelectItem value="wallet">محفظة إلكترونية</SelectItem>
                                <SelectItem value="cash">استلام نقدي</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">ملاحظات (مثل رقم المحفظة أو الحساب)</Label>
                        <Input
                            id="notes"
                            placeholder="تفاصيل إضافية..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-secondary/30 border-border/50"
                        />
                    </div>

                    {/* Warning if insufficient grams */}
                    {grams && parseFloat(grams) > (metalType === "gold" ? availableGrams.gold : availableGrams.silver) && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>عدد الجرامات المطلوبة يتجاوز المتاح لديك</span>
                        </div>
                    )}
                    <Button
                        type="submit"
                        className="w-full bg-gold-gradient hover:bg-gold-gradient-hover text-primary-foreground"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                جاري الإرسال...
                            </>
                        ) : (
                            "إرسال الطلب"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default NewWithdrawalDialog;
