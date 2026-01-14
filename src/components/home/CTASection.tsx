import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute top-20 right-20 w-40 h-40 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-primary/15 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gold-gradient mb-8 shadow-gold-lg animate-float">
            <Sparkles className="w-10 h-10 text-secondary" />
          </div>
          
          {/* Heading */}
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight">
            ابدأ استثمارك اليوم
            <br />
            <span className="text-gold-gradient">في أصول حقيقية</span>
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            انضم لآلاف المستثمرين الذين يثقون في FIS Gold لتنمية ثرواتهم
            من خلال الاستثمار في الذهب والفضة
          </p>

          {/* CTA Button */}
          <Button
            size="lg"
            className="bg-gold-gradient text-secondary font-black text-xl px-12 md:px-16 py-8 shadow-gold-lg hover:shadow-gold transition-all duration-300 hover:-translate-y-2 group"
          >
            <span>أنشئ حسابك الآن</span>
            <ArrowLeft className="w-6 h-6 mr-3 group-hover:-translate-x-2 transition-transform duration-300" />
          </Button>

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 mt-10">
            <div className="flex -space-x-3 space-x-reverse">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border-2 border-background flex items-center justify-center"
                >
                  <span className="text-xs">👤</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground font-medium">
              <span className="text-primary font-bold">+5,000</span> مستثمر يثقون بنا
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
