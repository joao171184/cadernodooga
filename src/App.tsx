import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CategoriasProvider } from "@/contexts/CategoriasContext";
import { PontosProvider } from "@/contexts/PontosContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import Pendentes from "./pages/Pendentes.tsx";
import PontoPage from "./pages/PontoPage.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">{children}</div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CategoriasProvider>
              <PontosProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/ponto/:slug" element={<PontoPage />} />
                  <Route path="/" element={<ProtectedLayout><Index /></ProtectedLayout>} />
                  <Route path="/pendentes" element={<ProtectedLayout><Pendentes /></ProtectedLayout>} />
                  <Route path="/guia/:categoria" element={<ProtectedLayout><Index /></ProtectedLayout>} />
                  <Route path="/guia/:categoria/:subcategoria" element={<ProtectedLayout><Index /></ProtectedLayout>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PontosProvider>
            </CategoriasProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
