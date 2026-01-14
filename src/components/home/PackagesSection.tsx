import { Check, Star, Sparkles, Crown, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const PackagesSection = () => {
  const packages = [
    {
      name: "باقة سنة",
      duration: "12 شهر",
      discount: "5%",
      reviewTime: "1-45 يوم",
      icon: Award,
      features: [
        "استثمار يبدأ من 2,000 جنيه",
        "سحب نقدي أو ذهب أو فضة",
        "تقارير شهرية مفصّلة",
        "دعم عربي متكامل",
      ],
      popular: false,
      gradient: "from-slate-600 to-slate-800",
    },
    {
      name: "باقة سنتين",
      duration: "24 شهر",
      discount: "2%",
      reviewTime: "1-30 يوم",
      icon: Crown,
      features: [
        "استثمار يبدأ من 2,000 جنيه",
        "سحب نقدي أو ذهب أو فضة",
        "تقارير شهرية مفصّلة",
        "دعم عربي متكامل",
        "أولوية في المراجعة",
      ],
      popular: true,
      gradient: "from-primary to-amber-600",
    },
    {
      name: "باقة 3 سنوات",
      duration: "36 شهر",
      discount: "1%",
      reviewTime: "1-15 يوم",
      icon: Sparkles,
      features: [
        "استثمار يبدأ من 2,000 جنيه",
        "سحب نقدي أو ذهب أو فضة",
        "تقارير شهرية مفصّلة",
        "دعم عربي متكامل",
        "أولوية قصوى في المراجعة",
        "مستشار استثماري شخصي",
      ],
      popular: false,
      gradient: "from-emerald-600 to-green-700",
    },
  ];

  return (
    <section id="packages" className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-bold text-sm md:text-base mb-4 tracking-wide">
            خطط مرنة تناسب الجميع
          </span>
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            <span className="text-gold-gradient">باقات</span> الاستثمار
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            اختر الباقة التي تناسب أهدافك الاستثمارية واستفد من مزايا حصرية
          </p>
        </div>

        {/* Packages Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
          {packages.map((pkg, index) => (
            <div
              key={pkg.name}
              className={`relative group ${pkg.popular ? 'md:-mt-4 md:mb-4' : ''}`}
            >
              {/* Popular Glow Effect */}
              {pkg.popular && (
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-amber-500 to-primary rounded-[2rem] blur-lg opacity-50 group-hover:opacity-75 transition-opacity animate-pulse" />
              )}
              
              <div className={`relative h-full bg-card rounded-3xl p-6 md:p-8 border-2 transition-all duration-300 hover-lift overflow-hidden ${
                pkg.popular
                  ? "border-primary shadow-gold-lg"
                  : "border-border hover:border-primary/40"
              }`}>
                {/* Popular Badge */}
                {pkg.popular && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2">
                    <div className="bg-gold-gradient text-secondary font-black text-sm px-6 py-2 rounded-b-xl flex items-center gap-2 shadow-lg">
                      <Star className="w-4 h-4 fill-current" />
                      الأكثر طلباً
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-16 h-16 mx-auto mb-6 mt-4 rounded-2xl bg-gradient-to-br ${pkg.gradient} flex items-center justify-center shadow-xl`}>
                  <pkg.icon className="w-8 h-8 text-white" />
                </div>

                {/* Package Name */}
                <h3 className="text-2xl font-black mb-2 text-center">{pkg.name}</h3>
                <p className="text-muted-foreground text-center mb-6 font-medium">{pkg.duration}</p>

                {/* Key Info */}
                <div className="space-y-4 mb-6 pb-6 border-b-2 border-border">
                  <div className="flex justify-between items-center bg-muted/50 rounded-xl p-3">
                    <span className="text-muted-foreground font-medium">نسبة الخصم</span>
                    <span className="font-black text-xl text-primary">{pkg.discount}</span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 rounded-xl p-3">
                    <span className="text-muted-foreground font-medium">وقت المراجعة</span>
                    <span className="font-bold text-foreground">{pkg.reviewTime}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        pkg.popular ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <Check className={`w-4 h-4 ${pkg.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <span className="text-sm font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full font-bold text-base py-6 transition-all duration-300 ${
                    pkg.popular
                      ? "bg-gold-gradient text-secondary shadow-gold hover:shadow-gold-lg hover:-translate-y-1"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  }`}
                >
                  اشترك الآن
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PackagesSection;
