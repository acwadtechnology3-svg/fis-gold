import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminReports, ReportData } from "@/hooks/useAdminReports";
import { AdminDeposit, AdminWithdrawal } from "@/hooks/useAdminData";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Download, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminReportsProps {
  deposits: AdminDeposit[];
  withdrawals: AdminWithdrawal[];
}

const COLORS = ["#f59e0b", "#ef4444", "#10b981", "#3b82f6"];

export const AdminReports = ({ deposits, withdrawals }: AdminReportsProps) => {
  const { reportData, loading, generateReport } = useAdminReports(deposits, withdrawals);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleGenerateReport = () => {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    generateReport(start, end);
  };

  const handleExport = () => {
    if (!reportData) return;

    const data = {
      summary: {
        totalDeposits: reportData.totalDeposits,
        totalWithdrawals: reportData.totalWithdrawals,
        netProfit: reportData.netProfit,
      },
      depositsByDate: reportData.depositsByDate,
      withdrawalsByDate: reportData.withdrawalsByDate,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  if (loading || !reportData) {
    return (
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">جاري تحميل التقارير...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الإيداعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold-gradient">
              {reportData.totalDeposits.toLocaleString("ar-EG")} ج.م
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي السحوبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {reportData.totalWithdrawals.toLocaleString("ar-EG")} ج.م
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              صافي الربح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                reportData.netProfit >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {reportData.netProfit.toLocaleString("ar-EG")} ج.م
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              طلبات معلقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {reportData.pendingDeposits + reportData.pendingWithdrawals}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold-gradient">
            <Calendar className="w-5 h-5 text-primary" />
            فلترة حسب التاريخ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">من تاريخ</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">إلى تاريخ</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleGenerateReport} className="gap-2 bg-gold-gradient">
                <TrendingUp className="w-4 h-4" />
                إنشاء تقرير
              </Button>
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="w-4 h-4" />
                تصدير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposits Over Time */}
        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader>
            <CardTitle className="text-gold-gradient">الإيداعات حسب التاريخ</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.depositsByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="المبلغ (ج.م)"
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="العدد"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Withdrawals Over Time */}
        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader>
            <CardTitle className="text-gold-gradient">السحوبات حسب التاريخ</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.withdrawalsByDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="المبلغ (ج.م)"
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="العدد"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deposits by Status */}
        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader>
            <CardTitle className="text-gold-gradient">الإيداعات حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.depositsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reportData.depositsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Withdrawals by Status */}
        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader>
            <CardTitle className="text-gold-gradient">السحوبات حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.withdrawalsByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="status" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="العدد" />
                <Bar dataKey="total" fill="#f59e0b" name="المبلغ (ج.م)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
