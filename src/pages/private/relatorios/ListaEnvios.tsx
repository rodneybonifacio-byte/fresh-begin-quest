import { Search, Filter, Download, Eye, Package, Calendar, MapPin, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ListaEnvios() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Mock data - substituir por dados reais da API
  const envios = [
    {
      id: 'ENV001',
      destinatario: 'João Silva',
      cidade: 'São Paulo',
      uf: 'SP',
      servico: 'SEDEX',
      status: 'Entregue',
      statusColor: 'bg-green-500',
      data: '2024-11-10',
      prazo: 1,
      valor: 25.50,
      rastreio: 'BR123456789BR'
    },
    {
      id: 'ENV002',
      destinatario: 'Maria Santos',
      cidade: 'Rio de Janeiro',
      uf: 'RJ',
      servico: 'PAC',
      status: 'Em Trânsito',
      statusColor: 'bg-blue-500',
      data: '2024-11-12',
      prazo: 5,
      valor: 18.90,
      rastreio: 'BR987654321BR'
    },
    {
      id: 'ENV003',
      destinatario: 'Pedro Oliveira',
      cidade: 'Belo Horizonte',
      uf: 'MG',
      servico: 'RodoNaves',
      status: 'Entregue',
      statusColor: 'bg-green-500',
      data: '2024-11-08',
      prazo: 2,
      valor: 32.00,
      rastreio: 'RD456789123RD'
    },
    {
      id: 'ENV004',
      destinatario: 'Ana Costa',
      cidade: 'Curitiba',
      uf: 'PR',
      servico: 'SEDEX',
      status: 'Em Trânsito',
      statusColor: 'bg-blue-500',
      data: '2024-11-13',
      prazo: 1,
      valor: 28.50,
      rastreio: 'BR789456123BR'
    },
    {
      id: 'ENV005',
      destinatario: 'Carlos Mendes',
      cidade: 'Porto Alegre',
      uf: 'RS',
      servico: 'PAC',
      status: 'Entregue',
      statusColor: 'bg-green-500',
      data: '2024-11-05',
      prazo: 6,
      valor: 22.30,
      rastreio: 'BR321654987BR'
    },
    {
      id: 'ENV006',
      destinatario: 'Fernanda Lima',
      cidade: 'Salvador',
      uf: 'BA',
      servico: 'SEDEX',
      status: 'Entregue',
      statusColor: 'bg-green-500',
      data: '2024-11-09',
      prazo: 2,
      valor: 35.80,
      rastreio: 'BR654987321BR'
    }
  ];

  const filteredEnvios = envios.filter(envio => {
    const matchSearch = envio.destinatario.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       envio.rastreio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' || envio.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Lista Completa de Envios
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e acompanhe todos os seus envios em um só lugar
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por destinatário ou código de rastreio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none cursor-pointer"
              >
                <option value="todos">Todos os Status</option>
                <option value="Em Trânsito">Em Trânsito</option>
                <option value="Entregue">Entregue</option>
              </select>
            </div>

            {/* Export Button */}
            <button className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all hover:scale-105">
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Mostrando <span className="font-bold text-foreground">{filteredEnvios.length}</span> de{' '}
            <span className="font-bold text-foreground">{envios.length}</span> envios
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold">Código</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Destinatário</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Destino</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Serviço</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Data</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Valor</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEnvios.map((envio) => (
                  <tr key={envio.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium">{envio.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{envio.destinatario}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{envio.cidade} - {envio.uf}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{envio.servico}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white ${envio.statusColor}`}>
                        <div className="w-2 h-2 bg-white rounded-full" />
                        {envio.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{new Date(envio.data).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary">
                        R$ {envio.valor.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/app/rastrear?code=${envio.rastreio}`)}
                        className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="h-5 w-5 text-primary" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden space-y-4">
          {filteredEnvios.map((envio) => (
            <div
              key={envio.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="font-mono text-sm font-bold text-primary">{envio.id}</span>
                  <h3 className="text-lg font-bold mt-1">{envio.destinatario}</h3>
                </div>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white ${envio.statusColor}`}>
                  <div className="w-2 h-2 bg-white rounded-full" />
                  {envio.status}
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Destino</span>
                  </div>
                  <p className="font-medium">{envio.cidade} - {envio.uf}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4" />
                    <span>Serviço</span>
                  </div>
                  <p className="font-medium">{envio.servico}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Data</span>
                  </div>
                  <p className="font-medium">{new Date(envio.data).toLocaleDateString('pt-BR')}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>Valor</span>
                  </div>
                  <p className="font-bold text-primary">R$ {envio.valor.toFixed(2)}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <button
                  onClick={() => navigate(`/app/rastrear?code=${envio.rastreio}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all"
                >
                  <Eye className="h-5 w-5" />
                  Ver Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredEnvios.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Nenhum envio encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros ou fazer uma nova busca
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
