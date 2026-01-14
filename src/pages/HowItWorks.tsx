import MainLayout from "@/layouts/MainLayout";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import CTASection from "@/components/home/CTASection";

const HowItWorks = () => {
  return (
    <MainLayout>
      <div className="pt-20">
        <HowItWorksSection />
        <CTASection />
      </div>
    </MainLayout>
  );
};

export default HowItWorks;
