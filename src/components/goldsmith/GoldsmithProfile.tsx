import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGoldsmiths, Goldsmith } from "@/hooks/useGoldsmiths";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Upload, Loader2, CheckCircle2 } from "lucide-react";

interface GoldsmithProfileProps {
  goldsmith: Goldsmith;
  onUpdate: () => void;
}

export const GoldsmithProfile = ({ goldsmith, onUpdate }: GoldsmithProfileProps) => {
  const { updateGoldsmith } = useGoldsmiths();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: goldsmith.name,
    shop_name: goldsmith.shop_name,
    address: goldsmith.address,
    phone: goldsmith.phone,
    email: goldsmith.email,
    description: goldsmith.description || "",
    logo_url: goldsmith.logo_url || "",
  });

  const handleImageUpload = async (file: File) => {
    setUploading("logo");
    const fileExt = file.name.split(".").pop();
    const fileName = `${goldsmith.user_id}/logo_${Date.now()}.${fileExt}`;
    const filePath = `goldsmiths/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("حدث خطأ في رفع الصورة");
      setUploading(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    setFormData({ ...formData, logo_url: publicUrl });
    setUploading(null);
    toast.success("تم رفع الصورة بنجاح");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await updateGoldsmith({
      ...formData,
      logo_url: formData.logo_url || goldsmith.logo_url,
    });

    setLoading(false);
    if (success) {
      onUpdate();
    }
  };

  return (
    <Card className="glass-dark border-primary/20 shadow-gold">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold-gradient">
          <Settings className="w-5 h-5 text-primary" />
          الملف الشخصي
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>لوجو المحل</Label>
            <div className="flex items-center gap-4">
              {formData.logo_url && (
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className="w-24 h-24 object-cover rounded-lg border border-primary/20"
                />
              )}
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
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
                  ) : formData.logo_url ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {formData.logo_url ? "تغيير اللوجو" : "رفع لوجو"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الصايغ</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop_name">اسم المحل</Label>
              <Input
                id="shop_name"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">العنوان</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <Button type="submit" disabled={loading} className="bg-gold-gradient">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ التغييرات"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
