import { useState } from 'react';
import { ButtonComponent } from '../../../components/button';
import { useUsuarioDados } from '../../../hooks/useUsuarioDados';
import { supabase } from '../../../integrations/supabase/client';

export default function TestarBuscaDados() {
  const [mostrar, setMostrar] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);
  const { data, isLoading, error, refetch } = useUsuarioDados(mostrar);

  const handleBuscar = () => {
    setMostrar(true);
    refetch();
  };

  const handleDebugAPI = async () => {
    setIsLoadingDebug(true);
    try {
      const apiToken = localStorage.getItem('token');
      const { data: result, error } = await supabase.functions.invoke('debug-api-data', {
        body: { apiToken },
      });
      
      if (error) {
        console.error('❌ Erro ao chamar debug:', error);
      } else {
        console.log('✅ Debug data:', result);
        setDebugData(result);
      }
    } catch (err) {
      console.error('❌ Erro:', err);
    } finally {
      setIsLoadingDebug(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Teste de Busca de Dados</h1>
      
      <div className="flex gap-4 mb-6">
        <ButtonComponent onClick={handleBuscar} disabled={isLoading}>
          {isLoading ? 'Buscando...' : 'Buscar Dados (Sincronizado)'}
        </ButtonComponent>

        <ButtonComponent onClick={handleDebugAPI} disabled={isLoadingDebug} variant="secondary">
          {isLoadingDebug ? 'Conectando...' : '🔍 Debug API Direta'}
        </ButtonComponent>
      </div>

      {debugData && (
        <div className="mb-6 border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
          <h2 className="text-xl font-semibold mb-3 text-blue-700">🔍 Dados Diretos da API</h2>
          <pre className="bg-white p-3 rounded overflow-auto text-sm max-h-96">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded">
          <strong>Erro:</strong> {error.message}
        </div>
      )}

      {data && (
        <div className="mt-6 space-y-6">
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Dados do Cliente</h2>
            <pre className="bg-gray-50 p-3 rounded overflow-auto text-sm">
              {JSON.stringify(data.cliente, null, 2)}
            </pre>
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">
              Remetentes ({data.remetentes?.length || 0})
            </h2>
            <pre className="bg-gray-50 p-3 rounded overflow-auto text-sm">
              {JSON.stringify(data.remetentes, null, 2)}
            </pre>
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">
              Destinatários ({data.destinatarios?.length || 0})
            </h2>
            <pre className="bg-gray-50 p-3 rounded overflow-auto text-sm">
              {JSON.stringify(data.destinatarios, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
