import { useState } from 'react';
import { Search, Trash2, User, MapPin, Phone, FileText, RefreshCw, Users } from 'lucide-react';
import { Content } from "../../Content";
import { Input } from '@heroui/react';
import { Button } from '@heroui/react';
import { Card } from '@heroui/react';
import { toast } from 'sonner';
import { LoadSpinner } from '../../../../components/loading';
import { ModalCustom } from '../../../../components/modal';
import type { IDestinatario } from '../../../../types/IDestinatario';
import { supabase } from '../../../../integrations/supabase/client';

interface Cliente {
    id: string;
    nome: string;
    email: string;
    cpfCnpj: string;
}

const GerenciarClientes = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [destinatarios, setDestinatarios] = useState<IDestinatario[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingDestinatarios, setLoadingDestinatarios] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [destinatarioToDelete, setDestinatarioToDelete] = useState<IDestinatario | null>(null);

    const searchClientes = async () => {
        if (!searchTerm.trim()) {
            toast.error('Digite um termo para buscar');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('gerenciar-clientes', {
                body: { action: 'search_clientes', searchTerm }
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Erro ao buscar clientes');

            setClientes(data.data || []);
            setSelectedCliente(null);
            setDestinatarios([]);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            toast.error('Erro ao buscar clientes');
        } finally {
            setLoading(false);
        }
    };

    const loadDestinatarios = async (cliente: Cliente) => {
        setSelectedCliente(cliente);
        setLoadingDestinatarios(true);
        
        try {
            const { data, error } = await supabase.functions.invoke('gerenciar-clientes', {
                body: { action: 'list_destinatarios', clienteId: cliente.id }
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Erro ao buscar destinatários');

            setDestinatarios(data.data || []);
        } catch (error) {
            console.error('Erro ao buscar destinatários:', error);
            toast.error('Erro ao buscar destinatários do cliente');
        } finally {
            setLoadingDestinatarios(false);
        }
    };

    const confirmDelete = (destinatario: IDestinatario) => {
        setDestinatarioToDelete(destinatario);
        setShowConfirmModal(true);
    };

    const deleteDestinatario = async () => {
        if (!destinatarioToDelete || !selectedCliente) return;

        setDeletingId(destinatarioToDelete.id);
        setShowConfirmModal(false);

        try {
            const { data, error } = await supabase.functions.invoke('gerenciar-clientes', {
                body: { action: 'delete_destinatario', destinatarioId: destinatarioToDelete.id }
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Erro ao excluir destinatário');

            toast.success('Destinatário excluído com sucesso');
            setDestinatarios(prev => prev.filter(d => d.id !== destinatarioToDelete.id));
        } catch (error) {
            console.error('Erro ao excluir destinatário:', error);
            toast.error('Erro ao excluir destinatário');
        } finally {
            setDeletingId(null);
            setDestinatarioToDelete(null);
        }
    };

    const formatCpfCnpj = (value: string) => {
        const cleaned = value?.replace(/\D/g, '') || '';
        if (cleaned.length <= 11) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    };

    return (
        <Content 
            titulo="Gestão de Clientes" 
            subTitulo="Gerenciar destinatários cadastrados por cliente"
        >
            <div className="space-y-6">
                {/* Busca de Clientes */}
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Buscar Cliente
                    </h3>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Digite nome, email ou CPF/CNPJ do cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchClientes()}
                            className="flex-1"
                        />
                        <Button onClick={searchClientes} disabled={loading}>
                            {loading ? <LoadSpinner /> : <Search className="h-4 w-4" />}
                            Buscar
                        </Button>
                    </div>
                </Card>

                {/* Lista de Clientes */}
                {clientes.length > 0 && (
                    <Card className="p-4">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Clientes Encontrados ({clientes.length})
                        </h3>
                        <div className="grid gap-2 max-h-60 overflow-y-auto">
                            {clientes.map((cliente) => (
                                <div
                                    key={cliente.id}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        selectedCliente?.id === cliente.id 
                                            ? 'border-primary bg-primary/5' 
                                            : 'border-border hover:border-primary/50'
                                    }`}
                                    onClick={() => loadDestinatarios(cliente)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{cliente.nome}</p>
                                            <p className="text-sm text-muted-foreground">{cliente.email}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatCpfCnpj(cliente.cpfCnpj)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Destinatários do Cliente */}
                {selectedCliente && (
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Destinatários de {selectedCliente.nome}
                            </h3>
                            <Button 
                                variant="bordered"
                                size="sm"
                                onClick={() => loadDestinatarios(selectedCliente)}
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Atualizar
                            </Button>
                        </div>

                        {loadingDestinatarios ? (
                            <div className="flex justify-center py-8">
                                <LoadSpinner />
                            </div>
                        ) : destinatarios.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <User className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                <p>Nenhum destinatário cadastrado</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {destinatarios.map((destinatario) => (
                                    <div 
                                        key={destinatario.id}
                                        className="p-4 rounded-lg border border-border bg-card"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{destinatario.nome}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <FileText className="h-4 w-4" />
                                                    <span>{formatCpfCnpj(destinatario.cpfCnpj)}</span>
                                                </div>
                                                {destinatario.celular && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Phone className="h-4 w-4" />
                                                        <span>{destinatario.celular}</span>
                                                    </div>
                                                )}
                                                {destinatario.endereco && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>
                                                            {destinatario.endereco.logradouro}, {destinatario.endereco.numero}
                                                            {destinatario.endereco.complemento && ` - ${destinatario.endereco.complemento}`}
                                                            {' - '}{destinatario.endereco.bairro}
                                                            {' - '}{destinatario.endereco.localidade}/{destinatario.endereco.uf}
                                                            {' - CEP: '}{destinatario.endereco.cep}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                color="danger"
                                                size="sm"
                                                onClick={() => confirmDelete(destinatario)}
                                                disabled={deletingId === destinatario.id}
                                            >
                                                {deletingId === destinatario.id ? (
                                                    <LoadSpinner />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}
            </div>

            {/* Modal de Confirmação */}
            {showConfirmModal && destinatarioToDelete && (
                <ModalCustom
                    title="Confirmar Exclusão"
                    description="Tem certeza que deseja excluir este destinatário?"
                    onCancel={() => {
                        setShowConfirmModal(false);
                        setDestinatarioToDelete(null);
                    }}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-destructive/10 rounded-lg">
                            <p className="font-medium">{destinatarioToDelete.nome}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatCpfCnpj(destinatarioToDelete.cpfCnpj)}
                            </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="bordered"
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setDestinatarioToDelete(null);
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                color="danger"
                                onClick={deleteDestinatario}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                            </Button>
                        </div>
                    </div>
                </ModalCustom>
            )}
        </Content>
    );
};

export default GerenciarClientes;
