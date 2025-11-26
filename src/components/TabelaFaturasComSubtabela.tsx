import React, { useState } from 'react';
import { format } from 'date-fns';
import Decimal from 'decimal.js';
import { DataTable } from './DataTable';
import type { IFatura } from '../types/IFatura';
import { calcularLucro, formatCurrencyWithCents } from '../utils/formatCurrency';
import { formatCpfCnpj } from '../utils/lib.formats';
import { formatarDataVencimento } from '../utils/date-utils';
import { StatusBadge } from './StatusBadge';
import { CopiadorDeId } from './CopiadorDeId';
import { Eye, CheckCircle, CreditCard, MessageCircle, XCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';

interface TabelaFaturasComSubtabelaProps {
    faturas: IFatura[];
    setIsModalConfirmaPagamento: (data: { isOpen: boolean; fatura: IFatura }) => void;
    realizarFechamento: (fatura: IFatura) => void;
    verificarFechamentoExistente: (faturaId: string) => any;
    visualizarFechamento: (fatura: IFatura) => void;
    cancelarBoleto: (fatura: IFatura) => void;
}

export const TabelaFaturasComSubtabela: React.FC<TabelaFaturasComSubtabelaProps> = ({
    faturas,
    setIsModalConfirmaPagamento,
    realizarFechamento,
    verificarFechamentoExistente,
    visualizarFechamento,
    cancelarBoleto,
}) => {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleExpand = (rowId: string) => {
        setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
    };

    const enviarFaturaWebhook = async (fatura: IFatura) => {
        try {
            const fechamentoData = verificarFechamentoExistente(fatura.id);
            
            if (!fechamentoData || (!fechamentoData.faturaPdf && !fechamentoData.boletoPdf)) {
                toast.error('PDF da fatura não encontrado. Realize o fechamento primeiro.');
                return;
            }

            // Criar blob do PDF (concatenado ou individual)
            let blob: Blob;
            
            if (fechamentoData.boletoPdf && fechamentoData.faturaPdf) {
                // Concatenar boleto + fatura
                const { PDFDocument } = await import('pdf-lib');
                
                const boletoPdfDoc = await PDFDocument.load(fechamentoData.boletoPdf);
                const faturaPdfDoc = await PDFDocument.load(fechamentoData.faturaPdf);
                
                const mergedPdf = await PDFDocument.create();
                const boletoCopiedPages = await mergedPdf.copyPages(boletoPdfDoc, boletoPdfDoc.getPageIndices());
                boletoCopiedPages.forEach((page) => mergedPdf.addPage(page));
                
                const faturaCopiedPages = await mergedPdf.copyPages(faturaPdfDoc, faturaPdfDoc.getPageIndices());
                faturaCopiedPages.forEach((page) => mergedPdf.addPage(page));
                
                const mergedPdfBytes = await mergedPdf.save();
                blob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
            } else {
                // Converter base64 existente para Blob
                const pdfBase64 = fechamentoData.boletoPdf || fechamentoData.faturaPdf;
                const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: 'application/pdf' });
            }

            // Buscar celular do remetente
            let celularRemetente = '';
            try {
                const remetenteResponse = await fetch(`https://envios.brhubb.com.br/api/remetente/${fatura.cpfCnpj ?? fatura.cliente.cpfCnpj}`);
                if (remetenteResponse.ok) {
                    const remetentes = await remetenteResponse.json();
                    if (remetentes && remetentes.length > 0) {
                        celularRemetente = remetentes[0].celular || '';
                    }
                }
            } catch (error) {
                console.warn('Não foi possível buscar celular do remetente:', error);
            }

            // Upload para Supabase Storage
            const baseFileName = `fatura_${fatura.id}_${Date.now()}.pdf`;
            const storagePath = `faturas/${baseFileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('faturas')
                .upload(storagePath, blob, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            if (uploadError) {
                throw new Error('Erro ao fazer upload do PDF: ' + uploadError.message);
            }

            // Gerar URL pública para verificação
            const { data: publicUrlData } = supabase.storage
                .from('faturas')
                .getPublicUrl(storagePath);

            console.log('✅ PDF salvo e URL pública gerada:', {
                fileName: baseFileName,
                storagePath,
                publicUrl: publicUrlData.publicUrl,
                uploadKey: uploadData?.path
            });

            const payload = {
                celular_cliente: celularRemetente,
                nome_cliente: fechamentoData.nomeCliente || fatura.cliente?.nome || fatura.nome || '',
                // Enviar somente o NOME do arquivo, sem caminho, conforme combinado
                pdf_url: baseFileName
            };

            console.log('📤 Enviando fatura para webhook:', { 
                celular: payload.celular_cliente,
                nome: payload.nome_cliente,
                pdf_url: payload.pdf_url,
                url_completa: publicUrlData.publicUrl
            });

            const response = await fetch(
                'https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/ab52ed88-dd1c-4bd2-a198-d1845e59e058/d965a334-7b87-4241-b3f2-d1026752f3e7',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (response.ok) {
                toast.success('Fatura enviada com sucesso!');
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Erro do webhook:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: errorData
                });
                throw new Error(`Erro ${response.status}: ${errorData.message || response.statusText || 'Webhook não encontrado'}`);
            }
        } catch (error: any) {
            console.error('Erro ao enviar fatura:', error);
            toast.error(error.message || 'Erro ao enviar fatura para o webhook');
        }
    };

    const renderSubTable = (subData: IFatura[]) => {
        return (
            <DataTable<IFatura>
                data={subData}
                columns={[
                    {
                        header: 'Subfatura - Cliente',
                        accessor: (row) => (
                            <div className="flex-col flex">
                                <span className="font-medium">{row.nome ?? row.cliente.nome}</span>
                                <span className="font-medium text-xs text-slate-400">{formatCpfCnpj(row.cpfCnpj ?? row.cliente.cpfCnpj)}</span>
                                <CopiadorDeId id={row.id.toString()} />
                            </div>
                        ),
                    },
                    {
                        header: 'Total R$',
                        accessor: (row) => (
                            <div>
                                {formatCurrencyWithCents(row.totalFaturado)}
                                <br />
                                <small className="text-red-700">{row.totalCusto && `Custo: ${formatCurrencyWithCents(row.totalCusto)}`}</small>
                                <br />
                                <small className="text-green-700">
                                    {Decimal(row.totalFaturado).minus(Decimal(row.totalCusto)).greaterThan(0) &&
                                        `Lucro: ${calcularLucro(Number(row.totalFaturado), Number(row.totalCusto))}`}
                                </small>
                            </div>
                        ),
                    },
                    {
                        header: 'Vencimento',
                        accessor: (row) => <div className="px-4 py-3 flex-col flex">{formatarDataVencimento(row.dataVencimento, row.dataPagamento)}</div>,
                    },
                    {
                        header: 'Status',
                        accessor: (row) => <StatusBadge status={row.status || ''} tipo="faturamento" />,
                    },
                ]}
                actionTitle={(row) => `${row.nome} - ${row.cpfCnpj}`}
                actions={[
                    {
                        label: 'Visualizar Boleto',
                        icon: <Eye size={16} />,
                        onClick: (row) => visualizarFechamento(row),
                        show: (row) => !!(verificarFechamentoExistente(row.id)) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                    },
                    {
                        label: 'Realizar Fechamento',
                        icon: <CheckCircle size={16} />,
                        onClick: (row) => realizarFechamento(row),
                        show: (row) => !verificarFechamentoExistente(row.id) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                    },
                    {
                        label: 'Confirmar Pagamento',
                        icon: <CreditCard size={16} />,
                        onClick: (row) => setIsModalConfirmaPagamento({ isOpen: true, fatura: row }),
                        show: (row) => ['PENDENTE', 'PAGO_PARCIAL'].includes(row.status),
                    },
                    {
                        label: 'Notificar via WhatsApp (Em breve)',
                        icon: <MessageCircle size={16} />,
                        onClick: () => {},
                        show: () => false,
                        disabled: true,
                    },
                    {
                        label: 'Cancelar Boleto',
                        icon: <XCircle size={16} />,
                        onClick: (row) => cancelarBoleto(row),
                        show: (row) => !!(verificarFechamentoExistente(row.id)) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                    },
                    {
                        label: 'Enviar Fatura',
                        icon: <Send size={16} />,
                        onClick: (row) => enviarFaturaWebhook(row),
                        show: (row) => !!(verificarFechamentoExistente(row.id)),
                    },
                ]}
                rowKey={(row) => row.id}
                className=""
            />
        );
    };

    return (
        <DataTable<IFatura>
            data={faturas}
            columns={[
                {
                    header: 'Cliente',
                    accessor: (row) => {
                        const nomeExibir = row.nome ?? row.cliente.nome;
                        const cpfCnpjExibir = row.cpfCnpj ?? row.cliente.cpfCnpj;

                        return (
                            <div className="flex-col flex">
                                <span className="font-medium">{nomeExibir}</span>
                                <span className="font-medium text-xs text-slate-400">{formatCpfCnpj(cpfCnpjExibir)}</span>
                                <CopiadorDeId id={row.id.toString()} />
                            </div>
                        );
                    },
                },
                {
                    header: 'Total Fatura R$',
                    accessor: (row) => (
                        <div className="px-4 py-3">
                            {formatCurrencyWithCents(row.totalFaturado)}
                            <br />
                            <small className="text-red-700">{row.totalCusto && `Custo: ${formatCurrencyWithCents(row.totalCusto)}`}</small>
                            <br />
                            <small className="text-green-700">
                                {Decimal(row.totalFaturado).minus(Decimal(row.totalCusto)).greaterThan(0) &&
                                    `Lucro: ${calcularLucro(Number(row.totalFaturado), Number(row.totalCusto))}`}
                            </small>
                        </div>
                    ),
                },
                {
                    header: 'Data Vencimento',
                    accessor: (row) => <div className="px-4 py-3 flex-col flex">{formatarDataVencimento(row.dataVencimento, row.dataPagamento)}</div>,
                },
                {
                    header: 'Status',
                    accessor: (row) => <StatusBadge status={row.status || ''} tipo="faturamento" />,
                },
                {
                    header: 'Criado em',
                    accessor: (row) => <div className="px-4 py-3">{format(new Date(row.criadoEm || ''), 'dd/MM/yyyy')}</div>,
                },
            ]}
            actionTitle={(row) => `${row.nome ?? row.cliente.nome} - ${row.cpfCnpj ?? row.cliente.cpfCnpj}`}
            actions={[
                {
                    label: 'Visualizar Boleto',
                    icon: <Eye size={16} />,
                    onClick: (row) => visualizarFechamento(row),
                    show: (row) => !!(verificarFechamentoExistente(row.id)) && (!row.faturas || row.faturas.length === 0) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                },
                {
                    label: 'Realizar Fechamento',
                    icon: <CheckCircle size={16} />,
                    onClick: (row) => realizarFechamento(row),
                    show: (row) => !verificarFechamentoExistente(row.id) && (!row.faturas || row.faturas.length === 0) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                },
                {
                    label: 'Confirmar Pagamento',
                    icon: <CreditCard size={16} />,
                    onClick: (row) => setIsModalConfirmaPagamento({ isOpen: true, fatura: row }),
                    show: (row) => !(row.faturas && row.faturas.length > 0) && ['PENDENTE', 'PAGO_PARCIAL'].includes(row.status),
                },
                {
                    label: 'Notificar via WhatsApp (Em breve)',
                    icon: <MessageCircle size={16} />,
                    onClick: () => {},
                    show: () => false,
                    disabled: true,
                },
                    {
                        label: 'Cancelar Boleto',
                        icon: <XCircle size={16} />,
                        onClick: (row) => cancelarBoleto(row),
                        show: (row) => !!(verificarFechamentoExistente(row.id)) && (!row.faturas || row.faturas.length === 0) && (row.status === 'PENDENTE' || row.status === 'PAGO_PARCIAL'),
                    },
                    {
                        label: 'Enviar Fatura',
                        icon: <Send size={16} />,
                        onClick: (row) => enviarFaturaWebhook(row),
                        show: (row) => !!(verificarFechamentoExistente(row.id)) && (!row.faturas || row.faturas.length === 0),
                    },
            ]}
            subTable={{
                hasSubData: (row) => !!(row.faturas && row.faturas.length > 0),
                getSubData: (row) => row.faturas || [],
                renderSubTable,
                expandedRows,
                onToggleExpand: toggleExpand,
            }}
            rowKey={(row) => row.id}
        />
    );
};
