import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { toast } from "sonner";
import { Settings, Save, Loader2 } from "lucide-react";
import { useActivityLog } from "@/hooks/useActivityLog";

export const AdminSettings = () => {
  const { settings, loading, updateSetting, getSetting } = useSystemSettings();
  const { logActivity } = useActivityLog();
  const [saving, setSaving] = useState<string | null>(null);

  const handleUpdateSetting = async (key: string, value: any) => {
    setSaving(key);
    const success = await updateSetting(key, value);
    if (success) {
      await logActivity(
        "setting_updated",
        "setting",
        null,
        `تم تحديث الإعداد: ${key}`,
        { key, value }
      );
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-dark border-primary/20 shadow-gold">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold-gradient">
          <Settings className="w-5 h-5 text-primary" />
          إعدادات النظام
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Withdrawal Fee */}
        <div className="space-y-2">
          <Label htmlFor="withdrawal_fee">نسبة رسوم السحب (%)</Label>
          <div className="flex gap-2">
            <Input
              id="withdrawal_fee"
              type="number"
              step="0.1"
              defaultValue={getSetting("withdrawal_fee_percentage") || 2.5}
              onBlur={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0) {
                  handleUpdateSetting("withdrawal_fee_percentage", value);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const input = document.getElementById("withdrawal_fee") as HTMLInputElement;
                const value = parseFloat(input.value);
                if (!isNaN(value) && value >= 0) {
                  handleUpdateSetting("withdrawal_fee_percentage", value);
                }
              }}
              disabled={saving === "withdrawal_fee_percentage"}
            >
              {saving === "withdrawal_fee_percentage" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Min Deposit Amount */}
        <div className="space-y-2">
          <Label htmlFor="min_deposit">الحد الأدنى لمبلغ الإيداع (ج.م)</Label>
          <div className="flex gap-2">
            <Input
              id="min_deposit"
              type="number"
              step="100"
              defaultValue={getSetting("min_deposit_amount") || 2000}
              onBlur={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                  handleUpdateSetting("min_deposit_amount", value);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const input = document.getElementById("min_deposit") as HTMLInputElement;
                const value = parseFloat(input.value);
                if (!isNaN(value) && value > 0) {
                  handleUpdateSetting("min_deposit_amount", value);
                }
              }}
              disabled={saving === "min_deposit_amount"}
            >
              {saving === "min_deposit_amount" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Auto Approve Deposits */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto_approve">الموافقة التلقائية على الإيداعات</Label>
            <p className="text-sm text-muted-foreground">
              الموافقة تلقائياً على جميع طلبات الإيداع
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="auto_approve"
              checked={getSetting("auto_approve_deposits") || false}
              onCheckedChange={(checked) => {
                handleUpdateSetting("auto_approve_deposits", checked);
              }}
              disabled={saving === "auto_approve_deposits"}
            />
            {saving === "auto_approve_deposits" && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email_notifications">إشعارات البريد الإلكتروني</Label>
            <p className="text-sm text-muted-foreground">
              إرسال إشعارات عبر البريد الإلكتروني للمستخدمين
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="email_notifications"
              checked={getSetting("email_notifications") ?? true}
              onCheckedChange={(checked) => {
                handleUpdateSetting("email_notifications", checked);
              }}
              disabled={saving === "email_notifications"}
            />
            {saving === "email_notifications" && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="maintenance_mode">وضع الصيانة</Label>
            <p className="text-sm text-muted-foreground">
              تعطيل الموقع للصيانة (للمستخدمين العاديين فقط)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="maintenance_mode"
              checked={getSetting("maintenance_mode") || false}
              onCheckedChange={(checked) => {
                handleUpdateSetting("maintenance_mode", checked);
              }}
              disabled={saving === "maintenance_mode"}
            />
            {saving === "maintenance_mode" && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
