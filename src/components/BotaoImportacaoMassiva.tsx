import { useState } from 'react';
import { toast } from 'sonner';
import { EmissaoService } from '../services/EmissaoService';
import { ViacepService } from '../services/viacepService';
import { dadosPlanilhaCompleta } from '../utils/dados-planilha-completa';
import { LoadSpinner } from './loading';

export const BotaoImportacaoMassiva = () => {
    const [importando, setImportando] = useState(false);

    const processar = async () => {
        setImportando(true);
        const emissaoService = new EmissaoService();
        const viacepService = new ViacepService();

        try {
            toast.info(`Processando ${dadosPlanilhaCompleta.length} registros...`);

            // Enriquecer com CEP
            const dadosEnriquecidos = await Promise.all(
                dadosPlanilhaCompleta.map(async (item) => {
                    try {
                        const cepLimpo = item.cep.replace(/\D/g, '');
                        const endereco = await viacepService.consulta(cepLimpo);
                        return {
                            ...item,
                            bairro: endereco.bairro || 'Centro',
                            cidade: endereco.localidade || '',
                            estado: endereco.uf || ''
                        };
                    } catch (error) {
                        return {
                            ...item,
                            bairro: 'Centro',
                            cidade: '',
                            estado: ''
                        };
                    }
                })
            );

            // Normalizar
            const dadosNormalizados = dadosEnriquecidos.map((item: any) => ({
                servico_frete: item.servico_frete.toUpperCase().trim(),
                cep: item.cep.replace(/\D/g, ''),
                altura: Number(item.altura),
                largura: Number(item.largura),
                comprimento: Number(item.comprimento),
                peso: Number(item.peso),
                logradouro: String(item.logradouro).trim(),
                numero: Math.max(Number(item.numero) || 1, 1),
                complemento: item.complemento ? String(item.complemento).trim() : undefined,
                nomeDestinatario: String(item.nomeDestinatario).trim(),
                cpfCnpj: Number(item.cpfCnpj.replace(/\D/g, '')),
                valor_frete: Number(item.valor_frete),
                bairro: String(item.bairro).trim(),
                cidade: String(item.cidade).trim(),
                estado: String(item.estado).toUpperCase().trim()
            }));

            const payload = {
                cpfCnpj: '15808095000303',
                data: dadosNormalizados
            };

            await emissaoService.processarPedidosImportados(payload);
            toast.success(`✅ ${dadosNormalizados.length} etiquetas importadas!`);
        } catch (error: any) {
            toast.error(`Erro: ${error.message}`);
        } finally {
            setImportando(false);
        }
    };

    return (
        <>
            {importando && <LoadSpinner mensagem="Importando todos os registros..." />}
            <button
                onClick={processar}
                disabled={importando}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
                🚀 Importar 161 Etiquetas
            </button>
        </>
    );
};
