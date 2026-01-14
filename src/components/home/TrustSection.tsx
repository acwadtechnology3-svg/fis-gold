import { Shield, FileCheck, Building, Users, Eye, Lock } from "lucide-react";

const TrustSection = () => {
  const trustItems = [
    {
      icon: Shield,
      title: "ذهب وفضة حقيقيين",
      description: "استثمارك مدعوم بمعادن ثمينة فعلية ومحفوظة بأمان",
    },
    {
      icon: FileCheck,
      title: "عقود رسمية موثقة",
      description: "جميع المعاملات موثقة بعقود قانونية معتمدة",
    },
    {
      icon: Building,
      title: "مقر رسمي",
      description: "مقر فعلي يمكنك زيارته والتحقق من استثمارك",
    },
    {
      icon: Users,
      title: "فريق محترف",
      description: "خبراء في الاستثمار والمعادن الثمينة لخدمتك",
    },
    {
      icon: Eye,
      title: "شفافية تامة",
      description: "تتبع استثمارك وقيمته الحقيقية في أي لحظة",
    },
    {
      icon: Lock,
      title: "أمان مطلق",
      description: "نظام حماية متقدم لجميع بياناتك ومعاملاتك",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-secondary text-secondary-foreground relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px]" />
      </div>
      
      <div className="container mx-auto px-4 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-primary font-bold text-sm md:text-base mb-4 tracking-wide">
            لماذا تثق بنا
          </span>
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            الثقة <span className="text-gold-gradient">والأمان</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            نلتزم بأعلى معايير الشفافية والأمان لحماية استثماراتك
          </p>
        </div>

        {/* Trust Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6 max-w-6xl mx-auto">
          {trustItems.map((item, index) => (
            <div
              key={item.title}
              className="group text-center p-6 rounded-2xl bg-secondary-foreground/5 border border-secondary-foreground/10 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 hover-lift"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <item.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold text-sm md:text-base mb-2">{item.title}</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
