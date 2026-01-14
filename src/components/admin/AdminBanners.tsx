import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Banner {
    id: string;
    title: string;
    description: string | null;
    button_text: string | null;
    button_link: string | null;
    is_active: boolean;
    display_order: number;
}

export const AdminBanners = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        button_text: "",
        button_link: "",
        is_active: true,
    });

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("banners")
                .select("*")
                .order("display_order", { ascending: true });

            if (error) throw error;
            setBanners(data || []);
        } catch (error) {
            console.error("Error fetching banners:", error);
            toast.error("فشل تحميل البنرات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBanner) {
                const { error } = await supabase
                    .from("banners")
                    .update(formData)
                    .eq("id", editingBanner.id);
                if (error) throw error;
                toast.success("تم تحديث البنر بنجاح");
            } else {
                const { error } = await supabase.from("banners").insert(formData);
                if (error) throw error;
                toast.success("تم إضافة البنر بنجاح");
            }
            setIsDialogOpen(false);
            resetForm();
            fetchBanners();
        } catch (error) {
            console.error("Error saving banner:", error);
            toast.error("حدث خطأ أثناء حفظ البنر");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا البنر؟")) return;
        try {
            const { error } = await supabase.from("banners").delete().eq("id", id);
            if (error) throw error;
            toast.success("تم حذف البنر بنجاح");
            fetchBanners();
        } catch (error) {
            console.error("Error deleting banner:", error);
            toast.error("فشل حذف البنر");
        }
    };

    const handleToggleActive = async (id: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from("banners")
                .update({ is_active: !currentState })
                .eq("id", id);
            if (error) throw error;
            fetchBanners();
        } catch (error) {
            console.error("Error toggling banner status:", error);
            toast.error("فشل تحديث حالة البنر");
        }
    };

    const openEditDialog = (banner: Banner) => {
        setEditingBanner(banner);
        setFormData({
            title: banner.title,
            description: banner.description || "",
            button_text: banner.button_text || "",
            button_link: banner.button_link || "",
            is_active: banner.is_active,
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingBanner(null);
        setFormData({
            title: "",
            description: "",
            button_text: "",
            button_link: "",
            is_active: true,
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">إدارة البنرات الإعلانية</h2>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground">
                            <Plus className="w-4 h-4 ml-2" />
                            إضافة بنر جديد
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingBanner ? "تعديل البنر" : "إضافة بنر جديد"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>عنوان البنر</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>الوصف</Label>
                                <Input
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>نص الزر</Label>
                                    <Input
                                        value={formData.button_text}
                                        onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>رابط الزر</Label>
                                    <Input
                                        value={formData.button_link}
                                        onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                                <Label>تفعيل البنر</Label>
                            </div>
                            <Button type="submit" className="w-full">
                                {editingBanner ? "تحديث" : "إضافة"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-card rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>العنوان</TableHead>
                            <TableHead>الوصف</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : banners.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    لا توجد بنرات حالياً
                                </TableCell>
                            </TableRow>
                        ) : (
                            banners.map((banner) => (
                                <TableRow key={banner.id}>
                                    <TableCell className="font-medium">{banner.title}</TableCell>
                                    <TableCell>{banner.description}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={banner.is_active}
                                                onCheckedChange={() => handleToggleActive(banner.id, banner.is_active)}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {banner.is_active ? "نشط" : "غير نشط"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(banner)}
                                            >
                                                <Pencil className="w-4 h-4 text-primary" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(banner.id)}
                                            >
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
