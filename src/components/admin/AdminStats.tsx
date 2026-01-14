import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ArrowDownToLine, ArrowUpFromLine, DollarSign } from "lucide-react";
import { AdminDeposit, AdminWithdrawal, UserWithProfile } from "@/hooks/useAdminData";

interface AdminStatsProps {
  users: UserWithProfile[];
  deposits: AdminDeposit[];
  withdrawals: AdminWithdrawal[];
}

export const AdminStats = ({ users, deposits, withdrawals }: AdminStatsProps) => {
  const totalDeposits = deposits
    .filter((d) => d.status === "approved")
    .reduce((sum, d) => sum + d.amount, 0);

  const totalWithdrawals = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((sum, w) => sum + w.amount, 0);

  const pendingDeposits = deposits.filter((d) => d.status === "pending").length;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending").length;

  const stats = [
    {
      title: "إجمالي المستخدمين",
      value: users.length,
      icon: Users,
      isGold: false,
    },
    {
      title: "إجمالي الإيداعات",
      value: `${totalDeposits.toLocaleString()} ج.م`,
      icon: ArrowDownToLine,
      isGold: true,
    },
    {
      title: "إجمالي السحوبات",
      value: `${totalWithdrawals.toLocaleString()} ج.م`,
      icon: ArrowUpFromLine,
      isGold: false,
    },
    {
      title: "طلبات معلقة",
      value: pendingDeposits + pendingWithdrawals,
      icon: DollarSign,
      isGold: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="glass-dark border-primary/20 shadow-gold">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${stat.isGold ? 'bg-gold-gradient' : 'bg-secondary'}`}>
              <stat.icon className={`w-4 h-4 ${stat.isGold ? 'text-primary-foreground' : 'text-primary'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold-gradient">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
