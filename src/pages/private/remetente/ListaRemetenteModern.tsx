import { useState, useEffect } from "react";
import { User, Plus, MapPin, Mail, Phone } from "lucide-react";
import { useFetchQuery } from "../../../hooks/useFetchQuery";
import { LoadSpinner } from "../../../components/loading";
import { formatCpfCnpj } from "../../../utils/lib.formats";
import { RemetenteSupabaseDirectService } from "../../../services/RemetenteSupabaseDirectService";
import type { IRemetente } from "../../../types/IRemetente";
import { ModalCadastrarRemetente } from "./ModalCadastrarRemetente";
import { useSearchParams, useNavigate } from "react-router-dom";

export const ListaRemetenteModern = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isModalOpenRemetente, setIsModalOpenRemetente] = useState<boolean>(false);
    const [isFromAutoCadastro, setIsFromAutoCadastro] = useState<boolean>(false);
    const [wasModalClosedManually, setWasModalClosedManually] = useState<boolean>(false);

    const service = new RemetenteSupabaseDirectService();

    const { data: remetentes, isLoading } = useFetchQuery<IRemetente[]>(
        ['remetentes'],
        async () => (await service.getAll()).data
    );

    // Abrir modal automaticamente APENAS quando vier do autocadastro via URL
    useEffect(() => {
        const fromCadastro = searchParams.get('from') === 'autocadastro';
        
        if (fromCadastro && !isModalOpenRemetente && !wasModalClosedManually) {
            setIsFromAutoCadastro(true);
            setIsModalOpenRemetente(true);
            navigate('/app/remetentes', { replace: true });
        }
    }, [searchParams, navigate, isModalOpenRemetente, wasModalClosedManually]);

    const formatEndereco = (remetente: IRemetente) => {
        const { endereco } = remetente;
        if (!endereco) return 'Endereço não informado';
        
        const partes = [
            endereco.logradouro,
            endereco.numero,
            endereco.complemento,
            endereco.bairro,
            `${endereco.localidade}/${endereco.uf}`
        ].filter(Boolean);
        
        return partes.join(', ');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <User className="h-6 w-6 text-primary" />
                                </div>
                                Remetentes
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Gerenciar endereços de origem para suas etiquetas
                            </p>
                        </div>
                        
                        <button
                            onClick={() => setIsModalOpenRemetente(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">Adicionar Remetente</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {isLoading && <LoadSpinner mensagem="Carregando remetentes..." />}
                
                {!isLoading && remetentes && remetentes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {remetentes.map((remetente) => (
                            <div
                                key={remetente.id}
                                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                            >
                                {/* Header do Card */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg text-foreground mb-1">
                                            {remetente.nome}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {formatCpfCnpj(remetente.cpfCnpj || '')}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <User size={20} className="text-primary" />
                                    </div>
                                </div>

                                {/* Informações de Contato */}
                                <div className="space-y-3 text-sm">
                                    {remetente.email && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail size={16} className="flex-shrink-0" />
                                            <span className="truncate">{remetente.email}</span>
                                        </div>
                                    )}
                                    
                                    {remetente.celular && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone size={16} className="flex-shrink-0" />
                                            <span>{remetente.celular}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-start gap-2 text-muted-foreground pt-2 border-t border-border">
                                        <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                                        <span className="text-xs leading-relaxed">
                                            {formatEndereco(remetente)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && (!remetentes || remetentes.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="p-6 bg-muted/50 rounded-full mb-6">
                            <User size={64} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-2xl font-semibold text-foreground mb-2">
                            Nenhum remetente cadastrado
                        </h3>
                        <p className="text-muted-foreground text-center max-w-md mb-6">
                            Adicione seu primeiro remetente para começar a emitir etiquetas de envio.
                        </p>
                        <button
                            onClick={() => setIsModalOpenRemetente(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
                        >
                            <Plus size={20} />
                            Adicionar Primeiro Remetente
                        </button>
                    </div>
                )}
            </div>

            <ModalCadastrarRemetente 
                isOpen={isModalOpenRemetente} 
                onCancel={() => {
                    setIsModalOpenRemetente(false);
                    setIsFromAutoCadastro(false);
                    setWasModalClosedManually(true);
                }}
                showWelcomeMessage={isFromAutoCadastro}
            />
        </div>
    );
};
