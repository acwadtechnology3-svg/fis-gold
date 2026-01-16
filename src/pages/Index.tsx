import Header from "@/components/home/Header";
import HeroSection from "@/components/home/HeroSection";
import LivePricesSection from "@/components/home/LivePricesSection";
import BannersSection from "@/components/home/BannersSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/home/Footer";
import GoldParticles from "@/components/GoldParticles";
import PartnersCarousel from "@/components/PartnersCarousel";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle OAuth errors from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = params.get('error') || hashParams.get('error');
    const errorDescription = params.get('error_description') || hashParams.get('error_description');

    if (error) {
      const errorMsg = decodeURIComponent(errorDescription || error || 'Unknown error');
      toast({
        variant: "destructive",
        title: "خطأ في المصادقة",
        description: errorMsg.includes('Unable to exchange external code')
          ? "فشل في تبادل رمز المصادقة. يرجى التحقق من إعدادات Google OAuth في Supabase."
          : errorMsg,
      });

      // Clean up URL after showing error
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [toast]);



  return (
    <div className="min-h-screen relative">
      <GoldParticles />
      <Header />
      <main className="relative z-10">
        <HeroSection />
        <LivePricesSection />
        <BannersSection />
        <PartnersCarousel />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
