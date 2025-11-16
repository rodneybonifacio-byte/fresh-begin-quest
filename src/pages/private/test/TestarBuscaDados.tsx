import { useState } from 'react';
import { ButtonComponent } from '../../../components/button';
import { useUsuarioDados } from '../../../hooks/useUsuarioDados';

export default function TestarBuscaDados() {
  const [mostrar, setMostrar] = useState(false);
  const { data, isLoading, error, refetch } = useUsuarioDados(mostrar);

  const handleBuscar = () => {
    setMostrar(true);
    refetch();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Teste de Busca de Dados</h1>
      
      <ButtonComponent onClick={handleBuscar} disabled={isLoading}>
        {isLoading ? 'Buscando...' : 'Buscar Dados do Cliente'}
      </ButtonComponent>

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
