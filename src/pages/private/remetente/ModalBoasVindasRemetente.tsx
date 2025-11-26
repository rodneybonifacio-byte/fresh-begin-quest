import { Package, MapPin, Tag, CheckCircle } from "lucide-react";
import { ButtonComponent } from "../../../components/button";

interface ModalBoasVindasRemetenteProps {
    isOpen: boolean;
    onClose: () => void;
    onCadastrar: () => void;
}

export const ModalBoasVindasRemetente = ({ isOpen, onClose, onCadastrar }: ModalBoasVindasRemetenteProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full animate-in fade-in-0 zoom-in-95 duration-300 overflow-hidden">
                {/* Header com gradiente */}
                <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Bem-vindo ao BRHUB Envios! 🎉</h2>
                        <p className="text-white/90 text-lg">Sua conta foi criada com sucesso</p>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="p-8 space-y-6">
                    {/* Texto introdutório */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                        <p className="text-foreground leading-relaxed">
                            Para começar a emitir etiquetas de envio, você precisa cadastrar pelo menos <strong>um remetente</strong>. 
                            O remetente é o endereço de origem dos seus envios.
                        </p>
                    </div>

                    {/* O que são os dados do remetente */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            O que são os dados do remetente?
                        </h3>
                        <p className="text-muted-foreground leading-relaxed pl-7">
                            Os dados do remetente incluem o nome da empresa/pessoa, CPF/CNPJ, endereço completo e contatos. 
                            <strong className="text-foreground"> Essas informações aparecem nas etiquetas impressas</strong> e são 
                            essenciais para que os Correios e transportadoras saibam de onde o pacote está saindo.
                        </p>
                    </div>

                    {/* Por que é importante */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Tag className="w-5 h-5 text-primary" />
                            Por que é importante?
                        </h3>
                        <ul className="space-y-2 pl-7">
                            <li className="flex items-start gap-2 text-muted-foreground">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span><strong className="text-foreground">Identificação clara:</strong> As etiquetas mostrarão seu endereço de forma completa e legível</span>
                            </li>
                            <li className="flex items-start gap-2 text-muted-foreground">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span><strong className="text-foreground">Rastreamento:</strong> Em caso de devolução, o pacote retorna para o endereço do remetente</span>
                            </li>
                            <li className="flex items-start gap-2 text-muted-foreground">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span><strong className="text-foreground">Múltiplos remetentes:</strong> Você pode cadastrar vários endereços de origem (matriz, filiais, estoque, etc.)</span>
                            </li>
                        </ul>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <ButtonComponent
                            onClick={onCadastrar}
                            variant="primary"
                            className="flex-1 h-12 font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
                        >
                            <Package className="w-5 h-5 mr-2" />
                            Cadastrar Meu Remetente
                        </ButtonComponent>
                        <ButtonComponent
                            onClick={onClose}
                            variant="ghost"
                            className="sm:flex-none px-6 h-12 font-medium border border-border hover:bg-accent"
                        >
                            Fazer depois
                        </ButtonComponent>
                    </div>

                    {/* Nota informativa */}
                    <div className="pt-2 text-center">
                        <p className="text-xs text-muted-foreground">
                            💡 <strong>Dica:</strong> Você pode cadastrar e gerenciar seus remetentes a qualquer momento no menu "Remetentes"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
