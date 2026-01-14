import { UserPlus, Wallet, CircleDollarSign, ArrowLeft } from "lucide-react";

const HowItWorksSection = () => {
  const steps = [
    {
      icon: UserPlus,
      title: "سجّل واختر الباقة",
      description: "أنشئ حسابك في دقائق معدودة واختر باقة الاستثمار المناسبة لأهدافك",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Wallet,
      title: "أودِع المبلغ",
      description: "أودِع المبلغ بسهولة وسيتم تحويله تلقائياً إلى ذهب أو فضة بسعر اليوم",
      color: "from-primary to-amber-600",
    },
    {
      icon: CircleDollarSign,
      title: "اسحب في أي وقت",
      description: "اسحب استثمارك وقتما تشاء نقداً أو ذهباً أو فضة بسعر السوق الفعلي",
      color: "from-green-500 to-emerald-600",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-primary/15 rounded-full blur-[80px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-bold text-sm md:text-base mb-4 tracking-wide">
            خطوات بسيطة
          </span>
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            كيف يعمل <span className="text-gold-gradient">FIS Gold</span>؟
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            ثلاث خطوات بسيطة لبدء رحلتك الاستثمارية في المعادن الثمينة
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto relative">
          {/* Connection Lines */}
          <div className="hidden md:block absolute top-24 right-[calc(33.33%-20px)] left-[calc(33.33%-20px)] h-1 bg-gradient-to-l from-primary/50 via-primary to-primary/50 rounded-full" />

          {steps.map((item, index) => (
            <div 
              key={item.title} 
              className="relative group"
            >
              <div className="bg-card rounded-3xl p-8 border-2 border-border hover:border-primary/40 transition-all duration-300 hover-lift text-center relative overflow-hidden h-full">
                {/* Step Number */}
                <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center">
                  <span className="text-secondary font-black text-lg">
                    {(index + 1).toLocaleString("ar-EG")}
                  </span>
                </div>
                
                {/* Icon */}
                <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-12 h-12 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-2xl font-bold mb-4 text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-base">
                  {item.description}
                </p>
              </div>
              
              {/* Arrow for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute -left-4 top-24 -translate-y-1/2 w-8 h-8 bg-primary rounded-full items-center justify-center z-10">
                  <ArrowLeft className="w-4 h-4 text-secondary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
