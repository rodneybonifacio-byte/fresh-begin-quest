import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmissaoService } from "../services/EmissaoService";
import type { IEmissao } from "../types/IEmissao";
import { useFetchQuery } from "./useFetchQuery";
import { FreteService } from "../services/FreteService";
import { supabase } from "../integrations/supabase/client";

/**
 * Dispara notificação WhatsApp "etiqueta_criada" automaticamente.
 * Não bloqueia o fluxo — erros são silenciados.
 */
async function dispararNotificacaoEtiquetaCriada(emissaoResponse: any, emissaoInput: any) {
  try {
    console.log('🔍 [NotifEtiqueta] Response recebida:', JSON.stringify(emissaoResponse).substring(0, 500));
    console.log('🔍 [NotifEtiqueta] Input original:', JSON.stringify(emissaoInput).substring(0, 500));

    const data = emissaoResponse?.data || emissaoResponse;
    
    // Tentar extrair status de múltiplos caminhos possíveis
    const rawStatus = data?.status || data?.statusDescricao || data?.statusEmissao || emissaoResponse?.status || '';
    const status = String(rawStatus).toUpperCase().replace(/[-\s]/g, '_');

    console.log('🔍 [NotifEtiqueta] Status extraído:', status, '| rawStatus:', rawStatus);

    // Aceitar qualquer status que indique emissão bem-sucedida
    const statusValidos = ['PRE_POSTADO', 'PREPOSTADO', 'CRIADO', 'EMITIDO'];
    const emissaoBemSucedida = statusValidos.some(s => status.includes(s)) || 
                                // Se não tem status mas tem código de rastreio, foi emitida com sucesso
                                (!status.includes('POSTADO') && !!(data?.codigoObjeto || data?.codigo_objeto));
    
    if (!emissaoBemSucedida) {
      console.log('ℹ️ Notificação ignorada — status não reconhecido:', status);
      return;
    }

    const digitsOnly = (v: any) => String(v ?? '').replace(/\D/g, '');

    const codigoRastreio = String(
      data?.codigoObjeto || data?.codigo_objeto || ''
    ).trim();

    const destinatarioPhone = digitsOnly(
      data?.destinatario?.celular ||
      data?.destinatario?.telefone ||
      emissaoInput?.destinatario?.celular ||
      emissaoInput?.destinatario?.telefone ||
      ''
    );

    const destinatarioNome = String(
      data?.destinatario?.nome ||
      emissaoInput?.destinatario?.nome ||
      'Cliente'
    ).trim();

    const remetenteNome = String(
      data?.remetente?.nome ||
      emissaoInput?.remetente?.nome ||
      emissaoInput?.remetenteNome ||
      'Remetente'
    ).trim();

    console.log('🔍 [NotifEtiqueta] Dados extraídos:', { codigoRastreio, destinatarioPhone, destinatarioNome, remetenteNome });

    if (!destinatarioPhone || !codigoRastreio) {
      console.log('ℹ️ Notificação etiqueta_criada ignorada (telefone ou rastreio ausente)', {
        destinatarioPhone,
        codigoRastreio,
      });
      return;
    }

    console.log('📲 Disparando notificação etiqueta_criada...', {
      phone: destinatarioPhone,
      codigo: codigoRastreio,
    });

    const { error } = await supabase.functions.invoke('send-whatsapp-template', {
      body: {
        trigger_key: 'etiqueta_criada',
        phone: destinatarioPhone,
        variables: {
          nome_destinatario: destinatarioNome,
          nome_remetente: remetenteNome,
          codigo_rastreio: codigoRastreio,
        },
      },
    });

    if (error) {
      console.error('⚠️ Falha ao disparar etiqueta_criada:', error);
    } else {
      console.log('✅ Notificação etiqueta_criada enviada');
    }
  } catch (err) {
    console.error('⚠️ Erro no disparo da notificação (não bloqueia):', err);
  }
}

export const useEmissao = () => {

    const queryClient = useQueryClient();
    const service = new EmissaoService();
    const freteService = new FreteService();

    // Armazena o input para usar no onSuccess
    let lastEmissaoInput: IEmissao | null = null;

    const mutation = useMutation({
        mutationFn: async (requestData: IEmissao) => {
            console.log('🚀 Mutation: Enviando dados para backend:', requestData);
            lastEmissaoInput = requestData;
            const response = await freteService.create(requestData);
            console.log('✅ Mutation: Resposta do backend:', response);
            return response;
        },
        onSuccess: (data) => {
            console.log('✅ Mutation Success:', data);
            queryClient.invalidateQueries({ queryKey: ["emissoes"] });
            toast.success("Emissão cadastrada com sucesso!", { duration: 5000, position: "top-center" });

            // Disparo automático de notificação WhatsApp
            dispararNotificacaoEtiquetaCriada(data, lastEmissaoInput);
        },
        onError: (error) => {
            console.error('❌ Mutation Error:', error);
        },
    })

    const onEmissaoCadastro = async (data: IEmissao, onIsLoadingCadastro: (isLoading: boolean) => void): Promise<any> => {
        try {
            onIsLoadingCadastro(true);
            console.log('📤 onEmissaoCadastro: Iniciando criação da emissão');
            const response = await mutation.mutateAsync(data) as any;
            console.log('📦 onEmissaoCadastro: Resposta completa:', response);
            console.log('🆔 ID retornado:', response?.id);
            onIsLoadingCadastro(false);
            // Backend retorna { id, frete, link_etiqueta } diretamente, não em response.data
            return response;
        } catch (error) {
            console.error('❌ onEmissaoCadastro: Erro ao criar emissão:', error);
            onIsLoadingCadastro(false);
            throw error;
        }
    }

    // Hook para buscar remetente por ID
    const getRemetenteEnderecoById = (id: string | undefined) => {
        return useFetchQuery<any>(
            ['remetente', id],
            async () => {
                if (!id) throw new Error("ID não informado");
                const response = await service.getRemetenteEnderecoById(id);
                return response.data;
            },
            {
                enabled: !!id // só executa se o ID for válido
            }
        );
    };

    return { onEmissaoCadastro, getRemetenteEnderecoById };
}
