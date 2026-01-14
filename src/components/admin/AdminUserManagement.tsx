import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserWithProfile } from "@/hooks/useAdminData";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Users,
  Edit,
  Shield,
  UserX,
  UserCheck,
  Eye,
  Search,
} from "lucide-react";
import { useActivityLog } from "@/hooks/useActivityLog";

interface AdminUserManagementProps {
  users: UserWithProfile[];
  onUpdateUser: (
    userId: string,
    updates: { full_name?: string; phone?: string; is_active?: boolean }
  ) => Promise<boolean>;
  onGrantRole: (userId: string, role: "admin" | "moderator" | "user") => Promise<boolean>;
  onRevokeRole: (userId: string, role: "admin" | "moderator" | "user") => Promise<boolean>;
  onGetPortfolio: (userId: string) => Promise<any>;
}

export const AdminUserManagement = ({
  users,
  onUpdateUser,
  onGrantRole,
  onRevokeRole,
  onGetPortfolio,
}: AdminUserManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const { logActivity } = useActivityLog();

  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    is_active: true,
  });

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm)
  );

  const handleEditUser = (user: UserWithProfile) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      is_active: user.is_active ?? true,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    const success = await onUpdateUser(selectedUser.id, editForm);
    if (success) {
      await logActivity(
        "user_updated",
        "user",
        selectedUser.id,
        `تم تحديث بيانات المستخدم: ${editForm.full_name || selectedUser.email}`,
        editForm
      );
      setEditDialogOpen(false);
    }
  };

  const handleToggleActive = async (user: UserWithProfile) => {
    const newStatus = !user.is_active;
    const success = await onUpdateUser(user.id, { is_active: newStatus });
    if (success) {
      await logActivity(
        newStatus ? "user_activated" : "user_deactivated",
        "user",
        user.id,
        `${newStatus ? "تفعيل" : "تعطيل"} حساب المستخدم: ${user.full_name || user.email}`
      );
    }
  };

  const handleGrantRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    const success = await onGrantRole(userId, role);
    if (success) {
      await logActivity("role_granted", "user", userId, `تم منح صلاحية ${role}`, { role });
    }
  };

  const handleRevokeRole = async (userId: string, role: "admin" | "moderator" | "user") => {
    const success = await onRevokeRole(userId, role);
    if (success) {
      await logActivity("role_revoked", "user", userId, `تم إلغاء صلاحية ${role}`, { role });
    }
  };

  const handleViewPortfolio = async (userId: string) => {
    setLoadingPortfolio(true);
    setPortfolioDialogOpen(true);
    const portfolio = await onGetPortfolio(userId);
    setPortfolioData(portfolio);
    setLoadingPortfolio(false);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "moderator":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <>
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gold-gradient">
              <Users className="w-5 h-5 text-primary" />
              إدارة المستخدمين ({users.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن مستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد مستخدمين</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">رقم الهاتف</TableHead>
                    <TableHead className="text-right">الصلاحيات</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ التسجيل</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || "غير محدد"}
                      </TableCell>
                      <TableCell>{user.email || "غير محدد"}</TableCell>
                      <TableCell>{user.phone || "غير محدد"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge
                                key={role}
                                variant="outline"
                                className={getRoleBadgeColor(role)}
                              >
                                {role === "admin"
                                  ? "أدمن"
                                  : role === "moderator"
                                  ? "مشرف"
                                  : "مستخدم"}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className={getRoleBadgeColor("user")}>
                              مستخدم
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.is_active ? "default" : "destructive"}
                          className={user.is_active ? "bg-green-500/20 text-green-400" : ""}
                        >
                          {user.is_active ? "نشط" : "معطل"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "dd MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPortfolio(user.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(user)}
                            className="h-8 w-8 p-0"
                          >
                            {user.is_active ? (
                              <UserX className="w-4 h-4 text-destructive" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription>
              تعديل معلومات المستخدم والصلاحيات
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active">الحالة</Label>
              <Select
                value={editForm.is_active ? "active" : "inactive"}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, is_active: value === "active" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">معطل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedUser && (
              <div className="space-y-2">
                <Label>الصلاحيات</Label>
                <div className="flex gap-2 flex-wrap">
                  {["admin", "moderator", "user"].map((role) => {
                    const hasRole = selectedUser.roles?.includes(role);
                    return (
                      <Button
                        key={role}
                        variant={hasRole ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (hasRole) {
                            handleRevokeRole(selectedUser.id, role as any);
                          } else {
                            handleGrantRole(selectedUser.id, role as any);
                          }
                        }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {role === "admin"
                          ? "أدمن"
                          : role === "moderator"
                          ? "مشرف"
                          : "مستخدم"}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} className="bg-gold-gradient">
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portfolio Dialog */}
      <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>محفظة المستخدم</DialogTitle>
            <DialogDescription>تفاصيل محفظة المستخدم المالية</DialogDescription>
          </DialogHeader>
          {loadingPortfolio ? (
            <div className="py-8 text-center">جاري التحميل...</div>
          ) : portfolioData ? (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">إجمالي الاستثمار</p>
                <p className="text-2xl font-bold text-gold-gradient">
                  {portfolioData.total_invested?.toLocaleString("ar-EG") || 0} ج.م
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">إجمالي الذهب (جرام)</p>
                <p className="text-2xl font-bold">
                  {portfolioData.total_gold_grams?.toFixed(4) || 0} جم
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">إيداعات معلقة</p>
                <p className="text-xl font-semibold">
                  {portfolioData.pending_deposits?.toLocaleString("ar-EG") || 0} ج.م
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">إيداعات معتمدة</p>
                <p className="text-xl font-semibold">
                  {portfolioData.approved_deposits?.toLocaleString("ar-EG") || 0} ج.م
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">سحوبات معلقة</p>
                <p className="text-xl font-semibold">
                  {portfolioData.pending_withdrawals?.toLocaleString("ar-EG") || 0} ج.م
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">سحوبات مكتملة</p>
                <p className="text-xl font-semibold">
                  {portfolioData.completed_withdrawals?.toLocaleString("ar-EG") || 0} ج.م
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              لا توجد بيانات محفظة
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPortfolioDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
