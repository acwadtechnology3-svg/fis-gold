import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";

const Footer = () => {
  const quickLinks = [
    { label: "الرئيسية", href: "#home" },
    { label: "الباقات", href: "#packages" },
    { label: "كيف يعمل", href: "#how-it-works" },
    { label: "لماذا نحن", href: "#why-us" },
  ];

  const legalLinks = [
    { label: "من نحن", href: "#" },
    { label: "الشروط والأحكام", href: "#" },
    { label: "سياسة الخصوصية", href: "#" },
    { label: "الأسئلة الشائعة", href: "#" },
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook", color: "hover:bg-blue-600" },
    { icon: Twitter, href: "#", label: "Twitter", color: "hover:bg-sky-500" },
    { icon: Instagram, href: "#", label: "Instagram", color: "hover:bg-pink-600" },
    { icon: Youtube, href: "#", label: "Youtube", color: "hover:bg-red-600" },
  ];

  return (
    <footer id="contact" className="bg-secondary text-secondary-foreground relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
      
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 lg:px-8 relative">
        <div className="py-16 md:py-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <img src={logo} alt="FIS Gold" className="h-16 w-auto mb-6 glow-gold" />
              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                FIS Gold هي منصة استثمارية رائدة في مجال الذهب والفضة، تتيح لك الاستثمار بأمان وشفافية كاملة مع فريق من الخبراء.
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className={`w-11 h-11 rounded-xl bg-secondary-foreground/10 flex items-center justify-center transition-all duration-300 ${social.color} hover:text-white hover:-translate-y-1`}
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-lg mb-6 text-gold-gradient">روابط سريعة</h4>
              <ul className="space-y-4">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors font-medium inline-block hover:translate-x-1 transform"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-bold text-lg mb-6 text-gold-gradient">معلومات قانونية</h4>
              <ul className="space-y-4">
                {legalLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors font-medium inline-block hover:translate-x-1 transform"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-bold text-lg mb-6 text-gold-gradient">تواصل معنا</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-muted-foreground group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <span dir="ltr" className="font-medium">+20 123 456 7890</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">info@fisgold.com</span>
                </li>
                <li className="flex items-start gap-3 text-muted-foreground group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">القاهرة، مصر</span>
                </li>
              </ul>

              {/* Newsletter */}
              <div className="mt-8">
                <h5 className="font-bold text-sm mb-3">اشترك في نشرتنا البريدية</h5>
                <div className="flex gap-2">
                  <Input 
                    placeholder="بريدك الإلكتروني" 
                    className="bg-secondary-foreground/10 border-secondary-foreground/20 text-secondary-foreground placeholder:text-muted-foreground"
                  />
                  <Button className="bg-gold-gradient text-secondary px-4">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-secondary-foreground/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm text-center md:text-right">
              © {new Date().getFullYear()} FIS Gold. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">مدعوم بـ</span>
              <span className="text-gold-gradient font-bold">❤️ من مصر</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
