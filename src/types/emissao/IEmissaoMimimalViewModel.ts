import type { IDestinatario } from "../IDestinatario"
import type { IRemetente } from "../IRemetente"

export interface IEmissaoMimimalViewModel {
    id: string
    altura: number
    largura: number
    comprimento: number
    diametro: number
    peso: number
    valor: number
    prazo: string
    status: string
    codigoObjeto: string
    servico: string
    codigoServicoPostagem: string
    criadoEm: string
    remetente: IRemetente
    destinatario: IDestinatario
}
