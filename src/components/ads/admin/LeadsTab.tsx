import { useState } from "react";
import { History, Inbox, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadNotifications } from "./LeadNotifications";
import { LeadRecipients } from "./LeadRecipients";
import { LeadsList } from "./LeadsList";
import { NotifyHistory } from "./NotifyHistory";

export function LeadsTab() {
  const [recipientsVersion, setRecipientsVersion] = useState(0);

  return (
    <Tabs defaultValue="pedidos">
      <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0 gap-1">
        <TabsTrigger value="pedidos" className="gap-1.5 rounded-full border border-border text-xs data-[state=active]:border-primary">
          <Inbox size={13} /> Pedidos
        </TabsTrigger>
        <TabsTrigger value="avisos" className="gap-1.5 rounded-full border border-border text-xs data-[state=active]:border-primary">
          <Mail size={13} /> Avisos por e-mail
        </TabsTrigger>
        <TabsTrigger value="historico" className="gap-1.5 rounded-full border border-border text-xs data-[state=active]:border-primary">
          <History size={13} /> Histórico de envios
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pedidos" className="mt-4"><LeadsList /></TabsContent>
      <TabsContent value="avisos" className="mt-4 space-y-4">
        <LeadNotifications refreshKey={recipientsVersion} />
        <LeadRecipients onChange={() => setRecipientsVersion((v) => v + 1)} />
      </TabsContent>
      <TabsContent value="historico" className="mt-4"><NotifyHistory /></TabsContent>
    </Tabs>
  );
}
