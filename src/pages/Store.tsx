import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useGoldsmiths } from "@/hooks/useGoldsmiths";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, ShoppingCart, Search, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/layouts/MainLayout";

interface ProductWithGoldsmith {
  id: string;
  goldsmith_id: string;
  name: string;
  weight_grams: number;
  karat: number;
  price: number;
  making_charge: number;
  quantity: number;
  images: string[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  goldsmith: {
    id: string;
    shop_name: string;
    name: string;
    logo_url: string | null;
    rating_average: number;
    rating_count: number;
  } | null;
}

const Store = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, loading, fetchProducts } = useProducts();
  const { goldsmiths } = useGoldsmiths();
  const { createOrder } = useOrders();
  const [productsWithGoldsmith, setProductsWithGoldsmith] = useState<ProductWithGoldsmith[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKarat, setSelectedKarat] = useState<string>("all");
  const [selectedGoldsmith, setSelectedGoldsmith] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithGoldsmith | null>(null);
  const [orderData, setOrderData] = useState({
    quantity: 1,
    shipping_address: "",
    shipping_phone: "",
    notes: "",
  });

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      await fetchProducts();

      // Fetch products with goldsmith info
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          goldsmith:goldsmiths!inner(
            id,
            shop_name,
            name,
            logo_url,
            rating_average,
            rating_count
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products with goldsmith:", error);
        toast.error("حدث خطأ في جلب المنتجات");
      } else {
        setProductsWithGoldsmith(data || []);
      }
      setLoadingProducts(false);
    };

    loadProducts();
  }, []);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = productsWithGoldsmith;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.goldsmith?.shop_name.toLowerCase().includes(searchLower) ||
          p.goldsmith?.name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by karat
    if (selectedKarat !== "all") {
      filtered = filtered.filter((p) => p.karat === parseInt(selectedKarat));
    }

    // Filter by goldsmith
    if (selectedGoldsmith !== "all") {
      filtered = filtered.filter((p) => p.goldsmith_id === selectedGoldsmith);
    }

    // Sort
    if (sortBy === "latest") {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "price-low") {
      filtered = [...filtered].sort(
        (a, b) => a.price + a.making_charge - (b.price + b.making_charge)
      );
    } else if (sortBy === "price-high") {
      filtered = [...filtered].sort(
        (a, b) => b.price + b.making_charge - (a.price + a.making_charge)
      );
    }

    return filtered;
  }, [productsWithGoldsmith, searchTerm, selectedKarat, selectedGoldsmith, sortBy]);

  const handleOrder = (product: ProductWithGoldsmith) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      navigate("/auth");
      return;
    }
    setSelectedProduct(product);
    setOrderData({
      quantity: 1,
      shipping_address: "",
      shipping_phone: user.phone || "",
      notes: "",
    });
    setOrderDialogOpen(true);
  };

  const handleSubmitOrder = async () => {
    if (!selectedProduct) return;

    if (!orderData.shipping_address || !orderData.shipping_phone) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const success = await createOrder({
      goldsmith_id: selectedProduct.goldsmith_id,
      product_id: selectedProduct.id,
      quantity: orderData.quantity,
      shipping_address: orderData.shipping_address,
      shipping_phone: orderData.shipping_phone,
      notes: orderData.notes,
    });

    if (success) {
      setOrderDialogOpen(false);
      toast.success("تم إنشاء الطلب بنجاح");
    }
  };

  const approvedGoldsmiths = useMemo(
    () => goldsmiths.filter((g) => g.status === "approved"),
    [goldsmiths]
  );

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gold-gradient">متجر الذهب</h1>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            <span className="text-gold-gradient">منتجات الصايغين المعتمدين</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            تصفح تشكيلة واسعة من منتجات الذهب من أفضل الصايغين المعتمدين
          </p>
        </div>

        {/* Filters */}
        <Card className="glass-dark border-primary/20 shadow-gold mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن منتج أو صايغ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              {/* Karat Filter */}
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

              {/* Goldsmith Filter */}
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

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="الأحدث" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">الأحدث</SelectItem>
                  <SelectItem value="price-low">السعر: من الأقل للأعلى</SelectItem>
                  <SelectItem value="price-high">السعر: من الأعلى للأقل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        {loadingProducts ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <Card className="glass-dark border-primary/20">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">لا توجد منتجات</p>
              <p className="text-muted-foreground">سيتم إضافة المنتجات قريباً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedProducts.map((product) => (
              <Card
                key={product.id}
                className="glass-dark border-primary/20 shadow-gold hover:shadow-gold-lg transition-all"
              >
                <CardContent className="p-6">
                  {/* Product Image */}
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-6xl">🥇</span>
                    </div>
                  )}

                  {/* Goldsmith Info */}
                  {product.goldsmith && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-primary/10">
                      {product.goldsmith.logo_url ? (
                        <img
                          src={product.goldsmith.logo_url}
                          alt={product.goldsmith.shop_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
                          <span className="text-sm">🏪</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{product.goldsmith.shop_name}</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-muted-foreground">
                            {product.goldsmith.rating_average.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Info */}
                  <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                  <div className="space-y-1 mb-4 text-sm text-muted-foreground">
                    <p>الوزن: {product.weight_grams} جم</p>
                    <div className="flex items-center gap-2">
                      <p>العيار: {product.karat} قيراط</p>
                      <Badge variant="outline" className="text-xs">
                        {product.karat}K
                      </Badge>
                    </div>
                    <p>الكمية المتاحة: {product.quantity}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gold-gradient">
                      {(product.price + product.making_charge).toLocaleString("ar-EG")} ج.م
                    </p>
                    {product.making_charge > 0 && (
                      <p className="text-xs text-muted-foreground">
                        (السعر: {product.price.toLocaleString("ar-EG")} + المصنعية:{" "}
                        {product.making_charge.toLocaleString("ar-EG")})
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Buy Button */}
                  <Button
                    className="w-full bg-gold-gradient hover:opacity-90 gap-2"
                    onClick={() => handleOrder(product)}
                    disabled={product.quantity === 0}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {product.quantity === 0 ? "غير متاح" : "شراء الآن"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>إتمام الطلب</DialogTitle>
            <DialogDescription>يرجى ملء المعلومات المطلوبة لإتمام الطلب</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <Label>المنتج</Label>
                <p className="font-semibold">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  السعر: {(selectedProduct.price + selectedProduct.making_charge).toLocaleString("ar-EG")} ج.م
                </p>
              </div>
              <div>
                <Label htmlFor="quantity">الكمية</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedProduct.quantity}
                  value={orderData.quantity}
                  onChange={(e) =>
                    setOrderData({ ...orderData, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="shipping_address">عنوان الشحن</Label>
                <Textarea
                  id="shipping_address"
                  value={orderData.shipping_address}
                  onChange={(e) => setOrderData({ ...orderData, shipping_address: e.target.value })}
                  placeholder="أدخل عنوان الشحن الكامل"
                />
              </div>
              <div>
                <Label htmlFor="shipping_phone">رقم الهاتف</Label>
                <Input
                  id="shipping_phone"
                  type="tel"
                  value={orderData.shipping_phone}
                  onChange={(e) => setOrderData({ ...orderData, shipping_phone: e.target.value })}
                  placeholder="رقم الهاتف للتواصل"
                />
              </div>
              <div>
                <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                <Textarea
                  id="notes"
                  value={orderData.notes}
                  onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmitOrder}>إتمام الطلب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Store;
