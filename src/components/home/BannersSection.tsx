import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Sparkles, TrendingUp, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  title: string;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  icon_name: string | null;
  gradient_from: string | null;
  gradient_via: string | null;
  gradient_to: string | null;
}

interface Banner {
  id: string;
  title: string;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  icon_name: string | null;
  gradient_from: string | null;
  gradient_via: string | null;
  gradient_to: string | null;
}

const BannersSection = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("banners")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (error) throw error;
        setBanners(data || []);
      } catch (error) {
        console.error("Error fetching banners:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextBanner = () => {
    if (banners.length === 0) return;
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    if (banners.length === 0) return;
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };

  if (loading || banners.length === 0) {
    return null; // Or show a loader/placeholder
  }

  const banner = banners[currentBanner];

  // Helper to render icon string to component if needed, or use default
  const renderIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'TrendingUp': return <TrendingUp className="w-8 h-8" />;
      case 'Sparkles': return <Sparkles className="w-8 h-8" />;
      default: return <Gift className="w-8 h-8" />;
    }
  };

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
            className={`relative rounded-2xl overflow-hidden p-8 md:p-12 min-h-[280px] flex items-center transition-all duration-500`}
            style={{
              backgroundImage: banner.image_url ? `url(${banner.image_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay if image exists to ensure text readability */}
            {banner.image_url && <div className="absolute inset-0 bg-black/50 z-0" />}

            {/* Gradient fallback if no image */}
            {!banner.image_url && (
              <div className={`absolute inset-0 bg-gradient-to-l from-${banner.gradient_from || 'amber-500'} via-${banner.gradient_via || 'yellow-500'} to-${banner.gradient_to || 'orange-500'} z-0`} />
            )}

            {/* Banner Content */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between w-full gap-6">
              <div className="flex-1 text-center md:text-right">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                  {renderIcon(banner.icon_name)}
                  <span className="text-white font-medium">عرض حصري</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  {banner.title}
                </h3>
                {banner.description && (
                  <p className="text-white/90 text-lg mb-6">
                    {banner.description}
                  </p>
                )}
                {banner.button_text && (
                  <Button
                    size="lg"
                    className="bg-white text-gray-900 hover:bg-white/90 font-bold shadow-xl"
                    asChild
                  >
                    <a href={banner.button_link || "#"}>{banner.button_text}</a>
                  </Button>
                )}
              </div>

              {/* Decorative Element - Only show if no image to avoid clutter */}
              {!banner.image_url && (
                <div className="hidden md:block">
                  <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                      {renderIcon(banner.icon_name)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/10 to-white/0 animate-shimmer pointer-events-none z-10" />
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={nextBanner}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-20"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={prevBanner}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-20"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {banners.map((_, index) => (
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
