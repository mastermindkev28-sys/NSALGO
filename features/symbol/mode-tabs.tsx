"use client";

import { Panel } from "@/components/ui/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { SetupDetail } from "@/features/atlas/setup-detail";
import type { AtlasSetup } from "@/types/atlas";

export function SymbolModeTabs({ swing, day }: { swing: AtlasSetup | null; day: AtlasSetup | null }) {
  const first = swing ? "swing" : "day";
  return (
    <Panel className="overflow-hidden">
      <Tabs defaultValue={first}>
        <TabsList className="px-4">
          {swing ? <TabsTrigger value="swing">Swing setup</TabsTrigger> : null}
          {day ? <TabsTrigger value="day">Day-trade setup</TabsTrigger> : null}
        </TabsList>
        {swing ? (
          <TabsContent value="swing">
            <SetupDetail setup={swing} />
          </TabsContent>
        ) : null}
        {day ? (
          <TabsContent value="day">
            <SetupDetail setup={day} />
          </TabsContent>
        ) : null}
      </Tabs>
    </Panel>
  );
}
