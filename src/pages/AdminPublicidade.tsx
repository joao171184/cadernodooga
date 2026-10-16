import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Megaphone, Menu } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSidebar } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAdsAdmin } from "@/components/ads/admin/useAdsAdmin";
import { CampaignsTab } from "@/components/ads/admin/CampaignsTab";
import { AdvertisersTab } from "@/components/ads/admin/AdvertisersTab";
import { ReportsTab } from "@/components/ads/admin/ReportsTab";
import { LeadsTab } from "@/components/ads/admin/LeadsTab";
import { SettingsTab } from "@/components/ads/admin/SettingsTab";

export default function AdminPublicidade() {
  const { toggleSidebar } = useSidebar();
  const data = useAdsAdmin();
  const [tab, setTab] = useState("campanhas");
  const [reportFocusId, setReportFocusId] = useState("");

  return (
    <div className="min-h-screen bg-panel-bg">
      <Helmet>
        <title>Publicidade · Caderno do Ogã</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="sticky top-0 z-20 border-b border-panel-border bg-panel-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button onClick={toggleSidebar} className="rounded-panel p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden" aria-label="Abrir menu">
            <Menu size={18} />
          </button>
          <Link to="/" className="rounded-panel p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Voltar aos pontos">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </Link>
          <Megaphone size={20} className="text-accent" />
          <h1 className="font-display text-lg font-bold uppercase text-foreground">Publicidade</h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 pb-24">
        {data.loading && !data.settings ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : data.error === "missing" ? (
          <div className="rounded-panel border border-feedback-warning-fg/30 bg-feedback-warning p-5 text-sm text-feedback-warning-fg">
            <p className="font-bold">O banco ainda não tem as tabelas de publicidade.</p>
            <p className="mt-1 opacity-90">
              Rode a migração <code>drizzle/migrations/0005_advertising.sql</code> no editor SQL do Lovable Cloud e recarregue esta página.
            </p>
          </div>
        ) : data.error === "failed" ? (
          <div className="rounded-panel border border-feedback-danger-fg/30 bg-feedback-danger p-5 text-sm text-feedback-danger-fg">
            <p className="font-bold">Não foi possível carregar a publicidade.</p>
            <button type="button" className="mt-2 text-xs font-semibold text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" onClick={() => void data.reload()}>Tentar de novo</button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="campanhas" className="text-xs font-bold uppercase tracking-wide">Campanhas</TabsTrigger>
              <TabsTrigger value="anunciantes" className="text-xs font-bold uppercase tracking-wide">Anunciantes</TabsTrigger>
              <TabsTrigger value="relatorios" className="text-xs font-bold uppercase tracking-wide">Relatórios</TabsTrigger>
              <TabsTrigger value="pedidos" className="text-xs font-bold uppercase tracking-wide">Pedidos</TabsTrigger>
              <TabsTrigger value="config" className="text-xs font-bold uppercase tracking-wide">Configurações</TabsTrigger>
            </TabsList>
            <TabsContent value="campanhas" className="mt-4">
              <CampaignsTab
                {...data}
                onOpenReport={(id) => {
                  setReportFocusId(id);
                  setTab("relatorios");
                }}
              />
            </TabsContent>
            <TabsContent value="anunciantes" className="mt-4"><AdvertisersTab {...data} /></TabsContent>
            <TabsContent value="relatorios" className="mt-4">
              <ReportsTab {...data} focusCampaignId={reportFocusId} />
            </TabsContent>
            <TabsContent value="pedidos" className="mt-4"><LeadsTab /></TabsContent>
            <TabsContent value="config" className="mt-4"><SettingsTab {...data} /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
