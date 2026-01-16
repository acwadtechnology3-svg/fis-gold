import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Partner {
    id: string;
    name: string;
    website_url: string | null;
    is_active: boolean;
    display_order: number;
    logo_url: string | null;
}

export const AdminPartners = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        website_url: "",
        logo_url: "",
        is_active: true,
    });

    const fetchPartners = async () => {
        try {
            setLoading(true);
            setLoading(true);
            const { data, error } = await (supabase as any)
                .from("partners")
                .select("*")
                .order("display_order", { ascending: true });

            if (error) throw error;
            setPartners(data || []);
        } catch (error) {
            console.error("Error fetching partners:", error);
            toast.error("فشل تحميل الشركاء");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPartner) {
                const { error } = await (supabase as any)
                    .from("partners")
                    .update(formData)
                    .eq("id", editingPartner.id);
                if (error) throw error;
                toast.success("تم تحديث الشريك بنجاح");
            } else {
                const { error } = await (supabase as any).from("partners").insert(formData);
                if (error) throw error;
                toast.success("تم إضافة الشريك بنجاح");
            }
            setIsDialogOpen(false);
            resetForm();
            fetchPartners();
        } catch (error) {
            console.error("Error saving partner:", error);
            toast.error("حدث خطأ أثناء حفظ الشريك");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا الشريك؟")) return;
        try {
            const { error } = await (supabase as any).from("partners").delete().eq("id", id);
            if (error) throw error;
            toast.success("تم حذف الشريك بنجاح");
            fetchPartners();
        } catch (error) {
            console.error("Error deleting partner:", error);
            toast.error("فشل حذف الشريك");
        }
    };

    const handleToggleActive = async (id: string, currentState: boolean) => {
        try {
            const { error } = await (supabase as any)
                .from("partners")
                .update({ is_active: !currentState })
                .eq("id", id);
            if (error) throw error;
            fetchPartners();
        } catch (error) {
            console.error("Error toggling partner status:", error);
            toast.error("فشل تحديث حالة الشريك");
        }
    };

    const openEditDialog = (partner: Partner) => {
        setEditingPartner(partner);
        setFormData({
            name: partner.name,
            website_url: partner.website_url || "",
            logo_url: partner.logo_url || "",
            is_active: partner.is_active,
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingPartner(null);
        setFormData({
            name: "",
            website_url: "",
            logo_url: "",
            is_active: true,
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">إدارة شركاء النجاح</h2>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground">
                            <Plus className="w-4 h-4 ml-2" />
                            إضافة شريك جديد
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingPartner ? "تعديل الشريك" : "إضافة شريك جديد"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>اسم الشريك</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>شعار الشريك (اختياري)</Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        try {
                                            setUploading(true);
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `partner_${Math.random()}.${fileExt}`;
                                            const filePath = `${fileName}`;

                                            const { error: uploadError } = await supabase.storage
                                                .from('marketing')
                                                .upload(filePath, file);

                                            if (uploadError) {
                                                throw uploadError;
                                            }

                                            const { data: { publicUrl } } = supabase.storage
                                                .from('marketing')
                                                .getPublicUrl(filePath);

                                            setFormData({ ...formData, logo_url: publicUrl });
                                            toast.success("تم رفع الشعار بنجاح");
                                        } catch (error) {
                                            console.error("Error uploading logo:", error);
                                            toast.error("فشل رفع الشعار");
                                        } finally {
                                            setUploading(false);
                                        }
                                    }}
                                    disabled={uploading}
                                />
                                {uploading && <p className="text-sm text-muted-foreground">جاري الرفع...</p>}
                                {formData.logo_url && (
                                    <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border bg-gray-100 flex items-center justify-center">
                                        <img
                                            src={formData.logo_url}
                                            alt="Preview"
                                            className="max-w-full max-h-full object-contain p-2"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-5 w-5"
                                            onClick={() => setFormData({ ...formData, logo_url: "" })}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>الموقع الإلكتروني</Label>
                                <Input
                                    value={formData.website_url}
                                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                    dir="ltr"
                                />
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                                <Label>تفعيل الشريك</Label>
                            </div>
                            <Button type="submit" className="w-full" disabled={uploading}>
                                {editingPartner ? "تحديث" : "إضافة"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-card rounded-lg border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>الاسم</TableHead>
                            <TableHead>الموقع الإلكتروني</TableHead>
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
                        ) : partners.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    لا يوجد شركاء حالياً
                                </TableCell>
                            </TableRow>
                        ) : (
                            partners.map((partner) => (
                                <TableRow key={partner.id}>
                                    <TableCell className="font-medium">{partner.name}</TableCell>
                                    <TableCell className="text-left dir-ltr">{partner.website_url || "-"}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={partner.is_active}
                                                onCheckedChange={() => handleToggleActive(partner.id, partner.is_active)}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {partner.is_active ? "نشط" : "غير نشط"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(partner)}
                                            >
                                                <Pencil className="w-4 h-4 text-primary" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(partner.id)}
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
