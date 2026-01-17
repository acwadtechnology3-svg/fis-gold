import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminData } from "@/hooks/useAdminData";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminDepositsTable } from "@/components/admin/AdminDepositsTable";
import { AdminWithdrawalsTable } from "@/components/admin/AdminWithdrawalsTable";
import { AdminMetalPrices } from "@/components/admin/AdminMetalPrices";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminActivityLog } from "@/components/admin/AdminActivityLog";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminFilters, FilterState } from "@/components/admin/AdminFilters";
import { AdminGoldsmiths } from "@/components/admin/AdminGoldsmiths";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminBanners } from "@/components/admin/AdminBanners";
import { AdminPartners } from "@/components/admin/AdminPartners";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminBuyRequestsTable } from "@/components/admin/AdminBuyRequestsTable";
import { AdminChat } from "@/components/admin/AdminChat";
import MetalPricesCard from "@/components/dashboard/MetalPricesCard";
import GoldParticles from "@/components/GoldParticles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldX } from "lucide-react";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    isAdmin,
    loading,
    users,
    deposits,
    withdrawals,
    approveDeposit,
    rejectDeposit,
    approveWithdrawal,
    rejectWithdrawal,
    updateUserProfile,
    grantUserRole,
    revokeUserRole,
    getUserPortfolio,
    adjustUserWallet,
    pendingBuys,
    approveBuyRequest,
    rejectBuyRequest,
  } = useAdminData();

  const [depositFilters, setDepositFilters] = useState<FilterState>({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
  });

  const [withdrawalFilters, setWithdrawalFilters] = useState<FilterState>({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
  });

  const [userFilters, setUserFilters] = useState<FilterState>({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
  });

  // Filter deposits
  const filteredDeposits = useMemo(() => {
    return deposits.filter((deposit) => {
      if (depositFilters.status !== "all" && deposit.status !== depositFilters.status) {
        return false;
      }
      if (depositFilters.search) {
        const searchLower = depositFilters.search.toLowerCase();
        if (
          !deposit.user_name?.toLowerCase().includes(searchLower) &&
          !deposit.amount.toString().includes(searchLower)
        ) {
          return false;
        }
      }
      if (depositFilters.dateFrom) {
        if (new Date(deposit.created_at) < new Date(depositFilters.dateFrom)) {
          return false;
        }
      }
      if (depositFilters.dateTo) {
        if (new Date(deposit.created_at) > new Date(depositFilters.dateTo)) {
          return false;
        }
      }
      if (depositFilters.minAmount) {
        if (deposit.amount < parseFloat(depositFilters.minAmount)) {
          return false;
        }
      }
      if (depositFilters.maxAmount) {
        if (deposit.amount > parseFloat(depositFilters.maxAmount)) {
          return false;
        }
      }
      return true;
    });
  }, [deposits, depositFilters]);

  // Filter withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((withdrawal) => {
      if (withdrawalFilters.status !== "all" && withdrawal.status !== withdrawalFilters.status) {
        return false;
      }
      if (withdrawalFilters.search) {
        const searchLower = withdrawalFilters.search.toLowerCase();
        if (
          !withdrawal.user_name?.toLowerCase().includes(searchLower) &&
          !withdrawal.amount.toString().includes(searchLower)
        ) {
          return false;
        }
      }
      if (withdrawalFilters.dateFrom) {
        if (new Date(withdrawal.created_at) < new Date(withdrawalFilters.dateFrom)) {
          return false;
        }
      }
      if (withdrawalFilters.dateTo) {
        if (new Date(withdrawal.created_at) > new Date(withdrawalFilters.dateTo)) {
          return false;
        }
      }
      if (withdrawalFilters.minAmount) {
        if (withdrawal.amount < parseFloat(withdrawalFilters.minAmount)) {
          return false;
        }
      }
      if (withdrawalFilters.maxAmount) {
        if (withdrawal.amount > parseFloat(withdrawalFilters.maxAmount)) {
          return false;
        }
      }
      return true;
    });
  }, [withdrawals, withdrawalFilters]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldX className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">غير مصرح لك بالوصول</h1>
        <p className="text-muted-foreground">ليس لديك صلاحية الوصول إلى لوحة تحكم الأدمن</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero-pattern relative" dir="rtl">
      <GoldParticles />
      <AdminHeader />

      <main className="container mx-auto py-6 px-4 space-y-6 relative z-10">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-12 max-w-6xl overflow-x-auto">
            <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
            <TabsTrigger value="deposits">الإيداعات</TabsTrigger>
            <TabsTrigger value="withdrawals">السحوبات</TabsTrigger>
            <TabsTrigger value="buy_requests">طلبات الشراء</TabsTrigger>
            <TabsTrigger value="users">المستخدمين</TabsTrigger>
            <TabsTrigger value="chat">المحادثات</TabsTrigger>
            <TabsTrigger value="goldsmiths">الصايغين</TabsTrigger>
            <TabsTrigger value="products">المنتجات</TabsTrigger>
            <TabsTrigger value="prices">أسعار المعادن</TabsTrigger>
            <TabsTrigger value="reports">التقارير</TabsTrigger>
            <TabsTrigger value="banners">البنرات</TabsTrigger>
            <TabsTrigger value="partners">الشركاء</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <AdminDashboard users={users} deposits={deposits} withdrawals={withdrawals} />
          </TabsContent>

          <TabsContent value="buy_requests" className="mt-6 space-y-4">
            <h2 className="text-xl font-bold mb-4">طلبات شراء الذهب/الفضة المعلقة</h2>
            {/* We need to import AdminBuyRequestsTable. Since I cannot add import in this hunk easily, 
                 I will add it in a separate hunk. For now using placeholder or assuming auto import if I could.
                 Wait, I can't assume auto import. I need to modify imports first.
                 I'll add the content here and fix imports in next step.
             */}
            <AdminBuyRequestsTable
              pendingBuys={pendingBuys}
              onApprove={approveBuyRequest}
              onReject={rejectBuyRequest}
            />
          </TabsContent>

          <TabsContent value="deposits" className="mt-6 space-y-4">
            <AdminFilters type="deposits" onFilterChange={setDepositFilters} />
            <AdminDepositsTable
              deposits={filteredDeposits}
              onApprove={approveDeposit}
              onReject={rejectDeposit}
            />
          </TabsContent>

          <TabsContent value="withdrawals" className="mt-6 space-y-4">
            <AdminFilters type="withdrawals" onFilterChange={setWithdrawalFilters} />
            <AdminWithdrawalsTable
              withdrawals={filteredWithdrawals}
              onApprove={approveWithdrawal}
              onReject={rejectWithdrawal}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-6 space-y-4">
            <AdminFilters type="users" onFilterChange={setUserFilters} />
            <AdminUserManagement
              users={users}
              onUpdateUser={updateUserProfile}
              onGrantRole={grantUserRole}
              onRevokeRole={revokeUserRole}
              onGetPortfolio={getUserPortfolio}
              onAdjustWallet={adjustUserWallet}
            />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <AdminChat />
          </TabsContent>

          <TabsContent value="goldsmiths" className="mt-6">
            <AdminGoldsmiths />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <AdminProducts />
          </TabsContent>

          <TabsContent value="prices" className="mt-6">
            <AdminMetalPrices />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <AdminReports deposits={deposits} withdrawals={withdrawals} />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <AdminActivityLog />
          </TabsContent>

          <TabsContent value="banners" className="mt-6">
            <AdminBanners />
          </TabsContent>

          <TabsContent value="partners" className="mt-6">
            <AdminPartners />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
