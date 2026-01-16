import { Card, CardContent } from "@/components/ui/card";
import { Wallet, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { PortfolioSummary } from "@/hooks/usePortfolio";

interface PortfolioStatsProps {
  summary: PortfolioSummary | null | undefined;
  isLoading: boolean;
}

const PortfolioStats = ({ summary, isLoading }: PortfolioStatsProps) => {
  const stats = [
    {
      title: "إجمالي الاستثمار",
      value: summary?.total_invested ?? 0,
      suffix: "ج.م",
      icon: Wallet,
      isGold: true,
    },
    {
      title: "الذهب المملوك",
      value: summary?.total_gold_grams ?? 0,
      suffix: "جرام",
      icon: TrendingUp,
      isGold: true,
    },
    {
      title: "إيداعات معلقة",
      value: summary?.pending_deposits ?? 0,
      suffix: "",
      icon: Clock,
      isGold: false,
    },
    {
      title: "إيداعات مؤكدة",
      value: summary?.approved_deposits ?? 0,
      suffix: "",
      icon: CheckCircle,
      isGold: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="glass-dark border-primary/20 hover:border-primary/40 transition-colors shadow-gold">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                {isLoading ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold text-gold-gradient">
                    {(stat.value ?? 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })}
                    {stat.suffix && <span className="text-sm font-normal text-muted-foreground mr-1">{stat.suffix}</span>}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${stat.isGold ? 'bg-gold-gradient' : 'bg-secondary'}`}>
                <stat.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PortfolioStats;
