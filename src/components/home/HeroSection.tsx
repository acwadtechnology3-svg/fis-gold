import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartInvesting = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleViewPackages = () => {
    navigate('/investment-plans');
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-hero-pattern" />

      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[80px]" />
      </div>

      {/* Floating Gold Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/40 rounded-full animate-float"
            style={{
              top: `${20 + i * 15}%`,
              left: `${10 + i * 15}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Logo Animation */}
          <div className="mb-8 animate-fade-up">
            <img src={logo} alt="FIS Gold" className="h-24 md:h-32 w-auto mx-auto glow-gold animate-float" />
          </div>

          {/* Badge */}
          <div
            className="inline-flex items-center gap-3 glass-dark rounded-full px-6 py-3 mb-8 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-primary font-bold text-sm md:text-base">منصة استثمارية موثوقة ومرخصة</span>
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>

          {/* Main Heading */}
          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-black text-secondary-foreground mb-8 leading-tight animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            استثمر في <span className="text-gold-gradient inline-block">الذهب والفضة</span>
            <br />
            <span className="text-3xl md:text-5xl lg:text-6xl">بثقة وأمان تام</span>
          </h1>

          {/* Subheading */}
          <p
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            محفظة استثمارية احترافية تتيح لك الاستثمار بمبالغ تبدأ من{" "}
            <span className="text-primary font-bold">مبالغ تناسبك </span> وسحب استثمارك بسعر السوق الحقيقي في أي وقت
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            <Button
              size="lg"
              onClick={handleStartInvesting}
              className="bg-gold-gradient text-secondary font-black text-lg px-10 py-7 shadow-gold-lg hover:shadow-gold transition-all duration-300 hover:-translate-y-1 group w-full sm:w-auto"
            >
              <span>ابدأ الاستثمار الآن</span>
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-2 transition-transform duration-300" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleViewPackages}
              className="border-2 border-primary/50 text-primary hover:bg-primary/10 hover:border-primary font-bold text-lg px-10 py-7 transition-all duration-300 w-full sm:w-auto"
            >
              تعرّف على الباقات
            </Button>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto animate-fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            {[
              { value: "+5,000", label: "مستثمر نشط", icon: TrendingUp },
              { value: "+50M", label: "جنيه إيداعات", icon: Sparkles },
              { value: "100%", label: "شفافية كاملة", icon: Shield },
            ].map((stat, index) => (
              <div key={stat.label} className="glass-dark rounded-2xl p-4 md:p-6 hover-lift group">
                <stat.icon className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-2xl md:text-4xl font-black text-gold-gradient mb-1">{stat.value}</div>
                <div className="text-muted-foreground text-xs md:text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
    </section>
  );
};

export default HeroSection;
