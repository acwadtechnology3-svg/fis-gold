import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("key", { ascending: true });

    if (error) {
      console.error("Error fetching settings:", error);
      toast.error("حدث خطأ في جلب الإعدادات");
      setLoading(false);
      return;
    }

    const formattedSettings = data?.map((setting) => ({
      ...setting,
      value: setting.value?.value ?? setting.value,
    }));

    setSettings(formattedSettings || []);
    setLoading(false);
  };

  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from("system_settings")
      .update({
        value: typeof value === "object" ? { value } : value,
        updated_at: new Date().toISOString(),
      })
      .eq("key", key);

    if (error) {
      console.error("Error updating setting:", error);
      toast.error("حدث خطأ في تحديث الإعداد");
      return false;
    }

    toast.success("تم تحديث الإعداد بنجاح");
    fetchSettings();
    return true;
  };

  const getSetting = (key: string): any => {
    const setting = settings.find((s) => s.key === key);
    return setting?.value;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    fetchSettings,
    updateSetting,
    getSetting,
  };
};
