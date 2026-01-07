import { useState, useEffect } from 'react';
import { X, FileText, Download, Loader2, Search, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../integrations/supabase/client';
import { EmissaoService } from '../../../../services/EmissaoService';
import { ManifestoService } from '../../../../services/ManifestoService';
import type { IEmissao } from '../../../../types/IEmissao';
import { formatDateTime } from '../../../../utils/date-utils';
import { openPDFInNewTab } from '../../../../utils/pdfUtils';
import { patchManifestoPdfHeader } from '../../../../utils/manifestoPdf';

interface Remetente {
  id: string;
  nome: string;
  cpfCnpj: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  cep?: string;
}

interface ModalGerarManifestoSaidaProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalGerarManifestoSaida = ({ isOpen, onClose }: ModalGerarManifestoSaidaProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [remetentes, setRemetentes] = useState<Remetente[]>([]);
  const [selectedRemetente, setSelectedRemetente] = useState<Remetente | null>(null);
  const [postagens, setPostagens] = useState<IEmissao[]>([]);
  const [selectedPostagens, setSelectedPostagens] = useState<string[]>([]);
  const [loadingRemetentes, setLoadingRemetentes] = useState(false);
  const [loadingPostagens, setLoadingPostagens] = useState(false);
  const [loadingManifesto, setLoadingManifesto] = useState(false);
  const [searchRemetente, setSearchRemetente] = useState('');

  const emissaoService = new EmissaoService();
  const manifestoService = new ManifestoService();

  // Buscar remetentes direto do Supabase
  useEffect(() => {
    if (isOpen && step === 1) {
      fetchRemetentes();
    }
  }, [isOpen, step]);

  // Buscar postagens quando selecionar remetente
  useEffect(() => {
    if (selectedRemetente && step === 2) {
      fetchPostagens();
    }
  }, [selectedRemetente, step]);

  const fetchRemetentes = async () => {
    try {
      setLoadingRemetentes(true);

      // Para admin, buscar todos os remetentes via edge function que ignora RLS
      const { data, error } = await supabase.functions.invoke('listar-remetentes-admin');

      if (error) {
        console.error('Erro ao buscar remetentes:', error);
        toast.error('Erro ao carregar remetentes');
        return;
      }

      const remetentesData = data?.data || data || [];
      const mapped: Remetente[] = remetentesData.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        cpfCnpj: r.cpf_cnpj || r.cpfCnpj || '',
        logradouro: r.logradouro,
        numero: r.numero,
        bairro: r.bairro,
        localidade: r.localidade,
        uf: r.uf,
        cep: r.cep,
      }));

      console.log('Remetentes carregados:', mapped.length);
      setRemetentes(mapped);
    } catch (error) {
      console.error('Erro ao buscar remetentes:', error);
      toast.error('Erro ao carregar remetentes');
    } finally {
      setLoadingRemetentes(false);
    }
  };

  const fetchPostagens = async () => {
    if (!selectedRemetente) return;

    try {
      setLoadingPostagens(true);
      console.log('🔍 Buscando postagens (PRE_POSTADO) e filtrando por remetenteId:', selectedRemetente.id, selectedRemetente.nome);

      // Buscar PRE_POSTADO (status correto para manifesto) JÁ filtrando por remetenteId (mesmo padrão do /admin/relatorios/envios)
      const response = await emissaoService.getAll(
        {
          limit: 500,
          offset: 0,
          status: 'PRE_POSTADO',
          remetenteId: selectedRemetente.id,
        },
        'admin'
      );

      const todas = response?.data || [];

      console.log('📋 Postagens retornadas (PRE_POSTADO):', todas.length);

      setPostagens(todas);
      setSelectedPostagens([]);
    } catch (error) {
      console.error('Erro ao buscar postagens:', error);
      toast.error('Erro ao carregar postagens');
    } finally {
      setLoadingPostagens(false);
    }
  };

  const handleSelectRemetente = (remetente: Remetente) => {
    setSelectedRemetente(remetente);
    setStep(2);
  };

  const handleTogglePostagem = (id: string) => {
    setSelectedPostagens(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPostagens.length === postagens.length) {
      setSelectedPostagens([]);
    } else {
      setSelectedPostagens(postagens.map(p => p.id!));
    }
  };

  const handleGerarManifesto = async () => {
    if (selectedPostagens.length === 0) {
      toast.error('Selecione pelo menos uma postagem');
      return;
    }

    try {
      setLoadingManifesto(true);
      
      // Mapear as emissões selecionadas para o formato esperado pelo serviço
      // Montar dados completos do remetente para o manifesto
      const remetenteData = {
        nome: selectedRemetente?.nome || '',
        cpfCnpj: selectedRemetente?.cpfCnpj || '',
        endereco: {
          logradouro: selectedRemetente?.logradouro || '',
          numero: selectedRemetente?.numero || '',
          bairro: selectedRemetente?.bairro || '',
          localidade: selectedRemetente?.localidade || '',
          uf: selectedRemetente?.uf || '',
          cep: selectedRemetente?.cep || ''
        }
      };

      const emissoesParaManifesto = postagens
        .filter(p => selectedPostagens.includes(p.id!))
        .map(p => ({
          id: p.id,
          codigoObjeto: p.codigoObjeto,
          remetenteNome: selectedRemetente?.nome || p.remetenteNome,
          remetenteCpfCnpj: selectedRemetente?.cpfCnpj,
          remetente: remetenteData,
          destinatarioNome: p.destinatario?.nome || '',
          status: p.status,
          criadoEm: p.criadoEm
        }));

      const emissoesSelecionadas = postagens.filter(p => selectedPostagens.includes(p.id!));

      const totalObjetos = emissoesSelecionadas.length;
      const totalSedex = emissoesSelecionadas.filter(p => (p.servico || '').toUpperCase().includes('SEDEX')).length;
      const totalPac = emissoesSelecionadas.filter(p => (p.servico || '').toUpperCase().includes('PAC')).length;

      const response = await manifestoService.enviarManifesto(emissoesParaManifesto as any);
      
      if (response?.dados) {
        const enderecoLinha = [
          [selectedRemetente?.logradouro, selectedRemetente?.numero].filter(Boolean).join(', '),
          selectedRemetente?.bairro,
          selectedRemetente?.localidade && selectedRemetente?.uf ? `${selectedRemetente.localidade}/${selectedRemetente.uf}` : (selectedRemetente?.localidade || selectedRemetente?.uf),
          selectedRemetente?.cep ? `CEP ${selectedRemetente.cep}` : ''
        ].filter(Boolean).join(' - ');

        const pdfCorrigido = await patchManifestoPdfHeader(response.dados, {
          clienteNome: selectedRemetente?.nome || 'Remetente',
          clienteCnpj: selectedRemetente?.cpfCnpj || '',
          enderecoLinha,
          manifestoId: response.manifestoId,
          dataHora: formatDateTime(new Date().toISOString()),
          totalObjetos,
          totalSedex,
          totalPac,
        });

        // Abrir PDF do manifesto
        openPDFInNewTab(pdfCorrigido, `manifesto-${selectedRemetente?.nome || 'saida'}.pdf`);
        toast.success('Manifesto gerado com sucesso!');
        handleClose();
      } else {
        toast.error('Erro ao gerar manifesto: PDF não retornado');
      }
    } catch (error: any) {
      console.error('Erro ao gerar manifesto:', error);
      toast.error(error?.response?.data?.message || 'Erro ao gerar manifesto');
    } finally {
      setLoadingManifesto(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedRemetente(null);
    setPostagens([]);
    setSelectedPostagens([]);
    setSearchRemetente('');
    onClose();
  };

  const handleVoltar = () => {
    setStep(1);
    setSelectedRemetente(null);
    setPostagens([]);
    setSelectedPostagens([]);
  };

  const filteredRemetentes = remetentes.filter(r => 
    r.nome?.toLowerCase().includes(searchRemetente.toLowerCase()) ||
    r.cpfCnpj?.includes(searchRemetente)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
              <FileText className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gerar Manifesto de Saída
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {step === 1 ? 'Selecione o remetente' : `Selecione as postagens de ${selectedRemetente?.nome}`}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === 1 ? (
            <>
              {/* Search Remetente */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar remetente por nome ou CPF/CNPJ..."
                  value={searchRemetente}
                  onChange={(e) => setSearchRemetente(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Lista de Remetentes */}
              {loadingRemetentes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-orange-500" size={32} />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRemetentes.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-slate-400 py-8">
                      Nenhum remetente encontrado
                    </p>
                  ) : (
                    filteredRemetentes.map((remetente) => (
                      <button
                        key={remetente.id}
                        onClick={() => handleSelectRemetente(remetente)}
                        className="w-full p-4 text-left bg-gray-50 dark:bg-slate-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">{remetente.nome}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {remetente.cpfCnpj} {remetente.localidade && `• ${remetente.localidade}/${remetente.uf}`}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleVoltar}
                  className="text-sm text-gray-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                >
                  ← Voltar para seleção de remetente
                </button>
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                >
                  {selectedPostagens.length === postagens.length ? (
                    <>
                      <CheckSquare size={18} /> Desmarcar todos
                    </>
                  ) : (
                    <>
                      <Square size={18} /> Selecionar todos ({postagens.length})
                    </>
                  )}
                </button>
              </div>

              {/* Lista de Postagens */}
              {loadingPostagens ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-orange-500" size={32} />
                </div>
              ) : postagens.length === 0 ? (
              <div className="text-center py-12">
                  <FileText className="mx-auto text-gray-300 dark:text-slate-600 mb-4" size={48} />
                  <p className="text-gray-500 dark:text-slate-400">
                    Nenhuma postagem encontrada com status PRE_POSTADO para este remetente
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {postagens.map((postagem) => (
                    <div
                      key={postagem.id}
                      onClick={() => handleTogglePostagem(postagem.id!)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedPostagens.includes(postagem.id!)
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                          : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                          selectedPostagens.includes(postagem.id!)
                            ? 'bg-orange-500 text-white'
                            : 'border-2 border-gray-300 dark:border-slate-500'
                        }`}>
                          {selectedPostagens.includes(postagem.id!) && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-mono font-medium text-gray-900 dark:text-white">
                              {postagem.codigoObjeto}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {formatDateTime(postagem.criadoEm)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-slate-300">
                            Destinatário: {postagem.destinatario?.nome || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {step === 2 && postagens.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {selectedPostagens.length} de {postagens.length} postagens selecionadas
              </p>
              <button
                onClick={handleGerarManifesto}
                disabled={selectedPostagens.length === 0 || loadingManifesto}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {loadingManifesto ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Gerar Manifesto
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
