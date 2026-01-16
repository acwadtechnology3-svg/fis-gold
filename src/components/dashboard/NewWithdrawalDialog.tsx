import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, Wallet } from "lucide-react";

interface NewWithdrawalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const NewWithdrawalDialog = ({ open, onOpenChange, onSuccess }: NewWithdrawalDialogProps) => {
    const [amount, setAmount] = useState("");
    const [withdrawalMethod, setWithdrawalMethod] = useState("");
    const [walletNumber, setWalletNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    // Fetch wallet balance when dialog opens
    useEffect(() => {
        const fetchWalletBalance = async () => {
            if (!user || !open) return;

            setLoadingBalance(true);
            try {
                const { data, error } = await supabase
                    .from("wallet_accounts")
                    .select("available_balance")
                    .eq("user_id", user.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                setWalletBalance(Number(data?.available_balance) || 0);
            } catch (error) {
                console.error("Error fetching wallet balance:", error);
                setWalletBalance(0);
            } finally {
                setLoadingBalance(false);
            }
        };

        fetchWalletBalance();
    }, [user, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || !withdrawalMethod) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "يرجى ملء جميع الحقول المطلوبة",
            });
            return;
        }

        // Require wallet number for electronic methods
        if ((withdrawalMethod === "vodafone_cash" || withdrawalMethod === "instapay" ||
            withdrawalMethod === "orange_cash" || withdrawalMethod === "etisalat_cash") && !walletNumber) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "يرجى إدخال رقم المحفظة",
            });
            return;
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "المبلغ يجب أن يكون أكبر من 0",
            });
            return;
        }

        // Check wallet balance
        if (amountNum > walletBalance) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: `رصيد المحفظة غير كافي. المتاح: ${walletBalance.toLocaleString("ar-EG")} ج.م`,
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

        // Prepare notes with wallet number
        const fullNotes = walletNumber
            ? `طريقة السحب: ${withdrawalMethod}\nرقم المحفظة: ${walletNumber}${notes ? `\nملاحظات: ${notes}` : ''}`
            : `طريقة السحب: ${withdrawalMethod}${notes ? `\nملاحظات: ${notes}` : ''}`;

        const { error } = await supabase.from("withdrawals").insert({
            user_id: user.id,
            withdrawal_type: 'cash',
            gross_amount: amountNum,
            net_amount: amountNum, // Will be calculated by admin
            fee_amount: 0,
            notes: fullNotes,
            idempotency_key: crypto.randomUUID(),
        } as any);

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
            setAmount("");
            setWithdrawalMethod("");
            setWalletNumber("");
            setNotes("");
            onOpenChange(false);
            onSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border/50">
                <DialogHeader>
                    <DialogTitle className="text-xl text-gold-gradient flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        سحب نقدية من المحفظة
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Wallet Balance Display */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">رصيد المحفظة المتاح:</span>
                            {loadingBalance ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <span className="text-xl font-bold text-gold-gradient">
                                    {walletBalance.toLocaleString("ar-EG")} ج.م
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">المبلغ المراد سحبه (ج.م) *</Label>
                        <Input
                            id="amount"
                            type="number"
                            min="1"
                            max={walletBalance}
                            placeholder="أدخل المبلغ"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-secondary/30 border-border/50"
                            dir="ltr"
                        />
                    </div>

                    {/* Withdrawal Method */}
                    <div className="space-y-2">
                        <Label htmlFor="withdrawalMethod">طريقة السحب *</Label>
                        <Select value={withdrawalMethod} onValueChange={setWithdrawalMethod}>
                            <SelectTrigger className="bg-secondary/30 border-border/50">
                                <SelectValue placeholder="اختر طريقة السحب" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                                <SelectItem value="orange_cash">أورنج كاش</SelectItem>
                                <SelectItem value="etisalat_cash">اتصالات كاش</SelectItem>
                                <SelectItem value="instapay">انستا باي</SelectItem>
                                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Wallet/Account Number - Show based on method */}
                    {(withdrawalMethod === "vodafone_cash" || withdrawalMethod === "orange_cash" ||
                        withdrawalMethod === "etisalat_cash" || withdrawalMethod === "instapay") && (
                            <div className="space-y-2">
                                <Label htmlFor="walletNumber">
                                    {withdrawalMethod === "instapay" ? "رقم حساب انستا باي *" : "رقم المحفظة *"}
                                </Label>
                                <Input
                                    id="walletNumber"
                                    placeholder={withdrawalMethod === "instapay" ? "أدخل رقم حساب انستا باي" : "أدخل رقم المحفظة"}
                                    value={walletNumber}
                                    onChange={(e) => setWalletNumber(e.target.value)}
                                    className="bg-secondary/30 border-border/50"
                                    dir="ltr"
                                />
                            </div>
                        )}

                    {/* Bank Account - Show for bank transfer */}
                    {withdrawalMethod === "bank_transfer" && (
                        <div className="space-y-2">
                            <Label htmlFor="walletNumber">رقم الحساب البنكي / IBAN *</Label>
                            <Input
                                id="walletNumber"
                                placeholder="أدخل رقم الحساب البنكي"
                                value={walletNumber}
                                onChange={(e) => setWalletNumber(e.target.value)}
                                className="bg-secondary/30 border-border/50"
                                dir="ltr"
                            />
                        </div>
                    )}

                    {/* Additional Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">ملاحظات إضافية</Label>
                        <Input
                            id="notes"
                            placeholder="ملاحظات اختيارية..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-secondary/30 border-border/50"
                        />
                    </div>

                    {/* Warning if insufficient balance */}
                    {amount && parseFloat(amount) > walletBalance && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>المبلغ المطلوب يتجاوز رصيد المحفظة المتاح</span>
                        </div>
                    )}

                    <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                        <p>• سيتم مراجعة طلبك خلال 24-48 ساعة</p>
                        <p>• سيتم التحويل إلى الحساب/المحفظة المحددة</p>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-gold-gradient hover:bg-gold-gradient-hover text-primary-foreground"
                        disabled={isLoading || walletBalance === 0}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                جاري الإرسال...
                            </>
                        ) : (
                            "إرسال طلب السحب"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default NewWithdrawalDialog;
