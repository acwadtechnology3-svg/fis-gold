import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Edit, Trash2, Eye, Loader2, Search, Plus, Upload } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useGoldsmiths, Product } from "@/hooks/useGoldsmiths";

interface ProductWithGoldsmith extends Product {
  goldsmith?: {
    shop_name: string;
    name: string;
  } | null;
}

export const AdminProducts = () => {
  const { products, loading, fetchProducts, createProduct, updateProduct, deleteProduct } = useProducts();
  const { goldsmiths, fetchGoldsmiths } = useGoldsmiths();
  const [productsWithGoldsmith, setProductsWithGoldsmith] = useState<ProductWithGoldsmith[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGoldsmith, setSelectedGoldsmith] = useState<string>("all");
  const [selectedKarat, setSelectedKarat] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithGoldsmith | null>(null);
  const [editData, setEditData] = useState<{
    name: string;
    weight_grams: number;
    karat: number;
    price: number;
    making_charge: number;
    quantity: number;
    is_active: boolean;
    description: string;
    metal_type: 'gold' | 'silver';
    images: string[];
  }>({
    name: "",
    weight_grams: 0,
    karat: 18,
    price: 0,
    making_charge: 0,
    quantity: 1,
    is_active: true,
    description: "",
    metal_type: 'gold',
    images: [],
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      await fetchGoldsmiths();
      await fetchProducts();

      // Fetch products with goldsmith info
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          goldsmith:goldsmiths(
            shop_name,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
        toast.error("حدث خطأ في جلب المنتجات");
      } else {
        setProductsWithGoldsmith(data || []);
      }
      setLoadingData(false);
    };

    loadData();
  }, []);

  const filteredProducts = productsWithGoldsmith.filter((product) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !product.name.toLowerCase().includes(searchLower) &&
        !product.goldsmith?.shop_name.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    if (selectedGoldsmith !== "all" && product.goldsmith_id !== selectedGoldsmith) {
      return false;
    }
    if (selectedKarat !== "all" && product.karat !== parseInt(selectedKarat)) {
      return false;
    }
    if (statusFilter !== "all" && product.is_active !== (statusFilter === "active")) {
      return false;
    }
    return true;
  });

  const handleAdd = () => {
    setSelectedProduct(null);
    setEditData({
      name: "",
      weight_grams: 0,
      karat: 18,
      price: 0,
      making_charge: 0,
      quantity: 1,
      is_active: true,
      description: "",
      metal_type: 'gold',
      images: [],
    });
    setAddDialogOpen(true);
  };

  const handleEdit = (product: ProductWithGoldsmith) => {
    setSelectedProduct(product);
    setEditData({
      name: product.name,
      weight_grams: product.weight_grams,
      karat: product.karat || 18,
      price: product.price,
      making_charge: product.making_charge,
      quantity: product.quantity,
      is_active: product.is_active,
      description: product.description || "",
      metal_type: product.metal_type || 'gold',
      images: product.images || [],
    });
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImages(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `fis_gold/products/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      toast.error("حدث خطأ في رفع الصورة: " + uploadError.message);
      setUploadingImages(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    setEditData({
      ...editData,
      images: [...editData.images, publicUrl],
    });
    setUploadingImages(false);
    toast.success("تم رفع الصورة بنجاح");
  };

  const handleSaveAdd = async () => {
    if (!editData.name || editData.weight_grams <= 0 || editData.price <= 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (editData.metal_type === 'gold' && !editData.karat) {
      toast.error("يرجى تحديد العيار للذهب");
      return;
    }

    setActionLoading("add");

    // Use createProduct with null goldsmith_id for FIS Gold products
    const success = await createProduct(
      {
        name: editData.name,
        weight_grams: editData.weight_grams,
        karat: editData.metal_type === 'gold' ? editData.karat : null,
        price: editData.price,
        making_charge: editData.making_charge,
        quantity: editData.quantity,
        images: editData.images,
        description: editData.description || undefined,
        metal_type: editData.metal_type,
      },
      null // null goldsmith_id for FIS Gold products
    );

    if (success) {
      // Refresh products
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          goldsmith:goldsmiths(
            shop_name,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProductsWithGoldsmith(data);
      }

      setAddDialogOpen(false);
    }
    setActionLoading(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedProduct) return;

    if (!editData.name || editData.weight_grams <= 0 || editData.price <= 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setActionLoading(selectedProduct.id);
    const success = await updateProduct(selectedProduct.id, editData);

    if (success) {
      // Refresh products
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          goldsmith:goldsmiths(
            shop_name,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProductsWithGoldsmith(data);
      }

      setEditDialogOpen(false);
      setActionLoading(null);
    } else {
      setActionLoading(null);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    setActionLoading(productId);
    const success = await deleteProduct(productId);

    if (success) {
      // Refresh products
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          goldsmith:goldsmiths(
            shop_name,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProductsWithGoldsmith(data);
      }
    }
    setActionLoading(null);
  };

  const approvedGoldsmiths = goldsmiths.filter((g) => g.status === "approved");

  return (
    <>
      <Card className="glass-dark border-primary/20 shadow-gold">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            إدارة المنتجات
          </CardTitle>
          <Button onClick={handleAdd} className="bg-gold-gradient hover:bg-gold-gradient-hover text-black">
            <Plus className="w-4 h-4 ml-2" />
            إضافة منتج
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={selectedGoldsmith} onValueChange={setSelectedGoldsmith}>
              <SelectTrigger>
                <SelectValue placeholder="جميع الصايغين" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الصايغين</SelectItem>
                {approvedGoldsmiths.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.shop_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedKarat} onValueChange={setSelectedKarat}>
              <SelectTrigger>
                <SelectValue placeholder="جميع العيارات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع العيارات</SelectItem>
                <SelectItem value="18">18 قيراط</SelectItem>
                <SelectItem value="21">21 قيراط</SelectItem>
                <SelectItem value="22">22 قيراط</SelectItem>
                <SelectItem value="24">24 قيراط</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loadingData ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border border-primary/20">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الصايغ</TableHead>
                    <TableHead>الوزن</TableHead>
                    <TableHead>العيار</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        لا توجد منتجات
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-semibold">{product.name}</TableCell>
                        <TableCell>
                          {product.goldsmith?.shop_name || "غير معروف"}
                        </TableCell>
                        <TableCell>{product.weight_grams} جم</TableCell>
                        <TableCell>
                          {product.karat ? (
                            <Badge variant="outline">{product.karat}K</Badge>
                          ) : (
                            <Badge variant="outline">{product.metal_type === 'silver' ? 'فضة' : '-'}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(product.price + product.making_charge).toLocaleString("ar-EG")} ج.م
                        </TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>
                          <Badge
                            variant={product.is_active ? "default" : "secondary"}
                          >
                            {product.is_active ? "نشط" : "غير نشط"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              disabled={actionLoading === product.id}
                            >
                              {actionLoading === product.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Edit className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                              disabled={actionLoading === product.id}
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
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المنتج</DialogTitle>
            <DialogDescription>قم بتعديل معلومات المنتج</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم المنتج</Label>
              <Input
                id="edit-name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-metal-type">نوع المعدن</Label>
              <Select
                value={editData.metal_type}
                onValueChange={(value: 'gold' | 'silver') => setEditData({ ...editData, metal_type: value, karat: value === 'gold' ? editData.karat : 0 })}
              >
                <SelectTrigger id="edit-metal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">ذهب</SelectItem>
                  <SelectItem value="silver">فضة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-weight">الوزن (جم)</Label>
                <Input
                  id="edit-weight"
                  type="number"
                  step="0.01"
                  value={editData.weight_grams}
                  onChange={(e) =>
                    setEditData({ ...editData, weight_grams: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              {editData.metal_type === 'gold' && (
                <div>
                  <Label htmlFor="edit-karat">العيار</Label>
                  <Select
                    value={editData.karat.toString()}
                    onValueChange={(value) => setEditData({ ...editData, karat: parseInt(value) })}
                  >
                    <SelectTrigger id="edit-karat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18">18 قيراط</SelectItem>
                      <SelectItem value="21">21 قيراط</SelectItem>
                      <SelectItem value="22">22 قيراط</SelectItem>
                      <SelectItem value="24">24 قيراط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">السعر (ج.م)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={editData.price}
                  onChange={(e) =>
                    setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-making">المصنعية (ج.م)</Label>
                <Input
                  id="edit-making"
                  type="number"
                  step="0.01"
                  value={editData.making_charge}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      making_charge: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-quantity">الكمية</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={editData.quantity}
                  onChange={(e) =>
                    setEditData({ ...editData, quantity: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-status">الحالة</Label>
                <Select
                  value={editData.is_active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setEditData({ ...editData, is_active: value === "active" })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description">الوصف</Label>
              <Textarea
                id="edit-description"
                className="min-h-[100px]"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>صور المنتج</Label>
              <div className="flex gap-2 flex-wrap mb-2">
                {editData.images.map((url, index) => (
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
                        setEditData({
                          ...editData,
                          images: editData.images.filter((_, i) => i !== index),
                        });
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <label className="border-2 border-dashed border-primary/30 rounded-lg p-4 cursor-pointer hover:bg-muted flex items-center justify-center w-20 h-20">
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
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} disabled={actionLoading !== null}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة منتج FIS Gold</DialogTitle>
            <DialogDescription>أضف منتج جديد للبيع في متجر FIS Gold</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-name">اسم المنتج</Label>
              <Input
                id="add-name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="add-metal-type">نوع المعدن</Label>
              <Select
                value={editData.metal_type}
                onValueChange={(value: 'gold' | 'silver') => setEditData({ ...editData, metal_type: value, karat: value === 'gold' ? 21 : 0 })}
              >
                <SelectTrigger id="add-metal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">ذهب</SelectItem>
                  <SelectItem value="silver">فضة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-weight">الوزن (جم)</Label>
                <Input
                  id="add-weight"
                  type="number"
                  step="0.01"
                  value={editData.weight_grams || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, weight_grams: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              {editData.metal_type === 'gold' && (
                <div>
                  <Label htmlFor="add-karat">العيار</Label>
                  <Select
                    value={editData.karat.toString()}
                    onValueChange={(value) => setEditData({ ...editData, karat: parseInt(value) })}
                  >
                    <SelectTrigger id="add-karat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18">18 قيراط</SelectItem>
                      <SelectItem value="21">21 قيراط</SelectItem>
                      <SelectItem value="22">22 قيراط</SelectItem>
                      <SelectItem value="24">24 قيراط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-price">السعر (ج.م)</Label>
                <Input
                  id="add-price"
                  type="number"
                  step="0.01"
                  value={editData.price || ''}
                  onChange={(e) =>
                    setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="add-making">المصنعية (ج.م)</Label>
                <Input
                  id="add-making"
                  type="number"
                  step="0.01"
                  value={editData.making_charge || ''}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      making_charge: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="add-quantity">الكمية</Label>
              <Input
                id="add-quantity"
                type="number"
                value={editData.quantity || ''}
                onChange={(e) =>
                  setEditData({ ...editData, quantity: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="add-description">الوصف</Label>
              <Textarea
                id="add-description"
                className="min-h-[100px]"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>صور المنتج</Label>
              <div className="flex gap-2 flex-wrap mb-2">
                {editData.images.map((url, index) => (
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
                        setEditData({
                          ...editData,
                          images: editData.images.filter((_, i) => i !== index),
                        });
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <label className="border-2 border-dashed border-primary/30 rounded-lg p-4 cursor-pointer hover:bg-muted flex items-center justify-center w-20 h-20">
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
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveAdd} disabled={actionLoading === "add"}>
              {actionLoading === "add" ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
