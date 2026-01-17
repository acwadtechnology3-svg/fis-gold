import { useAuth } from "@/contexts/AuthContext";
import { useGoldsmiths } from "@/hooks/useGoldsmiths";
import { Button } from "@/components/ui/button";
import { LogOut, User, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useEffect } from "react";

const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { currentGoldsmith, fetchMyGoldsmith } = useGoldsmiths();

  useEffect(() => {
    if (user) {
      fetchMyGoldsmith();
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 glass-dark border-b border-primary/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="FIS Gold" className="h-10 w-auto" />
            <span className="text-xl font-bold text-gold-gradient hidden sm:block">FIS Gold</span>
          </Link>

          <div className="flex items-center gap-4">
            {currentGoldsmith?.status === "approved" && (
              <Link to="/goldsmith/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-primary/30 hover:bg-primary/10"
                >
                  <Store className="h-4 w-4" />
                  <span className="hidden sm:block">لوحة الصايغ</span>
                </Button>
              </Link>
            )}
            {!currentGoldsmith && (
              <Link to="/goldsmith/register">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-primary/30 hover:bg-primary/10"
                >
                  <Store className="h-4 w-4" />
                  <span className="hidden sm:block">انضم كصايغ</span>
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4 text-primary" />
              <span className="hidden sm:block">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <LogOut className="h-4 w-4 ml-2" />
              <span className="hidden sm:block">تسجيل الخروج</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
