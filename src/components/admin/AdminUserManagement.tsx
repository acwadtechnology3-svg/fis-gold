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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Wallet,
  Plus,
  Minus,
  DollarSign,
  Lock,
  ImageIcon,
} from "lucide-react";
import { useActivityLog } from "@/hooks/useActivityLog";

interface AdminUserManagementProps {
  users: UserWithProfile[];
  onUpdateUser: (
    userId: string,
    updates: { full_name?: string; phone?: string; is_active?: boolean; kyc_status?: string }
  ) => Promise<boolean>;
  onGrantRole: (userId: string, role: "admin" | "moderator" | "user") => Promise<boolean>;
  onRevokeRole: (userId: string, role: "admin" | "moderator" | "user") => Promise<boolean>;
  onGetPortfolio: (userId: string) => Promise<any>;
  onAdjustWallet?: (
    userId: string,
    amount: number,
    adjustmentType: "credit" | "debit",
    reason: string
  ) => Promise<any>;
}

export const AdminUserManagement = ({
  users,
  onUpdateUser,
  onGrantRole,
  onRevokeRole,
  onGetPortfolio,
  onAdjustWallet,
}: AdminUserManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const { logActivity } = useActivityLog();

  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    is_active: true,
    kyc_status: "pending",
  });

  const [walletForm, setWalletForm] = useState({
    amount: "",
    adjustmentType: "credit" as "credit" | "debit",
    reason: "",
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
      kyc_status: user.kyc_status || "pending",
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

  const handleViewDetails = async (user: UserWithProfile) => {
    setSelectedUser(user);
    setLoadingPortfolio(true);
    setDetailsDialogOpen(true);
    const portfolio = await onGetPortfolio(user.id);
    setPortfolioData(portfolio);
    setLoadingPortfolio(false);
  };

  const handleOpenWalletDialog = (user: UserWithProfile) => {
    setSelectedUser(user);
    setWalletForm({ amount: "", adjustmentType: "credit", reason: "" });
    setWalletDialogOpen(true);
  };

  const handleWalletAdjustment = async () => {
    if (!selectedUser || !onAdjustWallet) return;

    const amount = parseFloat(walletForm.amount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    if (!walletForm.reason.trim()) {
      return;
    }

    setWalletLoading(true);
    const result = await onAdjustWallet(
      selectedUser.id,
      amount,
      walletForm.adjustmentType,
      walletForm.reason
    );
    setWalletLoading(false);

    if (result?.success) {
      setWalletDialogOpen(false);
      setWalletForm({ amount: "", adjustmentType: "credit", reason: "" });
    }
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

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "0";
    return amount.toLocaleString("ar-EG");
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
                    <TableHead className="text-right">الرصيد المتاح</TableHead>
                    <TableHead className="text-right">الرصيد المحجوز</TableHead>
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
                        <span className="text-green-400 font-semibold">
                          {formatCurrency(user.available_balance)} ج.م
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-400 font-semibold">
                          {formatCurrency(user.locked_balance)} ج.م
                        </span>
                      </TableCell>
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
                            onClick={() => handleViewDetails(user)}
                            className="h-8 w-8 p-0"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenWalletDialog(user)}
                            className="h-8 w-8 p-0"
                            title="إدارة المحفظة"
                          >
                            <Wallet className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0"
                            title="تعديل البيانات"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(user)}
                            className="h-8 w-8 p-0"
                            title={user.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
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

      {/* User Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>تفاصيل المستخدم</DialogTitle>
            <DialogDescription>
              معلومات كاملة عن المستخدم والمحفظة
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">المعلومات الأساسية</TabsTrigger>
                <TabsTrigger value="documents">المستندات</TabsTrigger>
                <TabsTrigger value="portfolio">المحفظة الاستثمارية</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">الاسم الكامل</Label>
                    <p className="font-semibold">{selectedUser.full_name || "غير محدد"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">البريد الإلكتروني</Label>
                    <p className="font-semibold">{selectedUser.email || "غير محدد"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">رقم الهاتف</Label>
                    <p className="font-semibold">{selectedUser.phone || "غير محدد"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">تاريخ التسجيل</Label>
                    <p className="font-semibold">
                      {format(new Date(selectedUser.created_at), "dd MMM yyyy - HH:mm", { locale: ar })}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">حالة الحساب</Label>
                    <Badge variant={selectedUser.is_active ? "default" : "destructive"}>
                      {selectedUser.is_active ? "نشط" : "معطل"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">حالة التحقق (KYC)</Label>
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">
                      {selectedUser.kyc_status || "قيد الانتظار"}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    رصيد المحفظة
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-muted-foreground">الرصيد المتاح</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(selectedUser.available_balance)} ج.م
                      </p>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">الرصيد المحجوز</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-400">
                        {formatCurrency(selectedUser.locked_balance)} ج.م
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="py-4 space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  صور المستندات
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Profile Image */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">صورة الملف الشخصي</Label>
                    <div className="border rounded-lg p-2 bg-muted/30">
                      {selectedUser.avatar_url ? (
                        <a href={selectedUser.avatar_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={selectedUser.avatar_url}
                            alt="صورة الملف الشخصي"
                            className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center rounded-lg">
                          <span className="text-muted-foreground text-sm">لا توجد صورة</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ID Front */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">الهوية - الوجه الأمامي</Label>
                    <div className="border rounded-lg p-2 bg-muted/30">
                      {selectedUser.id_front_url ? (
                        <a href={selectedUser.id_front_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={selectedUser.id_front_url}
                            alt="الهوية الأمامية"
                            className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center rounded-lg">
                          <span className="text-muted-foreground text-sm">لا توجد صورة</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ID Back */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">الهوية - الوجه الخلفي</Label>
                    <div className="border rounded-lg p-2 bg-muted/30">
                      {selectedUser.id_back_url ? (
                        <a href={selectedUser.id_back_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={selectedUser.id_back_url}
                            alt="الهوية الخلفية"
                            className="w-full h-32 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </a>
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center rounded-lg">
                          <span className="text-muted-foreground text-sm">لا توجد صورة</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Wallet Info */}
                {(selectedUser.wallet_type || selectedUser.wallet_number) && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-3">معلومات المحفظة الإلكترونية</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">نوع المحفظة</Label>
                        <p className="font-semibold">{selectedUser.wallet_type || "غير محدد"}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">رقم المحفظة</Label>
                        <p className="font-semibold font-mono" dir="ltr">{selectedUser.wallet_number || "غير محدد"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="portfolio" className="py-4">
                {loadingPortfolio ? (
                  <div className="py-8 text-center">جاري التحميل...</div>
                ) : portfolioData ? (
                  <div className="grid grid-cols-2 gap-4">
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
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Management Dialog */}
      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              إدارة محفظة المستخدم
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              {/* Current Balance Display */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">الرصيد المتاح الحالي</p>
                  <p className="text-xl font-bold text-green-400">
                    {formatCurrency(selectedUser.available_balance)} ج.م
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الرصيد المحجوز</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {formatCurrency(selectedUser.locked_balance)} ج.م
                  </p>
                </div>
              </div>

              {/* Adjustment Type */}
              <div className="space-y-2">
                <Label>نوع العملية</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={walletForm.adjustmentType === "credit" ? "default" : "outline"}
                    className={walletForm.adjustmentType === "credit" ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => setWalletForm({ ...walletForm, adjustmentType: "credit" })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    إضافة رصيد
                  </Button>
                  <Button
                    type="button"
                    variant={walletForm.adjustmentType === "debit" ? "default" : "outline"}
                    className={walletForm.adjustmentType === "debit" ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => setWalletForm({ ...walletForm, adjustmentType: "debit" })}
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    خصم رصيد
                  </Button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (ج.م)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="أدخل المبلغ"
                  value={walletForm.amount}
                  onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })}
                />
              </div>

              {/* Reason Input */}
              <div className="space-y-2">
                <Label htmlFor="reason">سبب العملية *</Label>
                <Textarea
                  id="reason"
                  placeholder="اكتب سبب هذه العملية (مطلوب للتوثيق)"
                  value={walletForm.reason}
                  onChange={(e) => setWalletForm({ ...walletForm, reason: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Preview */}
              {walletForm.amount && parseFloat(walletForm.amount) > 0 && (
                <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="text-sm text-muted-foreground mb-2">معاينة العملية:</p>
                  <p className="font-semibold">
                    {walletForm.adjustmentType === "credit" ? (
                      <span className="text-green-400">
                        + {formatCurrency(parseFloat(walletForm.amount))} ج.م
                      </span>
                    ) : (
                      <span className="text-red-400">
                        - {formatCurrency(parseFloat(walletForm.amount))} ج.م
                      </span>
                    )}
                  </p>
                  <p className="text-sm mt-1">
                    الرصيد الجديد:{" "}
                    <span className="font-bold">
                      {formatCurrency(
                        (selectedUser.available_balance || 0) +
                        (walletForm.adjustmentType === "credit"
                          ? parseFloat(walletForm.amount)
                          : -parseFloat(walletForm.amount))
                      )}{" "}
                      ج.م
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleWalletAdjustment}
              disabled={
                walletLoading ||
                !walletForm.amount ||
                parseFloat(walletForm.amount) <= 0 ||
                !walletForm.reason.trim()
              }
              className={
                walletForm.adjustmentType === "credit"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {walletLoading ? "جاري التنفيذ..." : "تأكيد العملية"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2">
              <Label htmlFor="kyc_status">حالة التحقق (KYC)</Label>
              <Select
                value={editForm.kyc_status}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, kyc_status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="verified">موثق</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
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
      </Dialog >
    </>
  );
};
