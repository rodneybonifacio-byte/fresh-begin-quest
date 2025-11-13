import type { ICotacaoMinimaResponse } from "./ICotacao"
import type { IDestinatario } from "./IDestinatario"
import type { IEmbalagem } from "./IEmbalagem"
import type { IRemetente } from "./IRemetente"

export interface IEmissao {
    id?: string
    remetenteId: string
    externoId?: string
    origem?: string
    destinatarioId?: string
    chaveNFe?: string
    numeroNotaFiscal?: string
    cienteObjetoNaoProibido: boolean
    codigoObjeto?: string
    codigoServico?: string
    servico?: string
    rfidObjeto?: string
    observacao?: string
    embalagem?: IEmbalagem
    cotacao: ICotacaoMinimaResponse
    itensDeclaracaoConteudo?: IEmissaoItensDeclaracaoConteudo[]
    listaServicoAdicional?: IEmissaolistaServicoAdicional[]
    logisticaReversa: LogisticaReversa
    valorDeclarado: number
    valorNotaFiscal: number
    valor?: number
    valorPostagem?: number
    status?: string
    statusFaturamento?: string
    criadoEm?: string
    remetente?: IRemetente
    cliente?: {
        cpfCnpj: string
        id: string
        nome: string
        telefone: string
        email: string
    }
    mensagensErrorPostagem?: string
    destinatario?: IDestinatario
    remetenteNome?: string
    remetenteCpfCnpj?: string
    transportadora?: string
}

export type LogisticaReversa = "S" | "N"

export interface IEmissaolistaServicoAdicional {
    codigoServicoAdicional: string
    nomeServicoAdicional: string
    valorDeclarado: string,
    orientacaoEntregaVizinho: string,
    tipoChecklist: string,
    subitensCheckList: string
}

export interface IEmissaoItensDeclaracaoConteudo {
    conteudo: string
    quantidade: string
    valor: string
}