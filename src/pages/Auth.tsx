import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import GoldParticles from "@/components/GoldParticles";
import { Mail, Lock, User, Loader2, Store } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isSigningUp = useRef(false);

  useEffect(() => {
    if (user && !isSigningUp.current) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "خطأ في تسجيل الدخول",
        description: error.message === "Invalid login credentials"
          ? "بيانات الدخول غير صحيحة"
          : error.message,
      });
    } else {
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "مرحباً بك في FIS Gold",
      });
      navigate("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !signupName) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
      return;
    }

    setIsLoading(true);
    isSigningUp.current = true;
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast({
          variant: "destructive",
          title: "خطأ في إنشاء الحساب",
          description: "هذا البريد الإلكتروني مسجل بالفعل",
        });
      } else {
        toast({
          variant: "destructive",
          title: "خطأ في إنشاء الحساب",
          description: error.message,
        });
      }
      isSigningUp.current = false;
    } else {
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "مرحباً بك في FIS Gold",
      });
      navigate("/complete-profile");
    }
  };

  return (
    <div className="min-h-screen bg-hero-pattern flex items-center justify-center p-4 relative">
      <GoldParticles />

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass-dark border-primary/20 relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="FIS Gold" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-gold-gradient">
            مرحباً بك في FIS Gold
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            استثمر في الذهب والفضة بأمان وثقة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground">
                تسجيل الدخول
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground">
                إنشاء حساب
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-foreground">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="example@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pr-10 bg-secondary/30 border-border/50 focus:border-primary"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-foreground">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pr-10 bg-secondary/30 border-border/50 focus:border-primary"
                      dir="ltr"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gold-gradient hover:bg-gold-gradient-hover text-primary-foreground font-semibold shadow-gold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    "تسجيل الدخول"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-foreground">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="أحمد محمد"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="pr-10 bg-secondary/30 border-border/50 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="example@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pr-10 bg-secondary/30 border-border/50 focus:border-primary"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pr-10 bg-secondary/30 border-border/50 focus:border-primary"
                      dir="ltr"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gold-gradient hover:bg-gold-gradient-hover text-primary-foreground font-semibold shadow-gold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري إنشاء الحساب...
                    </>
                  ) : (
                    "إنشاء حساب"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Join as Goldsmith Section */}
          <div className="mt-6 pt-6 border-t border-primary/20">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent"></div>
                <span className="text-sm text-muted-foreground">أو</span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent"></div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  هل أنت صايغ ذهب؟
                </h3>
                <p className="text-xs text-muted-foreground">
                  انضم إلى منصة FIS Gold كصايغ معتمد وعرض منتجاتك للبيع
                </p>
              </div>

              <Link to="/goldsmith/register">
                <Button
                  variant="outline"
                  className="w-full border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all gap-2 font-semibold"
                >
                  <Store className="w-4 h-4" />
                  انضم كصايغ معتمد
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
