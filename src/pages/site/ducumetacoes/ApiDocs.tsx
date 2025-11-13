import { LogoApp } from '../../../components/logo';
import { ApiDocEndpointCard } from './ApiDocEndpointCard';
import { NavBarPublico } from '../layout/NavBarPublico';

const apiDocumentacaoJson = {
    autenticacao: {
        endpoint: 'POST /login',
        request: {
            email: 'usuario@email.com',
            password: 'senha123',
        },
        response: {
            message: 'Login realizado com sucesso',
            token: 'token.jwt.aqui',
        },
    },
    cotacao_frete: {
        endpoint: 'POST /frete/cotacao',
        request: {
            cepOrigem: '06416-020',
            cepDestino: '13098588',
            embalagem: {
                altura: '16',
                largura: '16',
                comprimento: '16',
                peso: '2000',
                diametro: '0',
            },
            logisticaReversa: 'N',
            valorDeclarado: 0,
            cpfCnpjLoja: '98765432100',
        },
        response: {
            data: [
                {
                    idLote: '1ef72a3d-d937-4a1b-bac8-bdd786072610',
                    codigoServico: '03220',
                    nomeServico: 'SEDEX',
                    preco: '25.26',
                    prazo: 1,
                    embalagem: {
                        peso: 1500,
                        comprimento: 17,
                        altura: 20,
                        largura: 17,
                        diametro: 0,
                    },
                    imagem: 'correios',
                    transportadora: 'CORREIOS',
                    isNotaFiscal: false,
                },
                {
                    idLote: '1ef72a3d-d937-4a1b-bac8-bdd786072610',
                    codigoServico: '03298',
                    nomeServico: 'PAC',
                    preco: '29.69',
                    prazo: 5,
                    embalagem: {
                        peso: 1500,
                        comprimento: 17,
                        altura: 20,
                        largura: 17,
                        diametro: 0,
                    },
                    imagem: 'correios',
                    transportadora: 'CORREIOS',
                    isNotaFiscal: false,
                },
                {
                    idLote: '1ef72a3d-d937-4a1b-bac8-bdd786072610',
                    preco: '63.44',
                    nomeServico: 'RodoNaves',
                    codigoServico: 'RODONAVES',
                    prazo: 1,
                    imagem: 'rodonaves',
                    embalagem: {
                        peso: 1500,
                        comprimento: 17,
                        altura: 20,
                        largura: 17,
                        diametro: 0,
                    },
                    transportadora: 'RODONAVES',
                    isNotaFiscal: true,
                },
            ],
        },
    },
    solicitar_etiqueta: {
        endpoint: 'POST /emissoes',
        request: {
            remetenteId: '',
            cienteObjetoNaoProibido: true,
            itensDeclaracaoConteudo: [
                {
                    conteudo: 'Produto 1',
                    quantidade: '1',
                    valor: '50.00',
                },
            ],
            rfidObjeto: '',
            observacao: '',
            chaveNFe: '',
            numeroNotaFiscal: '',
            cadastrarDestinatario: true,
            logisticaReversa: 'N',
            cotacao: {
                idLote: 'd3e8dcb4-5b99-4e77-99a3-4ef20b2b3a51',
                codigoServico: '03220',
                nomeServico: 'SEDEX',
                preco: '28.90',
                prazo: 2,
            },
            embalagem: {
                id: '',
                descricao: '',
                altura: 15,
                largura: 20,
                comprimento: 25,
                peso: 1200,
                diametro: 0,
                formatoObjeto: 'CAIXA_PACOTE',
            },
            valorDeclarado: 100,
            destinatario: {
                id: '',
                nome: 'Carlos Ferreira',
                cpfCnpj: '123.456.789-09',
                telefone: '(11) 91234-5678',
                email: 'carlos.ferreira@email.com',
                endereco: {
                    cep: '01001-000',
                    logradouro: 'Rua dos Inventados',
                    numero: '100',
                    complemento: 'Apto 202',
                    bairro: 'Centro',
                    localidade: 'São Paulo',
                    uf: 'SP',
                },
            },
            remetente: {
                nome: 'Ana Martins',
                cpfCnpj: '987.654.321-00',
                telefone: '(11) 91234-5678',
                email: 'carlos.ferreira@email.com',
                endereco: {
                    cep: '20040-020',
                    logradouro: 'Avenida Fictícia',
                    numero: '500',
                    complemento: 'Sala 10',
                    bairro: 'Copacabana',
                    localidade: 'Rio de Janeiro',
                    uf: 'RJ',
                },
            },
        },
        response: {
            id: ':uuidEmissao',
            frete: [],
            link_etiqueta: 'https://envios.brhubb.com.br/view/pdf/:uuidEmissao/print',
        },
    },
    etiqueta_unica: {
        endpoint: 'GET /emissoes/etiqueta-correios/imprimir/:uuidEmissao',
        response: {
            data: {
                nome: 'idRecibo_84315407-61b7-447b-b154-0761b7447b35.pdf',
                dados: 'base64',
            },
        },
    },
    etiqueta_pdf: {
        endpoint: 'GET /emissoes/etiqueta/pdf/:uuidEmissao',
        response: {
            link: '{URL_BASE}/downloads/etiqueta/pdf/9e6fb8155e6c90b79a1b1d1b0847e158',
        },
    },
    declaracao_unica: {
        endpoint: 'GET /emissoes/declaraca-correios/imprimir/:uuidEmissao',
        response: {
            data: {
                nome: 'declaracao_84315407-61b7-447b-b154-0761b7447b35.pdf',
                dados: 'base64',
            },
        },
    },
    declaracao_pdf: {
        endpoint: 'GET /emissoes/declaracao/pdf/:uuidEmissao',
        response: {
            link: '{URL_BASE}/downloads/declaracao/pdf/8e6fb8155e6c90b79a1b1d1b0847e158',
        },
    },
};

