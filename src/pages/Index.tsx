import Header from "@/components/home/Header";
import HeroSection from "@/components/home/HeroSection";
import LivePricesSection from "@/components/home/LivePricesSection";
import BannersSection from "@/components/home/BannersSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/home/Footer";
import GoldParticles from "@/components/GoldParticles";
import PartnersCarousel from "@/components/PartnersCarousel";

const Index = () => {
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
