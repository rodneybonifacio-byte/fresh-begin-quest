import React, { useState } from 'react';
import { Tabs, Tab } from '@heroui/tabs';
import { Bot, Wrench, BarChart3, Settings2, HeadphonesIcon } from 'lucide-react';
import AgentesTab from './tabs/AgentesTab';
import ToolsTab from './tabs/ToolsTab';
import MetricasTab from './tabs/MetricasTab';
import ProvedoresTab from './tabs/ProvedoresTab';
import PipelineSuporteTab from './tabs/PipelineSuporteTab';

const GestaoIA: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('agentes');

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary" />
          Gestão da IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure agentes, funções, provedores e monitore o desempenho da inteligência artificial
        </p>
      </div>

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        variant="underlined"
        classNames={{
          tabList: "gap-4 border-b border-border",
          tab: "text-muted-foreground data-[selected=true]:text-primary",
          cursor: "bg-primary",
        }}
      >
        <Tab
          key="agentes"
          title={
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span>Agentes</span>
            </div>
          }
        >
          <AgentesTab />
        </Tab>
        <Tab
          key="tools"
          title={
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>Funções / Tools</span>
            </div>
          }
        >
          <ToolsTab />
        </Tab>
        <Tab
          key="metricas"
          title={
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Métricas</span>
            </div>
          }
        >
          <MetricasTab />
        </Tab>
        <Tab
          key="provedores"
          title={
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span>Provedores</span>
            </div>
          }
        >
          <ProvedoresTab />
        </Tab>
        <Tab
          key="pipeline"
          title={
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="w-4 h-4" />
              <span>Pipeline Suporte</span>
            </div>
          }
        >
          <PipelineSuporteTab />
        </Tab>
      </Tabs>
    </div>
  );
};

export default GestaoIA;
