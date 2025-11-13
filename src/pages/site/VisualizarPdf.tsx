import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function VisualizarPdf() {
    const { pdfId } = useParams<{ pdfId: string }>();
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        if (!pdfId) return;

        const fetchPdf = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_BASE_API_URL}/emissoes/${pdfId}/imprimir/completa/public`, {
                    headers: {
                        'Cache-Control': 'no-store',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Erro ${response.status}`);
                }

                // resposta JSON com o base64, ex: { base64: "JVBERi0x..." }
                const data = await response.json();

                // garante que a chave correta exista
                const base64 = data.data.dados;
                if (!base64 || typeof base64 !== 'string') {
                    throw new Error('Resposta inválida da API');
                }

                setPdfBase64(base64);
            } catch (error) {
                console.error(error);
                setErro('Não foi possível carregar o PDF.');
            }
        };

        fetchPdf();
    }, [pdfId]);

    if (erro) {
        return (
            <div style={{ padding: 20, color: 'red' }}>
                <h2>Erro ao exibir PDF</h2>
                <p>{erro}</p>
            </div>
        );
    }

    if (!pdfBase64) {
        return <p style={{ padding: 20 }}>Carregando PDF...</p>;
    }

    return (
        <iframe
            src={`data:application/pdf;base64,${pdfBase64}`}
            style={{
                width: '100%',
                height: '100vh',
                border: 'none',
            }}
            title={`Visualização do PDF ${pdfId}`}
        />
    );
}
