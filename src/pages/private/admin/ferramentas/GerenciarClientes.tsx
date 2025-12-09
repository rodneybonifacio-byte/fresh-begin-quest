import { useState } from 'react';
import { Search, Trash2, User, MapPin, Phone, FileText, RefreshCw, Users, Building2, Send } from 'lucide-react';
import { Content } from "../../Content";
import { Input } from '@heroui/react';
import { Button } from '@heroui/react';
import { Card } from '@heroui/react';
import { Tabs, Tab } from '@heroui/react';
import { toast } from 'sonner';
import { LoadSpinner } from '../../../../components/loading';
import { ModalCustom } from '../../../../components/modal';
import type { IDestinatario } from '../../../../types/IDestinatario';
import type { IRemetente } from '../../../../types/IRemetente';
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
    const [remetentes, setRemetentes] = useState<IRemetente[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'destinatario' | 'remetente'; item: IDestinatario | IRemetente } | null>(null);
    const [activeTab, setActiveTab] = useState('remetentes');

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
            setRemetentes([]);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            toast.error('Erro ao buscar clientes');
        } finally {
            setLoading(false);
        }
    };

    const loadClienteData = async (cliente: Cliente) => {
        setSelectedCliente(cliente);
        setLoadingData(true);
        
        try {
            // Buscar remetentes e destinatários em paralelo
            const [remetentesRes, destinatariosRes] = await Promise.all([
                supabase.functions.invoke('gerenciar-clientes', {
                    body: { action: 'list_remetentes', clienteId: cliente.id }
                }),
                supabase.functions.invoke('gerenciar-clientes', {
                    body: { action: 'list_destinatarios', clienteId: cliente.id }
                })
            ]);

            if (remetentesRes.error) throw remetentesRes.error;
            if (destinatariosRes.error) throw destinatariosRes.error;

            setRemetentes(remetentesRes.data?.data || []);
            setDestinatarios(destinatariosRes.data?.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados do cliente:', error);
            toast.error('Erro ao carregar dados do cliente');
        } finally {
            setLoadingData(false);
        }
    };

    const confirmDelete = (type: 'destinatario' | 'remetente', item: IDestinatario | IRemetente) => {
        setItemToDelete({ type, item });
        setShowConfirmModal(true);
    };

    const deleteItem = async () => {
        if (!itemToDelete || !selectedCliente) return;

        setDeletingId(itemToDelete.item.id);
        setShowConfirmModal(false);

        try {
            const action = itemToDelete.type === 'remetente' ? 'delete_remetente' : 'delete_destinatario';
            const idKey = itemToDelete.type === 'remetente' ? 'remetenteId' : 'destinatarioId';

            const { data, error } = await supabase.functions.invoke('gerenciar-clientes', {
                body: { action, [idKey]: itemToDelete.item.id }
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || `Erro ao excluir ${itemToDelete.type}`);

            toast.success(`${itemToDelete.type === 'remetente' ? 'Remetente' : 'Destinatário'} excluído com sucesso`);
            
            if (itemToDelete.type === 'remetente') {
                setRemetentes(prev => prev.filter(r => r.id !== itemToDelete.item.id));
            } else {
                setDestinatarios(prev => prev.filter(d => d.id !== itemToDelete.item.id));
            }
        } catch (error) {
            console.error(`Erro ao excluir ${itemToDelete.type}:`, error);
            toast.error(`Erro ao excluir ${itemToDelete.type}`);
        } finally {
            setDeletingId(null);
            setItemToDelete(null);
        }
    };

    const formatCpfCnpj = (value: string) => {
        const cleaned = value?.replace(/\D/g, '') || '';
        if (cleaned.length <= 11) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    };

    const renderRemetentes = () => (
        <div className="space-y-3">
            {remetentes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhum remetente cadastrado</p>
                </div>
            ) : (
                remetentes.map((remetente) => (
                    <div 
                        key={remetente.id}
                        className="p-4 rounded-lg border border-border bg-card"
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{remetente.nome}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span>{formatCpfCnpj(remetente.cpfCnpj)}</span>
                                </div>
                                {remetente.celular && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <span>{remetente.celular}</span>
                                    </div>
                                )}
                                {remetente.endereco && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span>
                                            {remetente.endereco.logradouro}, {remetente.endereco.numero}
                                            {remetente.endereco.complemento && ` - ${remetente.endereco.complemento}`}
                                            {' - '}{remetente.endereco.bairro}
                                            {' - '}{remetente.endereco.localidade}/{remetente.endereco.uf}
                                            {' - CEP: '}{remetente.endereco.cep}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <Button
                                color="danger"
                                size="sm"
                                onClick={() => confirmDelete('remetente', remetente)}
                                disabled={deletingId === remetente.id}
                            >
                                {deletingId === remetente.id ? (
                                    <LoadSpinner />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderDestinatarios = () => (
        <div className="space-y-3">
            {destinatarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhum destinatário cadastrado</p>
                </div>
            ) : (
                destinatarios.map((destinatario) => (
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
                                onClick={() => confirmDelete('destinatario', destinatario)}
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
                ))
            )}
        </div>
    );

    return (
        <Content 
            titulo="Gestão de Clientes" 
            subTitulo="Gerenciar remetentes e destinatários cadastrados por cliente"
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
                                    onClick={() => loadClienteData(cliente)}
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

                {/* Dados do Cliente (Remetentes e Destinatários) */}
                {selectedCliente && (
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Cadastros de {selectedCliente.nome}
                            </h3>
                            <Button 
                                variant="bordered"
                                size="sm"
                                onClick={() => loadClienteData(selectedCliente)}
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Atualizar
                            </Button>
                        </div>

                        {loadingData ? (
                            <div className="flex justify-center py-8">
                                <LoadSpinner />
                            </div>
                        ) : (
                            <Tabs 
                                selectedKey={activeTab} 
                                onSelectionChange={(key) => setActiveTab(key as string)}
                                classNames={{
                                    tabList: "gap-4",
                                    cursor: "bg-primary",
                                    tab: "px-4 py-2",
                                    tabContent: "group-data-[selected=true]:text-primary"
                                }}
                            >
                                <Tab 
                                    key="remetentes" 
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4" />
                                            <span>Remetentes ({remetentes.length})</span>
                                        </div>
                                    }
                                >
                                    <div className="pt-4">
                                        {renderRemetentes()}
                                    </div>
                                </Tab>
                                <Tab 
                                    key="destinatarios" 
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Send className="h-4 w-4" />
                                            <span>Destinatários ({destinatarios.length})</span>
                                        </div>
                                    }
                                >
                                    <div className="pt-4">
                                        {renderDestinatarios()}
                                    </div>
                                </Tab>
                            </Tabs>
                        )}
                    </Card>
                )}
            </div>

            {/* Modal de Confirmação */}
            {showConfirmModal && itemToDelete && (
                <ModalCustom
                    title="Confirmar Exclusão"
                    description={`Tem certeza que deseja excluir este ${itemToDelete.type === 'remetente' ? 'remetente' : 'destinatário'}?`}
                    onCancel={() => {
                        setShowConfirmModal(false);
                        setItemToDelete(null);
                    }}
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-destructive/10 rounded-lg">
                            <p className="font-medium">{itemToDelete.item.nome}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatCpfCnpj(itemToDelete.item.cpfCnpj)}
                            </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="bordered"
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setItemToDelete(null);
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                color="danger"
                                onClick={deleteItem}
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
