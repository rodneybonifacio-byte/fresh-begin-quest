import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Plus, 
  Import, 
  Download, 
  Filter, 
  BarChart3,
  PackageSearch,
  ChevronLeft,
  ChevronRight,
  Package
} from "lucide-react";
import { toast } from "sonner";
import { useFetchQuery } from "../../hooks/useFetchQuery";
import { useImprimirEtiquetaPDF } from "../../hooks/useImprimirEtiquetaPDF";
import { useAuth } from "../../providers/AuthContext";
import { useGlobalConfig } from "../../providers/GlobalConfigContext";
import { useLoadingSpinner } from "../../providers/LoadingSpinnerContext";
import { EmissaoService } from "../../services/EmissaoService";
import { supabase } from "../../integrations/supabase/client";
import { exportEmissoesToExcel } from "../../utils/exportToExcel";
import type { IEmissao } from "../../types/IEmissao";
import type { IResponse } from "../../types/IResponse";
import { MobileEmissaoCard } from "./MobileEmissaoCard";
import { ModalCustom } from "../modal";
import { FiltroEmissao } from "../../pages/private/emissao/FiltroEmissao";
import { ModalViewPDF } from "../../pages/private/emissao/ModalViewPDF";
import { ModalViewErroPostagem } from "../../pages/private/emissao/ModalViewErroPostagem";
import { DashboardEmissoes } from "../../pages/private/emissao/DashboardEmissoes";

const TABS = [
  { id: 'PRE_POSTADO', label: 'Pré-Postados' },
  { id: 'POSTADO', label: 'Postados' },
  { id: 'EM_TRANSITO', label: 'Em Trânsito' },
  { id: 'ENTREGUE', label: 'Entregues' },
  { id: 'CANCELADO', label: 'Cancelados' },
];

