import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import ChatButton from "@/components/ChatButton";
import Chatbot from "@/components/Chatbot";
import ProtectedRoute from "@/components/ProtectedRoute";
import { queryClient } from "@/lib/queryClient";
import Index from "./pages/Index";
import Packages from "./pages/Packages";
import HowItWorks from "./pages/HowItWorks";
import WhyUs from "./pages/WhyUs";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import CompleteProfile from "./pages/CompleteProfile";
import Dashboard from "./pages/Dashboard";
import Deposit from "./pages/Deposit";
import Admin from "./pages/Admin";
import GoldsmithRegister from "./pages/GoldsmithRegister";
import GoldsmithDashboard from "./pages/GoldsmithDashboard";
import CertifiedGoldsmiths from "./pages/CertifiedGoldsmiths";
import GoldsmithProductsPage from "./pages/GoldsmithProductsPage";
import Store from "./pages/Store";
import GoldInvestmentCalculator from "./pages/GoldInvestmentCalculator";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChatProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ChatButton />
            <Chatbot />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/packages" element={<Packages />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/why-us" element={<WhyUs />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/goldsmith/register" element={<GoldsmithRegister />} />
              <Route path="/goldsmith/dashboard" element={<GoldsmithDashboard />} />
              <Route path="/goldsmiths" element={<CertifiedGoldsmiths />} />
              <Route path="/goldsmith/:id" element={<GoldsmithProductsPage />} />
              <Route path="/store" element={<Store />} />
              <Route path="/calculator" element={<GoldInvestmentCalculator />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ChatProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
