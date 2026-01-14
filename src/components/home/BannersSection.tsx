import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Sparkles, TrendingUp, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Banner {
  id: number;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  icon: React.ReactNode;
  gradient: string;
}

const mockBanners: Banner[] = [
  {
    id: 1,
    title: "عرض خاص للمستثمرين الجدد",
    description: "احصل على خصم 50% على رسوم السحب عند الاشتراك في باقة 3 سنوات",
    buttonText: "استفد من العرض",
    buttonLink: "/packages",
    icon: <Gift className="w-8 h-8" />,
    gradient: "from-amber-500 via-yellow-500 to-orange-500",
  },
  {
    id: 2,
    title: "الذهب يرتفع بنسبة 15%",
    description: "استثمر الآن واستفد من ارتفاع أسعار الذهب العالمية",
    buttonText: "ابدأ الاستثمار",
    buttonLink: "/packages",
    icon: <TrendingUp className="w-8 h-8" />,
    gradient: "from-yellow-400 via-amber-500 to-yellow-600",
  },
  {
    id: 3,
    title: "باقة الفضة الجديدة",
    description: "استثمر في الفضة بعوائد مميزة وخيارات سحب مرنة",
    buttonText: "اكتشف المزيد",
    buttonLink: "/packages",
    icon: <Sparkles className="w-8 h-8" />,
    gradient: "from-slate-400 via-gray-300 to-slate-500",
  },
];

const BannersSection = () => {
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % mockBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % mockBanners.length);
  };

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + mockBanners.length) % mockBanners.length);
  };

  const banner = mockBanners[currentBanner];

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-secondary/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 right-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/50 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gold-gradient">العروض والإعلانات</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            اكتشف أحدث العروض والفرص الاستثمارية
          </p>
        </div>

        {/* Banner Carousel */}
        <div className="relative max-w-4xl mx-auto">
          <div
            className={`relative rounded-2xl overflow-hidden bg-gradient-to-l ${banner.gradient} p-8 md:p-12 min-h-[280px] flex items-center transition-all duration-500`}
          >
            {/* Banner Content */}
            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-6">
              <div className="flex-1 text-center md:text-right">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                  {banner.icon}
                  <span className="text-white font-medium">عرض حصري</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  {banner.title}
                </h3>
                <p className="text-white/90 text-lg mb-6">
                  {banner.description}
                </p>
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-white/90 font-bold shadow-xl"
                >
                  {banner.buttonText}
                </Button>
              </div>

              {/* Decorative Element */}
              <div className="hidden md:block">
                <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                    {banner.icon}
                  </div>
                </div>
              </div>
            </div>

            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/10 to-white/0 animate-shimmer pointer-events-none" />
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={nextBanner}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={prevBanner}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {mockBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentBanner
                    ? "bg-primary w-8"
                    : "bg-primary/30 hover:bg-primary/50"
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BannersSection;