export const MobileEmissaoList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setIsLoading } = useLoadingSpinner();
  const config = useGlobalConfig();
  const perPage = config.pagination.perPage;
  
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('PRE_POSTADO');
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isModalViewPDF, setIsModalViewPDF] = useState(false);
  const [isModalViewErroPostagem, setIsModalViewErroPostagem] = useState(false);
  const [erroPostagem, setErroPostagem] = useState<string | undefined>();
  const [etiqueta, setEtiqueta] = useState<{ nome: string; dados: string }>();
  
  const service = new EmissaoService();
  const { onEmissaoImprimir } = useImprimirEtiquetaPDF();

  const { data: emissoes, isLoading, refetch } = useFetchQuery<IResponse<IEmissao[]>>(
    ['emissoes-mobile', searchParams.toString(), user?.email, page, tab],
    async () => {
      const params: any = {
        limit: perPage,
        offset: (page - 1) * perPage,
        status: tab,
      };
      
      const dataIni = searchParams.get('dataIni');
      const dataFim = searchParams.get('dataFim');
      const destinatario = searchParams.get('destinatario');
      const codigoObjeto = searchParams.get('codigoObjeto');
      
      if (dataIni) params.dataIni = dataIni;
      if (dataFim) params.dataFim = dataFim;
      if (destinatario) params.destinatario = destinatario;
      if (codigoObjeto) params.codigoObjeto = codigoObjeto;
      
      return service.getAll(params);
    }
  );

  // Busca todos os dados sem filtro de status para o dashboard
  const { data: allEmissoes } = useFetchQuery<IResponse<IEmissao[]>>(
    ['emissoes-dashboard-mobile', searchParams.get('dataIni'), searchParams.get('dataFim')],
    async () => {
      const params: any = {
        limit: 1000,
        offset: 0
      };
      const dataIni = searchParams.get('dataIni');
      const dataFim = searchParams.get('dataFim');
      if (dataIni) params.dataIni = dataIni;
      if (dataFim) params.dataFim = dataFim;
      return service.getAll(params);
    }
  );

  const handleViewDetails = (emissao: IEmissao) => {
    navigate(`/app/emissao/detail/${emissao.id}`);
  };

  const handlePrint = async (emissao: IEmissao) => {
    try {
      const response = await onEmissaoImprimir(emissao, 'merge', setIsLoading);
      if (response?.data) {
        setEtiqueta(response.data);
        setIsModalViewPDF(true);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  const handleCancel = async (emissao: IEmissao) => {
    if (!emissao.codigoObjeto || !emissao.id) {
      toast.error('Dados insuficientes para cancelar');
      return;
    }
    
    if (!confirm(`Cancelar etiqueta ${emissao.codigoObjeto}?`)) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase.functions.invoke('cancelar-etiqueta-admin', {
        body: {
          codigoObjeto: emissao.codigoObjeto,
          motivo: 'Cancelado pelo usuário',
          emissaoId: emissao.id
        }
      });
      
      if (error) throw error;
      
      toast.success('Etiqueta cancelada!');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewError = (msg?: string) => {
    setErroPostagem(msg);
    setIsModalViewErroPostagem(true);
  };

  const handleExport = () => {
    if (emissoes?.data?.length) {
      exportEmissoesToExcel(emissoes.data, 'emissoes');
    }
  };

  const totalPages = emissoes?.meta?.totalPages || Math.ceil((emissoes?.total || 0) / perPage);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary px-4 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <PackageSearch className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Pré-Postagem</h1>
            <p className="text-white/70 text-sm">Gerencie seus envios</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <a 
            href="/app/emissao/adicionar"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-primary rounded-xl font-semibold text-sm shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Nova Etiqueta
          </a>
          <a
            href="/app/emissao/importacao"
            className="p-3 bg-white/20 text-white rounded-xl"
          >
            <Import className="w-5 h-5" />
          </a>
          <button 
            onClick={handleExport}
            className="p-3 bg-white/20 text-white rounded-xl"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className={`p-3 rounded-xl transition-colors ${showDashboard ? 'bg-white text-primary' : 'bg-white/20 text-white'}`}
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="p-3 bg-white/20 text-white rounded-xl"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-4">
        {/* Dashboard */}
        {showDashboard && allEmissoes?.data && allEmissoes.data.length > 0 && (
          <div className="mb-4">
            <DashboardEmissoes emissoes={allEmissoes.data} />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 mb-4 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(1); }}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                  ${tab === t.id 
                    ? 'text-primary border-b-2 border-primary bg-primary/5' 
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !emissoes?.data || emissoes.data.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhuma etiqueta
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie sua primeira etiqueta clicando no botão acima
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {emissoes.data.map((emissao) => (
              <MobileEmissaoCard
                key={emissao.id}
                emissao={emissao}
                onViewDetails={handleViewDetails}
                onPrint={handlePrint}
                onCancel={handleCancel}
                onViewError={handleViewError}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {emissoes?.data && emissoes.data.length > 0 && (
          <div className="flex items-center justify-between mt-4 bg-card rounded-xl border border-border/50 p-3">
            <span className="text-xs text-muted-foreground">
              Pág. {page}/{totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page >= (totalPages || 1)}
                className="flex items-center gap-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ModalViewPDF 
        isOpen={isModalViewPDF} 
        base64={etiqueta?.dados || ''} 
        onCancel={() => setIsModalViewPDF(false)} 
      />
      <ModalViewErroPostagem 
        isOpen={isModalViewErroPostagem} 
        jsonContent={erroPostagem || ''} 
        onCancel={() => setIsModalViewErroPostagem(false)} 
      />
      
      {isFilterOpen && (
        <ModalCustom 
          title="Filtrar Envios" 
          description="Filtre por período, destinatário ou código"
          onCancel={() => setIsFilterOpen(false)}
        >
          <FiltroEmissao onCancel={() => setIsFilterOpen(false)} />
        </ModalCustom>
      )}
    </div>
  );
};
