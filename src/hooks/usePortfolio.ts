import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryClient";

export interface Deposit {
  id: string;
  amount: number;
  package_type: string;
  payment_method: string | null;
  status: string;
  gold_grams: number | null;
  gold_price_at_deposit: number | null;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface Withdrawal {
  id: string;
  amount: number;
  withdrawal_type: string;
  grams: number | null;
  status: string;
  gold_price_at_withdrawal: number | null;
  fee_percentage: number | null;
  fee_amount: number | null;
  net_amount: number | null;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface PortfolioSummary {
  total_invested: number;
  total_gold_grams: number;
  pending_deposits: number;
  approved_deposits: number;
  pending_withdrawals: number;
  completed_withdrawals: number;
}

/**
 * Cache-aside pattern for portfolio data:
 * - User-specific data cached per user
 * - Cache stays fresh for 1 minute
 * - Automatically refetches when data becomes stale
 */
export const usePortfolio = () => {
  const { user } = useAuth();

  const depositsQuery = useQuery({
    queryKey: queryKeys.deposits(user?.id || ''),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Deposit[];
    },
    enabled: !!user,
    staleTime: 60 * 1000, // Fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const withdrawalsQuery = useQuery({
    queryKey: queryKeys.withdrawals(user?.id || ''),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Withdrawal[];
    },
    enabled: !!user,
    staleTime: 60 * 1000, // Fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.portfolioSummary(user?.id || ''),
    queryFn: async () => {
      if (!user) return null;
      try {
        const { data, error } = await supabase
          .rpc("get_user_portfolio", { p_user_id: user.id });

        if (error) {
          console.error("Portfolio RPC error:", error);
          // Return default values if RPC fails
          return {
            total_invested: 0,
            total_gold_grams: 0,
            pending_deposits: 0,
            approved_deposits: 0,
            pending_withdrawals: 0,
            completed_withdrawals: 0,
          } as PortfolioSummary;
        }
        return data?.[0] as PortfolioSummary | null;
      } catch (err) {
        console.error("Portfolio fetch error:", err);
        return {
          total_invested: 0,
          total_gold_grams: 0,
          pending_deposits: 0,
          approved_deposits: 0,
          pending_withdrawals: 0,
          completed_withdrawals: 0,
        } as PortfolioSummary;
      }
    },
    enabled: !!user,
    staleTime: 60 * 1000, // Fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  return {
    deposits: depositsQuery.data ?? [],
    withdrawals: withdrawalsQuery.data ?? [],
    summary: summaryQuery.data,
    isLoading: depositsQuery.isLoading || withdrawalsQuery.isLoading || summaryQuery.isLoading,
    refetchAll: () => {
      depositsQuery.refetch();
      withdrawalsQuery.refetch();
      summaryQuery.refetch();
    },
  };
};
