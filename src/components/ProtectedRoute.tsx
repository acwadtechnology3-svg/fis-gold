import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(true);
  const [isProfileActive, setIsProfileActive] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_active, phone, first_name, last_name")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          setProfileLoading(false);
          return;
        }

        // Check if profile is complete (has required fields)
        const isComplete = !!(profile?.phone && profile?.first_name && profile?.last_name);

        // User can access if profile is active AND complete
        setIsProfileActive(profile?.is_active === true && isComplete === true);
        setProfileLoading(false);
      } catch (error) {
        console.error("Error checking profile:", error);
        setProfileLoading(false);
      }
    };

    if (!authLoading && user) {
      checkProfile();
    } else if (!authLoading && !user) {
      setProfileLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If profile is not active or incomplete, redirect to complete-profile
  if (!isProfileActive) {
    // If we are already at complete-profile, allow access to prevent loop
    if (location.pathname === "/complete-profile") {
      return <>{children}</>;
    }
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

