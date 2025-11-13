import { useState } from 'react';
import type { IAddress } from '../types/IAddress';
import { ModalCustom } from './modal';

interface Props {
    endereco?: IAddress;
}

export function EnderecoDetalhado({ endereco }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    if (!endereco || !endereco.logradouro || !endereco.numero) {
        return <span className="text-gray-500">---</span>;
    }

    const enderecoCompleto = `${endereco.logradouro}, ${endereco.numero}${endereco.complemento ? `, ${endereco.complemento}` : ''} - ${endereco.bairro}, ${endereco.localidade} - ${endereco.uf}, ${endereco.cep}`;

    return (
        <>
            <span className="text-xs text-slate-500">
                {endereco.logradouro}, {endereco.numero}{' '}
                <button onClick={() => setIsOpen(true)} className="text-blue-500 underline">
                    [...]
                </button>
            </span>

            {isOpen && (

                <ModalCustom
                    onCancel={() => setIsOpen(false)}
                    title="Endereço completo"
                >
                    <div className="mt-4 text-slate-700 text-base">{enderecoCompleto}</div>
                </ModalCustom>
            )}
        </>
    );
}
