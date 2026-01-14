import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "الرئيسية", href: "/" },
    { label: "الباقات", href: "/packages" },
    { label: "الصايغين المعتمدين", href: "/goldsmiths" },
    { label: "المتجر", href: "/store" },
    { label: "حاسبة الاستثمار", href: "/calculator" },
    { label: "كيف يعمل", href: "/how-it-works" },
    { label: "لماذا نحن", href: "/why-us" },
    { label: "من نحن", href: "/about" },
    { label: "تواصل معنا", href: "/contact" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header 
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/95 backdrop-blur-xl shadow-lg border-b border-primary/10" 
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20 lg:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={logo} 
              alt="FIS Gold" 
              className="h-12 lg:h-16 w-auto transition-transform duration-300 group-hover:scale-105 glow-gold" 
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`relative transition-colors font-semibold text-base group ${
                  isActive(link.href) ? "text-primary" : "text-foreground/80 hover:text-primary"
                }`}
              >
                {link.label}
                <span className={`absolute -bottom-1 right-0 h-0.5 bg-gold-gradient transition-all duration-300 ${
                  isActive(link.href) ? "w-full" : "w-0 group-hover:w-full"
                }`} />
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button 
                  className="bg-gold-gradient text-secondary font-bold text-base px-6 py-5 shadow-gold hover:shadow-gold-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  <User className="h-4 w-4 ml-2" />
                  لوحة التحكم
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button 
                    variant="ghost" 
                    className="font-bold text-base hover:text-primary hover:bg-primary/10 transition-all"
                  >
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button 
                    className="bg-gold-gradient text-secondary font-bold text-base px-6 py-5 shadow-gold hover:shadow-gold-lg transition-all duration-300 hover:-translate-y-0.5"
                  >
                    ابدأ الاستثمار
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 hover:bg-primary/10 rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X size={28} className="text-primary" />
            ) : (
              <Menu size={28} />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div 
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <nav className="py-4 border-t border-primary/20">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`transition-all font-semibold py-3 px-4 rounded-lg ${
                    isActive(link.href) 
                      ? "text-primary bg-primary/10" 
                      : "text-foreground/80 hover:text-primary hover:bg-primary/10"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-primary/20">
                {user ? (
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-gold-gradient text-secondary font-bold shadow-gold">
                      <User className="h-4 w-4 ml-2" />
                      لوحة التحكم
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full font-bold border-primary/30 hover:bg-primary/10">
                        تسجيل الدخول
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-gold-gradient text-secondary font-bold shadow-gold">
                        ابدأ الاستثمار
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
