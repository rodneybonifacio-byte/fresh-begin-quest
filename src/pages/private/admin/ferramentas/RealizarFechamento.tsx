import { useState } from 'react';
import { Content } from '../../Content';
import { ButtonComponent } from '../../../../components/button';
import { supabase } from '../../../../integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Wifi } from 'lucide-react';

export default function RealizarFechamento() {
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [loading, setLoading] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);

    const handleTestarConexao = async () => {
        try {
            setTestingConnection(true);
            
            const testDataInicio = '2025-01-01';
            const testDataFim = '2025-01-02';
            
            console.log('Testando conexão via edge function...');
            
            const { data, error } = await supabase.functions.invoke('realizar-fechamento', {
                body: {
                    dataInicio: testDataInicio,
                    dataFim: testDataFim,
                }
            });

            if (error) {
                console.error('Erro na conexão:', error);
                toast.error('Falha na conexão: ' + error.message);
            } else {
                console.log('Resposta:', data);
                toast.success('Conexão estabelecida com sucesso!');
            }
        } catch (error: any) {
            console.error('Erro ao testar conexão:', error);
            toast.error('Erro ao testar conexão: ' + error.message);
        } finally {
            setTestingConnection(false);
        }
    };

    const handleRealizarFechamento = async () => {
        if (!dataInicio || !dataFim) {
            toast.error('Preencha as datas de início e fim');
            return;
        }

        try {
            setLoading(true);
            
            const { data, error } = await supabase.functions.invoke('realizar-fechamento', {
                body: {
                    dataInicio,
                    dataFim,
                }
            });

            if (error) throw error;

            toast.success('Fechamento realizado com sucesso!');
            console.log('Resultado do fechamento:', data);
        } catch (error: any) {
            console.error('Erro ao realizar fechamento:', error);
            toast.error(error.message || 'Erro ao realizar fechamento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Content
            titulo="Realizar Fechamento"
            subTitulo="Processar fechamento de período"
        >
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 max-w-2xl">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Data Início
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Data Fim
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dataFim}
                                    onChange={(e) => setDataFim(e.target.value)}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                            ℹ️ Informações sobre o fechamento
                        </h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Será processado o fechamento do período selecionado</li>
                            <li>• Todos os envios no período serão incluídos</li>
                            <li>• O processo pode levar alguns minutos</li>
                        </ul>
                    </div>

                    <div className="flex gap-2">
                        <ButtonComponent
                            onClick={handleTestarConexao}
                            disabled={testingConnection}
                            variant="secondary"
                            border="outline"
                        >
                            <Wifi className="mr-2 h-4 w-4" />
                            {testingConnection ? 'Testando...' : 'Testar Conexão'}
                        </ButtonComponent>
                        
                        <ButtonComponent
                            onClick={handleRealizarFechamento}
                            disabled={loading || !dataInicio || !dataFim}
                        >
                            {loading ? 'Processando...' : 'Realizar Fechamento'}
                        </ButtonComponent>
                    </div>
                </div>
            </div>
        </Content>
    );
}