export const ApiDocs = () => {
    const PRO_URLAPI = 'https://envios.brhubb.com.br/api';

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-200">
            <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-50 border-b border-gray-200 dark:border-slate-700">
                <NavBarPublico />
            </header>

            <section className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 text-white py-16">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4">API BRHUB-ENVIOS</h1>
                    <p className="text-xl max-w-3xl mx-auto">Documentação completa para integração com o sistema de envios e rastreamento</p>
                </div>
            </section>

            <section className="bg-white dark:bg-slate-900 py-12 border-b border-gray-200 dark:border-slate-700">
                <div className="container mx-auto px-4 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Visão Geral da API</h2>
                        <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm max-w-3xl">
                            Esta API permite integrar sistemas com a plataforma BRHUB-ENVIOS para realizar operações de autenticação, cotação, geração de
                            etiquetas, e muito mais.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">URL Base</h3>
                        <div className="bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 p-4 rounded font-mono text-sm border border-gray-200 dark:border-slate-600">
                            {PRO_URLAPI}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Principais Endpoints</h3>
                        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            <li>
                                <code className="font-mono text-orange-600 dark:text-orange-400">POST /login</code> – Autenticação do usuário
                            </li>
                            <li>
                                <code className="font-mono text-orange-600 dark:text-orange-400">POST /frete/cotacao</code> – Cotação de frete
                            </li>
                            <li>
                                <code className="font-mono text-orange-600 dark:text-orange-400">POST /emissoes</code> – Solicitação de etiquetas
                            </li>
                            <li>
                                <code className="font-mono text-orange-600 dark:text-orange-400">GET /emissoes/etiqueta-correios/imprimir/:uuidEmissao</code> –
                                Imprimir etiqueta
                            </li>
                            <li>
                                <code className="font-mono text-orange-600 dark:text-orange-400">GET /emissoes/declaraca-correios/imprimir/:uuidEmissao</code> –
                                Imprimir declaração
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="py-16 bg-white dark:bg-slate-900">
                <div className="container mx-auto px-4">
                    <ApiDocEndpointCard
                        id="autenticacao"
                        method="POST"
                        url={`{URL_BASE}/login`}
                        titulo="Autenticação"
                        descricao="Use este endpoint para obter um token JWT válido, necessário para acessar rotas protegidas da API."
                        campos={[
                            { nome: 'email', tipo: 'string', obrigatorio: true, descricao: 'E-mail do usuário para autenticação.' },
                            { nome: 'password', tipo: 'string', obrigatorio: true, descricao: 'Senha correspondente ao e-mail informado.' },
                        ]}
                        request={apiDocumentacaoJson.autenticacao.request}
                        response={apiDocumentacaoJson.autenticacao.response}
                    />

                    <ApiDocEndpointCard
                        id="cotacao"
                        method="POST"
                        url={`{URL_BASE}/frete/cotacao`}
                        titulo="Cotação de Frete"
                        descricao="Endpoint para cotação de frete com os Correios."
                        campos={[
                            { nome: 'cepOrigem', tipo: 'string', obrigatorio: true, descricao: 'CEP de origem do envio.' },
                            { nome: 'cepDestino', tipo: 'string', obrigatorio: true, descricao: 'CEP de destino do envio.' },
                            {
                                nome: 'embalagem',
                                tipo: 'object',
                                obrigatorio: true,
                                descricao: 'Dimensões da embalagem do envio.',
                                subParametros: [
                                    { nome: 'altura', tipo: 'number', descricao: 'Exemplo: 2cm', obrigatorio: true },
                                    { nome: 'largura', tipo: 'number', descricao: 'Exemplo: 11cm', obrigatorio: true },
                                    { nome: 'comprimento', tipo: 'number', descricao: 'Exemplo: 16cm', obrigatorio: true },
                                    { nome: 'peso', tipo: 'number', descricao: 'Exemplos: 100gramas - 1000gramas', obrigatorio: true },
                                ],
                            },
                            { nome: 'valorDeclarado', tipo: 'number', obrigatorio: true, descricao: 'Valor do objeto transportado (R$).' },
                            { nome: 'cpfCnpjLoja', tipo: 'string', obrigatorio: true, descricao: 'CPF/CNPJ da loja/logista.' },
                        ]}
                        request={apiDocumentacaoJson.cotacao_frete.request}
                        response={apiDocumentacaoJson.cotacao_frete.response}
                    />

                    <ApiDocEndpointCard
                        id="etiquetas"
                        method="POST"
                        url={`{URL_BASE}/emissoes`}
                        titulo="Solicitação de Etiquetas"
                        descricao="Endpoint para solicitação de etiquetas de envio."
                        campos={[
                            {
                                nome: 'remetenteId',
                                tipo: 'string',
                                obrigatorio: true,
                                descricao: "Se não informado, o objeto 'remetente' é obrigatório com todos os campos preenchidos.",
                            },
                            {
                                nome: 'cienteObjetoNaoProibido',
                                tipo: 'boolean',
                                obrigatorio: true,
                                descricao: 'Confirmação de que o objeto enviado não infringe as regras dos Correios.',
                            },
                            {
                                nome: 'itensDeclaracaoConteudo',
                                tipo: 'array',
                                obrigatorio: false,
                                descricao:
                                    'Lista de itens que compõem a declaração de conteúdo do pacote. Caso aplicável, todos os campos do objeto são obrigatórios.',
                                subParametros: [
                                    { nome: 'conteudo', tipo: 'string', descricao: 'Descricão do produto', obrigatorio: true },
                                    { nome: 'quantidade', tipo: 'string', descricao: 'Quantidade de produtos', obrigatorio: true },
                                    { nome: 'valor', tipo: 'string', descricao: 'Valor do produto', obrigatorio: true },
                                ],
                            },
                            { nome: 'rfidObjeto', tipo: 'string', descricao: 'Identificador RFID do objeto, se aplicável.' },
                            { nome: 'observacao', tipo: 'string', descricao: 'Observações adicionais sobre o envio.' },
                            { nome: 'chaveNFe', tipo: 'string', descricao: 'Chave da nota fiscal eletrônica, se aplicável.' },
                            { nome: 'numeroNotaFiscal', tipo: 'string', descricao: 'Número da nota fiscal, se aplicável.' },
                            {
                                nome: 'cadastrarDestinatario',
                                tipo: 'boolean',
                                obrigatorio: true,
                                descricao: 'Informa se o destinatário deve ser salvo no sistema para reuso futuro.',
                            },
                            {
                                nome: 'logisticaReversa',
                                tipo: 'string',
                                obrigatorio: true,
                                descricao: "Indica se o envio será de logística reversa. Ex: 'N' para não.",
                            },
                            {
                                nome: 'cotacao',
                                tipo: 'object',
                                obrigatorio: true,
                                descricao: 'Dados da cotação selecionada para a emissão da etiqueta.',
                                subParametros: [
                                    { nome: 'idLote', tipo: 'string', descricao: 'Identificador da cotação.', obrigatorio: true },
                                    { nome: 'codigoServico', tipo: 'string', descricao: 'Código do serviço dos Correios.', obrigatorio: true },
                                    { nome: 'nomeServico', tipo: 'string', descricao: 'Nome do serviço de entrega.' },
                                    { nome: 'preco', tipo: 'string', descricao: 'Preço da entrega em reais (R$).' },
                                    { nome: 'prazo', tipo: 'number', descricao: 'Prazo estimado de entrega em dias.' },
                                ],
                            },
                            {
                                nome: 'embalagem',
                                tipo: 'object',
                                obrigatorio: true,
                                descricao: 'Dimensões da embalagem do envio.',
                                subParametros: [
                                    { nome: 'altura', tipo: 'number', descricao: 'Exemplo: 2cm', obrigatorio: true },
                                    { nome: 'largura', tipo: 'number', descricao: 'Exemplo: 11cm', obrigatorio: true },
                                    { nome: 'comprimento', tipo: 'number', descricao: 'Exemplo: 16cm', obrigatorio: true },
                                    { nome: 'peso', tipo: 'number', descricao: 'Exemplos: 100gramas - 1000gramas', obrigatorio: true },
                                ],
                            },
                            {
                                nome: 'destinatario',
                                tipo: 'object',
                                obrigatorio: true,
                                descricao: 'Dados completos do destinatário do envio.',
                                subParametros: [
                                    { nome: 'id', tipo: 'string', descricao: 'Identificador interno do destinatário.', obrigatorio: true },
                                    { nome: 'nome', tipo: 'string', descricao: 'Nome completo do destinatário.', obrigatorio: true },
                                    { nome: 'cpfCnpj', tipo: 'string', descricao: 'CPF ou CNPJ do destinatário.', obrigatorio: true },
                                    { nome: 'telefone', tipo: 'string', descricao: 'Telefone de contato do destinatário.', obrigatorio: false },
                                    { nome: 'celular', tipo: 'string', descricao: 'Telefone celular de contato do destinatário.', obrigatorio: true },
                                    { nome: 'email', tipo: 'string', descricao: 'Email de contato do destinatário.', obrigatorio: false },
                                    {
                                        nome: 'endereco',
                                        tipo: 'object',
                                        obrigatorio: true,
                                        descricao: 'Dados completos do endereço do destinatario.',
                                        subParametros: [
                                            { nome: 'cep', tipo: 'string', descricao: 'CEP do endereço.', obrigatorio: true },
                                            { nome: 'logradouro', tipo: 'string', descricao: 'Rua ou avenida.', obrigatorio: true },
                                            { nome: 'numero', tipo: 'string', descricao: 'Número do endereço.', obrigatorio: true },
                                            { nome: 'complemento', tipo: 'string', descricao: 'Complemento do endereço.', obrigatorio: true },
                                            { nome: 'bairro', tipo: 'string', descricao: 'Bairro.', obrigatorio: true },
                                            { nome: 'localidade', tipo: 'string', descricao: 'Cidade ou localidade.', obrigatorio: true },
                                            { nome: 'uf', tipo: 'string', descricao: 'Unidade federativa (UF).', obrigatorio: true },
                                        ],
                                    },
                                ],
                            },
                            {
                                nome: 'remetente',
                                tipo: 'object',
                                obrigatorio: true,
                                descricao: 'Tornando-se obrigatório se o remetenteId não for informado.',
                                subParametros: [
                                    { nome: 'nome', tipo: 'string', descricao: 'Nome completo do remetente.', obrigatorio: true },
                                    { nome: 'cpfCnpj', tipo: 'string', descricao: 'CPF ou CNPJ do remetente.', obrigatorio: true },
                                    { nome: 'telefone', tipo: 'string', descricao: 'Telefone de contato do remetente.', obrigatorio: false },
                                    { nome: 'celular', tipo: 'string', descricao: 'Telefone celular de contato do remetente.', obrigatorio: true },
                                    { nome: 'email', tipo: 'string', descricao: 'Email de contato do remetente.', obrigatorio: true },
                                    {
                                        nome: 'endereco',
                                        tipo: 'object',
                                        obrigatorio: true,
                                        descricao: 'Dados completos do endereço do remetente.',
                                        subParametros: [
                                            { nome: 'cep', tipo: 'string', descricao: 'CEP do endereço.', obrigatorio: true },
                                            { nome: 'logradouro', tipo: 'string', descricao: 'Rua ou avenida.', obrigatorio: true },
                                            { nome: 'numero', tipo: 'string', descricao: 'Número do endereço.', obrigatorio: true },
                                            { nome: 'complemento', tipo: 'string', descricao: 'Complemento do endereço.', obrigatorio: true },
                                            { nome: 'bairro', tipo: 'string', descricao: 'Bairro.', obrigatorio: true },
                                            { nome: 'localidade', tipo: 'string', descricao: 'Cidade ou localidade.', obrigatorio: true },
                                            { nome: 'uf', tipo: 'string', descricao: 'Unidade federativa (UF).', obrigatorio: true },
                                        ],
                                    },
                                ],
                            },
                        ]}
                        request={apiDocumentacaoJson.solicitar_etiqueta.request}
                        response={apiDocumentacaoJson.solicitar_etiqueta.response}
                    />

                    <ApiDocEndpointCard
                        id="imprimir_etiqueta_view"
                        method="GET"
                        url={`{URL_BASE}/emissoes/etiqueta/pdf/:uuidEmissao`}
                        titulo="Etiqueta em PDF"
                        descricao="Visualize a etiqueta única em PDF."
                        subDescricao=""
                        campos={[{ nome: 'uuidEmissao', tipo: 'string', obrigatorio: true, descricao: 'UUID da emissão retornado na criação.' }]}
                        response={apiDocumentacaoJson.etiqueta_pdf.response}
                    />

                    {/* <ApiDocEndpointCard
                        id="imprimir_etiqueta"
                        method="GET"
                        url={`{URL_BASE}/emissoes/etiqueta-correios/imprimir/:uuidEmissao`}
                        titulo="Imprimir Etiqueta Base64"
                        descricao="Use este endpoint para imprimir uma etiqueta única no formato Base64."
                        campos={[{ nome: 'uuidEmissao', tipo: 'string', obrigatorio: true, descricao: 'UUID da emissão retornado na criação.' }]}
                        response={apiDocumentacaoJson.etiqueta_unica.response}
                    />

                    <ApiDocEndpointCard
                        id="imprimir_declaracao_view"
                        method="GET"
                        url={`{URL_BASE}/emissoes/declaracao/pdf/:uuidEmissao`}
                        titulo="Declaração em PDF"
                        descricao="Visualize a declaração única em PDF."
                        campos={[{ nome: 'uuidEmissao', tipo: 'string', obrigatorio: true, descricao: 'UUID da emissão retornado na criação.' }]}
                        response={apiDocumentacaoJson.declaracao_pdf.response}
                    />

                    <ApiDocEndpointCard
                        id="imprimir_declaracao"
                        method="GET"
                        url={`{URL_BASE}/emissoes/declaraca-correios/imprimir/:uuidEmissao`}
                        titulo="Imprimir declaração Base64"
                        descricao="Use este endpoint para imprimir uma declaração de conteúdo única."
                        campos={[{ nome: 'uuidEmissao', tipo: 'string', obrigatorio: true, descricao: 'UUID da emissão retornado na criação.' }]}
                        response={apiDocumentacaoJson.declaracao_unica.response}
                    /> */}
                </div>
            </section>

            <footer className="bg-gray-800 dark:bg-slate-950 text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="h-10 w-40 flex items-center justify-center rounded mb-6 md:mb-0">
                            <LogoApp light />
                        </div>
                        <div className="flex space-x-6">
                            <a href="#" className="hover:text-orange-400 dark:hover:text-orange-300 transition-colors">
                                Termos de Uso
                            </a>
                            <a href="#" className="hover:text-orange-400 dark:hover:text-orange-300 transition-colors">
                                Política de Privacidade
                            </a>
                            <a href="#" className="hover:text-orange-400 dark:hover:text-orange-300 transition-colors">
                                Suporte
                            </a>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-gray-400 dark:text-gray-500 text-sm">© 2023 BRHUB-ENVIOS. Todos os direitos reservados.</div>
                </div>
            </footer>
        </div>
    );
};
