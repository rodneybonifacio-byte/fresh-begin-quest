import { FileText, Download } from 'lucide-react';
import { Content } from '../../Content';

const FaturaExemplo = () => {
  const handleDownload = () => {
    window.open('/fatura-laras-modas.html', '_blank');
  };

  const dadosFatura = {
    nomeCliente: "LARAS MODAS",
    cpfCnpj: "00.000.000/0001-00",
    codigoFatura: "FAT-LARAS-001",
    dataEmissao: new Date().toLocaleDateString('pt-BR'),
    dataVencimento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    valorTotal: "300,00",
    itens: [
      { codigo: "ENV001", destinatario: "TEREZINHA", cidade: "Campinas/SP", valor: "150,00" },
      { codigo: "ENV002", destinatario: "TEREZINHA", cidade: "Campinas/SP", valor: "150,00" }
    ]
  };

  const buttons = [
    {
      label: 'Abrir e Baixar PDF',
      onClick: handleDownload,
      icon: <Download className="h-4 w-4" />
    }
  ];

  return (
    <Content
      titulo="Fatura de Exemplo"
      subTitulo="Fatura gerada para Laras Modas - R$ 300,00"
      button={buttons}
    >
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-primary/10 border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Fatura #{dadosFatura.codigoFatura}</span>
          </div>
          <span className="text-sm bg-warning/20 text-warning px-3 py-1 rounded-full font-medium">
            PENDENTE
          </span>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-semibold">{dadosFatura.nomeCliente}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CNPJ</p>
              <p className="font-semibold">{dadosFatura.cpfCnpj}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Emissão</p>
              <p className="font-semibold">{dadosFatura.dataEmissao}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vencimento</p>
              <p className="font-semibold">{dadosFatura.dataVencimento}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Itens da Fatura</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Código</th>
                    <th className="text-left p-3 text-sm font-medium">Destinatário</th>
                    <th className="text-left p-3 text-sm font-medium">Destino</th>
                    <th className="text-right p-3 text-sm font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFatura.itens.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-3">{item.codigo}</td>
                      <td className="p-3">{item.destinatario}</td>
                      <td className="p-3">{item.cidade}</td>
                      <td className="p-3 text-right font-medium">R$ {item.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-primary text-primary-foreground p-4 rounded-lg text-right">
              <p className="text-sm opacity-90">TOTAL A PAGAR</p>
              <p className="text-3xl font-bold">R$ {dadosFatura.valorTotal}</p>
            </div>
          </div>
        </div>
      </div>
    </Content>
  );
};

export default FaturaExemplo;
