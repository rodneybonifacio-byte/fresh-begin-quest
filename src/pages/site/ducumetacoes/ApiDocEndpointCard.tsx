import { useState } from "react";
import { ApiDocItemParametro } from "./ApiDocItemParametro";

export const ApiDocEndpointCard = ({ id, method, url, titulo, descricao, subDescricao, campos, request, response }: any) => {
    const [open, setOpen] = useState(true);
    const [showRequest, setShowRequest] = useState(false);
    const [showResponse, setShowResponse] = useState(false);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 id={id} className="text-3xl font-bold text-orange-500 dark:text-orange-400">{titulo}</h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{descricao}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden mb-8 border border-gray-200 dark:border-slate-700">
                <div className="bg-gray-800 dark:bg-slate-900 text-white px-6 py-4 flex items-center gap-2 justify-between cursor-pointer" onClick={() => setOpen(!open)}>
                    <div className="flex items-center gap-2">
                        <span className={`method-badge ${method === 'POST' ? 'method-post' : 'method-get'}`}>{method}</span>
                        <span className="font-mono text-lg">{url}</span>
                    </div>
                    <span className="text-sm text-gray-300 dark:text-gray-400">{open ? 'Ocultar' : 'Mostrar'}</span>
                </div>

                {open && (
                    <div className="p-6">
                        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-slate-600">
                            <p className="mb-4 text-gray-700 dark:text-gray-300">{subDescricao}</p>
                            <p className="font-bold text-orange-500 dark:text-orange-400 mb-2">Campos obrigatórios:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                {campos.map((campo: any) => (
                                    <ApiDocItemParametro key={campo.nome} {...campo} />
                                ))}
                            </ul>
                        </div>

                        {request && (
                            <div className="mb-6 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-orange-500 dark:text-orange-400">Request:</span>
                                        <span className="text-gray-600 dark:text-gray-300 text-xs">Exemplo de payload que deve ser enviado na requisição.</span>
                                    </div>
                                    <button onClick={() => setShowRequest(prev => !prev)} className="text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
                                        {showRequest ? 'Ocultar Exemplo' : 'Mostrar Exemplo'}
                                    </button>
                                </div>
                                {showRequest && (
                                    <pre className="code-block bg-gray-100 dark:bg-slate-700 text-sm text-gray-800 dark:text-gray-200 p-4 rounded-md overflow-x-auto whitespace-pre border border-gray-200 dark:border-slate-600">
                                        <code>{JSON.stringify(request, null, 2)}</code>
                                    </pre>
                                )}
                            </div>
                        )}

                        {response && (
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-orange-500 dark:text-orange-400">Response:</span>
                                        <span className="text-gray-600 dark:text-gray-300 text-xs">Veja um exemplo de resposta com status 200.</span>
                                    </div>
                                    <button onClick={() => setShowResponse(prev => !prev)} className="text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
                                        {showResponse ? 'Ocultar Exemplo' : 'Mostrar Exemplo'}
                                    </button>
                                </div>
                                {showResponse && (
                                    <pre className="code-block bg-gray-100 dark:bg-slate-700 text-sm text-gray-800 dark:text-gray-200 p-4 rounded-md overflow-x-auto whitespace-pre border border-gray-200 dark:border-slate-600">
                                        <code>{JSON.stringify(response, null, 2)}</code>
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
