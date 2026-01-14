import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserWithProfile } from "@/hooks/useAdminData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Users } from "lucide-react";

interface AdminUsersTableProps {
  users: UserWithProfile[];
}

export const AdminUsersTable = ({ users }: AdminUsersTableProps) => {
  return (
    <Card className="glass-dark border-primary/20 shadow-gold">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold-gradient">
          <Users className="w-5 h-5 text-primary" />
          المستخدمين ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا يوجد مستخدمين</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">تاريخ التسجيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || "غير محدد"}
                  </TableCell>
                  <TableCell>{user.phone || "غير محدد"}</TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), "dd MMM yyyy", { locale: ar })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
