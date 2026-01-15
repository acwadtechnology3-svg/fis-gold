import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowLeft, Star, Gem, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import GoldParticles from "@/components/GoldParticles";

const InvestmentPlans = () => {
    const navigate = useNavigate();

    const plans = [
        {
            name: "باقة السنة الواحدة",
            duration: "12 شهر",
            roi: "عائد يصل إلى 15%",
            minInvestment: "2,000 ج.م",
            features: [
                "إدارة احترافية للمحفظة",
                "توزيع أرباح ربع سنوي",
                "تقارير أداء شهرية",
                "إمكانية التخارج المبكر (مع رسوم)",
                "دعم فني مخصص"
            ],
            icon: Star,
            color: "from-blue-400 to-blue-600",
            popular: false
        },
        {
            name: "باقة السنتين",
            duration: "24 شهر",
            roi: "عائد يصل إلى 35%",
            minInvestment: "5,000 ج.م",
            features: [
                "جميع مميزات الباقة السنوية",
                "عائد مركب",
                "أولوية في الاكتتابات الجديدة",
                "رسوم مخفضة للتخارج المبكر",
                "مدير حساب شخصي"
            ],
            icon: Gem,
            color: "from-purple-400 to-purple-600",
            popular: true
        },
        {
            name: "باقة الـ 3 سنوات",
            duration: "36 شهر",
            roi: "عائد يصل إلى 60%",
            minInvestment: "10,000 ج.م",
            features: [
                "جميع مميزات الباقة المتقدمة",
                "أعلى معدل عائد",
                "تأمين على المحفظة",
                "بدون رسوم إدارية",
                "استشارات مالية مجانية"
            ],
            icon: Crown,
            color: "from-amber-400 to-amber-600",
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            <GoldParticles />
            <Header />

            <main className="container mx-auto px-4 pt-32 pb-16 relative z-10">
                <div className="text-center mb-16 animate-fade-up">
                    <h1 className="text-4xl md:text-5xl font-black text-secondary-foreground mb-4">
                        باقات <span className="text-gold-gradient">الاستثمار</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        اختر الباقة المناسبة لأهدافك المالية وابدأ رحلة استثمار آمنة ومربحة
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <Card
                            key={index}
                            className={`relative overflow-hidden border-2 transition-all duration-300 hover:-translate-y-2 ${plan.popular
                                    ? "border-primary shadow-gold-lg scale-105 z-10"
                                    : "border-border/50 hover:border-primary/50"
                                } glass-dark`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0 left-0 bg-gold-gradient text-secondary text-center py-1 font-bold text-sm">
                                    الأكثر طلباً
                                </div>
                            )}

                            <CardHeader className="text-center pb-2 pt-8">
                                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-lg`}>
                                    <plan.icon className="w-8 h-8 text-white" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-foreground mb-1">
                                    {plan.name}
                                </CardTitle>
                                <CardDescription className="text-lg font-medium text-primary">
                                    {plan.roi}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="text-center">
                                <div className="text-3xl font-black text-foreground mb-6">
                                    {plan.minInvestment}
                                    <span className="text-sm text-muted-foreground font-normal block mt-1">
                                        الحد الأدنى للاستثمار
                                    </span>
                                </div>

                                <ul className="space-y-3 text-right">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                <Check className="w-3 h-3 text-primary" />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter className="pt-4">
                                <Button
                                    className={`w-full font-bold text-lg h-12 ${plan.popular ? "bg-gold-gradient text-secondary hover:shadow-gold" : ""
                                        }`}
                                    onClick={() => navigate('/auth')}
                                >
                                    اشترك الآن
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="mt-16 text-center animate-fade-up" style={{ animationDelay: "0.2s" }}>
                    <Button
                        variant="outline"
                        size="lg"
                        className="group border-primary/50 text-primary hover:bg-primary/10"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft className="ml-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        العودة للرئيسية
                    </Button>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default InvestmentPlans;
