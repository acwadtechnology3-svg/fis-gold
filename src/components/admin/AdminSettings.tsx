import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useAdminData } from "@/hooks/useAdminData";
import { Settings, Save, Loader2 } from "lucide-react";
import { useActivityLog } from "@/hooks/useActivityLog";

export const AdminSettings = () => {
  const { settings, loading, updateSetting, getSetting } = useSystemSettings();
  const { feeRules, updateFeeRule } = useAdminData();
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

  const handleUpdateFeeRule = async (feeType: string, percentageValue: number) => {
    setSaving(feeType);
    // Convert percentage (e.g. 10) to decimal (0.10)
    const decimalValue = percentageValue / 100;
    const success = await updateFeeRule(feeType, decimalValue);

    if (success) {
      await logActivity(
        "setting_updated",
        "fee_rule",
        null,
        `تم تحديث نسبة رسوم السحب المبكر إلى: ${percentageValue}%`,
        { feeType, value: decimalValue }
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
          <Label htmlFor="withdrawal_fee">نسبة رسوم السحب المبكر (كسر الوديعة) (%)</Label>
          <div className="flex gap-2">
            <Input
              id="withdrawal_fee"
              type="number"
              step="0.1"
              // Convert decimal (0.10) to percentage (10) for display. Default 10%
              defaultValue={((feeRules["forced_withdrawal"] || 0.10) * 100).toFixed(1)}
              onBlur={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0) {
                  handleUpdateFeeRule("forced_withdrawal", value);
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
                  handleUpdateFeeRule("forced_withdrawal", value);
                }
              }}
              disabled={saving === "forced_withdrawal"}
            >
              {saving === "forced_withdrawal" ? (
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
              defaultValue={getSetting("min_deposit_amount") || 100}
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

        {/* Payment Settings Section */}
        <div className="border-t border-primary/20 pt-6 mt-6">
          <h3 className="text-lg font-semibold text-gold-gradient mb-4">إعدادات الدفع</h3>

          {/* Company Wallet Number */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="company_wallet_number">رقم محفظة الشركة للإيداع</Label>
            <p className="text-sm text-muted-foreground">
              رقم المحفظة الذي سيظهر للمستخدمين في صفحة الإيداع
            </p>
            <div className="flex gap-2">
              <Input
                id="company_wallet_number"
                type="text"
                placeholder="01027136059"
                defaultValue={getSetting("company_wallet_number") || "01027136059"}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value) {
                    handleUpdateSetting("company_wallet_number", value);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.getElementById("company_wallet_number") as HTMLInputElement;
                  const value = input.value.trim();
                  if (value) {
                    handleUpdateSetting("company_wallet_number", value);
                  }
                }}
                disabled={saving === "company_wallet_number"}
              >
                {saving === "company_wallet_number" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Company InstaPay Address */}
          <div className="space-y-2">
            <Label htmlFor="company_instapay_address">عنوان InstaPay للشركة</Label>
            <p className="text-sm text-muted-foreground">
              عنوان InstaPay الذي سيظهر للمستخدمين في صفحة الإيداع
            </p>
            <div className="flex gap-2">
              <Input
                id="company_instapay_address"
                type="text"
                placeholder="fisgold@instapay"
                defaultValue={getSetting("company_instapay_address") || "fisgold@instapay"}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value) {
                    handleUpdateSetting("company_instapay_address", value);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.getElementById("company_instapay_address") as HTMLInputElement;
                  const value = input.value.trim();
                  if (value) {
                    handleUpdateSetting("company_instapay_address", value);
                  }
                }}
                disabled={saving === "company_instapay_address"}
              >
                {saving === "company_instapay_address" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
