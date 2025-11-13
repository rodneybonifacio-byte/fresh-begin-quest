import type { IDestinatario } from "../IDestinatario"
import type { IRemetente } from "../IRemetente"

export interface IEmissaoViewModel {
    id: string
    clienteId: string
    remetenteId: string
    destinatarioId: string
    altura: number
    largura: number
    comprimento: number
    diametro: number
    peso: number
    chaveNFe: string
    numeroNotaFiscal: string
    observacao: string
    rfidObjeto: string
    valor: string
    valorPostagem: any
    valorDeclarado: number
    prazo: string
    status: string
    codigoObjeto: any
    servico: string
    codigoServicoVenda: string
    codigoServicoPostagem: string
    cienteObjetoNaoProibido: boolean
    codigoFormatoObjetoInformado: string
    itensDeclaracaoConteudo: string
    listaServicoAdicional: string
    mensagensErrorPostagem: string
    remetenteCpfCnpj: string
    remetenteNome: string
    criadoEm: string
    remetente: IRemetente
    destinatario: IDestinatario
    historioRastreio?: any[]
}
