import MainLayout from "@/layouts/MainLayout";
import WhyUsSection from "@/components/home/WhyUsSection";
import TrustSection from "@/components/home/TrustSection";
import CTASection from "@/components/home/CTASection";

const WhyUs = () => {
  return (
    <MainLayout>
      <div className="pt-20">
        <WhyUsSection />
        <TrustSection />
        <CTASection />
      </div>
    </MainLayout>
  );
};

export default WhyUs;
