import { StatusBadge } from "./StatusBadge";

export const StatusBadgeEmissao = ({ status, mensagensErrorPostagem, handleOnViewErroPostagem }: { status?: string, mensagensErrorPostagem?: string, handleOnViewErroPostagem: (mensagensErrorPostagem: string) => void }) => {
    return (
        mensagensErrorPostagem ? (
            <span
                className="font-medium rounded-md text-center text-xs } px-2 py-1 text-red-500 cursor-pointer bg-red-500/10"
                onClick={handleOnViewErroPostagem.bind(null, mensagensErrorPostagem)}
            >
                {mensagensErrorPostagem ? `Error na postagem` : ''}
            </span>
        ) : (
            <StatusBadge status={status || ''} tipo="envio" />
        )
    );
}