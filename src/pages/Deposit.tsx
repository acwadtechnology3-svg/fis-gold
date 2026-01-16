import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldCheck, Copy, Upload, Wallet, CreditCard, Clock, Phone, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const Deposit = () => {
    const { toast } = useToast();
    const { getSetting, loading: settingsLoading } = useSystemSettings();
    const [amount, setAmount] = useState("");
    const [phone, setPhone] = useState("");
    const [screenshot, setScreenshot] = useState<File | null>(null);

    // Get wallet and InstaPay settings with fallback values
    const walletNumber = getSetting("company_wallet_number") || "01027136059";
    const instapayAddress = getSetting("company_instapay_address") || "fisgold@instapay";

    const handleCopyNumber = (number: string) => {
        navigator.clipboard.writeText(number);
        toast({
            title: "تم النسخ",
            description: "تم نسخ الرقم إلى الحافظة بنجاح",
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "تم إرسال الطلب",
            description: "سيتم مراجعة طلب الإيداع وتنفيذه خلال 24-48 ساعة",
        });
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 relative">
            {/* Details Header */}
            <div className="text-right mb-8">
                <h1 className="text-3xl font-bold text-gold-gradient mb-2">الإيداع</h1>
                <p className="text-muted-foreground">
                    يمكنك إيداع رصيدك بسهولة باستخدام إحدى الطرق التالية. سيتم تفعيل الإيداع بعد مراجعة البيانات خلال 24-48 ساعة من قبل فريق الدعم الفني.
                </p>
            </div>

            {/* Security Badge */}
            <div className="bg-[#1a1f2e] border border-blue-900/30 rounded-lg p-3 mb-8 flex items-center justify-between text-blue-100/80 text-sm">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <span className="flex-1 text-center font-medium">جميع المعاملات محمية بأعلى معايير الأمان والشفافية</span>
            </div>

            <div className="max-w-3xl mx-auto bg-[#1a1f2e]/50 backdrop-blur border border-blue-900/30 rounded-xl p-6 md:p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6 text-right">طرق الإيداع المتاحة</h2>

                {settingsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="wallet" className="w-full" dir="rtl">
                        <TabsList className="grid w-full grid-cols-2 bg-[#0d1117] h-12 mb-6">
                            <TabsTrigger value="wallet" className="data-[state=active]:bg-[#1a2333] data-[state=active]:text-white gap-2">
                                <Wallet className="w-4 h-4" />
                                محفظة إلكترونية
                            </TabsTrigger>
                            <TabsTrigger value="instapay" className="data-[state=active]:bg-[#1a2333] data-[state=active]:text-white gap-2">
                                <CreditCard className="w-4 h-4" />
                                إنستاباي
                            </TabsTrigger>
                        </TabsList>

                        {/* Wallet Content */}
                        <TabsContent value="wallet" className="space-y-6">
                            <div className="bg-[#1e2538] border border-blue-900/30 rounded-xl p-6 text-center relative overflow-hidden group">
                                <div className="flex items-center gap-2 mb-2 text-blue-300">
                                    <Wallet className="w-5 h-5" />
                                    <span className="font-medium">رقم المحفظة للإرسال</span>
                                </div>
                                <div
                                    className="text-4xl font-bold text-white tracking-wider cursor-pointer hover:text-gold transition-colors"
                                    onClick={() => handleCopyNumber(walletNumber)}
                                >
                                    {walletNumber}
                                </div>
                                <p className="text-sm text-gray-400 mt-2">أرسل المبلغ إلى هذا الرقم</p>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-4 left-4 text-gray-400 hover:text-white"
                                    onClick={() => handleCopyNumber(walletNumber)}
                                >
                                    <Copy className="w-5 h-5" />
                                </Button>
                            </div>
                            {renderForm(amount, setAmount, phone, setPhone, screenshot, setScreenshot, handleSubmit)}
                        </TabsContent>

                        {/* Instapay Content */}
                        <TabsContent value="instapay" className="space-y-6">
                            <div className="bg-[#1e2538] border border-blue-900/30 rounded-xl p-6 text-center relative overflow-hidden group">
                                <div className="flex items-center gap-2 mb-2 text-blue-300">
                                    <CreditCard className="w-5 h-5" />
                                    <span className="font-medium">عنوان الدفع للإرسال (Instapay Address)</span>
                                </div>
                                <div
                                    className="text-2xl font-bold text-white tracking-wider cursor-pointer hover:text-gold transition-colors"
                                    onClick={() => handleCopyNumber(instapayAddress)}
                                >
                                    {instapayAddress}
                                </div>
                                <p className="text-sm text-gray-400 mt-2">أرسل المبلغ إلى هذا العنوان</p>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-4 left-4 text-gray-400 hover:text-white"
                                    onClick={() => handleCopyNumber(instapayAddress)}
                                >
                                    <Copy className="w-5 h-5" />
                                </Button>
                            </div>
                            {renderForm(amount, setAmount, phone, setPhone, screenshot, setScreenshot, handleSubmit)}
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            {/* Footer Notes */}
            <div className="max-w-3xl mx-auto mt-6 bg-[#1e2538]/50 rounded-xl p-6 border border-blue-900/20">
                <h3 className="text-lg font-bold text-white mb-4 text-right">ملاحظات للعميل</h3>
                <div className="space-y-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-emerald-400">
                        <span>تأكد من صحة البيانات قبل الإرسال.</span>
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-end gap-2 text-blue-300">
                        <span>في حال وجود أي مشكلة، يمكنك التواصل مع الدعم الفني مباشرة.</span>
                        <Phone className="w-5 h-5" />
                    </div>
                    <div className="flex items-center justify-end gap-2 text-yellow-500/80 text-sm mt-4 border-t border-white/10 pt-4">
                        <span>سيتم تفعيل الإيداع بعد مراجعة البيانات خلال 24-48 ساعة.</span>
                        <Clock className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const renderForm = (
    amount: string,
    setAmount: (v: string) => void,
    phone: string,
    setPhone: (v: string) => void,
    screenshot: File | null,
    setScreenshot: (f: File | null) => void,
    onSubmit: (e: React.FormEvent) => void
) => (
    <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
            <Label className="text-right block">* المبلغ</Label>
            <Input
                type="number"
                placeholder="المبلغ بالجنيه"
                className="bg-[#0d1117] border-blue-900/30 h-12 text-right"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
            />
        </div>

        <div className="space-y-2">
            <Label className="text-right block">* رقم الهاتف</Label>
            <Input
                type="tel"
                placeholder="رقم الهاتف المرتبط بالمحفظة"
                className="bg-[#0d1117] border-blue-900/30 h-12 text-right"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
            />
        </div>

        <div className="space-y-2">
            <Label className="text-right block">* صورة المعاملة</Label>
            <div className="relative">
                <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => e.target.files && setScreenshot(e.target.files[0])}
                    required={!screenshot}
                />
                <div className="bg-[#0d1117] border border-dashed border-blue-900/30 rounded-md h-12 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors">
                    {screenshot ? (
                        <span className="text-emerald-400">{screenshot.name}</span>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            <span>رفع صورة المعاملة</span>
                        </>
                    )}
                </div>
            </div>
        </div>

        <Button type="submit" className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg mt-4">
            رفع وإرسال الطلب
        </Button>
    </form>
);

export default Deposit;

