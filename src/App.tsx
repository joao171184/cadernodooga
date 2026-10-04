import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Canonical } from "@/components/Canonical";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AdConsentBanner } from "@/components/ads/AdConsentBanner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CategoriasProvider } from "@/contexts/CategoriasContext";
import { PontosProvider } from "@/contexts/PontosContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index.tsx";
import PontoPage from "./pages/PontoPage.tsx";
import { lazy, Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

const Login = lazy(() => import("./pages/Login.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Pendentes = lazy(() => import("./pages/Pendentes.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const AuthConfirm = lazy(() => import("./pages/AuthConfirm.tsx"));
const Anuncie = lazy(() => import("./pages/Anuncie.tsx"));
const AdminPublicidade = lazy(() => import("./pages/AdminPublicidade.tsx"));

const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="animate-spin text-primary" size={32} />
  </div>
);

const queryClient = new QueryClient();

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">{children}</div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

// A interface só esconde a página; quem barra de fato é o RLS (is_ads_admin) no banco.
function AdminLayout({ children }: { children: ReactNode }) {
  const { isLoggedIn, isAdmin, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />

        <BrowserRouter>
          <Canonical />
          <AuthProvider>
            <CategoriasProvider>
              <PontosProvider>
                <Suspense fallback={<PageSpinner />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/confirm" element={<AuthConfirm />} />
                  <Route path="/ponto/:slug" element={<PontoPage />} />
                  <Route path="/" element={<AppLayout><Index /></AppLayout>} />
                  <Route path="/favoritos" element={<AppLayout><Index /></AppLayout>} />
                  <Route path="/pendentes" element={<ProtectedLayout><Pendentes /></ProtectedLayout>} />
                  <Route path="/guia/:categoria" element={<AppLayout><Index /></AppLayout>} />
                  <Route path="/guia/:categoria/:subcategoria" element={<AppLayout><Index /></AppLayout>} />
                  <Route path="/anuncie" element={<Anuncie />} />
                  <Route path="/admin/publicidade" element={<AdminLayout><AdminPublicidade /></AdminLayout>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
                <AdConsentBanner />
              </PontosProvider>
            </CategoriasProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
