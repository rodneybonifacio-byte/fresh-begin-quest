import { BadgeDollarSign, TriangleAlert, X } from "lucide-react";
import { useState } from "react";

export default function ModalNotificacaoFaturaEmAtraso() {
    const [isOpen, setIsOpen] = useState(false);
    const handleClose = () => setIsOpen((prev) => !prev);

    return (
        isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md transform transition-all">

                    {/* Botão de fechar */}
                    <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>

                    {/* Cabeçalho */}
                    <div className="bg-gradient-to-r from-red-600 to-red-500 p-5 flex items-center">
                        <div className="bg-white p-3 rounded-full mr-4">
                            <TriangleAlert className="text-red-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-xl">Fatura Pendente</h2>
                            <p className="text-red-100 text-sm">Gentileza regularizar o pagamento para evitar encargos</p>
                        </div>
                    </div>

                    {/* Corpo */}
                    <div className="p-6">
                        <div className="flex items-start mb-5">
                            <div className="bg-red-100 p-3 rounded-full mr-4">
                                <BadgeDollarSign className="text-red-600" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Olá, [Nome do Cliente]</h3>
                                <p className="text-gray-600 mt-1 text-sm leading-relaxed">
                                    <span className="font-bold">Verificamos que sua fatura no valor de <span className="text-red-600">R$ 287,90</span> permanece em aberto desde 05/04/2024.</span>
                                    <br /><br />
                                    Solicitamos a regularização para manter seus serviços ativos e evitar cobranças adicionais.
                                </p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-5">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <i className="fas fa-clock text-yellow-500"></i>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        <span className="font-bold">Data limite para pagamento:</span> 15/05/2024<br />
                                        A partir desta data, serão aplicados juros de 2% ao mês.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p className="text-xs text-gray-500">Valor total</p>
                                <p className="font-bold text-gray-800 text-xl">R$ 287,90</p>
                            </div>
                            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center">
                                <i className="fas fa-credit-card mr-2"></i> Pagar Agora
                            </button>
                        </div>
                    </div>

                    {/* Rodapé */}
                    <div className="bg-gray-100 px-6 py-4 text-center">
                        <p className="text-xs text-gray-500">
                            Em caso de dúvidas, entre em contato com nosso <a href="#" className="text-blue-600 hover:underline">atendimento</a>.
                            <br />
                            <span className="italic">Agradecemos sua atenção e confiança.</span>
                        </p>
                    </div>
                </div>
            </div>
        )
    );
}
