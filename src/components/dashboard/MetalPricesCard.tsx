import { RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { Skeleton } from "@/components/ui/skeleton";

const MetalPricesCard = () => {
  const { data: pricesData, isLoading, refetch, isFetching } = useMetalPrices();

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return "---";
    return Math.round(price).toLocaleString("ar-EG");
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.toLocaleDateString("ar-EG")} - ${date.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}`;
  };

  const lastUpdate = pricesData?.gold?.updated_at || pricesData?.silver?.updated_at;

  return (
    <Card className="glass-dark border-primary/20 shadow-gold">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gold-gradient">
            أسعار المعادن اليوم
          </CardTitle>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Gold Price */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🥇</span>
              <span className="text-sm font-medium text-muted-foreground">الذهب</span>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">شراء:</span>
                  <span className="text-lg font-bold text-green-400">
                    {formatPrice(pricesData?.gold?.buy_price_per_gram || pricesData?.gold?.price_per_gram)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">بيع:</span>
                  <span className="text-lg font-bold text-red-400">
                    {formatPrice(pricesData?.gold?.sell_price_per_gram)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Silver Price */}
          <div className="bg-gradient-to-br from-slate-400/10 to-gray-500/5 rounded-xl p-4 border border-slate-400/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🥈</span>
              <span className="text-sm font-medium text-muted-foreground">الفضة</span>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">شراء:</span>
                  <span className="text-lg font-bold text-green-400">
                    {formatPrice(pricesData?.silver?.buy_price_per_gram || pricesData?.silver?.price_per_gram)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">بيع:</span>
                  <span className="text-lg font-bold text-red-400">
                    {formatPrice(pricesData?.silver?.sell_price_per_gram)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {lastUpdate ? `آخر تحديث: ${formatDate(lastUpdate)}` : ""}
          </span>
          {pricesData?.is_cached && (
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>سعر محفوظ</span>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          الأسعار استرشادية ويتم اعتماد السعر النهائي وقت تنفيذ العملية
        </p>
      </CardContent>
    </Card>
  );
};

export default MetalPricesCard;