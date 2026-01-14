import MainLayout from "@/layouts/MainLayout";
import { Shield, Users, Target, Award, Building, TrendingUp } from "lucide-react";
import CTASection from "@/components/home/CTASection";

const About = () => {
  const stats = [
    { value: "+5000", label: "مستثمر نشط" },
    { value: "+100M", label: "جنيه إجمالي الاستثمارات" },
    { value: "+10", label: "سنوات خبرة" },
    { value: "99%", label: "رضا العملاء" },
  ];

  const values = [
    {
      icon: Shield,
      title: "الأمان والثقة",
      description: "نلتزم بأعلى معايير الأمان لحماية استثماراتك ومعلوماتك الشخصية",
    },
    {
      icon: Users,
      title: "خدمة العملاء",
      description: "فريق دعم متخصص متاح لمساعدتك في أي وقت والرد على استفساراتك",
    },
    {
      icon: Target,
      title: "الشفافية",
      description: "نؤمن بالشفافية الكاملة في جميع العمليات والمعاملات المالية",
    },
    {
      icon: Award,
      title: "التميز",
      description: "نسعى دائماً لتقديم أفضل الخدمات والحلول الاستثمارية لعملائنا",
    },
  ];

  return (
    <MainLayout>
      <div className="pt-20">
        {/* Hero Section */}
        <section className="py-20 px-4 bg-hero-pattern relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background" />
          <div className="container mx-auto relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gold-gradient">من نحن</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              FIS Gold هي منصة استثمارية رائدة متخصصة في الذهب والفضة، نهدف إلى تمكين الجميع
              من الاستثمار في المعادن الثمينة بسهولة وأمان
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 bg-dark-gradient">
          <div className="container mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gold-gradient mb-2">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  <span className="text-gold-gradient">قصتنا</span>
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    بدأت رحلة FIS Gold من إيماننا العميق بأن الاستثمار في المعادن الثمينة يجب أن يكون
                    متاحاً للجميع وليس حكراً على الأثرياء فقط.
                  </p>
                  <p>
                    منذ تأسيسنا، عملنا على تطوير منصة تجمع بين البساطة والأمان، حيث يمكن لأي شخص
                    البدء في الاستثمار بمبالغ صغيرة تبدأ من 2000 جنيه فقط.
                  </p>
                  <p>
                    اليوم، نفخر بخدمة آلاف المستثمرين الذين وثقوا بنا في إدارة استثماراتهم
                    في الذهب والفضة، ونستمر في تطوير خدماتنا لتلبية احتياجاتهم المتزايدة.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="bg-card rounded-2xl p-8 border border-primary/20 shadow-gold">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gold-gradient rounded-full flex items-center justify-center">
                      <Building className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">مقرنا الرئيسي</h3>
                      <p className="text-muted-foreground">القاهرة، مصر</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gold-gradient rounded-full flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">رؤيتنا</h3>
                      <p className="text-muted-foreground">قيادة سوق الاستثمار في المعادن الثمينة</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 px-4 bg-secondary/30">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <span className="text-gold-gradient">قيمنا</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                نؤمن بمجموعة من القيم الأساسية التي توجه عملنا وعلاقتنا مع عملائنا
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-6 text-center border border-primary/10 hover:border-primary/30 transition-all hover:-translate-y-1"
                >
                  <div className="w-16 h-16 bg-gold-gradient rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CTASection />
      </div>
    </MainLayout>
  );
};

export default About;
