import React, { useRef } from 'react';

type UploadArquivoProps = {
    onChange: (files: File[], event?: React.ChangeEvent<HTMLInputElement>) => void;
    allowTypes?: string[]; // ex: ['pdf', 'png', 'jpg']
    multiple?: boolean;
    maxFiles?: number;
};

export const UploadArquivo = ({ onChange, allowTypes = [], multiple = false, maxFiles = 1, }: UploadArquivoProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [arquivos, setArquivos] = React.useState<File[]>([]);

    const aceitar = allowTypes.length > 0 ? allowTypes.map(t => `.${t}`).join(',') : undefined;

    const handleSelecionar = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const novos = files.slice(0, maxFiles);

        setArquivos(novos);
        onChange(novos, event);
    };

    const removerArquivo = (index: number) => {
        const novaLista = [...arquivos];
        novaLista.splice(index, 1);
        setArquivos(novaLista);
        onChange(novaLista);
    };

    return (
        <div className="w-full">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white hover:border-primary transition">
                <div
                    className="cursor-pointer text-center text-gray-500 hover:text-primary"
                    onClick={() => inputRef.current?.click()}
                >
                    <p className="text-sm">Clique para selecionar arquivos</p>
                    <p className="text-xs text-slate-400 mt-1">
                        {allowTypes.length > 0 ? `Permitido: ${allowTypes.join(', ')}` : 'Todos os tipos'}
                    </p>
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept={aceitar}
                    multiple={multiple}
                    className="hidden"
                    onChange={handleSelecionar}
                />
            </div>

            {arquivos.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {arquivos.map((file, idx) => (
                        <li
                            key={idx}
                            className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded-md text-sm"
                        >
                            <span className="truncate">{file.name}</span>
                            <button
                                type="button"
                                onClick={() => removerArquivo(idx)}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold"
                            >
                                Remover
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
