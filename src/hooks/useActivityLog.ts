import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user_name?: string;
}

export const useActivityLog = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async (limit: number = 100) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching activity log:", error);
      setLoading(false);
      return;
    }

    // Get user names for activities
    const userIds = [...new Set(data?.map((a) => a.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const activitiesWithNames = data?.map((activity) => {
      const profile = profiles?.find((p) => p.user_id === activity.user_id);
      return {
        ...activity,
        user_name: profile?.full_name || "غير معروف",
      };
    });

    setActivities(activitiesWithNames || []);
    setLoading(false);
  };

  const logActivity = async (
    actionType: string,
    entityType: string,
    entityId: string | null = null,
    description: string | null = null,
    metadata: Record<string, any> | null = null
  ) => {
    const { error } = await supabase.rpc("log_admin_activity", {
      p_action_type: actionType,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_description: description,
      p_metadata: metadata,
    });

    if (error) {
      console.error("Error logging activity:", error);
      return false;
    }

    // Refresh activities
    fetchActivities();
    return true;
  };

  // Don't auto-fetch - let components fetch when needed
  // useEffect(() => {
  //   if (user) {
  //     fetchActivities();
  //   }
  // }, [user]);

  return {
    activities,
    loading,
    fetchActivities,
    logActivity,
  };
};
