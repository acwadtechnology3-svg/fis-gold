import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield } from "lucide-react";

export const AdminHeader = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="glass-dark border-b border-primary/20 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-gradient rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gold-gradient">لوحة تحكم الأدمن</h1>
            <p className="text-sm text-muted-foreground">إدارة النظام</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2 border-primary/30 hover:bg-primary/10 hover:text-primary">
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </Button>
      </div>
    </header>
  );
};
