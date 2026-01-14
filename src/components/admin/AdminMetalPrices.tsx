import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Save, TrendingUp } from "lucide-react";
import { useActivityLog } from "@/hooks/useActivityLog";

export const AdminMetalPrices = () => {
  const { data: pricesData, isLoading, refetch } = useMetalPrices();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [updating, setUpdating] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [directPrices, setDirectPrices] = useState<{ gold: any; silver: any } | null>(null);

  const [goldBuyPrice, setGoldBuyPrice] = useState("");
  const [goldSellPrice, setGoldSellPrice] = useState("");
  const [silverBuyPrice, setSilverBuyPrice] = useState("");
  const [silverSellPrice, setSilverSellPrice] = useState("");

  // Fetch prices directly from database
  const fetchPricesDirectly = async () => {
    setLoadingPrices(true);
    try {
      const { data, error } = await supabase.rpc("get_latest_metal_prices");
      if (error) throw error;
      
      if (data && data.length > 0) {
        const goldPrice = data.find((p: any) => p.metal_type === 'gold');
        const silverPrice = data.find((p: any) => p.metal_type === 'silver');
        
        // Transform to match the expected format
        const transformedPrices = {
          gold: goldPrice ? {
            price_per_gram: Number(goldPrice.buy_price_per_gram || goldPrice.price_per_gram),
            buy_price_per_gram: Number(goldPrice.buy_price_per_gram),
            sell_price_per_gram: Number(goldPrice.sell_price_per_gram),
            price_per_ounce: Number(goldPrice.buy_price_per_ounce || goldPrice.price_per_ounce),
            buy_price_per_ounce: Number(goldPrice.buy_price_per_ounce),
            sell_price_per_ounce: Number(goldPrice.sell_price_per_ounce),
            source: goldPrice.source,
            updated_at: goldPrice.updated_at
          } : null,
          silver: silverPrice ? {
            price_per_gram: Number(silverPrice.buy_price_per_gram || silverPrice.price_per_gram),
            buy_price_per_gram: Number(silverPrice.buy_price_per_gram),
            sell_price_per_gram: Number(silverPrice.sell_price_per_gram),
            price_per_ounce: Number(silverPrice.buy_price_per_ounce || silverPrice.price_per_ounce),
            buy_price_per_ounce: Number(silverPrice.buy_price_per_ounce),
            sell_price_per_ounce: Number(silverPrice.sell_price_per_ounce),
            source: silverPrice.source,
            updated_at: silverPrice.updated_at
          } : null,
        };
        
        setDirectPrices(transformedPrices);
      }
    } catch (error) {
      console.error("Error fetching prices directly:", error);
    } finally {
      setLoadingPrices(false);
    }
  };

  // Fetch prices on component mount
  useEffect(() => {
    fetchPricesDirectly();
  }, []);

  // Use direct prices if available, otherwise use hook data
  const currentPrices = directPrices || pricesData;
  const isCurrentlyLoading = loadingPrices || isLoading;

  // Initialize form with current prices
  useEffect(() => {
    if (currentPrices?.gold) {
      setGoldBuyPrice((currentPrices.gold.buy_price_per_gram || currentPrices.gold.price_per_gram || 0).toString());
      setGoldSellPrice((currentPrices.gold.sell_price_per_gram || 0).toString());
    }
    if (currentPrices?.silver) {
      setSilverBuyPrice((currentPrices.silver.buy_price_per_gram || currentPrices.silver.price_per_gram || 0).toString());
      setSilverSellPrice((currentPrices.silver.sell_price_per_gram || 0).toString());
    }
  }, [currentPrices]);

  const handleUpdatePrices = async () => {
    if (!goldBuyPrice || !goldSellPrice || !silverBuyPrice || !silverSellPrice) {
      toast.error("يرجى إدخال جميع الأسعار (شراء وبيع)");
      return;
    }

    const goldBuy = parseFloat(goldBuyPrice);
    const goldSell = parseFloat(goldSellPrice);
    const silverBuy = parseFloat(silverBuyPrice);
    const silverSell = parseFloat(silverSellPrice);

    if (
      isNaN(goldBuy) || isNaN(goldSell) || isNaN(silverBuy) || isNaN(silverSell) ||
      goldBuy <= 0 || goldSell <= 0 || silverBuy <= 0 || silverSell <= 0
    ) {
      toast.error("يرجى إدخال أسعار صحيحة");
      return;
    }

    if (goldSell >= goldBuy) {
      toast.error("سعر بيع الذهب يجب أن يكون أقل من سعر الشراء");
      return;
    }

    if (silverSell >= silverBuy) {
      toast.error("سعر بيع الفضة يجب أن يكون أقل من سعر الشراء");
      return;
    }

    setUpdating(true);

    try {
      const OUNCE_TO_GRAMS = 31.1035;

      // Update gold prices
      const { error: goldError } = await supabase.from("metal_prices").insert({
        metal_type: "gold",
        price_per_gram: goldBuy, // Backward compatibility
        buy_price_per_gram: goldBuy,
        sell_price_per_gram: goldSell,
        price_per_ounce: goldBuy * OUNCE_TO_GRAMS, // Backward compatibility
        buy_price_per_ounce: goldBuy * OUNCE_TO_GRAMS,
        sell_price_per_ounce: goldSell * OUNCE_TO_GRAMS,
        source: "manual",
      });

      if (goldError) {
        throw goldError;
      }

      // Update silver prices
      const { error: silverError } = await supabase.from("metal_prices").insert({
        metal_type: "silver",
        price_per_gram: silverBuy, // Backward compatibility
        buy_price_per_gram: silverBuy,
        sell_price_per_gram: silverSell,
        price_per_ounce: silverBuy * OUNCE_TO_GRAMS, // Backward compatibility
        buy_price_per_ounce: silverBuy * OUNCE_TO_GRAMS,
        sell_price_per_ounce: silverSell * OUNCE_TO_GRAMS,
        source: "manual",
      });

      if (silverError) {
        throw silverError;
      }

      // Log activity
      await logActivity(
        "prices_updated",
        "price",
        null,
        `تم تحديث أسعار المعادن: ذهب شراء ${goldBuy} ج/جم بيع ${goldSell} ج/جم، فضة شراء ${silverBuy} ج/جم بيع ${silverSell} ج/جم`,
        { 
          gold_buy: goldBuy, 
          gold_sell: goldSell,
          silver_buy: silverBuy, 
          silver_sell: silverSell 
        }
      );

      toast.success("تم تحديث الأسعار بنجاح");
      
      // Invalidate and refetch metal prices query to update all components (cache-aside pattern)
      await queryClient.invalidateQueries({ queryKey: queryKeys.metalPrices });
      refetch();
      // Also fetch directly from database
      await fetchPricesDirectly();
    } catch (error: any) {
      console.error("Error updating prices:", error);
      toast.error("حدث خطأ في تحديث الأسعار: " + (error.message || "خطأ غير معروف"));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card className="glass-dark border-primary/20 shadow-gold">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gold-gradient">
          <TrendingUp className="w-5 h-5 text-primary" />
          إدارة أسعار المعادن
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Prices Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gold Prices */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🥇</span>
              <span className="text-sm font-medium text-muted-foreground">أسعار الذهب الحالية</span>
            </div>
            {isCurrentlyLoading ? (
              <div className="space-y-2">
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">سعر الشراء:</span>
                  <span className="text-xl font-bold text-green-400">
                    {currentPrices?.gold?.buy_price_per_gram || currentPrices?.gold?.price_per_gram
                      ? Math.round((currentPrices.gold.buy_price_per_gram || currentPrices.gold.price_per_gram)).toLocaleString("ar-EG")
                      : "---"}
                    <span className="text-xs text-muted-foreground mr-1">ج/جم</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">سعر البيع:</span>
                  <span className="text-xl font-bold text-red-400">
                    {currentPrices?.gold?.sell_price_per_gram
                      ? Math.round(currentPrices.gold.sell_price_per_gram).toLocaleString("ar-EG")
                      : "---"}
                    <span className="text-xs text-muted-foreground mr-1">ج/جم</span>
                  </span>
                </div>
              </div>
            )}
            {currentPrices?.gold?.source && (
              <p className="text-xs text-muted-foreground mt-2">
                المصدر: {currentPrices.gold.source === "manual" ? "يدوي" : "تلقائي"}
              </p>
            )}
          </div>

          {/* Silver Prices */}
          <div className="bg-gradient-to-br from-slate-400/10 to-gray-500/5 rounded-xl p-4 border border-slate-400/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🥈</span>
              <span className="text-sm font-medium text-muted-foreground">أسعار الفضة الحالية</span>
            </div>
            {isCurrentlyLoading ? (
              <div className="space-y-2">
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">سعر الشراء:</span>
                  <span className="text-xl font-bold text-green-400">
                    {currentPrices?.silver?.buy_price_per_gram || currentPrices?.silver?.price_per_gram
                      ? Math.round((currentPrices.silver.buy_price_per_gram || currentPrices.silver.price_per_gram)).toLocaleString("ar-EG")
                      : "---"}
                    <span className="text-xs text-muted-foreground mr-1">ج/جم</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">سعر البيع:</span>
                  <span className="text-xl font-bold text-red-400">
                    {currentPrices?.silver?.sell_price_per_gram
                      ? Math.round(currentPrices.silver.sell_price_per_gram).toLocaleString("ar-EG")
                      : "---"}
                    <span className="text-xs text-muted-foreground mr-1">ج/جم</span>
                  </span>
                </div>
              </div>
            )}
            {currentPrices?.silver?.source && (
              <p className="text-xs text-muted-foreground mt-2">
                المصدر: {currentPrices.silver.source === "manual" ? "يدوي" : "تلقائي"}
              </p>
            )}
          </div>
        </div>

        {/* Update Prices Form */}
        <div className="space-y-4 border-t border-primary/20 pt-4">
          <h3 className="text-lg font-semibold">تحديث الأسعار يدوياً</h3>
          
          {/* Gold Prices */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gold-gradient flex items-center gap-2">
              <span>🥇</span> أسعار الذهب
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gold-buy-price">سعر الشراء (ج/جم)</Label>
                <Input
                  id="gold-buy-price"
                  type="number"
                  step="0.01"
                  value={goldBuyPrice}
                  onChange={(e) => setGoldBuyPrice(e.target.value)}
                  placeholder={(currentPrices?.gold?.buy_price_per_gram || currentPrices?.gold?.price_per_gram || 0).toString()}
                  className="border-green-500/30 focus:border-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gold-sell-price">سعر البيع (ج/جم)</Label>
                <Input
                  id="gold-sell-price"
                  type="number"
                  step="0.01"
                  value={goldSellPrice}
                  onChange={(e) => setGoldSellPrice(e.target.value)}
                  placeholder={(currentPrices?.gold?.sell_price_per_gram || 0).toString()}
                  className="border-red-500/30 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Silver Prices */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span>🥈</span> أسعار الفضة
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="silver-buy-price">سعر الشراء (ج/جم)</Label>
                <Input
                  id="silver-buy-price"
                  type="number"
                  step="0.01"
                  value={silverBuyPrice}
                  onChange={(e) => setSilverBuyPrice(e.target.value)}
                  placeholder={(currentPrices?.silver?.buy_price_per_gram || currentPrices?.silver?.price_per_gram || 0).toString()}
                  className="border-green-500/30 focus:border-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="silver-sell-price">سعر البيع (ج/جم)</Label>
                <Input
                  id="silver-sell-price"
                  type="number"
                  step="0.01"
                  value={silverSellPrice}
                  onChange={(e) => setSilverSellPrice(e.target.value)}
                  placeholder={(currentPrices?.silver?.sell_price_per_gram || 0).toString()}
                  className="border-red-500/30 focus:border-red-500"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleUpdatePrices}
              disabled={updating}
              className="gap-2 bg-gold-gradient hover:opacity-90"
            >
              <Save className="w-4 h-4" />
              {updating ? "جاري الحفظ..." : "حفظ الأسعار"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                refetch();
                fetchPricesDirectly();
              }}
              disabled={isCurrentlyLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isCurrentlyLoading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Price History */}
        <div className="border-t border-primary/20 pt-4">
          <h3 className="text-lg font-semibold mb-2">سجل التحديثات</h3>
          <p className="text-sm text-muted-foreground">
            يتم حفظ جميع تحديثات الأسعار في قاعدة البيانات
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
