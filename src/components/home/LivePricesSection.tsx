import { RefreshCw, AlertCircle } from "lucide-react";
import { useMetalPrices } from "@/hooks/useMetalPrices";
import { Skeleton } from "@/components/ui/skeleton";
import goldBarImage from "@/assets/gold-bar.png";
import silverBarImage from "@/assets/silver-bar.png";

const LivePricesSection = () => {
  const { data: pricesData, isLoading, error } = useMetalPrices();

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return "---";
    return Math.round(price).toLocaleString("ar-EG");
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.toLocaleDateString("ar-EG")} - ${date.toLocaleTimeString("ar-EG")}`;
  };

  const prices = [
    {
      name: "الذهب عيار 24",
      buyPricePerGram: pricesData?.gold?.buy_price_per_gram || pricesData?.gold?.price_per_gram,
      sellPricePerGram: pricesData?.gold?.sell_price_per_gram,
      gradient: "from-yellow-400 via-amber-500 to-yellow-600",
      bgGradient: "from-yellow-500/20 to-amber-600/10",
      image: goldBarImage,
    },
    {
      name: "الفضة",
      buyPricePerGram: pricesData?.silver?.buy_price_per_gram || pricesData?.silver?.price_per_gram,
      sellPricePerGram: pricesData?.silver?.sell_price_per_gram,
      gradient: "from-slate-300 via-gray-400 to-slate-500",
      bgGradient: "from-slate-400/20 to-gray-500/10",
      image: silverBarImage,
    },
  ];

  const lastUpdate = pricesData?.gold?.updated_at || pricesData?.silver?.updated_at;

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-bold text-sm md:text-base mb-4 tracking-wide">
            أسعار المعادن الثمينة
          </span>
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            <span className="text-gold-gradient">أسعار</span> اليوم
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            أسعار الذهب والفضة محدثة بالجنيه المصري
          </p>
        </div>

        {/* Prices Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-3xl mx-auto">
          {prices.map((item, index) => (
            <div
              key={item.name}
              className="group relative hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Card Background Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.bgGradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative bg-card rounded-3xl p-6 md:p-8 border-2 border-border hover:border-primary/40 transition-all duration-300 overflow-hidden">
                {/* Shimmer Effect */}
                <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative flex flex-col items-center text-center">
                  {/* Cached Badge */}
                  {pricesData?.is_cached && (
                    <div className="absolute top-0 left-0 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                      <AlertCircle className="w-3 h-3" />
                      محفوظ
                    </div>
                  )}
                  
                  {/* Image */}
                  <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center mb-6">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" 
                    />
                  </div>
                  
                  {/* Name */}
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {item.name}
                  </h3>
                  
                  {/* Prices */}
                  <div className="w-full space-y-3">
                    {isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                          <span className="text-sm font-medium text-muted-foreground">سعر الشراء:</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl md:text-3xl font-black text-green-400">
                              {formatPrice(item.buyPricePerGram)}
                            </span>
                            <span className="text-xs text-muted-foreground">ج/جم</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                          <span className="text-sm font-medium text-muted-foreground">سعر البيع:</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl md:text-3xl font-black text-red-400">
                              {formatPrice(item.sellPricePerGram)}
                            </span>
                            <span className="text-xs text-muted-foreground">ج/جم</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Last Update */}
        <div className="flex items-center justify-center gap-2 mt-10 text-muted-foreground">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {isLoading ? "جاري التحديث..." : lastUpdate ? `آخر تحديث: ${formatDate(lastUpdate)}` : ""}
          </span>
        </div>

        {/* Disclaimer */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground bg-muted/50 inline-block px-4 py-2 rounded-full">
            الأسعار استرشادية ويتم اعتماد السعر النهائي وقت تنفيذ العملية
          </p>
        </div>

        {/* Error Message */}
        {error && !pricesData && (
          <div className="text-center mt-4">
            <p className="text-sm text-destructive">
              يتم عرض آخر سعر متاح
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default LivePricesSection;