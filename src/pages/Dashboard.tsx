import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolio } from "@/hooks/usePortfolio";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PortfolioStats from "@/components/dashboard/PortfolioStats";
import MetalPricesCard from "@/components/dashboard/MetalPricesCard";
import WalletCard from "@/components/dashboard/WalletCard";
import InvestmentLogs from "@/components/dashboard/InvestmentLogs";
import DepositsTable from "@/components/dashboard/DepositsTable";
import WithdrawalsTable from "@/components/dashboard/WithdrawalsTable";
import NewDepositDialog from "@/components/dashboard/NewDepositDialog";
import NewWithdrawalDialog from "@/components/dashboard/NewWithdrawalDialog";
import BuyGoldDialog from "@/components/dashboard/BuyGoldDialog";
import SellAssetDialog from "@/components/dashboard/SellAssetDialog";
import TermsDialog from "@/components/dashboard/TermsDialog";
import GoldParticles from "@/components/GoldParticles";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Minus, Coins } from "lucide-react";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { deposits, withdrawals, summary, walletBalance, isLoading, refetchAll } = usePortfolio();

  const [termsOpen, setTermsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [buyGoldOpen, setBuyGoldOpen] = useState(false);
  const [sellAssetOpen, setSellAssetOpen] = useState(false);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);

  const [actionType, setActionType] = useState<"buy" | "sell">("buy");
  const [selectedMetal, setSelectedMetal] = useState<"gold" | "silver">("gold");

  const handleBuyClick = (metal: "gold" | "silver") => {
    setActionType("buy");
    setSelectedMetal(metal);
    setTermsOpen(true);
  };

  const handleSellClick = (metal: "gold" | "silver") => {
    setActionType("sell");
    setSelectedMetal(metal);
    setTermsOpen(true);
  };

  const handleTermsAccept = () => {
    setTermsOpen(false);
    if (actionType === "buy") {
      setBuyGoldOpen(true);
    } else {
      // Changed to use instant sell dialog
      setSellAssetOpen(true);
    }
  };

  // Allow direct withdrawal (cash) without terms? Or create button for it?
  // Existing "Sell" button was confusingly mapped to Withdrawal.
  // I'll keep NewWithdrawalDialog access for actual cash withdrawals via a new button or just keep it accessible via side?
  // User asked for "Buy/Sell Gold/Silver".
  // I'll add "Cash Withdrawal" button separately maybe? Or just leave it out for now as user didn't explicitly ask for "Cash Withdrawal" button change, just "Buy/Sell Silver".
  // But since I hijacked "Sell" to mean "Trade Sell", user might lose access to "Withdraw Funds".
  // I should add a "Withdraw Funds" button or rename the "Sell" button?
  // The header has "Deposit" (Plus icon). Maybe "Withdraw" (Minus icon) next to it?
  // Current header: [Deposit] [Buy Gold] [Sell Gold]
  // New Header: [Deposit] [Withdraw] -- [Buy Gold] [Sell Gold] -- [Buy Silver] [Sell Silver]

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
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                إيداع نقدية
              </Button>
              <Button onClick={() => setWithdrawalOpen(true)} variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                <Minus className="h-4 w-4 ml-2" />
                سحب نقدية
              </Button>
            </div>
          </div>

          {/* Trading Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={() => handleBuyClick('gold')} className="bg-gold-gradient hover:bg-gold-gradient-hover text-black shadow-gold font-bold transition-all hover:scale-105 h-12">
              <Plus className="h-4 w-4 ml-2" />
              شراء ذهب
            </Button>
            <Button onClick={() => handleSellClick('gold')} className="bg-destructive hover:bg-destructive/90 text-white shadow-lg font-bold transition-all hover:scale-105 h-12">
              <Coins className="h-4 w-4 ml-2" />
              بيع ذهب
            </Button>

            <Button onClick={() => handleBuyClick('silver')} className="bg-zinc-300 hover:bg-zinc-200 text-black shadow-lg font-bold transition-all hover:scale-105 h-12 border border-zinc-400">
              <Plus className="h-4 w-4 ml-2" />
              شراء فضة
            </Button>
            <Button onClick={() => handleSellClick('silver')} className="bg-zinc-700 hover:bg-zinc-600 text-white shadow-lg font-bold transition-all hover:scale-105 h-12 border border-zinc-600">
              <Coins className="h-4 w-4 ml-2" />
              بيع فضة
            </Button>
          </div>
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
        <NewWithdrawalDialog
          open={withdrawalOpen}
          onOpenChange={setWithdrawalOpen}
          onSuccess={refetchAll}
        />

        <BuyGoldDialog
          open={buyGoldOpen}
          onOpenChange={setBuyGoldOpen}
          onSuccess={refetchAll}
          metalType={selectedMetal}
        />

        <SellAssetDialog
          open={sellAssetOpen}
          onOpenChange={setSellAssetOpen}
          onSuccess={refetchAll}
          metalType={selectedMetal}
        />

        {/* Wallet + Metal Prices Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <WalletCard balance={walletBalance} isLoading={isLoading} />
          <MetalPricesCard />
        </div>

        {/* Portfolio Stats Row */}
        <div className="mb-8">
          <PortfolioStats summary={summary} isLoading={isLoading} />
        </div>

        {/* Investment Logs */}
        <div className="mb-8">
          <InvestmentLogs deposits={deposits} isLoading={isLoading} />
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
