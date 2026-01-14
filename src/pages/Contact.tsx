import MainLayout from "@/layouts/MainLayout";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const Contact = () => {
  return (
    <MainLayout>
      <div className="pt-20">
        {/* Hero Section */}
        <section className="py-16 px-4 bg-hero-pattern relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background" />
          <div className="container mx-auto relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gold-gradient">تواصل معنا</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              نحن هنا لمساعدتك في رحلتك الاستثمارية. تواصل معنا للاستفسار أو الدعم
            </p>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="bg-card rounded-2xl p-8 shadow-xl border border-primary/10">
                <h2 className="text-2xl font-bold mb-6 text-gold-gradient">أرسل لنا رسالة</h2>
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">الاسم الكامل</label>
                      <Input placeholder="أدخل اسمك" className="bg-background" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
                      <Input type="email" placeholder="example@email.com" className="bg-background" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
                    <Input type="tel" placeholder="+20 xxx xxx xxxx" className="bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">الموضوع</label>
                    <Input placeholder="موضوع الرسالة" className="bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">الرسالة</label>
                    <Textarea placeholder="اكتب رسالتك هنا..." rows={5} className="bg-background" />
                  </div>
                  <Button className="w-full bg-gold-gradient hover:opacity-90 text-primary-foreground shadow-gold">
                    <Send className="w-5 h-5 ml-2" />
                    إرسال الرسالة
                  </Button>
                </form>
              </div>

              {/* Contact Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-gold-gradient">معلومات التواصل</h2>
                  <p className="text-muted-foreground mb-8">
                    فريقنا متاح للرد على استفساراتك ومساعدتك في اتخاذ أفضل القرارات الاستثمارية
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-primary/10">
                    <div className="w-12 h-12 bg-gold-gradient rounded-full flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">الهاتف</h3>
                      <p className="text-muted-foreground" dir="ltr">+20 123 456 7890</p>
                      <p className="text-muted-foreground" dir="ltr">+20 098 765 4321</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-primary/10">
                    <div className="w-12 h-12 bg-gold-gradient rounded-full flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">البريد الإلكتروني</h3>
                      <p className="text-muted-foreground">info@fisgold.com</p>
                      <p className="text-muted-foreground">support@fisgold.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-primary/10">
                    <div className="w-12 h-12 bg-gold-gradient rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">العنوان</h3>
                      <p className="text-muted-foreground">القاهرة، مصر</p>
                      <p className="text-muted-foreground">شارع التحرير، برج الاستثمار</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-primary/10">
                    <div className="w-12 h-12 bg-gold-gradient rounded-full flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">ساعات العمل</h3>
                      <p className="text-muted-foreground">الأحد - الخميس: 9 صباحاً - 5 مساءً</p>
                      <p className="text-muted-foreground">الجمعة والسبت: عطلة</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default Contact;
