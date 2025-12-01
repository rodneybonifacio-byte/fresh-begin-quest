import React, { useState } from 'react';
import { X, Send, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import type { IFatura } from '../types/IFatura';

interface ModalEnviarFaturaWhatsAppProps {
    isOpen: boolean;
    onClose: () => void;
    fatura: IFatura | null;
    fechamentoData: any;
}

export const ModalEnviarFaturaWhatsApp: React.FC<ModalEnviarFaturaWhatsAppProps> = ({
    isOpen,
    onClose,
    fatura,
    fechamentoData,
}) => {
    const [celular, setCelular] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const formatarCelular = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    };

    const handleCelularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatarCelular(e.target.value);
        setCelular(formatted);
    };

    const enviarFatura = async () => {
        if (!fatura || !fechamentoData) return;

        const celularLimpo = celular.replace(/\D/g, '');
        if (celularLimpo.length < 10) {
            toast.error('Informe um número de celular válido');
            return;
        }

        setIsLoading(true);
        try {
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

            // Gerar URL pública
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
                celular_cliente: celularLimpo,
                nome_cliente: fechamentoData.nomeCliente || fatura.cliente?.nome || fatura.nome || '',
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
                setCelular('');
                onClose();
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
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Enviar Fatura via WhatsApp
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Informe o número de WhatsApp que receberá a fatura:
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Número do WhatsApp
                        </label>
                        <div className="relative">
                            <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="tel"
                                value={celular}
                                onChange={handleCelularChange}
                                placeholder="(00) 00000-0000"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                maxLength={16}
                            />
                        </div>
                    </div>

                    {fatura && (
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 space-y-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Cliente:</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {fatura.nome ?? fatura.cliente?.nome}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={enviarFatura}
                        disabled={isLoading || celular.replace(/\D/g, '').length < 10}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Send size={16} />
                                Enviar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
