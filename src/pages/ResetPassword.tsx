import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import GoldParticles from "@/components/GoldParticles";
import { Lock, Loader2 } from "lucide-react";

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        // Check if we have a valid session (Supabase handles the recovery link automatically)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, the link might be invalid or expired
                toast({
                    variant: "destructive",
                    title: "رابط غير صالح",
                    description: "الرابط منتهي الصلاحية أو غير صحيح. يرجى طلب رابط جديد.",
                });
                navigate("/auth");
            }
        });
    }, [navigate]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "كلمات المرور غير متطابقة",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
            });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            toast({
                title: "تم تغيير كلمة المرور",
                description: "تم تحديث كلمة المرور بنجاح. سيتم توجيهك للوحة التحكم.",
            });

            setTimeout(() => {
                navigate("/dashboard");
            }, 2000);

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message || "فشل تحديث كلمة المرور",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-hero-pattern flex items-center justify-center p-4 relative">
            <GoldParticles />

            <Card className="w-full max-w-md glass-dark border-primary/20 relative z-10">
                <CardHeader className="text-center space-y-4">
                    <CardTitle className="text-2xl font-bold text-gold-gradient">
                        تعيين كلمة مرور جديدة
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        أدخل كلمة المرور الجديدة لحسابك
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pr-10 bg-secondary/30 border-border/50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pr-10 bg-secondary/30 border-border/50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gold-gradient hover:bg-gold-gradient-hover text-primary-foreground font-semibold shadow-gold"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                    جاري التحديث...
                                </>
                            ) : (
                                "تحديث كلمة المرور"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPassword;
