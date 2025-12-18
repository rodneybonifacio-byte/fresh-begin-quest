import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Content } from '../../Content';
import { LoadSpinner } from '../../../../components/loading';
import { TableCustom } from '../../../../components/table';
import { NotFoundData } from '../../../../components/NotFoundData';
import CustomCheckbox from '../../../../components/CheckboxCustom';
import { useLoadingSpinner } from '../../../../providers/LoadingSpinnerContext';
import { PaginacaoCustom } from '../../../../components/PaginacaoCustom';
import { ModalProgressoGeracaoMassa } from '../../../../components/ModalProgressoGeracaoMassa';
import { ModalRecargaPix } from '../../financeiro/recarga/ModalRecargaPix';
import { useAuth } from '../../../../providers/AuthContext';


import { toastError, toastSuccess, toastWarning } from '../../../../utils/toastNotify';
import { formatDateTime } from '../../../../utils/date-utils';
import { RefreshCcw, Package, CheckCircle, Clock, AlertCircle, Truck, Zap, RotateCcw, FileCheck, FileX } from 'lucide-react';
import { IntegracaoService } from '../../../../services/IntegracaoService';
import { isValid as isValidCpf } from '@fnando/cpf';
import { isValid as isValidCnpj } from '@fnando/cnpj';

interface PedidoImportado {
    id: string;
    externo_id: string;
    numero_pedido: string;
    plataforma: string;
    status: string;
    destinatario_nome: string;
    destinatario_logradouro: string;
    destinatario_numero: string;
    destinatario_complemento: string;
    destinatario_bairro: string;
    destinatario_cidade: string;
    destinatario_estado: string;
    destinatario_cep: string;
    destinatario_cpf_cnpj: string | null;
    valor_total: number;
    peso_total: number;
    codigo_rastreio: string | null;
    servico_frete: string | null;
    criado_em: string;
    dados_originais?: {
        shipping_address?: {
            company?: string;
        };
        billing_address?: {
            company?: string;
        };
    };
    remetentes?: {
        nome: string;
    };
}

// Extrair CPF/CNPJ do campo company do Shopify
const extrairDocumento = (pedido: PedidoImportado): string | null => {
    // Primeiro tenta o campo já salvo
    if (pedido.destinatario_cpf_cnpj) {
        return pedido.destinatario_cpf_cnpj;
    }
    
    // Tenta extrair do dados_originais (shipping_address.company ou billing_address.company)
    const company = pedido.dados_originais?.shipping_address?.company || 
                   pedido.dados_originais?.billing_address?.company || '';
    
    // Extrair apenas dígitos
    const digitos = company.replace(/\D/g, '');
    
    if (digitos.length === 11 || digitos.length === 14) {
        return digitos;
    }
    
    return null;
};

// Verificar se documento é válido
const isDocumentoValido = (documento: string | null): boolean => {
    if (!documento) return false;
    
    const digitos = documento.replace(/\D/g, '');
    
    if (digitos.length === 11) {
        return isValidCpf(digitos);
    }
    if (digitos.length === 14) {
        return isValidCnpj(digitos);
    }
    
    return false;
};

// Formatar documento para exibição
const formatarDocumento = (documento: string | null): string => {
    if (!documento) return '-';
    
    const digitos = documento.replace(/\D/g, '');
    
    if (digitos.length === 11) {
        return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (digitos.length === 14) {
        return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return documento;
};

// Badge de status do documento
const DocumentoBadge = ({ documento }: { documento: string | null }) => {
    const valido = isDocumentoValido(documento);
    
    if (valido) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <FileCheck className="w-3 h-3" />
                OK
            </span>
        );
    }
    
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <FileX className="w-3 h-3" />
            Inválido
        </span>
    );
};

interface ProgressoState {
    isOpen: boolean;
    total: number;
    processados: number;
    sucessos: number;
    erros: number;
    pedidoAtual?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
        pendente: {
            icon: <Clock className="w-3 h-3" />,
            className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            label: 'Pendente',
        },
        processado: {
            icon: <CheckCircle className="w-3 h-3" />,
            className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            label: 'Processado',
        },
        erro: {
            icon: <AlertCircle className="w-3 h-3" />,
            className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            label: 'Erro',
        },
    };

    const config = statusConfig[status] || statusConfig.pendente;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {config.icon}
            {config.label}
        </span>
    );
};

const ITEMS_PER_PAGE = 10;

