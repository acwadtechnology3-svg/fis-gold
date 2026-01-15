import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PortfolioStats from "@/components/dashboard/PortfolioStats";
import MetalPricesCard from "@/components/dashboard/MetalPricesCard";
import DepositsTable from "@/components/dashboard/DepositsTable";
import WithdrawalsTable from "@/components/dashboard/WithdrawalsTable";
import NewDepositDialog from "@/components/dashboard/NewDepositDialog";
import NewWithdrawalDialog from "@/components/dashboard/NewWithdrawalDialog";
import BuyGoldDialog from "@/components/dashboard/BuyGoldDialog";
import TermsDialog from "@/components/dashboard/TermsDialog";
import GoldParticles from "@/components/GoldParticles";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Minus } from "lucide-react";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { deposits, withdrawals, summary, isLoading, refetchAll } = usePortfolio();

  const [termsOpen, setTermsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [buyGoldOpen, setBuyGoldOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [actionType, setActionType] = useState<"buy" | "sell">("buy");

  const handleBuyClick = () => {
    setActionType("buy");
    setTermsOpen(true);
  };

  const handleSellClick = () => {
    setActionType("sell");
    setTermsOpen(true);
  };

  const handleTermsAccept = () => {
    setTermsOpen(false);
    if (actionType === "buy") {
      setBuyGoldOpen(true);
    } else {
      setWithdrawalOpen(true);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-hero-pattern relative">
      <GoldParticles />
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gold-gradient">
              لوحة التحكم
            </h1>
            <p className="text-muted-foreground mt-1">
              مرحباً بك في محفظتك الاستثمارية
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setDepositOpen(true)} variant="outline" className="border-primary text-primary hover:bg-primary/10">
              <Plus className="h-4 w-4 ml-2" />
              شحن المحفظة
            </Button>
            <Button onClick={handleBuyClick} className="bg-gold-gradient hover:bg-gold-gradient-hover text-black shadow-gold font-bold transition-all hover:scale-105">
              <Plus className="h-4 w-4 ml-2" />
              شراء ذهب
            </Button>
            <Button onClick={handleSellClick} className="bg-destructive hover:bg-destructive/90 text-white shadow-lg font-bold transition-all hover:scale-105">
              <Minus className="h-4 w-4 ml-2" />
              بيع ذهب
            </Button>
          </div>

          <TermsDialog
            open={termsOpen}
            onOpenChange={setTermsOpen}
            onAccept={handleTermsAccept}
            actionType={actionType}
          />
          <NewDepositDialog
            open={depositOpen}
            onOpenChange={setDepositOpen}
            onSuccess={refetchAll}
            showTrigger={false}
          />
          <BuyGoldDialog
            open={buyGoldOpen}
            onOpenChange={setBuyGoldOpen}
            onSuccess={refetchAll}
          />
          <NewWithdrawalDialog
            open={withdrawalOpen}
            onOpenChange={setWithdrawalOpen}
            onSuccess={refetchAll}
          />
        </div>

        {/* Metal Prices + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PortfolioStats summary={summary} isLoading={isLoading} />
          </div>
          <div>
            <MetalPricesCard />
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DepositsTable deposits={deposits} isLoading={isLoading} />
          <WithdrawalsTable withdrawals={withdrawals} isLoading={isLoading} />
        </div>
      </main >
    </div >
  );
};

export default Dashboard;
