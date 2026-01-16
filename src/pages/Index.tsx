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

  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (!user || loading) return;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_active, phone, first_name, last_name")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error checking profile:", error);
          return;
        }

        const isComplete = profile?.phone && profile?.first_name && profile?.last_name;

        if (!isComplete) {
          // New User / Incomplete -> Complete Profile
          navigate("/complete-profile");
        } else {
          // Existing User -> Dashboard
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error in profile check:", error);
      }
    };

    if (user && !loading) {
      checkProfileAndRedirect();
    }
  }, [user, loading, navigate]);

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