const PedidosImportados = () => {
    const { setIsLoading } = useLoadingSpinner();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const service = new IntegracaoService();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [importando, setImportando] = useState(false);
    const [cancelando, setCancelando] = useState(false);
    const canceladoRef = useRef(false);

    // Estados para modal PIX
    const [showPixModal, setShowPixModal] = useState(false);
    const [pixChargeData, setPixChargeData] = useState<any>(null);
    const [saldoAtual, setSaldoAtual] = useState(0);
    const [pedidoPendentePix, setPedidoPendentePix] = useState<string | null>(null);

    const [progresso, setProgresso] = useState<ProgressoState>({
        isOpen: false,
        total: 0,
        processados: 0,
        sucessos: 0,
        erros: 0,
    });

    // Buscar pedidos importados via backend function
    const { data: pedidos, isLoading, isError } = useQuery({
        queryKey: ['pedidos-importados'],
        queryFn: async () => {
            const response = await service.getPedidosImportados();
            return response.data as PedidoImportado[];
        },
    });

    // Paginação
    const totalRecords = pedidos?.length || 0;
    const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedPedidos = pedidos?.slice(startIndex, endIndex) || [];
    const recordsOnPage = paginatedPedidos.length;

    const paginationMeta = {
        currentPage,
        totalPages,
        totalRecords,
        recordsOnPage,
        prevPage: currentPage > 1 ? currentPage - 1 : null,
        nextPage: currentPage < totalPages ? currentPage + 1 : null,
    };

    // Processar pedidos em massa com progresso
    const processarEmMassa = useCallback(async (ids: string[], pedidosData: PedidoImportado[]) => {
        canceladoRef.current = false;
        setCancelando(false);

        setProgresso({
            isOpen: true,
            total: ids.length,
            processados: 0,
            sucessos: 0,
            erros: 0,
        });

        let sucessos = 0;
        let erros = 0;

        for (let i = 0; i < ids.length; i++) {
            if (canceladoRef.current) {
                break;
            }

            const id = ids[i];
            const pedido = pedidosData.find((p) => p.id === id);

            setProgresso((prev) => ({
                ...prev,
                pedidoAtual: pedido?.numero_pedido || id,
            }));

            try {
                const response = await service.processarPedidoShopify(id);
                
                // Verificar se retornou saldo insuficiente com PIX
                if (response.data?.saldoInsuficiente && response.data?.pix) {
                    console.log('⚠️ Saldo insuficiente - mostrando modal PIX');
                    
                    // Fechar o modal de progresso
                    setProgresso((prev) => ({ ...prev, isOpen: false }));
                    
                    // Configurar modal de PIX
                    setSaldoAtual(response.data.saldoAtual || 0);
                    setPixChargeData({
                        pix_copia_cola: response.data.pix.pixCopiaECola,
                        qr_code_url: response.data.pix.qrCodeUrl,
                        valor: response.data.pix.valor,
                        txid: response.data.pix.txid,
                    });
                    setPedidoPendentePix(id);
                    setShowPixModal(true);
                    
                    toastWarning(`Saldo insuficiente. Realize o pagamento de R$ ${response.data.valorNecessario?.toFixed(2)} via PIX.`);
                    return; // Parar o processamento em massa
                }
                
                sucessos++;
            } catch {
                erros++;
            }

            setProgresso((prev) => ({
                ...prev,
                processados: i + 1,
                sucessos,
                erros,
            }));
        }

        // Finalizado
        setProgresso((prev) => ({
            ...prev,
            pedidoAtual: undefined,
        }));

        if (sucessos > 0) {
            toastSuccess(`${sucessos} etiqueta(s) gerada(s) com sucesso!`);
        }
        if (erros > 0) {
            toastError(`${erros} pedido(s) com erro`);
        }

        setSelectedIds([]);
        queryClient.invalidateQueries({ queryKey: ['pedidos-importados'] });
    }, [queryClient, service]);

    const handleCancelar = useCallback(() => {
        if (progresso.processados >= progresso.total) {
            // Finalizado, apenas fechar
            setProgresso((prev) => ({ ...prev, isOpen: false }));
        } else {
            // Cancelar processamento
            setCancelando(true);
            canceladoRef.current = true;
        }
    }, [progresso.processados, progresso.total]);

    const handleProcessarSelecionados = () => {
        if (selectedIds.length === 0) {
            toastError('Selecione pelo menos um pedido');
            return;
        }
        processarEmMassa(selectedIds, pedidos || []);
    };

    const handleGerarEmMassa = () => {
        const pendentesData = pedidos?.filter((p) => p.status === 'pendente') || [];
        if (pendentesData.length === 0) {
            toastError('Nenhum pedido pendente para gerar etiqueta');
            return;
        }
        processarEmMassa(pendentesData.map((p) => p.id), pendentesData);
    };

    const handleImportarPedidos = async () => {
        try {
            setImportando(true);
            setIsLoading(true);

            const integracoesResponse = await service.getAll();
            const shopifyIntegracao = integracoesResponse.data.find((i) => i.plataforma === 'shopify');

            if (!shopifyIntegracao) {
                throw new Error('Configure a integração Shopify primeiro');
            }

            if (!shopifyIntegracao.remetenteId || !shopifyIntegracao.id) {
                throw new Error('Selecione um remetente na integração Shopify');
            }

            const response = await service.importarPedidosShopify(shopifyIntegracao.id, shopifyIntegracao.remetenteId);
            setCurrentPage(1);
            toastSuccess(response?.message || 'Pedidos importados!');
            queryClient.invalidateQueries({ queryKey: ['pedidos-importados'] });
        } catch (error: any) {
            toastError(error.message || 'Erro ao importar pedidos');
        } finally {
            setImportando(false);
            setIsLoading(false);
        }
    };

    const handleCheckboxChange = (id: string, selected: boolean) => {
        setSelectedIds((prev) => (selected ? [...prev, id] : prev.filter((item) => item !== id)));
    };

    const pendentes = pedidos?.filter((p) => p.status === 'pendente') || [];
    const processados = pedidos?.filter((p) => p.status === 'processado') || [];
    const comErro = pedidos?.filter((p) => p.status === 'erro') || [];

    const handleReprocessarFalhados = () => {
        if (comErro.length === 0) {
            toastError('Nenhum pedido com erro para reprocessar');
            return;
        }
        processarEmMassa(comErro.map((p) => p.id), comErro);
    };

    // Card mobile para cada pedido
    const PedidoCard = ({ pedido }: { pedido: PedidoImportado }) => {
        const documento = extrairDocumento(pedido);
        
        return (
            <div className={`bg-card border rounded-xl p-4 space-y-3 ${
                selectedIds.includes(pedido.id) ? 'border-primary bg-primary/5' : 'border-border'
            }`}>
                {/* Header: Checkbox + Pedido + Status */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {pedido.status === 'pendente' && (
                            <CustomCheckbox
                                checked={selectedIds.includes(pedido.id)}
                                item={{ value: pedido.id, label: '' }}
                                onSelected={(item, selected) => handleCheckboxChange(item.value, selected)}
                            />
                        )}
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">#{pedido.numero_pedido}</span>
                        </div>
                    </div>
                    <StatusBadge status={pedido.status} />
                </div>

                {/* Destinatário */}
                <div className="space-y-1">
                    <span className="font-medium text-sm">{pedido.destinatario_nome}</span>
                    <p className="text-xs text-muted-foreground">
                        {pedido.destinatario_logradouro}
                        {pedido.destinatario_numero ? `, ${pedido.destinatario_numero}` : ''} - {pedido.destinatario_bairro}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {pedido.destinatario_cidade}/{pedido.destinatario_estado} - CEP: {pedido.destinatario_cep}
                    </p>
                </div>

                {/* CPF/CNPJ + Doc Status */}
                <div className="flex items-center justify-between gap-2 py-2 border-t border-border">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">CPF/CNPJ:</span>
                        <span className="font-mono text-xs">{formatarDocumento(documento)}</span>
                    </div>
                    <DocumentoBadge documento={documento} />
                </div>

                {/* Footer: Valor + Rastreio + Data */}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-primary">R$ {Number(pedido.valor_total || 0).toFixed(2)}</span>
                        {pedido.codigo_rastreio && (
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{pedido.codigo_rastreio}</span>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(pedido.criado_em)}</span>
                </div>
            </div>
        );
    };

    return (
        <Content
            titulo="Pedidos Importados"
            subTitulo={`${pendentes.length} pendente(s) · ${processados.length} processado(s)${comErro.length > 0 ? ` · ${comErro.length} erro(s)` : ''}`}
            isButton
            button={[
                ...(comErro.length > 0
                    ? [
                          {
                              label: window.innerWidth < 640 ? `Reprocessar (${comErro.length})` : `Reprocessar Falhados (${comErro.length})`,
                              onClick: handleReprocessarFalhados,
                              bgColor: 'bg-red-600 hover:bg-red-700',
                              icon: <RotateCcw className="w-4 h-4" />,
                          },
                      ]
                    : []),
                ...(pendentes.length > 0
                    ? [
                          {
                              label: window.innerWidth < 640 ? `Gerar (${pendentes.length})` : `Gerar Todos (${pendentes.length})`,
                              onClick: handleGerarEmMassa,
                              bgColor: 'bg-amber-600 hover:bg-amber-700',
                              icon: <Zap className="w-4 h-4" />,
                          },
                      ]
                    : []),
                ...(selectedIds.length > 0
                    ? [
                          {
                              label: window.innerWidth < 640 ? `Etiquetas (${selectedIds.length})` : `Gerar Etiquetas (${selectedIds.length})`,
                              onClick: handleProcessarSelecionados,
                              bgColor: 'bg-green-600 hover:bg-green-700',
                              icon: <Truck className="w-4 h-4" />,
                          },
                      ]
                    : []),
                {
                    label: importando ? 'Importando...' : (window.innerWidth < 640 ? 'Importar' : 'Importar Pedidos'),
                    onClick: handleImportarPedidos,
                    bgColor: 'bg-primary',
                    icon: <RefreshCcw className={`w-4 h-4 ${importando ? 'animate-spin' : ''}`} />,
                },
            ]}
        >
            {isLoading && <LoadSpinner mensagem="Carregando pedidos..." />}

            {!isLoading && !isError && pedidos && pedidos.length > 0 && (
                <div className="rounded-lg">
                    {/* Desktop: Table view */}
                    <div className="hidden md:block">
                        <TableCustom thead={['', 'Pedido', 'Plataforma', 'Destinatário', 'CPF/CNPJ (company)', 'Doc.', 'Cidade/UF', 'Valor', 'Status', 'Rastreio', 'Data']}>
                            {paginatedPedidos.map((pedido) => {
                                const documento = extrairDocumento(pedido);
                                
                                return (
                                    <tr
                                        key={pedido.id}
                                        className={`hover:bg-accent/50 cursor-pointer transition-colors ${
                                            selectedIds.includes(pedido.id) ? 'bg-primary/5' : ''
                                        }`}
                                    >
                                        <td className="px-4 py-3">
                                            {pedido.status === 'pendente' && (
                                                <CustomCheckbox
                                                    checked={selectedIds.includes(pedido.id)}
                                                    item={{ value: pedido.id, label: '' }}
                                                    onSelected={(item, selected) => handleCheckboxChange(item.value, selected)}
                                                />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-medium">{pedido.numero_pedido}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm capitalize">{pedido.plataforma}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{pedido.destinatario_nome}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {pedido.destinatario_logradouro}
                                                    {pedido.destinatario_numero ? `, ${pedido.destinatario_numero}` : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-xs">
                                                {formatarDocumento(documento)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <DocumentoBadge documento={documento} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-muted-foreground">
                                                {pedido.destinatario_cidade}/{pedido.destinatario_estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium">R$ {Number(pedido.valor_total || 0).toFixed(2)}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={pedido.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            {pedido.codigo_rastreio ? (
                                                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{pedido.codigo_rastreio}</span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-muted-foreground">{formatDateTime(pedido.criado_em)}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </TableCustom>
                    </div>

                    {/* Mobile: Card view */}
                    <div className="md:hidden space-y-3">
                        {paginatedPedidos.map((pedido) => (
                            <PedidoCard key={pedido.id} pedido={pedido} />
                        ))}
                    </div>

                    <PaginacaoCustom meta={paginationMeta} onPageChange={setCurrentPage} />
                </div>
            )}

            {!isLoading && !isError && (!pedidos || pedidos.length === 0) && (
                <div className="text-center py-8 md:py-12 px-4">
                    <Package className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-base md:text-lg font-medium text-foreground mb-2">Nenhum pedido importado</h3>
                    <p className="text-sm md:text-base text-muted-foreground mb-4">
                        Clique em "Importar" para buscar pedidos da sua loja
                    </p>
                    <button
                        onClick={handleImportarPedidos}
                        disabled={importando}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2 text-sm md:text-base"
                    >
                        <RefreshCcw className={`w-4 h-4 ${importando ? 'animate-spin' : ''}`} />
                        Importar Pedidos
                    </button>
                </div>
            )}

            {isError && <NotFoundData />}

            <ModalProgressoGeracaoMassa
                isOpen={progresso.isOpen}
                total={progresso.total}
                processados={progresso.processados}
                sucessos={progresso.sucessos}
                erros={progresso.erros}
                pedidoAtual={progresso.pedidoAtual}
                onCancelar={handleCancelar}
                cancelando={cancelando}
            />

            {/* Modal PIX para saldo insuficiente */}
            <ModalRecargaPix
                isOpen={showPixModal}
                onClose={() => {
                    setShowPixModal(false);
                    setPedidoPendentePix(null);
                }}
                chargeData={pixChargeData}
                saldoInicial={saldoAtual}
                clienteId={user?.clienteId || ''}
                onPaymentConfirmed={async () => {
                    // Após pagamento confirmado, tentar processar o pedido novamente
                    if (pedidoPendentePix) {
                        try {
                            await service.processarPedidoShopify(pedidoPendentePix);
                            toastSuccess('Etiqueta gerada com sucesso!');
                            queryClient.invalidateQueries({ queryKey: ['pedidos-importados'] });
                        } catch (error: any) {
                            toastError(error.message || 'Erro ao gerar etiqueta');
                        }
                    }
                    setShowPixModal(false);
                    setPedidoPendentePix(null);
                }}
            />
        </Content>
    );
};

export default PedidosImportados;
