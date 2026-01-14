import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import GoldParticles from "@/components/GoldParticles";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col relative">
      <GoldParticles />
      <Header />
      <main className="flex-1 relative z-10 pt-20 lg:pt-24">{children}</main>
      <Footer />
    </div>
  );
};

export default MainLayout;
