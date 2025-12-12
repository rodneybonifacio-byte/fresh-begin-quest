import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa, { ParseResult } from 'papaparse';
import { RemetenteService } from '../../../services/RemetenteService';
import { useFetchQuery } from '../../../hooks/useFetchQuery';
import SelectCustom from '../../../components/SelectCustom';
import { Content } from '../Content';
import { UploadArquivo } from '../../../components/UploadArquivo';
import { LoadSpinner } from '../../../components/loading';
import { ButtonComponent } from '../../../components/button';
import { Box, RefreshCcw, Tag, Download } from 'lucide-react';

interface ParsedRow {
    [key: string]: string;
}

interface Remetente {
    bairro: string;
    cep: string;
    complemento: string;
    cpfCnpj: string;
    localidade: string;
    logradouro: string;
    nome: string;
    numero: string;
    uf: string;
    id: string;
}

export default function FileMapper() {
    const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
    const [mappedFields, setMappedFields] = useState<Record<string, string>>({});
    const [dataPreview, setDataPreview] = useState<ParsedRow[]>([]);
    const [remetentesCliente, setRemetentesCliente] = useState<Remetente[]>([]);
    const [selectedRemetenteId, setSelectedRemetenteId] = useState<string>('');
    const [loadingImport, setLoadingImport] = useState(false);

    const serviceRemetente = new RemetenteService();
    const { data: remetentes } = useFetchQuery<any[]>(
        ['remetente-filter'],
        async () => (await serviceRemetente.getAll()).data
    );

    useEffect(() => {
        if (remetentes) {
            setRemetentesCliente(remetentes);
        }
    }, [remetentes]);

    const expectedFields = [
        'nomeDesitinatario', 'cpfCnpjDestinatario', 'celularDestinatario',
        'cepDestinatario', 'logradouroDestinatario', 'numeroDestinatario',
        'complementoDestinatario', 'bairroDestinatario', 'localidadeDestinatario',
        'ufDestinatario', 'logisticaReversa', 'altura', 'largura', 'comprimento',
        'peso', 'valorDeclarado', 'modalidadeFrete'
    ];

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                nomeDesitinatario: 'João da Silva',
                cpfCnpjDestinatario: '12345678901',
                celularDestinatario: '11999999999',
                cepDestinatario: '01310100',
                logradouroDestinatario: 'Av Paulista',
                numeroDestinatario: '1000',
                complementoDestinatario: 'Sala 101',
                bairroDestinatario: 'Bela Vista',
                localidadeDestinatario: 'São Paulo',
                ufDestinatario: 'SP',
                logisticaReversa: 'N',
                altura: '10',
                largura: '15',
                comprimento: '20',
                peso: '500',
                valorDeclarado: '100.00',
                modalidadeFrete: 'SEDEX'
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
        XLSX.writeFile(workbook, 'modelo_importacao_etiquetas.xlsx');
    };

    const handleFileUpload = (_arquivos: File[], e?: React.ChangeEvent<HTMLInputElement>) => {
        const file = e?.target.files?.[0];
        if (!file) return;

        const fileType = file.name.split('.').pop();
        const reader = new FileReader();
        setLoadingImport(true);
        reader.onload = (event) => {
            const content = event.target?.result;
            if (!content) return;

            if (fileType === 'csv' || fileType === 'txt') {
                const parsed: ParseResult<ParsedRow> = Papa.parse(content.toString(), { header: true });
                processParsedData(parsed.data);
            } else if (fileType === 'xlsx') {
                const workbook = XLSX.read(content, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const data: ParsedRow[] = XLSX.utils.sheet_to_json(sheet);
                processParsedData(data);
            } else {
                alert('Formato de arquivo não suportado.');
            }
            setLoadingImport(false);
        };

        if (fileType === 'xlsx') reader.readAsBinaryString(file);
        else reader.readAsText(file);
    };

    const processParsedData = (data: ParsedRow[]) => {
        if (!data.length) return;
        const headers = Object.keys(data[0]);
        setOriginalHeaders(headers);
        setDataPreview(data);
    };

    const handleMappingChange = (expected: string, original: string) => {
        setMappedFields((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((key) => {
                if (key !== expected && updated[key] === original) {
                    delete updated[key];
                }
            });
            updated[expected] = original;
            return updated;
        });
    };

    const getMappedData = () => {
        return dataPreview.map((row) => {
            const map = (field: string) => row[mappedFields[field]];

            const destinatario = {
                nome: map('nomeDesitinatario'),
                cpfCnpj: map('cpfCnpjDestinatario'),
                celular: map('celularDestinatario'),
                endereco: {
                    cep: map('cepDestinatario'),
                    logradouro: map('logradouroDestinatario'),
                    numero: map('numeroDestinatario'),
                    complemento: map('complementoDestinatario'),
                    bairro: map('bairroDestinatario'),
                    localidade: map('localidadeDestinatario'),
                    uf: map('ufDestinatario')
                }
            };

            const cotacao = {
                nomeServico: map('modalidadeFrete') || 'SEDEX',
                embalagem: {
                    altura: map('altura'),
                    largura: map('largura'),
                    comprimento: map('comprimento'),
                    peso: map('peso')
                }
            };

            return {
                remetenteId: selectedRemetenteId,
                destinatario,
                logisticaReversa: map('logisticaReversa') as 'S' | 'N',
                valorDeclarado: map('valorDeclarado'),
                cotacao,
                cienteObjetoNaoProibido: true
            };
        });
    };

    const handleSubmit = () => {
        const mappedData = getMappedData();
        console.log('Dados para envio:', mappedData);
    };

    return (

        <Content
            titulo="Importação de Arquivo"
            subTitulo="Importe um arquivo CSV, TXT ou XLSX e mapeie os campos para enviar os dados para a API."
        >
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end mb-4">
                <div className="flex-1">
                    <UploadArquivo
                        onChange={handleFileUpload}
                        allowTypes={['csv', 'txt', 'xlsx']}
                    />
                </div>
                <ButtonComponent onClick={handleDownloadTemplate} type="button" variant='ghost'>
                    <Download className="w-4 h-4" /> Baixar Modelo
                </ButtonComponent>
            </div>

            <SelectCustom
                label="Remetente"
                searchable
                data={remetentesCliente.map(r => ({ label: r.nome, value: r.id }))}
                valueSelected={selectedRemetenteId}
                onChange={(v: any) => setSelectedRemetenteId(v.toString())}
            />
            {loadingImport && <LoadSpinner mensagem="Carregando..." />}
            {originalHeaders.length > 0 && !loadingImport && (
                <div className="bg-white p-4 rounded shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold">Mapeamento de Campos</h2>
                        <span className="text-sm text-gray-500">{dataPreview.length} registro(s) importado(s)</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {expectedFields.map((expected) => (
                            <div key={expected} className="flex flex-row flex-wrap items-center border-b pb-1 justify-between gap-1">
                                <label className="font-medium">{expected}</label>

                                <div key={expected} className="flex flex-col flex-wrap justify-between gap-1">
                                    <select
                                        value={mappedFields[expected] || ''}
                                        onChange={(e) => handleMappingChange(expected, e.target.value)}
                                        className={`border p-1 rounded ${mappedFields[expected] ? 'border-red-500' : ''}`}
                                    >
                                        <option value="">-- Selecionar campo do arquivo --</option>
                                        {originalHeaders.map((header) => (
                                            <option
                                                className='disabled:text-red-600'
                                                key={header}
                                                value={header}
                                                disabled={Object.values(mappedFields).includes(header) && mappedFields[expected] !== header}
                                            >
                                                {header}
                                            </option>
                                        ))}
                                    </select>
                                    {mappedFields[expected] && (
                                        <span className="text-xs text-gray-600">Valor exemplo: {dataPreview[0]?.[mappedFields[expected]] || '-'}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {dataPreview.length > 0 && (
                <div>
                    <h2 className="font-bold mt-6 mb-2">Prévia dos Dados Mapeados</h2>
                    <div className="overflow-auto max-h-96 border rounded">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-gray-200 sticky top-0">
                                <tr>
                                    {expectedFields.map((field, index) => (
                                        <th key={index} className="px-2 py-1 border-b">{field}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dataPreview.map((row, idx) => (
                                    <tr key={idx} className="even:bg-gray-50">
                                        {expectedFields.map((field, i) => (
                                            <td key={i} className="px-2 py-1 border-b">
                                                {mappedFields[field] ? row[mappedFields[field]] : ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className='flex flex-row gap-2 mt-4'>
                        <ButtonComponent onClick={handleSubmit} type="button" variant='primary'>
                            <Box /> Fazer Cotação
                        </ButtonComponent>
                        <ButtonComponent onClick={handleSubmit} type="button" variant='secondary'>
                            <Tag /> Emitir etiquetas
                        </ButtonComponent>
                        <ButtonComponent type="button" variant='ghost'>
                            <RefreshCcw /> Reprocessar endereços
                        </ButtonComponent>
                    </div>
                </div>
            )}
        </Content >
    );
}