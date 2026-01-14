import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGoldsmiths } from "@/hooks/useGoldsmiths";
import { useProducts } from "@/hooks/useProducts";
import { useOrders } from "@/hooks/useOrders";
import { GoldsmithReviews } from "@/components/goldsmith/GoldsmithReviews";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, MapPin, Phone, ShoppingCart, ArrowRight } from "lucide-react";
import GoldParticles from "@/components/GoldParticles";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import MainLayout from "@/layouts/MainLayout";

const GoldsmithProductsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { goldsmiths, fetchGoldsmiths, loading: goldsmithsLoading } = useGoldsmiths();
  const { products, fetchProducts } = useProducts(id);
  const { createOrder } = useOrders();
  const [goldsmith, setGoldsmith] = useState<any>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [orderData, setOrderData] = useState({
    quantity: 1,
    shipping_address: "",
    shipping_phone: "",
    notes: "",
  });

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        await fetchGoldsmiths("approved");
      };
      loadData();
      fetchProducts(id);
    }
  }, [id]);

  useEffect(() => {
    if (id && goldsmiths.length > 0) {
      const found = goldsmiths.find((g) => g.id === id);
      if (found) {
        setGoldsmith(found);
      }
    }
  }, [id, goldsmiths]);

  const handleOrder = (product: any) => {
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
    if (!selectedProduct || !id) return;

    if (!orderData.shipping_address || !orderData.shipping_phone) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const success = await createOrder({
      goldsmith_id: id,
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

  if (!goldsmith) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hero-pattern">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 relative z-10">
        {/* Goldsmith Info */}
        <Card className="glass-dark border-primary/20 shadow-gold mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {goldsmith.logo_url ? (
                  <img
                    src={goldsmith.logo_url}
                    alt={goldsmith.shop_name}
                    className="w-32 h-32 object-cover rounded-full border-4 border-gold-gradient"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-4 border-gold-gradient flex items-center justify-center">
                    <span className="text-4xl">🏪</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-3xl font-bold text-gold-gradient">
                        {goldsmith.shop_name}
                      </h1>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        ✓ معتمد
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{goldsmith.name}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">
                    {goldsmith.rating_average.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({goldsmith.rating_count} تقييم)
                  </span>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{goldsmith.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{goldsmith.phone}</span>
                  </div>
                </div>

                {/* Description */}
                {goldsmith.description && (
                  <p className="text-muted-foreground">{goldsmith.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gold-gradient">المنتجات</h2>
          {products.length === 0 ? (
            <Card className="glass-dark border-primary/20">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">لا توجد منتجات متاحة حالياً</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products
                .filter((p) => p.is_active)
                .map((product) => (
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

                      {/* Product Info */}
                      <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                      <div className="space-y-1 mb-4 text-sm text-muted-foreground">
                        <p>الوزن: {product.weight_grams} جم</p>
                        <p>العيار: {product.karat} قيراط</p>
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

        {/* Reviews */}
        <div className="mt-8">
          <GoldsmithReviews goldsmithId={id || ""} canReview={true} />
        </div>
      </div>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>إنشاء طلب شراء</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} -{" "}
              {(selectedProduct?.price + selectedProduct?.making_charge).toLocaleString("ar-EG")}{" "}
              ج.م
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">الكمية</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedProduct?.quantity}
                value={orderData.quantity}
                onChange={(e) =>
                  setOrderData({ ...orderData, quantity: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_address">عنوان الشحن *</Label>
              <Textarea
                id="shipping_address"
                value={orderData.shipping_address}
                onChange={(e) =>
                  setOrderData({ ...orderData, shipping_address: e.target.value })
                }
                required
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_phone">رقم الهاتف *</Label>
              <Input
                id="shipping_phone"
                type="tel"
                value={orderData.shipping_phone}
                onChange={(e) =>
                  setOrderData({ ...orderData, shipping_phone: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={orderData.notes}
                onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">المبلغ الإجمالي:</p>
              <p className="text-2xl font-bold text-gold-gradient">
                {selectedProduct
                  ? (
                    (selectedProduct.price + selectedProduct.making_charge) *
                    orderData.quantity
                  ).toLocaleString("ar-EG")
                  : 0}{" "}
                ج.م
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSubmitOrder} className="bg-gold-gradient">
              تأكيد الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default GoldsmithProductsPage;
