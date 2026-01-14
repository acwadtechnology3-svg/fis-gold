import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts, Product } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Package, Upload, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface GoldsmithProductsProps {
  goldsmithId: string;
  products: Product[];
  onRefresh: () => void;
}

export const GoldsmithProducts = ({
  goldsmithId,
  products,
  onRefresh,
}: GoldsmithProductsProps) => {
  const { createProduct, updateProduct, deleteProduct } = useProducts(goldsmithId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    weight_grams: "",
    karat: "21",
    price: "",
    making_charge: "",
    quantity: "1",
    description: "",
    images: [] as string[],
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        weight_grams: product.weight_grams.toString(),
        karat: product.karat.toString(),
        price: product.price.toString(),
        making_charge: product.making_charge.toString(),
        quantity: product.quantity.toString(),
        description: product.description || "",
        images: product.images || [],
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        weight_grams: "",
        karat: "21",
        price: "",
        making_charge: "",
        quantity: "1",
        description: "",
        images: [],
      });
    }
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImages(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${goldsmithId}/products/${Date.now()}.${fileExt}`;
    const filePath = `goldsmiths/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("حدث خطأ في رفع الصورة");
      setUploadingImages(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    setFormData({
      ...formData,
      images: [...formData.images, publicUrl],
    });
    setUploadingImages(false);
    toast.success("تم رفع الصورة بنجاح");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const productData = {
      name: formData.name,
      weight_grams: parseFloat(formData.weight_grams),
      karat: parseInt(formData.karat),
      price: parseFloat(formData.price),
      making_charge: parseFloat(formData.making_charge),
      quantity: parseInt(formData.quantity),
      images: formData.images,
      description: formData.description || undefined,
    };

    let success = false;
    if (editingProduct) {
      success = await updateProduct(editingProduct.id, productData);
    } else {
      success = await createProduct(productData);
    }

    setLoading(false);
    if (success) {
      setDialogOpen(false);
      onRefresh();
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    await deleteProduct(productId);
    onRefresh();
  };

  return (
    <>
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gold-gradient">
              <Package className="w-5 h-5 text-primary" />
              المنتجات ({products.length})
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="gap-2 bg-gold-gradient"
                >
                  <Plus className="w-4 h-4" />
                  إضافة منتج
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "تعديل منتج" : "إضافة منتج جديد"}
                  </DialogTitle>
                  <DialogDescription>
                    أدخل بيانات المنتج
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">اسم المنتج *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">الوزن (جرام) *</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.01"
                        value={formData.weight_grams}
                        onChange={(e) =>
                          setFormData({ ...formData, weight_grams: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="karat">العيار *</Label>
                      <Select
                        value={formData.karat}
                        onValueChange={(value) =>
                          setFormData({ ...formData, karat: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="18">18</SelectItem>
                          <SelectItem value="21">21</SelectItem>
                          <SelectItem value="22">22</SelectItem>
                          <SelectItem value="24">24</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">الكمية *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, quantity: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">السعر (ج.م) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="making_charge">المصنعية (ج.م)</Label>
                      <Input
                        id="making_charge"
                        type="number"
                        step="0.01"
                        value={formData.making_charge}
                        onChange={(e) =>
                          setFormData({ ...formData, making_charge: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>صور المنتج</Label>
                    <div className="flex gap-2 flex-wrap">
                      {formData.images.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Product ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 p-0"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                images: formData.images.filter((_, i) => i !== index),
                              });
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      <label className="border-2 border-dashed border-primary/30 rounded-lg p-4 cursor-pointer hover:bg-muted">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                        />
                        {uploadingImages ? (
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        ) : (
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        )}
                      </label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-gold-gradient">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : editingProduct ? (
                        "حفظ التغييرات"
                      ) : (
                        "إضافة المنتج"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد منتجات. اضغط على "إضافة منتج" لبدء البيع
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">الوزن</TableHead>
                  <TableHead className="text-right">العيار</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.weight_grams} جم</TableCell>
                    <TableCell>{product.karat} قيراط</TableCell>
                    <TableCell>
                      {(product.price + product.making_charge).toLocaleString("ar-EG")} ج.م
                    </TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.is_active ? "default" : "secondary"}
                      >
                        {product.is_active ? "نشط" : "معطل"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
};
