import MainLayout from "@/layouts/MainLayout";
import PackagesSection from "@/components/home/PackagesSection";
import CTASection from "@/components/home/CTASection";

const Packages = () => {
  return (
    <MainLayout>
      <div className="pt-20">
        <PackagesSection />
        <CTASection />
      </div>
    </MainLayout>
  );
};

export default Packages;
