import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  // Reset Password State
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني",
      });
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "تم إرسال الرابط",
        description: "راجع بريدك الإلكتروني لإعادة تعيين كلمة المرور",
      });
      setResetOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message || "فشل إرسال رابط الاستعادة",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const isSigningUp = useRef(false);

  // Check for errors in URL (e.g. from OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    if (error) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: errorDescription || error,
      });
    }

    // Also check hash for error (Supabase sometimes returns errors in hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashError = hashParams.get('error');
    const hashErrorDesc = hashParams.get('error_description');
    if (hashError) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: hashErrorDesc || hashError,
      });
    }
  }, []);

  // Check profile completion after Google OAuth callback
  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (!user || isSigningUp.current) return;
      // ... (rest of logic)

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("phone, first_name, last_name, is_active")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error checking profile:", error);
          return;
        }

        // Check if profile is complete (has required fields)
        const isComplete = profile?.phone && profile?.first_name && profile?.last_name;

        if (!isComplete) {
          // Profile is not complete, redirect to complete-profile
          navigate("/complete-profile");
        } else if (profile?.is_active) {
          // Profile is complete and active, redirect to dashboard
          navigate("/dashboard");
        } else {
          // Profile is complete but not active (pending verification)
          navigate("/complete-profile");
        }
      } catch (error) {
        console.error("Error in profile check:", error);
      }
    };

    if (user) {
      checkProfileAndRedirect();
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "خطأ في تسجيل الدخول",
        description: error.message || "فشل تسجيل الدخول بحساب Google",
      });
    }
    // Note: If successful, user will be redirected by Google OAuth, then the useEffect will handle navigation
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
                      autoComplete="username"
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
                      autoComplete="current-password"
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

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setResetOpen(true)}
                    className="text-sm text-gold-500 hover:text-gold-400 underline transition-colors"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              </form>

              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">أو</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 border-2 hover:bg-secondary/50"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  تسجيل الدخول بحساب Google
                </Button>
              </div>
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
                      autoComplete="name"
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
                      autoComplete="email"
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
                      autoComplete="new-password"
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

              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">أو</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 border-2 hover:bg-secondary/50"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  إنشاء حساب بحساب Google
                </Button>
              </div>
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

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="bg-card border-border/50 text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient">استعادة كلمة المرور</DialogTitle>
            <DialogDescription>
              أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">البريد الإلكتروني</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="example@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="bg-secondary/30 border-border/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gold-gradient hover:bg-gold-gradient-hover text-primary-foreground shadow-gold"
              disabled={resetLoading}
            >
              {resetLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                "إرسال الرابط"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
