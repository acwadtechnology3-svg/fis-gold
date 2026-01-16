import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  is_active?: boolean;
  roles?: string[];
}

export interface AdminDeposit {
  id: string;
  user_id: string;
  amount: number;
  package_type: string;
  payment_method: string | null;
  payment_proof_url: string | null;
  gold_grams: number | null;
  gold_price_at_deposit: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  user_email?: string;
  user_name?: string;
  provider?: string;
}

export interface AdminWithdrawal {
  id: string;
  user_id: string;
  deposit_id: string | null;
  amount: number;
  withdrawal_type: string;
  grams?: number | null;
  gold_price_at_withdrawal: number | null;
  fee_percentage: number | null;
  fee_amount: number | null;
  net_amount: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  user_email?: string;
  user_name?: string;
  user_phone?: string;
}

export const useAdminData = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data State
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [pendingBuys, setPendingBuys] = useState<any[]>([]);
  const [feeRules, setFeeRules] = useState<Record<string, number>>({});

  const checkAdminRole = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    } else {
      setIsAdmin(!!data);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const userIds: string[] = [];
    const [profilesResult, rolesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_roles")
        .select("user_id, role")
    ]);

    if (profilesResult.error) {
      console.error("Error fetching users:", profilesResult.error);
      return;
    }

    const profiles = profilesResult.data || [];
    const userRoles = rolesResult.data || [];

    const rolesByUserId = new Map<string, string[]>();
    userRoles.forEach((ur) => {
      if (!rolesByUserId.has(ur.user_id)) {
        rolesByUserId.set(ur.user_id, []);
      }
      rolesByUserId.get(ur.user_id)!.push(ur.role);
    });

    const usersData: UserWithProfile[] = profiles.map((profile) => ({
      id: profile.id,
      email: profile.email || "",
      created_at: profile.created_at,
      full_name: profile.full_name,
      phone: profile.phone,
      is_active: profile.is_active ?? true,
      roles: rolesByUserId.get(profile.id) || [],
    }));

    setUsers(usersData);
  };

  const fetchDeposits = async () => {
    const [depositsResult, profilesResult] = await Promise.all([
      supabase
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name")
    ]);

    if (depositsResult.error) {
      console.error("Error fetching deposits:", depositsResult.error);
      return;
    }

    const data = (depositsResult.data || []) as any[];
    const profiles = profilesResult.data || [];

    const profilesMap = new Map(profiles.map((p) => [p.id, p.full_name]));

    const depositsWithUsers = data.map((deposit) => ({
      ...deposit,
      user_name: profilesMap.get(deposit.user_id) || "غير معروف",
    }));

    setDeposits(depositsWithUsers);
  };

  const fetchWithdrawals = async () => {
    const [withdrawalsResult, profilesResult] = await Promise.all([
      supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, phone")
    ]);

    if (withdrawalsResult.error) {
      console.error("Error fetching withdrawals:", withdrawalsResult.error);
      return;
    }

    const data = (withdrawalsResult.data || []) as any[];
    const profiles = profilesResult.data || [];

    const profilesMap = new Map(profiles.map((p) => [p.id, p.full_name]));

    const withdrawalsWithUsers = data.map((withdrawal) => ({
      ...withdrawal,
      user_name: profilesMap.get(withdrawal.user_id) || "غير معروف",
      user_phone: (profiles.find(p => p.id === withdrawal.user_id) as any)?.phone || null,
    }));

    setWithdrawals(withdrawalsWithUsers);
  };

  const fetchFeeRules = async () => {
    const { data, error } = await (supabase
      .from("fee_rules" as any) as any)
      .select("fee_type, percent");

    if (error) {
      console.error("Error fetching fee rules:", error);
      return;
    }

    const rules: Record<string, number> = {};
    data.forEach((rule: any) => {
      rules[rule.fee_type] = rule.percent;
    });
    setFeeRules(rules);
  };

  const fetchPendingBuys = async () => {
    const [buysResult, profilesResult] = await Promise.all([
      supabase
        .from("gold_positions" as any)
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
    ]);

    if (buysResult.error) {
      console.error("Error fetching pending buys:", buysResult.error);
      return;
    }

    const buys = buysResult.data || [];
    const profiles = profilesResult.data || [];
    const profilesMap = new Map(profiles.map(p => [p.id, p]));

    const buysWithProfiles = buys.map(buy => ({
      ...buy,
      profiles: profilesMap.get(buy.user_id) || { full_name: 'مستخدم غير معروف', email: '' }
    }));

    setPendingBuys(buysWithProfiles);
  };

  const updateFeeRule = async (feeType: string, feePercent: number) => {
    const { error } = await (supabase
      .from("fee_rules" as any) as any)
      .update({ percent: feePercent })
      .eq("fee_type", feeType);

    if (error) {
      toast.error("حدث خطأ في تحديث نسبة الرسوم");
      return false;
    }

    toast.success("تم تحديث نسبة الرسوم بنجاح");
    fetchFeeRules();
    return true;
  };

  const approveDeposit = async (depositId: string) => {
    const deposit = deposits.find((d) => d.id === depositId);

    const { error } = await supabase
      .from("deposits")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", depositId);

    if (error) {
      toast.error("حدث خطأ في الموافقة على الإيداع");
      return false;
    }

    await supabase.rpc("log_admin_activity", {
      p_action_type: "deposit_approved",
      p_entity_type: "deposit",
      p_entity_id: depositId,
      p_description: `تمت الموافقة على إيداع بقيمة ${deposit?.amount} ج.م - تم إضافة المبلغ للمحفظة`,
      p_metadata: { amount: deposit?.amount },
    });

    toast.success("تمت الموافقة على الإيداع وإضافة المبلغ للمحفظة");
    fetchDeposits();
    return true;
  };

  const rejectDeposit = async (depositId: string, notes: string) => {
    const deposit = deposits.find((d) => d.id === depositId);

    const { error } = await supabase
      .from("deposits")
      .update({
        status: "rejected",
        notes,
      })
      .eq("id", depositId);

    if (error) {
      toast.error("حدث خطأ في رفض الإيداع");
      return false;
    }

    await supabase.rpc("log_admin_activity", {
      p_action_type: "deposit_rejected",
      p_entity_type: "deposit",
      p_entity_id: depositId,
      p_description: `تم رفض إيداع بقيمة ${deposit?.amount} ج.م`,
      p_metadata: { notes },
    });

    toast.success("تم رفض الإيداع");
    fetchDeposits();
    return true;
  };

  const approveWithdrawal = async (withdrawalId: string, proofImageUrl?: string) => {
    const withdrawal = withdrawals.find((w) => w.id === withdrawalId);

    const { data: success, error } = await supabase.rpc('approve_withdrawal_request', {
      p_withdrawal_id: withdrawalId,
      p_admin_id: user?.id
    });

    if (error || !success) {
      console.error("Error approving withdrawal:", error);
      toast.error("حدث خطأ في الموافقة على السحب");
      return false;
    }

    if (proofImageUrl) {
      const { error: updateError } = await supabase
        .from("withdrawals")
        .update({ proof_image: proofImageUrl } as any)
        .eq("id", withdrawalId);

      if (updateError) {
        console.error("Error updating proof image:", updateError);
        toast.error("تم الموافقة ولكن فشل حفظ صورة الإثبات");
      }
    }

    await supabase.rpc("log_admin_activity", {
      p_action_type: "withdrawal_approved",
      p_entity_type: "withdrawal",
      p_entity_id: withdrawalId,
      p_description: `تمت الموافقة على سحب بقيمة ${withdrawal?.amount} ج.م`,
      p_metadata: { net_amount: withdrawal?.net_amount },
    });

    toast.success("تمت الموافقة على السحب بنجاح");
    fetchWithdrawals();
    return true;
  };

  const rejectWithdrawal = async (withdrawalId: string, notes: string) => {
    const withdrawal = withdrawals.find((w) => w.id === withdrawalId);

    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: "rejected",
        notes,
      })
      .eq("id", withdrawalId);

    if (error) {
      toast.error("حدث خطأ في رفض السحب");
      return false;
    }

    await supabase.rpc("log_admin_activity", {
      p_action_type: "withdrawal_rejected",
      p_entity_type: "withdrawal",
      p_entity_id: withdrawalId,
      p_description: `تم رفض سحب بقيمة ${withdrawal?.amount} ج.م`,
      p_metadata: { notes },
    });

    toast.success("تم رفض السحب");
    fetchWithdrawals();
    return true;
  };

  const approveBuyRequest = async (positionId: string) => {
    const { data: success, error } = await supabase.rpc('approve_buy_request', {
      p_position_id: positionId,
      p_admin_id: user?.id
    });

    if (error || !success) {
      console.error("Error approving buy request:", error);
      toast.error("حدث خطأ في الموافقة على الطلب");
      return false;
    }

    toast.success("تمت الموافقة على طلب الشراء");
    fetchPendingBuys();
    return true;
  };

  const rejectBuyRequest = async (positionId: string) => {
    const { error } = await supabase.from('gold_positions' as any).delete().eq('id', positionId).eq('status', 'pending');

    if (error) {
      toast.error("خطأ في رفض الطلب");
      return false;
    }

    toast.success("تم رفض الطلب");
    fetchPendingBuys();
    return true;
  };

  const updateUserProfile = async (
    userId: string,
    updates: { full_name?: string; phone?: string; is_active?: boolean }
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      toast.error("حدث خطأ في تحديث بيانات المستخدم");
      return false;
    }

    toast.success("تم تحديث بيانات المستخدم بنجاح");
    fetchUsers();
    return true;
  };

  const grantUserRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

    if (error) {
      toast.error("حدث خطأ في منح الصلاحية");
      return false;
    }

    toast.success("تم منح الصلاحية بنجاح");
    fetchUsers();
    return true;
  };

  const revokeUserRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);

    if (error) {
      toast.error("حدث خطأ في إلغاء الصلاحية");
      return false;
    }

    toast.success("تم إلغاء الصلاحية بنجاح");
    fetchUsers();
    return true;
  };

  const getUserPortfolio = async (userId: string) => {
    const { data, error } = await supabase.rpc("get_user_portfolio_admin", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching user portfolio:", error);
      return null;
    }

    return data?.[0] || null;
  };

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      Promise.all([fetchUsers(), fetchDeposits(), fetchWithdrawals(), fetchFeeRules(), fetchPendingBuys()]);
    }
  }, [isAdmin]);

  return {
    isAdmin,
    loading,
    users,
    deposits,
    withdrawals,
    pendingBuys,
    feeRules,

    // Actions
    approveDeposit,
    rejectDeposit,
    approveWithdrawal,
    rejectWithdrawal,
    approveBuyRequest,
    rejectBuyRequest,
    updateFeeRule,

    // User Mgmt
    updateUserProfile,
    grantUserRole,
    revokeUserRole,
    getUserPortfolio,

    // Refresh
    refetchDeposits: fetchDeposits,
    refetchWithdrawals: fetchWithdrawals,
    refetchUsers: fetchUsers,
    refetchPendingBuys: fetchPendingBuys,
  };
};
