import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGoldsmiths } from "@/hooks/useGoldsmiths";
import { useProducts } from "@/hooks/useProducts";
import { useOrders } from "@/hooks/useOrders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldX, Settings, Package, ShoppingCart, Star } from "lucide-react";
import GoldParticles from "@/components/GoldParticles";
import { GoldsmithProfile } from "@/components/goldsmith/GoldsmithProfile";
import { GoldsmithProducts } from "@/components/goldsmith/GoldsmithProducts";
import { GoldsmithOrders } from "@/components/goldsmith/GoldsmithOrders";

const GoldsmithDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { currentGoldsmith, loading, fetchMyGoldsmith } = useGoldsmiths();
  const { products, fetchProducts } = useProducts(currentGoldsmith?.id);
  const { orders, fetchOrders } = useOrders(currentGoldsmith?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyGoldsmith();
    }
  }, [user]);

  useEffect(() => {
    if (currentGoldsmith?.id) {
      fetchProducts(currentGoldsmith.id);
      fetchOrders(currentGoldsmith.id);
    }
  }, [currentGoldsmith?.id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentGoldsmith) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldX className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">ليس لديك حساب صايغ</h1>
        <p className="text-muted-foreground">يرجى التسجيل كصايغ معتمد أولاً</p>
        <Button onClick={() => navigate("/goldsmith/register")}>
          التسجيل كصايغ
        </Button>
      </div>
    );
  }

  if (currentGoldsmith.status !== "approved") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        <h1 className="text-2xl font-bold">
          {currentGoldsmith.status === "pending"
            ? "قيد المراجعة"
            : currentGoldsmith.status === "rejected"
            ? "تم رفض الطلب"
            : "تم تعليق الحساب"}
        </h1>
        <p className="text-muted-foreground">
          {currentGoldsmith.status === "pending"
            ? "جاري مراجعة طلبك من قبل الإدارة"
            : currentGoldsmith.admin_notes || "يرجى التواصل مع الإدارة"}
        </p>
      </div>
    );
  }

  const stats = [
    {
      title: "المنتجات",
      value: products.length,
      icon: Package,
      color: "text-blue-400",
    },
    {
      title: "الطلبات",
      value: orders.length,
      icon: ShoppingCart,
      color: "text-green-400",
    },
    {
      title: "التقييم",
      value: currentGoldsmith.rating_average.toFixed(1),
      icon: Star,
      color: "text-yellow-400",
    },
    {
      title: "عدد التقييمات",
      value: currentGoldsmith.rating_count,
      icon: Star,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="min-h-screen bg-hero-pattern relative" dir="rtl">
      <GoldParticles />
      <div className="container mx-auto py-6 px-4 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gold-gradient">
              لوحة تحكم الصايغ
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentGoldsmith.shop_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
              ✓ صايغ معتمد
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="glass-dark border-primary/20 shadow-gold">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full bg-secondary`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gold-gradient">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="products">المنتجات</TabsTrigger>
            <TabsTrigger value="orders">الطلبات</TabsTrigger>
            <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            <GoldsmithProducts
              goldsmithId={currentGoldsmith.id}
              products={products}
              onRefresh={fetchProducts}
            />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <GoldsmithOrders
              orders={orders}
              onRefresh={fetchOrders}
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <GoldsmithProfile
              goldsmith={currentGoldsmith}
              onUpdate={fetchMyGoldsmith}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GoldsmithDashboard;
