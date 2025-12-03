import React, { useState } from 'react';
import { ModalCustom } from './modal';
import { ButtonComponent } from './button';
import { InputField } from './InputField';
import type { IFatura } from '../types/IFatura';
import { BoletoService } from '../services/BoletoService';
import { toast } from 'sonner';
import { Download, FileText, Loader2 } from 'lucide-react';
import { downloadPDF } from '../utils/pdfUtils';

interface ModalEmitirBoletoProps {
    fatura: IFatura;
    onClose: () => void;
    onSuccess?: () => void;
}

export const ModalEmitirBoleto: React.FC<ModalEmitirBoletoProps> = ({
    fatura,
    onClose,
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [boleto, setBoleto] = useState<any>(null);
    const [dataVencimento, setDataVencimento] = useState(() => {
        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);
        return amanha.toISOString().split('T')[0];
    });

    const service = new BoletoService();

    const handleEmitir = async () => {
        try {
            setLoading(true);

            const resultado = await service.emitir({
                faturaId: fatura.id,
                valorCobrado: parseFloat(fatura.totalFaturado),
                dataVencimento,
                pagadorNome: fatura.cliente.nome,
                pagadorCpfCnpj: fatura.cliente.cpfCnpj,
                mensagem: `Fatura ${fatura.codigo} - BRHUB Envios`,
                multa: {
                    tipo: 'PERCENTUAL',
                    valor: 2, // 2% de multa
                },
                // Juros mora removido conforme solicitado
            });

            setBoleto(resultado);
            toast.success('Boleto emitido com sucesso!');
            onSuccess?.();
        } catch (error: any) {
            console.error('Erro ao emitir boleto:', error);
            toast.error(error.message || 'Erro ao emitir boleto');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (boleto?.pdf) {
            downloadPDF(boleto.pdf, `boleto_${fatura.codigo}.pdf`);
        }
    };

    return (
        <ModalCustom
            title="Emitir Boleto Bancário"
            description={`Fatura ${fatura.codigo} - ${fatura.cliente.nome}`}
            onCancel={onClose}
        >
            <div className="flex flex-col gap-4">
                {!boleto ? (
                    <>
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    Valor
                                </span>
                                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    R$ {parseFloat(fatura.totalFaturado).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    Cliente
                                </span>
                                <span className="text-sm text-slate-900 dark:text-slate-100">
                                    {fatura.cliente.nome}
                                </span>
                            </div>
                        </div>

                        <InputField
                            label="Data de Vencimento"
                            type="date"
                            value={dataVencimento}
                            onChange={(e) => setDataVencimento(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />

                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
                            <p className="text-blue-800 dark:text-blue-200 mb-2">
                                <strong>Configurações automáticas:</strong>
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                                <li>Multa: 2% após vencimento</li>
                                <li>Webhook configurado para atualização automática</li>
                            </ul>
                        </div>

                        <ButtonComponent
                            variant="primary"
                            onClick={handleEmitir}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Emitindo boleto...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Emitir Boleto
                                </>
                            )}
                        </ButtonComponent>
                    </>
                ) : (
                    <>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-4">
                                ✅ Boleto Emitido com Sucesso!
                            </h3>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Nosso Número:</span>
                                    <span className="font-mono font-bold">{boleto.nossoNumero}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Vencimento:</span>
                                    <span className="font-bold">
                                        {new Date(boleto.dataVencimento).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Valor:</span>
                                    <span className="font-bold">R$ {boleto.valor.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Linha Digitável:</p>
                                <p className="font-mono text-sm break-all">{boleto.linhaDigitavel}</p>
                            </div>
                        </div>

                        <ButtonComponent
                            variant="primary"
                            onClick={handleDownload}
                            className="w-full"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar Boleto PDF
                        </ButtonComponent>
                    </>
                )}
            </div>
        </ModalCustom>
    );
};
