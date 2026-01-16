import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Upload, X, Copy, CheckCircle, AlertCircle } from "lucide-react";

interface NewDepositDialogProps {
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

interface PaymentMethod {
  label: string;
  number: string;
  instructions: string;
  bankName?: string;
  link?: string;
}

const NewDepositDialog = ({ onSuccess, open: controlledOpen, onOpenChange: setControlledOpen, showTrigger = true }: NewDepositDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [companyWallet, setCompanyWallet] = useState("");
  const [companyInstapay, setCompanyInstapay] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch company wallet settings from database
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("key, value")
          .in("key", ["company_wallet_number", "company_instapay_address"]);

        if (error) throw error;

        data?.forEach((setting: any) => {
          const value = typeof setting.value === 'string'
            ? setting.value.replace(/"/g, '')
            : setting.value;
          if (setting.key === "company_wallet_number") {
            setCompanyWallet(value || "01027136059");
          } else if (setting.key === "company_instapay_address") {
            setCompanyInstapay(value || "fisgold@instapay");
          }
        });
      } catch (error) {
        console.error("Error fetching payment settings:", error);
        // Use defaults if fetch fails
        setCompanyWallet("01027136059");
        setCompanyInstapay("fisgold@instapay");
      }
    };

    if (open) {
      fetchSettings();
    }
  }, [open]);

  // Build company wallets object dynamically
  const COMPANY_WALLETS: Record<string, PaymentMethod> = {
    vodafone_cash: {
      label: "فودافون كاش",
      number: companyWallet,
      instructions: "أرسل المبلغ إلى هذا الرقم",
    },
    orange_cash: {
      label: "أورنج كاش",
      number: companyWallet,
      instructions: "أرسل المبلغ إلى هذا الرقم",
    },
    etisalat_cash: {
      label: "اتصالات كاش",
      number: companyWallet,
      instructions: "أرسل المبلغ إلى هذا الرقم",
    },
    we_pay: {
      label: "وي باي",
      number: companyWallet,
      instructions: "أرسل المبلغ إلى هذا الرقم",
    },
    instapay: {
      label: "انستا باي",
      number: companyInstapay,
      instructions: "حول المبلغ إلى حساب انستا باي",
      link: `https://ipn.eg/S/${companyInstapay.replace('@instapay', '')}/instapay/KXuORf`,
    },
    bank_transfer: {
      label: "حساب بنكي",
      number: companyWallet,
      bankName: "البنك الأهلي المصري",
      instructions: "حول المبلغ إلى الحساب البنكي التالي",
    },
  };

  const selectedWallet = paymentMethod ? COMPANY_WALLETS[paymentMethod] : null;

  const handleCopyNumber = async () => {
    if (!selectedWallet) return;
    try {
      await navigator.clipboard.writeText(selectedWallet.number);
      setCopiedNumber(true);
      toast({
        title: "تم النسخ",
        description: "تم نسخ الرقم بنجاح",
      });
      setTimeout(() => setCopiedNumber(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل نسخ الرقم",
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يجب رفع ملف صورة فقط",
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حجم الملف يجب أن يكون أقل من 5 ميجابايت",
      });
      return;
    }

    setIsUploading(true);
    setPaymentProof(file);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/payment_proof_${Date.now()}.${fileExt}`;
      const filePath = `deposits/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setPaymentProofUrl(data.publicUrl);
      setIsUploading(false);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message || "فشل رفع الملف",
      });
      setPaymentProof(null);
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !paymentMethod || !paymentProofUrl) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى ملء جميع الحقول ورفع إثبات الدفع",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 2000) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الحد الأدنى للإيداع هو 2,000 ج.م",
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

    const { error } = await supabase.from("deposits" as any).insert({
      user_id: user.id,
      amount: amountNum,
      payment_method: paymentMethod,
      provider: 'manual', // Mark as manual deposit
      payment_proof_url: paymentProofUrl,
      idempotency_key: crypto.randomUUID(), // Required by schema
    });

    setIsLoading(false);

    if (error) {
      console.error('Deposit error:', error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء إرسال طلب الإيداع",
      });
    } else {
      toast({
        title: "تم إرسال الطلب",
        description: "سيتم مراجعة طلبك في أقرب وقت",
      });
      setAmount("");
      setPaymentMethod("");
      setPaymentProof(null);
      setPaymentProofUrl(null);
      setOpen(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button className="bg-gold-gradient hover:bg-gold-gradient-hover text-primary-foreground shadow-gold">
            <Plus className="h-4 w-4 ml-2" />
            إيداع جديد
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border/50 max-h-[90vh] overflow-y-auto" aria-describedby="deposit-dialog-desc">
        <DialogHeader>
          <DialogTitle className="text-xl text-gold-gradient">طلب إيداع جديد</DialogTitle>
          <p id="deposit-dialog-desc" className="text-sm text-muted-foreground">
            قم بإدخال تفاصيل الإيداع ورفع إيصال الدفع.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Payment Method - First so user can see wallet details */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">طريقة الدفع *</Label>
            <Select value={paymentMethod} onValueChange={(value) => {
              setPaymentMethod(value);
              setCopiedNumber(false);
            }}>
              <SelectTrigger className="bg-secondary/30 border-border/50">
                <SelectValue placeholder="اختر طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                <SelectItem value="orange_cash">أورنج كاش</SelectItem>
                <SelectItem value="etisalat_cash">اتصالات كاش</SelectItem>
                <SelectItem value="we_pay">وي باي</SelectItem>
                <SelectItem value="instapay">انستا باي</SelectItem>
                <SelectItem value="bank_transfer">حساب بنكي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show company wallet details when payment method is selected */}
          {selectedWallet && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">{selectedWallet.instructions}</span>
              </div>

              {/* Wallet/Account Number */}
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {paymentMethod === "bank_transfer" ? "رقم الحساب البنكي" :
                    paymentMethod === "instapay" ? "حساب انستا باي" : "رقم المحفظة للإرسال"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-mono" dir="ltr">{selectedWallet.number}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyNumber}
                    className="gap-2"
                  >
                    {copiedNumber ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        تم النسخ
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        نسخ
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Bank name for bank transfer */}
              {paymentMethod === "bank_transfer" && 'bankName' in selectedWallet && (
                <p className="text-sm text-muted-foreground">
                  البنك: <span className="font-semibold">{selectedWallet.bankName}</span>
                </p>
              )}

              {/* InstaPay link */}
              {paymentMethod === "instapay" && 'link' in selectedWallet && selectedWallet.link && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => window.open(selectedWallet.link, '_blank')}
                >
                  فتح رابط انستا باي
                </Button>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">المبلغ (ج.م) *</Label>
            <Input
              id="amount"
              type="number"
              min="2000"
              placeholder="الحد الأدنى 2,000 ج.م"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary/30 border-border/50"
              dir="ltr"
            />
          </div>

          {/* Payment Proof Upload */}
          <div className="space-y-2">
            <Label htmlFor="paymentProof">إثبات الدفع (صورة الإيصال) *</Label>
            {paymentProofUrl ? (
              <div className="relative">
                <img
                  src={paymentProofUrl}
                  alt="Payment proof"
                  className="w-full h-48 object-contain rounded-lg border border-primary/20"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 left-2"
                  onClick={() => {
                    setPaymentProof(null);
                    setPaymentProofUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 flex flex-col items-center justify-center bg-secondary/30 hover:bg-primary/5 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                  id="paymentProof"
                />
                <label
                  htmlFor="paymentProof"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isUploading ? "جاري الرفع..." : "رفع صورة للمعاملة"}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">ملاحظات للعميل</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                تأكد من صحة البيانات قبل الإرسال
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                قيد المراجعة - سيتم التفعيل خلال 24-48 ساعة
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                في حال وجود أي مشكلة يمكنك التواصل مع الدعم الفني مباشرة
              </li>
            </ul>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            سيتم تفعيل الإيداع بعد مراجعة البيانات خلال 24-48 ساعة وسيتواصل معك أحد ممثلي الدعم الفني لتأكيد العملية
          </p>

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
              "رفع وإرسال الطلب"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewDepositDialog;
