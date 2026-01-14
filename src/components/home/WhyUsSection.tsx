import { Coins, TrendingUp, Banknote, ListChecks, Headphones, Zap } from "lucide-react";

const WhyUsSection = () => {
  const reasons = [
    {
      icon: Coins,
      title: "ابدأ من 2,000 جنيه",
      description: "لا حاجة لرأس مال كبير - استثمر بالمبلغ الذي يناسبك",
      gradient: "from-amber-500 to-orange-600",
    },
    {
      icon: TrendingUp,
      title: "سحب بسعر السوق",
      description: "احصل على القيمة الحقيقية لاستثمارك بسعر يوم السحب",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Banknote,
      title: "خيارات سحب متعددة",
      description: "اختر استلام أموالك نقداً أو ذهباً أو فضة",
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: ListChecks,
      title: "باقات واضحة ومرنة",
      description: "نظام باقات شفاف بنسب خصم ومواعيد محددة مسبقاً",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      icon: Headphones,
      title: "دعم عربي متكامل",
      description: "فريق دعم فني متخصص جاهز لمساعدتك بالعربية",
      gradient: "from-primary to-amber-600",
    },
    {
      icon: Zap,
      title: "سرعة في التنفيذ",
      description: "إجراءات سريعة وفعالة لجميع معاملاتك الاستثمارية",
      gradient: "from-red-500 to-rose-600",
    },
  ];

  return (
    <section id="why-us" className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-bold text-sm md:text-base mb-4 tracking-wide">
            مميزاتنا الفريدة
          </span>
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            ليه تختار <span className="text-gold-gradient">FIS Gold</span>؟
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            مزايا حصرية تجعلنا الخيار الأمثل للاستثمار في المعادن الثمينة
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {reasons.map((item, index) => (
            <div
              key={item.title}
              className="group bg-card rounded-3xl p-6 md:p-8 border-2 border-border hover:border-primary/40 transition-all duration-300 hover-lift"
            >
              <div className={`w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-xl mb-3">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUsSection;
