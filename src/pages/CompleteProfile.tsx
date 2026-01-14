import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CompleteProfile = () => {
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [walletType, setWalletType] = useState("");
  const [walletNumber, setWalletNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    
    // Check if profile already exists and is complete
    const checkProfile = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_active, phone, first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching profile:', error);
          setCheckingProfile(false);
          return;
        }

        if (profile) {
          // Check if profile is complete (has required fields)
          const isComplete = profile.phone && profile.first_name && profile.last_name;
          
          if (isComplete && !profile.is_active) {
            // Profile is complete but not active (pending verification)
            setProfileSubmitted(true);
          } else if (isComplete && profile.is_active) {
            // Profile is active, redirect to dashboard
            navigate('/dashboard');
            return;
          }
          
          // Load existing data if profile exists but incomplete
          if (profile.first_name) setFirstName(profile.first_name);
          if (profile.last_name) setLastName(profile.last_name);
          if (profile.phone) setPhone(profile.phone);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    if (user) {
      checkProfile();
    } else {
      setCheckingProfile(false);
    }
  }, [user, navigate]);

  const uploadFile = async (file: File, path: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!firstName || !lastName || !phone || !walletType) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
      });
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = null;
      let idFrontUrl = null;
      let idBackUrl = null;

      if (profileImage) {
        avatarUrl = await uploadFile(profileImage, 'avatars');
      }

      if (idFront) {
        idFrontUrl = await uploadFile(idFront, 'ids');
      }

      if (idBack) {
        idBackUrl = await uploadFile(idBack, 'ids');
      }

      const updateData: any = {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        phone: phone,
        wallet_type: walletType,
        wallet_number: walletNumber,
        is_active: false, // Set to false - waiting for admin verification
      };

      if (avatarUrl) updateData.avatar_url = avatarUrl;
      if (idFrontUrl) updateData.id_front_url = idFrontUrl;
      if (idBackUrl) updateData.id_back_url = idBackUrl;

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "تم إرسال المعلومات بنجاح",
        description: "سيتم مراجعة بياناتك وتفعيل حسابك قريباً",
      });

      // Don't navigate - show waiting message instead
      setProfileSubmitted(true);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "حدث خطأ",
        description: error.message || "فشل تحديث البيانات",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show waiting message if profile is submitted and pending verification
  if (profileSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="max-w-2xl w-full relative z-10">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 sm:p-12 shadow-gold text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-gold-gradient">
                في انتظار الموافقة
              </h2>
              <p className="text-muted-foreground text-lg">
                تم إرسال معلوماتك بنجاح
              </p>
              <p className="text-muted-foreground">
                سيتم مراجعة بياناتك من قبل الإدارة وتفعيل حسابك قريباً
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                يمكنك تسجيل الخروج والعودة لاحقاً للتحقق من حالة حسابك
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="max-w-3xl w-full space-y-8 relative z-10">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gold-gradient">
            إضافة معلومات الحساب
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            يرجى إكمال معلومات حسابك للمتابعة
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 sm:p-10 shadow-gold">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Profile Image */}
            <div className="flex flex-col items-center space-y-4">
              <Label className="text-base">صورة الملف الشخصي *</Label>
              <div className="relative group cursor-pointer">
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center bg-background/50 group-hover:bg-primary/5 transition-colors overflow-hidden">
                  {profileImage ? (
                    <img
                      src={URL.createObjectURL(profileImage)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-10 h-10 text-primary/50" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleImageUpload(e, setProfileImage)}
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="relative">
                اخـتيار صورة
                <Upload className="w-4 h-4 mr-2" />
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleImageUpload(e, setProfileImage)}
                />
              </Button>
              <div className="flex items-center text-xs text-yellow-500 gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>صورة الملف الشخصي مطلوبة (PNG, JPG, GIF حتى 5MB)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Names */}
              <div className="space-y-2">
                <Label htmlFor="firstName">الاسم الأول *</Label>
                <Input
                  id="firstName"
                  placeholder="الاسم الأول"
                  required
                  className="bg-background/50"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">اسم العائلة *</Label>
                <Input
                  id="lastName"
                  placeholder="اسم العائلة"
                  required
                  className="bg-background/50"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              {/* Contact */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  required
                  className="bg-background/50 text-left"
                  dir="ltr"
                  value={email}
                  disabled // Email usually comes from auth and shouldn't be changed here easily
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  required
                  className="bg-background/50 text-left"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Wallet Info */}
              <div className="space-y-2 md:col-span-2">
                <Label>نوع المحفظة الإلكترونية *</Label>
                <Select value={walletType} onValueChange={setWalletType}>
                  <SelectTrigger className="bg-background/50 text-right">
                    <SelectValue placeholder="اختر نوع المحفظة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vodafone">فودافون كاش</SelectItem>
                    <SelectItem value="orange">أورنج كاش</SelectItem>
                    <SelectItem value="etisalat">اتصالات كاش</SelectItem>
                    <SelectItem value="we">وي باي</SelectItem>
                    <SelectItem value="instapay">انستا باي</SelectItem>
                    <SelectItem value="bank_transfer">حساب بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="walletNumber">رقم المحفظة الإلكترونية / الحساب</Label>
                <Input
                  id="walletNumber"
                  placeholder="رقم المحفظة (أو رقم الحساب)"
                  className="bg-background/50 text-left"
                  dir="ltr"
                  value={walletNumber}
                  onChange={(e) => setWalletNumber(e.target.value)}
                />
              </div>
            </div>

            {/* ID Documents */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xl font-bold text-foreground">وثائق الهوية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ID Front */}
                <div className="space-y-2">
                  <Label>صورة الهوية - الوجه الأمامي *</Label>
                  <div className="relative border-2 border-dashed border-primary/30 rounded-lg p-8 flex flex-col items-center justify-center bg-background/30 hover:bg-primary/5 transition-colors group">
                    {idFront ? (
                      <div className="text-center">
                        <p className="text-primary font-medium">{idFront.name}</p>
                        <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={() => setIdFront(null)}>إزالة</Button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">لا توجد صورة مختارة</p>
                        <Button type="button" variant="outline" className="relative">
                          اختيار ملف
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleImageUpload(e, setIdFront)}
                          />
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">PNG, JPG, GIF حتى 5MB</p>
                      </>
                    )}
                  </div>
                </div>

                {/* ID Back */}
                <div className="space-y-2">
                  <Label>صورة الهوية - الوجه الخلفي *</Label>
                  <div className="relative border-2 border-dashed border-primary/30 rounded-lg p-8 flex flex-col items-center justify-center bg-background/30 hover:bg-primary/5 transition-colors group">
                    {idBack ? (
                      <div className="text-center">
                        <p className="text-primary font-medium">{idBack.name}</p>
                        <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={() => setIdBack(null)}>إزالة</Button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">لا توجد صورة مختارة</p>
                        <Button type="button" variant="outline" className="relative">
                          اختيار ملف
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => handleImageUpload(e, setIdBack)}
                          />
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">PNG, JPG, GIF حتى 5MB</p>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gold-gradient text-black font-bold text-lg hover:shadow-gold-lg transition-all py-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "إكمال المعلومات"
              )}
            </Button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
