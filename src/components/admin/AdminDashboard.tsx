import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX
} from "lucide-react";
import { AdminDeposit, AdminWithdrawal, UserWithProfile } from "@/hooks/useAdminData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminDashboardProps {
  users: UserWithProfile[];
  deposits: AdminDeposit[];
  withdrawals: AdminWithdrawal[];
}

export const AdminDashboard = ({ users, deposits, withdrawals }: AdminDashboardProps) => {
  const navigate = useNavigate();

  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const inactiveUsers = users.filter((u) => !u.is_active).length;

  const totalDeposits = deposits
    .filter((d) => d.status === "approved")
    .reduce((sum, d) => sum + d.amount, 0);

  const totalWithdrawals = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((sum, w) => sum + (w.net_amount || w.amount), 0);

  const pendingDeposits = deposits.filter((d) => d.status === "pending");
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const totalPending = pendingDeposits.length + pendingWithdrawals.length;

  const netBalance = totalDeposits - totalWithdrawals;

  // Recent deposits (last 5)
  const recentDeposits = deposits.slice(0, 5);

  // Recent withdrawals (last 5)
  const recentWithdrawals = withdrawals.slice(0, 5);

  // Pending users (awaiting verification)
  const pendingUsers = users.filter((u) => !u.is_active);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">معلق</Badge>;
      case "approved":
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">موافق عليه</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">مرفوض</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المستخدمين
            </CardTitle>
            <div className="p-2 rounded-full bg-secondary">
              <Users className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold-gradient">{totalUsers}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-green-600">
                <UserCheck className="w-3 h-3" />
                {activeUsers} نشط
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <UserX className="w-3 h-3" />
                {inactiveUsers} غير نشط
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الإيداعات
            </CardTitle>
            <div className="p-2 rounded-full bg-gold-gradient">
              <ArrowDownToLine className="w-4 h-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold-gradient">
              {totalDeposits.toLocaleString("ar-EG")} ج.م
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {deposits.filter((d) => d.status === "approved").length} معاملة
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي السحوبات
            </CardTitle>
            <div className="p-2 rounded-full bg-secondary">
              <ArrowUpFromLine className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold-gradient">
              {totalWithdrawals.toLocaleString("ar-EG")} ج.م
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {withdrawals.filter((w) => w.status === "completed").length} معاملة
            </div>
          </CardContent>
        </Card>

        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              صافي الرصيد
            </CardTitle>
            <div className="p-2 rounded-full bg-gold-gradient">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netBalance.toLocaleString("ar-EG")} ج.م
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {netBalance >= 0 ? 'ربح' : 'خسارة'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Items & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Items */}
        <Card className="glass-dark border-primary/20 shadow-gold lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  الطلبات المعلقة
                </CardTitle>
                <CardDescription>الطلبات التي تحتاج إلى مراجعة</CardDescription>
              </div>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                {totalPending}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <ArrowDownToLine className="w-5 h-5 text-yellow-600" />
                  <div>
                    <div className="font-medium">إيداعات معلقة</div>
                    <div className="text-sm text-muted-foreground">
                      {pendingDeposits.length} طلب يحتاج إلى مراجعة
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const element = document.querySelector('[data-value="deposits"]') as HTMLElement;
                    if (element) element.click();
                  }}
                >
                  عرض الكل
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <ArrowUpFromLine className="w-5 h-5 text-yellow-600" />
                  <div>
                    <div className="font-medium">سحوبات معلقة</div>
                    <div className="text-sm text-muted-foreground">
                      {pendingWithdrawals.length} طلب يحتاج إلى مراجعة
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const element = document.querySelector('[data-value="withdrawals"]') as HTMLElement;
                    if (element) element.click();
                  }}
                >
                  عرض الكل
                </Button>
              </div>

              {pendingUsers.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <div>
                      <div className="font-medium">مستخدمين في انتظار التفعيل</div>
                      <div className="text-sm text-muted-foreground">
                        {pendingUsers.length} مستخدم يحتاج إلى مراجعة
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const element = document.querySelector('[data-value="users"]') as HTMLElement;
                      if (element) element.click();
                    }}
                  >
                    عرض الكل
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader>
            <CardTitle>إجراءات سريعة</CardTitle>
            <CardDescription>الوصول السريع إلى الأقسام</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                const element = document.querySelector('[data-value="users"]') as HTMLElement;
                if (element) element.click();
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              إدارة المستخدمين
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                const element = document.querySelector('[data-value="deposits"]') as HTMLElement;
                if (element) element.click();
              }}
            >
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              الإيداعات
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                const element = document.querySelector('[data-value="withdrawals"]') as HTMLElement;
                if (element) element.click();
              }}
            >
              <ArrowUpFromLine className="w-4 h-4 mr-2" />
              السحوبات
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                const element = document.querySelector('[data-value="reports"]') as HTMLElement;
                if (element) element.click();
              }}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              التقارير
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                const element = document.querySelector('[data-value="settings"]') as HTMLElement;
                if (element) element.click();
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              الإعدادات
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deposits */}
        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5" />
              أحدث الإيداعات
            </CardTitle>
            <CardDescription>آخر 5 إيداعات تمت</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDeposits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد إيداعات
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDeposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-medium">{deposit.user_name || "غير معروف"}</TableCell>
                      <TableCell>{deposit.amount.toLocaleString("ar-EG")} ج.م</TableCell>
                      <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(deposit.created_at), "dd MMM yyyy", { locale: ar })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Withdrawals */}
        <Card className="glass-dark border-primary/20 shadow-gold">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5" />
              أحدث السحوبات
            </CardTitle>
            <CardDescription>آخر 5 سحوبات تمت</CardDescription>
          </CardHeader>
          <CardContent>
            {recentWithdrawals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد سحوبات
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">{withdrawal.user_name || "غير معروف"}</TableCell>
                      <TableCell>{(withdrawal.net_amount || withdrawal.amount).toLocaleString("ar-EG")} ج.م</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(withdrawal.created_at), "dd MMM yyyy", { locale: ar })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

