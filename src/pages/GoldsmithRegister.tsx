import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGoldsmiths } from "@/hooks/useGoldsmiths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import GoldParticles from "@/components/GoldParticles";
import logo from "@/assets/logo.png";

const STEPS = [
  "بيانات شخصية",
  "بيانات المحل",
  "رفع الملفات",
  "بيانات العرض",
  "مراجعة",
];

const GoldsmithRegister = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createGoldsmithApplication } = useGoldsmiths();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Step 1: Personal Information
  const [personalData, setPersonalData] = useState({
    name: "",
    phone: "",
    email: user?.email || "",
    national_id: "",
  });

  // Step 2: Shop Information
  const [shopData, setShopData] = useState({
    shop_name: "",
    address: "",
    city: "",
    commercial_registration: "",
    tax_card_number: "",
  });

  // Step 3: Files
  const [files, setFiles] = useState({
    id_card: "",
    commercial_registration: "",
    tax_card: "",
    logo: "",
    shop_photo: "",
  });

  // Step 4: Display Data
  const [displayData, setDisplayData] = useState({
    description: "",
    years_experience: "",
    product_types: [] as string[],
    payment_method: "",
    bank_account: "",
    vodafone_cash_number: "",
    company_account: "",
  });

  // Step 5: Legal Acceptances
  const [legalAcceptances, setLegalAcceptances] = useState({
    terms_accepted: false,
    data_accuracy_accepted: false,
    review_accepted: false,
  });

  const handleImageUpload = async (
    file: File,
    type: "id_card" | "commercial_registration" | "tax_card" | "logo" | "shop_photo"
  ) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("يجب رفع ملف صورة فقط");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("حجم الملف يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    setUploading(type);
    
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;
      const filePath = `goldsmiths/${fileName}`;

      // Upload file directly (bucket check removed - listBuckets requires admin permissions)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        
        // More specific error messages
        if (uploadError.message.includes("already exists") || uploadError.message.includes("duplicate")) {
          // Try to delete and re-upload
          await supabase.storage.from("images").remove([filePath]);
          const { error: retryError } = await supabase.storage
            .from("images")
            .upload(filePath, file, { upsert: true });
          
          if (retryError) {
            toast.error(`خطأ في رفع الصورة: ${retryError.message}`);
            setUploading(null);
            return;
          }
          // Continue after successful retry
        } else if (uploadError.message.includes("new row violates") || uploadError.message.includes("row-level security")) {
          toast.error("خطأ في الصلاحيات. يرجى التأكد من إعدادات Storage. راجع: scripts/إعداد-التخزين.md");
          setUploading(null);
          return;
        } else if (uploadError.message.includes("not found") || uploadError.message.includes("does not exist")) {
          toast.error("خزان التخزين غير موجود. يرجى إنشاء bucket باسم 'images' في Supabase Dashboard");
          setUploading(null);
          return;
        } else {
          toast.error(`خطأ في رفع الصورة: ${uploadError.message}`);
          setUploading(null);
          return;
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      if (!publicUrl) {
        toast.error("حدث خطأ في الحصول على رابط الصورة");
        setUploading(null);
        return;
      }

      setFiles({ ...files, [type]: publicUrl });
      setUploading(null);
      toast.success("تم رفع الصورة بنجاح");
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(`حدث خطأ غير متوقع: ${error.message || "خطأ غير معروف"}`);
      setUploading(null);
    }
  };

  const toggleProductType = (type: string) => {
    setDisplayData((prev) => ({
      ...prev,
      product_types: prev.product_types.includes(type)
        ? prev.product_types.filter((t) => t !== type)
        : [...prev.product_types, type],
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!personalData.name || !personalData.phone || !personalData.email || !personalData.national_id) {
          toast.error("يرجى ملء جميع الحقول المطلوبة");
          return false;
        }
        return true;
      case 2:
        if (
          !shopData.shop_name ||
          !shopData.address ||
          !shopData.city ||
          !shopData.commercial_registration ||
          !shopData.tax_card_number
        ) {
          toast.error("يرجى ملء جميع الحقول المطلوبة");
          return false;
        }
        return true;
      case 3:
        if (!files.id_card || !files.commercial_registration || !files.tax_card || !files.logo) {
          toast.error("يرجى رفع جميع الملفات المطلوبة");
          return false;
        }
        return true;
      case 4:
        if (!displayData.description || !displayData.years_experience || displayData.product_types.length === 0) {
          toast.error("يرجى ملء جميع الحقول المطلوبة");
          return false;
        }
        return true;
      case 5:
        if (
          !legalAcceptances.terms_accepted ||
          !legalAcceptances.data_accuracy_accepted ||
          !legalAcceptances.review_accepted
        ) {
          toast.error("يرجى الموافقة على جميع الشروط");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      navigate("/auth");
      return;
    }

    setLoading(true);

    const applicationData = {
      ...personalData,
      ...shopData,
      ...displayData,
      id_card_image_url: files.id_card,
      commercial_registration_image_url: files.commercial_registration,
      tax_card_image_url: files.tax_card,
      logo_url: files.logo,
      shop_photo_url: files.shop_photo,
      years_experience: parseInt(displayData.years_experience) || 0,
      ...legalAcceptances,
    };

    const success = await createGoldsmithApplication(applicationData as any);

    setLoading(false);

    if (success) {
      toast.success("تم استلام طلبك بنجاح، سيتم مراجعته خلال 48 ساعة");
      navigate("/dashboard");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hero-pattern">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              يجب تسجيل الدخول أولاً
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              تسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero-pattern relative" dir="rtl">
      <GoldParticles />
      <div className="container mx-auto py-8 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Card className="glass-dark border-primary/20 shadow-gold">
            <CardHeader>
              <div className="flex items-center gap-3 mb-6">
                <img src={logo} alt="FIS Gold" className="w-12 h-12" />
                <div>
                  <CardTitle className="text-2xl text-gold-gradient">
                    انضم كصايغ معتمد
                  </CardTitle>
                  <CardDescription>
                    نموذج تسجيل صايغ معتمد – FIS Gold
                  </CardDescription>
                </div>
              </div>

              {/* Stepper */}
              <Stepper steps={STEPS} currentStep={currentStep} />
            </CardHeader>
            <CardContent className="pt-8">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gold-gradient mb-2">
                      القسم الأول: بيانات الصايغ الشخصية
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      يرجى إدخال بياناتك الشخصية الصحيحة
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم الكامل للصايغ *</Label>
                      <Input
                        id="name"
                        value={personalData.name}
                        onChange={(e) =>
                          setPersonalData({ ...personalData, name: e.target.value })
                        }
                        required
                        placeholder="أحمد محمد أحمد"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={personalData.phone}
                        onChange={(e) =>
                          setPersonalData({ ...personalData, phone: e.target.value })
                        }
                        required
                        placeholder="01234567890"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={personalData.email}
                        onChange={(e) =>
                          setPersonalData({ ...personalData, email: e.target.value })
                        }
                        required
                        placeholder="email@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="national_id">رقم البطاقة / الرقم القومي *</Label>
                      <Input
                        id="national_id"
                        value={personalData.national_id}
                        onChange={(e) =>
                          setPersonalData({ ...personalData, national_id: e.target.value })
                        }
                        required
                        placeholder="12345678901234"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Shop Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gold-gradient mb-2">
                      القسم الثاني: بيانات المحل
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      يرجى إدخال بيانات محل الذهب
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shop_name">اسم محل الذهب *</Label>
                      <Input
                        id="shop_name"
                        value={shopData.shop_name}
                        onChange={(e) =>
                          setShopData({ ...shopData, shop_name: e.target.value })
                        }
                        required
                        placeholder="محل الذهب الأصيل"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">عنوان المحل بالكامل *</Label>
                      <Textarea
                        id="address"
                        value={shopData.address}
                        onChange={(e) =>
                          setShopData({ ...shopData, address: e.target.value })
                        }
                        required
                        rows={2}
                        placeholder="شارع...، منطقة...، مدينة..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">المحافظة / المدينة *</Label>
                        <Input
                          id="city"
                          value={shopData.city}
                          onChange={(e) =>
                            setShopData({ ...shopData, city: e.target.value })
                          }
                          required
                          placeholder="القاهرة"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="commercial_registration">رقم السجل التجاري *</Label>
                        <Input
                          id="commercial_registration"
                          value={shopData.commercial_registration}
                          onChange={(e) =>
                            setShopData({
                              ...shopData,
                              commercial_registration: e.target.value,
                            })
                          }
                          required
                          placeholder="12345"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tax_card_number">رقم البطاقة الضريبية *</Label>
                      <Input
                        id="tax_card_number"
                        value={shopData.tax_card_number}
                        onChange={(e) =>
                          setShopData({ ...shopData, tax_card_number: e.target.value })
                        }
                        required
                        placeholder="123-456-789"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Files Upload */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gold-gradient mb-2">
                      القسم الثالث: ملفات التحقق
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      يرجى رفع جميع المستندات المطلوبة
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ID Card */}
                    <div className="space-y-2">
                      <Label>صورة البطاقة الشخصية *</Label>
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "id_card");
                          }}
                          className="hidden"
                          id="id_card"
                        />
                        <label
                          htmlFor="id_card"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          {uploading === "id_card" ? (
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          ) : files.id_card ? (
                            <>
                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                              <span className="text-sm text-green-500">تم الرفع</span>
                              {files.id_card && (
                                <img
                                  src={files.id_card}
                                  alt="ID Card"
                                  className="w-20 h-20 object-cover rounded-lg mt-2"
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">اضغط للرفع</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Commercial Registration */}
                    <div className="space-y-2">
                      <Label>صورة السجل التجاري *</Label>
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "commercial_registration");
                          }}
                          className="hidden"
                          id="commercial_registration"
                        />
                        <label
                          htmlFor="commercial_registration"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          {uploading === "commercial_registration" ? (
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          ) : files.commercial_registration ? (
                            <>
                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                              <span className="text-sm text-green-500">تم الرفع</span>
                              {files.commercial_registration && (
                                <img
                                  src={files.commercial_registration}
                                  alt="Commercial Registration"
                                  className="w-20 h-20 object-cover rounded-lg mt-2"
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">اضغط للرفع</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Tax Card */}
                    <div className="space-y-2">
                      <Label>صورة البطاقة الضريبية *</Label>
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "tax_card");
                          }}
                          className="hidden"
                          id="tax_card"
                        />
                        <label
                          htmlFor="tax_card"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          {uploading === "tax_card" ? (
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          ) : files.tax_card ? (
                            <>
                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                              <span className="text-sm text-green-500">تم الرفع</span>
                              {files.tax_card && (
                                <img
                                  src={files.tax_card}
                                  alt="Tax Card"
                                  className="w-20 h-20 object-cover rounded-lg mt-2"
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">اضغط للرفع</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Logo */}
                    <div className="space-y-2">
                      <Label>لوجو المحل * (مفضل)</Label>
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "logo");
                          }}
                          className="hidden"
                          id="logo"
                        />
                        <label
                          htmlFor="logo"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          {uploading === "logo" ? (
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          ) : files.logo ? (
                            <>
                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                              <span className="text-sm text-green-500">تم الرفع</span>
                              {files.logo && (
                                <img
                                  src={files.logo}
                                  alt="Logo"
                                  className="w-20 h-20 object-cover rounded-lg mt-2"
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">اضغط للرفع</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Shop Photo */}
                    <div className="space-y-2 md:col-span-2">
                      <Label>صورة للمحل من الخارج</Label>
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file, "shop_photo");
                          }}
                          className="hidden"
                          id="shop_photo"
                        />
                        <label
                          htmlFor="shop_photo"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          {uploading === "shop_photo" ? (
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          ) : files.shop_photo ? (
                            <>
                              <CheckCircle2 className="w-8 h-8 text-green-500" />
                              <span className="text-sm text-green-500">تم الرفع</span>
                              {files.shop_photo && (
                                <img
                                  src={files.shop_photo}
                                  alt="Shop Photo"
                                  className="w-32 h-32 object-cover rounded-lg mt-2"
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">اضغط للرفع (اختياري)</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Display Data */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gold-gradient mb-2">
                      القسم الرابع: بيانات العرض
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      معلومات عن المحل والمنتجات
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">وصف قصير عن المحل *</Label>
                      <Textarea
                        id="description"
                        value={displayData.description}
                        onChange={(e) =>
                          setDisplayData({ ...displayData, description: e.target.value })
                        }
                        required
                        rows={3}
                        placeholder="مثال: محل متخصص في بيع المشغولات الذهبية عيار 21 و18 منذ 15 سنة"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="years_experience">عدد سنوات الخبرة *</Label>
                      <Input
                        id="years_experience"
                        type="number"
                        min="0"
                        value={displayData.years_experience}
                        onChange={(e) =>
                          setDisplayData({ ...displayData, years_experience: e.target.value })
                        }
                        required
                        placeholder="15"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>أنواع المنتجات * (يمكن اختيار أكثر من نوع)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { id: "crafted", label: "مشغولات" },
                          { id: "ingots", label: "سبائك" },
                          { id: "gold_coins", label: "جنيهات ذهب" },
                          { id: "silver", label: "فضة" },
                        ].map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => toggleProductType(type.id)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              displayData.product_types.includes(type.id)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-muted hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {displayData.product_types.includes(type.id) && (
                                <Check className="w-4 h-4" />
                              )}
                              <span>{type.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Method (Optional) */}
                    <div className="space-y-4 border-t border-primary/20 pt-4">
                      <Label>بيانات الدفع (اختياري)</Label>
                      <div className="space-y-2">
                        <Label htmlFor="payment_method">طريقة استلام الأرباح</Label>
                        <Select
                          value={displayData.payment_method}
                          onValueChange={(value) =>
                            setDisplayData({ ...displayData, payment_method: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر طريقة الدفع" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                            <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                            <SelectItem value="company_account">حساب شركة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {displayData.payment_method === "bank_transfer" && (
                        <div className="space-y-2">
                          <Label htmlFor="bank_account">رقم الحساب البنكي</Label>
                          <Input
                            id="bank_account"
                            value={displayData.bank_account}
                            onChange={(e) =>
                              setDisplayData({ ...displayData, bank_account: e.target.value })
                            }
                            placeholder="رقم الحساب البنكي"
                          />
                        </div>
                      )}

                      {displayData.payment_method === "vodafone_cash" && (
                        <div className="space-y-2">
                          <Label htmlFor="vodafone_cash_number">رقم فودافون كاش</Label>
                          <Input
                            id="vodafone_cash_number"
                            value={displayData.vodafone_cash_number}
                            onChange={(e) =>
                              setDisplayData({
                                ...displayData,
                                vodafone_cash_number: e.target.value,
                              })
                            }
                            placeholder="01012345678"
                          />
                        </div>
                      )}

                      {displayData.payment_method === "company_account" && (
                        <div className="space-y-2">
                          <Label htmlFor="company_account">حساب الشركة</Label>
                          <Input
                            id="company_account"
                            value={displayData.company_account}
                            onChange={(e) =>
                              setDisplayData({
                                ...displayData,
                                company_account: e.target.value,
                              })
                            }
                            placeholder="حساب الشركة"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review & Legal */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gold-gradient mb-2">
                      القسم الخامس: المراجعة والموافقة القانونية
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      راجع بياناتك وأكد الموافقات
                    </p>
                  </div>

                  {/* Review Summary */}
                  <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                    <h4 className="font-semibold text-gold-gradient">ملخص البيانات</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">الاسم: </span>
                        <span className="font-medium">{personalData.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">اسم المحل: </span>
                        <span className="font-medium">{shopData.shop_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المدينة: </span>
                        <span className="font-medium">{shopData.city}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">سنوات الخبرة: </span>
                        <span className="font-medium">{displayData.years_experience}</span>
                      </div>
                    </div>
                  </div>

                  {/* Legal Acceptances */}
                  <div className="space-y-4 border-t border-primary/20 pt-4">
                    <h4 className="font-semibold">الموافقات القانونية *</h4>

                    <div className="flex items-start gap-3 space-y-0">
                      <Checkbox
                        id="terms"
                        checked={legalAcceptances.terms_accepted}
                        onCheckedChange={(checked) =>
                          setLegalAcceptances({
                            ...legalAcceptances,
                            terms_accepted: checked === true,
                          })
                        }
                        className="mt-1"
                      />
                      <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
                        أوافق على شروط وأحكام FIS Gold
                      </Label>
                    </div>

                    <div className="flex items-start gap-3 space-y-0">
                      <Checkbox
                        id="data_accuracy"
                        checked={legalAcceptances.data_accuracy_accepted}
                        onCheckedChange={(checked) =>
                          setLegalAcceptances({
                            ...legalAcceptances,
                            data_accuracy_accepted: checked === true,
                          })
                        }
                        className="mt-1"
                      />
                      <Label htmlFor="data_accuracy" className="cursor-pointer text-sm leading-relaxed">
                        أتعهد بصحة البيانات المقدمة
                      </Label>
                    </div>

                    <div className="flex items-start gap-3 space-y-0">
                      <Checkbox
                        id="review"
                        checked={legalAcceptances.review_accepted}
                        onCheckedChange={(checked) =>
                          setLegalAcceptances({
                            ...legalAcceptances,
                            review_accepted: checked === true,
                          })
                        }
                        className="mt-1"
                      />
                      <Label htmlFor="review" className="cursor-pointer text-sm leading-relaxed">
                        أوافق على مراجعة الإدارة قبل التفعيل
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-primary/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  السابق
                </Button>

                {currentStep < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="gap-2 bg-gold-gradient"
                  >
                    التالي
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="gap-2 bg-gold-gradient"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        إرسال طلب الاعتماد
                      </>
                    )}
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                بعد الإرسال، سيتم مراجعة طلبك من قبل الإدارة خلال 48 ساعة
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GoldsmithRegister;
