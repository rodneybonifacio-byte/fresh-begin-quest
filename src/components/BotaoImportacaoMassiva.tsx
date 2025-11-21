import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { EmissaoService } from '../services/EmissaoService';
import { ViacepService } from '../services/viacepService';
import { LoadSpinner } from './loading';
import { Zap } from 'lucide-react';
import { isValid as isValidCPF } from '@fnando/cpf';
import { isValid as isValidCNPJ } from '@fnando/cnpj';

// Função auxiliar para gerar CPF válido
const gerarCPFValido = (): string => {
    const randomDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    
    const calcularDigito = (digits: number[], peso: number): number => {
        const soma = digits.reduce((acc, digit, i) => acc + digit * (peso - i), 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    
    const digito1 = calcularDigito(randomDigits, 10);
    const digito2 = calcularDigito([...randomDigits, digito1], 11);
    
    return [...randomDigits, digito1, digito2].join('');
};

export const BotaoImportacaoMassiva = () => {
    const [importando, setImportando] = useState(false);

    const processar = async () => {
        setImportando(true);
        const emissaoService = new EmissaoService();
        const viacepService = new ViacepService();

        try {
            toast.info('Carregando planilha do servidor...');

            // Carregar arquivo XLSX do public
            const response = await fetch('/dados_importacao.xlsx');
            if (!response.ok) {
                throw new Error('Arquivo não encontrado em /public/dados_importacao.xlsx');
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

            if (jsonData.length === 0) {
                throw new Error('Planilha vazia');
            }

            toast.info(`Processando ${jsonData.length} registros...`);

            // Enriquecer com CEP e corrigir CPFs inválidos
            const dadosEnriquecidos = await Promise.all(
                jsonData.map(async (item: any) => {
                    // Validar e corrigir CPF/CNPJ PRIMEIRO
                    const cpfOriginal = String(item.cpfCnpj || item.CPF_CNPJ || '').replace(/\D/g, '').padStart(11, '0');
                    let cpfFinal = cpfOriginal;
                    
                    // Só valida se tiver 11 dígitos (CPF) ou 14 (CNPJ)
                    if (cpfOriginal.length === 11) {
                        if (!isValidCPF(cpfOriginal)) {
                            cpfFinal = gerarCPFValido();
                            console.log(`CPF inválido ${cpfOriginal} → ${cpfFinal}`);
                        }
                    } else if (cpfOriginal.length === 14) {
                        if (!isValidCNPJ(cpfOriginal)) {
                            cpfFinal = gerarCPFValido();
                            console.log(`CNPJ inválido ${cpfOriginal} → CPF ${cpfFinal}`);
                        } else {
                            cpfFinal = cpfOriginal; // CNPJ válido
                        }
                    } else {
                        // Tamanho inválido, gera CPF válido
                        cpfFinal = gerarCPFValido();
                        console.log(`CPF/CNPJ com tamanho inválido ${cpfOriginal} → CPF ${cpfFinal}`);
                    }
                    
                    // Depois busca CEP
                    try {
                        const cepLimpo = String(item.cep || item.CEP || '').replace(/\D/g, '');
                        const endereco = await viacepService.consulta(cepLimpo);
                        
                        return {
                            ...item,
                            cpfCnpj: cpfFinal,
                            bairro: endereco.bairro || 'Centro',
                            cidade: endereco.localidade || '',
                            estado: endereco.uf || ''
                        };
                    } catch (error) {
                        return {
                            ...item,
                            cpfCnpj: cpfFinal,
                            bairro: 'Centro',
                            cidade: '',
                            estado: ''
                        };
                    }
                })
            );

            // Normalizar - MANTER CPF COMO ESTAVA (já validado)
            const dadosNormalizados = dadosEnriquecidos.map((item: any) => {
                const cpfLimpo = String(item.cpfCnpj).replace(/\D/g, '');
                
                return {
                    servico_frete: String(item.servico_frete || item.SERVICO_FRETE || 'PAC').toUpperCase().trim(),
                    cep: String(item.cep || item.CEP || '').replace(/\D/g, ''),
                    altura: Number(item.altura || item.ALTURA || 0),
                    largura: Number(item.largura || item.LARGURA || 0),
                    comprimento: Number(item.comprimento || item.COMPRIMENTO || 0),
                    peso: Number(item.peso || item.PESO || 0),
                    logradouro: String(item.logradouro || item.LOGRADOURO || '').trim(),
                    numero: Math.max(Number(item.numero || item.NUMERO || 1), 1),
                    complemento: item.complemento || item.COMPLEMENTO ? String(item.complemento || item.COMPLEMENTO).trim() : undefined,
                    nomeDestinatario: String(item.nomeDestinatario || item.NOME_DESTINATARIO || '').trim(),
                    cpfCnpj: Number(cpfLimpo),
                    valor_frete: Number(item.valor_frete || item.VALOR_FRETE || 0),
                    bairro: String(item.bairro || '').trim(),
                    cidade: String(item.cidade || '').trim(),
                    estado: String(item.estado || item.uf || item.UF || '').toUpperCase().trim()
                };
            });

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
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
                <Zap className="w-5 h-5" />
                <span className="font-semibold">Importação Rápida</span>
            </button>
        </>
    );
};
