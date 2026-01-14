import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminDeposit, AdminWithdrawal } from "./useAdminData";

export interface ReportData {
  totalDeposits: number;
  totalWithdrawals: number;
  netProfit: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  approvedDeposits: number;
  completedWithdrawals: number;
  depositsByDate: { date: string; amount: number; count: number }[];
  withdrawalsByDate: { date: string; amount: number; count: number }[];
  depositsByStatus: { status: string; count: number; total: number }[];
  withdrawalsByStatus: { status: string; count: number; total: number }[];
}

export const useAdminReports = (
  deposits: AdminDeposit[],
  withdrawals: AdminWithdrawal[]
) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = (startDate?: Date, endDate?: Date) => {
    setLoading(true);

    let filteredDeposits = deposits;
    let filteredWithdrawals = withdrawals;

    if (startDate && endDate) {
      filteredDeposits = deposits.filter(
        (d) =>
          new Date(d.created_at) >= startDate &&
          new Date(d.created_at) <= endDate
      );
      filteredWithdrawals = withdrawals.filter(
        (w) =>
          new Date(w.created_at) >= startDate &&
          new Date(w.created_at) <= endDate
      );
    }

    const totalDeposits = filteredDeposits
      .filter((d) => d.status === "approved")
      .reduce((sum, d) => sum + d.amount, 0);

    const totalWithdrawals = filteredWithdrawals
      .filter((w) => w.status === "completed")
      .reduce((sum, w) => sum + (w.net_amount || w.amount), 0);

    const netProfit = totalDeposits - totalWithdrawals;

    const pendingDeposits = filteredDeposits.filter(
      (d) => d.status === "pending"
    ).length;

    const pendingWithdrawals = filteredWithdrawals.filter(
      (w) => w.status === "pending"
    ).length;

    const approvedDeposits = filteredDeposits.filter(
      (d) => d.status === "approved"
    ).length;

    const completedWithdrawals = filteredWithdrawals.filter(
      (w) => w.status === "completed"
    ).length;

    // Group by date
    const depositsByDateMap = new Map<string, { amount: number; count: number }>();
    filteredDeposits.forEach((d) => {
      const date = new Date(d.created_at).toISOString().split("T")[0];
      const existing = depositsByDateMap.get(date) || { amount: 0, count: 0 };
      depositsByDateMap.set(date, {
        amount: existing.amount + (d.status === "approved" ? d.amount : 0),
        count: existing.count + 1,
      });
    });

    const withdrawalsByDateMap = new Map<string, { amount: number; count: number }>();
    filteredWithdrawals.forEach((w) => {
      const date = new Date(w.created_at).toISOString().split("T")[0];
      const existing = withdrawalsByDateMap.get(date) || { amount: 0, count: 0 };
      withdrawalsByDateMap.set(date, {
        amount: existing.amount + (w.status === "completed" ? w.net_amount || w.amount : 0),
        count: existing.count + 1,
      });
    });

    const depositsByDate = Array.from(depositsByDateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const withdrawalsByDate = Array.from(withdrawalsByDateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by status
    const depositsByStatusMap = new Map<string, { count: number; total: number }>();
    filteredDeposits.forEach((d) => {
      const existing = depositsByStatusMap.get(d.status) || { count: 0, total: 0 };
      depositsByStatusMap.set(d.status, {
        count: existing.count + 1,
        total: existing.total + d.amount,
      });
    });

    const withdrawalsByStatusMap = new Map<string, { count: number; total: number }>();
    filteredWithdrawals.forEach((w) => {
      const existing = withdrawalsByStatusMap.get(w.status) || { count: 0, total: 0 };
      withdrawalsByStatusMap.set(w.status, {
        count: existing.count + 1,
        total: existing.total + (w.net_amount || w.amount),
      });
    });

    const depositsByStatus = Array.from(depositsByStatusMap.entries()).map(
      ([status, data]) => ({ status, ...data })
    );

    const withdrawalsByStatus = Array.from(withdrawalsByStatusMap.entries()).map(
      ([status, data]) => ({ status, ...data })
    );

    setReportData({
      totalDeposits,
      totalWithdrawals,
      netProfit,
      pendingDeposits,
      pendingWithdrawals,
      approvedDeposits,
      completedWithdrawals,
      depositsByDate,
      withdrawalsByDate,
      depositsByStatus,
      withdrawalsByStatus,
    });

    setLoading(false);
  };

  useEffect(() => {
    if (deposits.length > 0 || withdrawals.length > 0) {
      generateReport();
    }
  }, [deposits, withdrawals]);

  return {
    reportData,
    loading,
    generateReport,
  };
};
