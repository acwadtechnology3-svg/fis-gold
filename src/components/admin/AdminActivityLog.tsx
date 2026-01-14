import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityLog } from "@/hooks/useActivityLog";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { History, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const AdminActivityLog = () => {
  const { activities, loading, fetchActivities } = useActivityLog();
  
  // Fetch activities only when component mounts (lazy loading)
  useEffect(() => {
    fetchActivities();
  }, []);

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      deposit_approved: "موافقة على إيداع",
      deposit_rejected: "رفض إيداع",
      withdrawal_approved: "موافقة على سحب",
      withdrawal_rejected: "رفض سحب",
      user_updated: "تحديث مستخدم",
      user_activated: "تفعيل مستخدم",
      user_deactivated: "تعطيل مستخدم",
      role_granted: "منح صلاحية",
      role_revoked: "إلغاء صلاحية",
      prices_updated: "تحديث أسعار",
      setting_updated: "تحديث إعداد",
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("approved") || actionType.includes("activated") || actionType.includes("granted")) {
      return "bg-green-500/20 text-green-400 border-green-500/30";
    }
    if (actionType.includes("rejected") || actionType.includes("deactivated") || actionType.includes("revoked")) {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  return (
    <Card className="glass-dark border-primary/20 shadow-gold">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold-gradient">
          <History className="w-5 h-5 text-primary" />
          سجل الأنشطة ({activities.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد أنشطة مسجلة</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ والوقت</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      {format(new Date(activity.created_at), "dd MMM yyyy - HH:mm", {
                        locale: ar,
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {activity.user_name || "غير معروف"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getActionColor(activity.action_type)}>
                        {getActionLabel(activity.action_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {activity.entity_type === "deposit"
                          ? "إيداع"
                          : activity.entity_type === "withdrawal"
                          ? "سحب"
                          : activity.entity_type === "user"
                          ? "مستخدم"
                          : activity.entity_type === "price"
                          ? "سعر"
                          : activity.entity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {activity.description || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
