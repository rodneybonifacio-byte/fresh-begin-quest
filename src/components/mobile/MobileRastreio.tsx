import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  PackageSearch, 
  Search, 
  MapPinned, 
  CalendarClock, 
  ArrowRight, 
  Waypoints,
  Navigation,
  PackageCheck
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { IRastreioResponse } from "../../types/rastreio/IRastreio";
import { CorreriosService } from "../../services/CorreriosService";
import { useLoadingSpinner } from "../../providers/LoadingSpinnerContext";

const schema = yup.object().shape({
  codigo: yup
    .string()
    .required("Código obrigatório")
    .test(
      "formato-etiqueta-ou-uuid",
      "Código inválido",
      (value) =>
        !!value &&
        (/^[a-zA-Z]{2}\d{9}[a-zA-Z]{2}$/.test(value) ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    ),
});

type FormData = yup.InferType<typeof schema>;

interface MobileRastreioProps {
  numeroObjeto?: string;
}

// Formata endereço completo da unidade de retirada
const formatarEnderecoUnidade = (unidade: any) => {
  if (!unidade?.endereco) return null;
  const end = unidade.endereco;
  const partes = [
    end.logradouro,
    end.numero ? `nº ${end.numero}` : '',
    end.bairro,
    end.cidade || unidade.cidadeUf?.split('-')[0],
    end.uf || unidade.cidadeUf?.split('-')[1],
    end.cep ? `CEP: ${end.cep}` : ''
  ].filter(Boolean);
  return partes.join(', ');
}

export const MobileRastreio = ({ numeroObjeto }: MobileRastreioProps) => {
  const { setIsLoading } = useLoadingSpinner();
  const [rastreio, setRastreio] = useState<IRastreioResponse | undefined>();
  const service = new CorreriosService();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: { codigo: numeroObjeto || "" },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      setIsLoading(true);
      return service.rastreio(data.codigo);
    },
    onSuccess: (response) => {
      setRastreio(response ?? undefined);
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
      setRastreio(undefined);
      toast.error("Objeto não encontrado");
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const getStatusColor = (index: number, total: number) => {
    if (index === 0) return "bg-primary";
    if (index < total - 1) return "bg-primary/60";
    return "bg-muted-foreground/40";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <PackageSearch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Rastreio</h1>
            <p className="text-white/70 text-sm">Acompanhe sua encomenda</p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Digite o código de rastreio"
              {...register("codigo")}
              className="w-full h-14 pl-12 pr-24 rounded-xl bg-white text-foreground placeholder:text-muted-foreground text-base font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              type="submit"
              disabled={mutation.isPending}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? "..." : "Buscar"}
            </button>
          </div>
          {errors.codigo && (
            <p className="text-white/90 text-xs mt-2 ml-1">{errors.codigo.message}</p>
          )}
        </form>
      </div>

      {/* Content */}
      <div className="px-4 -mt-4">
        {rastreio ? (
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            {/* Package Info Header */}
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Código
                </span>
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-md">
                  {rastreio.servico || "Correios"}
                </span>
              </div>
              <p className="text-lg font-bold text-foreground tracking-wide">
                {rastreio.codigoObjeto}
              </p>
              {rastreio.dataPrevisaoEntrega && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <CalendarClock className="w-4 h-4" />
                  <span>Previsão: {format(parseISO(rastreio.dataPrevisaoEntrega), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Waypoints className="w-4 h-4 text-primary" />
                Histórico de Movimentação
              </h3>
              
              <div className="space-y-0">
                {rastreio.eventos.map((evento, index) => {
                  const enderecoCompleto = evento.codigo === 'LDI' ? formatarEnderecoUnidade(evento.unidade) : null;
                  
                  return (
                    <div key={index} className="flex gap-3">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${getStatusColor(
                            index,
                            rastreio.eventos.length
                          )} ring-4 ring-background`}
                        />
                        {index < rastreio.eventos.length - 1 && (
                          <div className="w-0.5 h-full min-h-[60px] bg-border" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-start gap-3">
                          {evento.image && (
                            <img
                              src={evento.image}
                              alt=""
                              className="w-10 h-10 object-contain rounded-lg bg-muted p-1"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-snug">
                              {evento.descricao}
                            </p>
                            
                            {evento.unidade && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                                <Navigation className="w-3 h-3" />
                                <span>
                                  {evento.unidadeDestino ? "De " : ""}
                                  {evento.unidade.tipo}: {evento.unidade.cidadeUf}
                                </span>
                              </div>
                            )}
                            
                            {/* Endereço completo de retirada para eventos LDI */}
                            {enderecoCompleto && (
                              <div className="flex items-start gap-2 bg-primary/10 p-2 rounded-md mt-2">
                                <MapPinned className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-primary">
                                    Local de retirada:
                                  </span>
                                  <span className="text-xs text-foreground">
                                    {enderecoCompleto}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {evento.unidadeDestino && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                <ArrowRight className="w-3 h-3" />
                                <span>
                                  Para {evento.unidadeDestino.tipo}: {evento.unidadeDestino.cidadeUf}
                                </span>
                              </div>
                            )}

                            {evento.detalhes && (
                              <p className="text-xs text-destructive mt-1.5 font-medium">
                                {evento.detalhes}
                              </p>
                            )}

                            <time className="text-xs text-muted-foreground mt-2 block">
                              {format(parseISO(evento.dataCompleta), "dd MMM yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-card rounded-2xl shadow-lg border border-border p-8 text-center mt-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <PackageCheck className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Rastreie sua encomenda
            </h3>
            <p className="text-sm text-muted-foreground">
              Digite o código de rastreio no campo acima para acompanhar o status da sua entrega
            </p>
          </div>
        )}
      </div>

      {/* Bottom spacing */}
      <div className="h-24" />
    </div>
  );
};
