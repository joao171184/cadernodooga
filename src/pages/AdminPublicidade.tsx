import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Megaphone, Menu } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSidebar } from "@/components/ui/sidebar";
import { useAdsAdmin } from "@/components/ads/admin/useAdsAdmin";
import { CampaignsTab } from "@/components/ads/admin/CampaignsTab";
import { AdvertisersTab } from "@/components/ads/admin/AdvertisersTab";
import { ReportsTab } from "@/components/ads/admin/ReportsTab";
import { LeadsTab } from "@/components/ads/admin/LeadsTab";
import { SettingsTab } from "@/components/ads/admin/SettingsTab";

export default function AdminPublicidade() {
  const { toggleSidebar } = useSidebar();
  const data = useAdsAdmin();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Publicidade · Caderno do Ogã</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button onClick={toggleSidebar} className="rounded-lg p-2 hover:bg-muted md:hidden" aria-label="Abrir menu">
            <Menu size={18} />
          </button>
          <Link to="/" className="rounded-lg p-2 hover:bg-muted" aria-label="Voltar aos pontos">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </Link>
          <Megaphone size={20} className="text-accent" />
          <h1 className="font-display text-lg font-bold uppercase text-foreground">Publicidade</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 pb-24">
        {data.loading && !data.settings ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : data.error === "missing" ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
            <p className="font-bold">O banco ainda não tem as tabelas de publicidade.</p>
            <p className="mt-1 text-muted-foreground">
              Rode a migração <code>drizzle/migrations/0005_advertising.sql</code> no editor SQL do Lovable Cloud e recarregue esta página.
            </p>
          </div>
        ) : data.error === "failed" ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm">
            <p className="font-bold">Não foi possível carregar a publicidade.</p>
            <button className="mt-2 text-xs font-bold uppercase text-accent hover:underline" onClick={() => void data.reload()}>Tentar de novo</button>
          </div>
        ) : (
          <Tabs defaultValue="campanhas">
            <TabsList className="flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="campanhas" className="text-xs font-bold uppercase">Campanhas</TabsTrigger>
              <TabsTrigger value="anunciantes" className="text-xs font-bold uppercase">Anunciantes</TabsTrigger>
              <TabsTrigger value="relatorios" className="text-xs font-bold uppercase">Relatórios</TabsTrigger>
              <TabsTrigger value="pedidos" className="text-xs font-bold uppercase">Pedidos</TabsTrigger>
              <TabsTrigger value="config" className="text-xs font-bold uppercase">Configurações</TabsTrigger>
            </TabsList>
            <TabsContent value="campanhas" className="mt-4"><CampaignsTab {...data} /></TabsContent>
            <TabsContent value="anunciantes" className="mt-4"><AdvertisersTab {...data} /></TabsContent>
            <TabsContent value="relatorios" className="mt-4"><ReportsTab {...data} /></TabsContent>
            <TabsContent value="pedidos" className="mt-4"><LeadsTab /></TabsContent>
            <TabsContent value="config" className="mt-4"><SettingsTab {...data} /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
