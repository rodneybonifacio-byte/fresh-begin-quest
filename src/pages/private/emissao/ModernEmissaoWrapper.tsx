import { useState, useEffect } from "react";
import { Package, MapPin, Truck, CheckCircle2, Printer } from "lucide-react";
import { FormProvider, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../../providers/AuthContext';
import { useCliente } from '../../../hooks/useCliente';
import { useRemetentes } from '../../../hooks/useRemetente';
import type { ICotacaoMinimaResponse } from '../../../types/ICotacao';
import type { IDestinatario } from '../../../types/IDestinatario';
import type { IEmbalagem } from '../../../types/IEmbalagem';
import type { IEmissao } from '../../../types/IEmissao';
import { Step1Dimensoes } from './steps/Step1Dimensoes';
import { Step2Destinatario } from './steps/Step2Destinatario';
import { Step3Frete } from './steps/Step3Frete';
import { Step4Confirmacao } from './steps/Step4Confirmacao';
import { Step5Imprimir } from './steps/Step5Imprimir';
import { useNavigate } from 'react-router-dom';

const createValidationSchema = () => {
    return yup.object().shape({
        nomeRemetente: yup.string().required('O nome do remetente é obrigatório'),
        remetenteId: yup.string().required('O remetente é obrigatório'),
        embalagem: yup.object().shape({
            altura: yup.number().typeError('A altura deve ser um número').required('A altura é obrigatória'),
            comprimento: yup.number().typeError('O comprimento deve ser um número').required('O comprimento é obrigatório'),
            largura: yup.number().typeError('A largura deve ser um número').required('A largura é obrigatória'),
            peso: yup.number().typeError('O peso deve ser um número').required('O peso é obrigatório'),
        }),
        destinatario: yup.object().shape({
            nome: yup.string().required('O nome é obrigatório'),
            cpfCnpj: yup.string().required('O CPF/CNPJ é obrigatório'),
            celular: yup.string().required('O celular é obrigatório'),
            endereco: yup.object().shape({
                cep: yup.string().required('O CEP é obrigatório'),
                logradouro: yup.string().required('O logradouro é obrigatório'),
                numero: yup.string().required('O número é obrigatório'),
                bairro: yup.string().required('O bairro é obrigatório'),
                localidade: yup.string().required('A cidade é obrigatória'),
                uf: yup.string().required('O estado é obrigatório'),
            }),
        }),
        cotacao: yup.object().shape({
            codigoServico: yup.string().required('Selecione um serviço de frete'),
        }),
    });
};

export const ModernEmissaoWrapper = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedEmbalagem, setSelectedEmbalagem] = useState<IEmbalagem | undefined>();
    const [clienteSelecionado, setClienteSelecionado] = useState<any>();
    const [_destinatarioSelecionado, setDestinatarioSelecionado] = useState<IDestinatario | undefined>();
    const [cotacaoSelecionado, setCotacaoSelecionado] = useState<ICotacaoMinimaResponse | undefined>();
    const [emissaoGerada, setEmissaoGerada] = useState<IEmissao | null>(null);
    const [pdfData, setPdfData] = useState<{ nome: string; dados: string; linkEtiqueta?: string } | null>(null);
    
    // Função para resetar cotações quando voltar
    const resetCotacoes = () => {
        console.log('🔄 Resetando cotações...');
        setCotacaoSelecionado(undefined);
        methods.setValue('cotacao.codigoServico', '');
    };
    
    // Função para resetar destinatário quando voltar
    const resetDestinatario = () => {
        console.log('🔄 Resetando destinatário...');
        setDestinatarioSelecionado(undefined);
        methods.setValue('destinatario', {
            nome: '',
            cpfCnpj: '',
            celular: '',
            endereco: {
                cep: '',
                logradouro: '',
                numero: '',
                bairro: '',
                localidade: '',
                uf: '',
            },
        });
    };

    const { user: userPayload } = useAuth();
    const { data: cliente } = useCliente(userPayload?.clienteId || '');
    const { data: remetentesResponse } = useRemetentes({
        clienteId: userPayload?.clienteId || '',
        page: 1,
        perPage: 100,
    });

    const methods = useForm({
        resolver: yupResolver(createValidationSchema()),
        mode: 'onChange',
        defaultValues: {
            nomeRemetente: '',
            remetenteId: '',
            embalagem: {
                altura: 0,
                largura: 0,
                comprimento: 0,
                peso: 0,
            },
            destinatario: {
                nome: '',
                cpfCnpj: '',
                celular: '',
                endereco: {
                    cep: '',
                    logradouro: '',
                    numero: '',
                    bairro: '',
                    localidade: '',
                    uf: '',
                },
            },
            cotacao: {
                codigoServico: '',
            },
        },
    });

    useEffect(() => {
        if (remetentesResponse?.data && cliente) {
            const remetenteCompleto = remetentesResponse.data.find((remetente) => remetente.id === cliente.id);
            if (remetenteCompleto) {
                setClienteSelecionado(remetenteCompleto);
                methods.setValue('nomeRemetente', remetenteCompleto.nome);
                methods.setValue('remetenteId', remetenteCompleto.id);
            } else {
                setClienteSelecionado(cliente);
                methods.setValue('nomeRemetente', cliente.nome);
                methods.setValue('remetenteId', cliente.id);
            }
        }
    }, [cliente, remetentesResponse]);

    const steps = [
        { icon: Package, label: "Dimensões", description: "Embalagem e peso" },
        { icon: MapPin, label: "Destinatário", description: "Endereço de entrega" },
        { icon: Truck, label: "Frete", description: "Escolha o serviço" },
        { icon: CheckCircle2, label: "Confirmar", description: "Revisar e emitir" },
        { icon: Printer, label: "Imprimir", description: "Etiqueta gerada" },
    ];

    const handleSuccess = (emissao: any, pdf: { nome: string; dados: string; linkEtiqueta?: string }) => {
        setEmissaoGerada(emissao);
        setPdfData(pdf);
        setCurrentStep(4); // Vai para o step 5 (índice 4)
    };
    
    const handleFinish = () => {
        navigate('/app/emissao');
    };

    return (
        <FormProvider {...methods}>
            <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
            {/* Header com Progress Stepper */}
            <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    {/* Mobile: Compact Progress */}
                    <div className="lg:hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold text-foreground">Nova Etiqueta</h1>
                            <span className="text-sm font-medium text-muted-foreground">
                                Etapa {currentStep + 1} de {steps.length}
                            </span>
                        </div>
                        
                        {/* Mobile Progress Bar */}
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            >
                                <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-r from-transparent to-white/30 animate-pulse" />
                            </div>
                        </div>

                        {/* Current Step Info */}
                        <div className="mt-4 flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                {(() => {
                                    const StepIcon = steps[currentStep].icon;
                                    return <StepIcon className="h-5 w-5 text-primary" />;
                                })()}
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">{steps[currentStep].label}</p>
                                <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Desktop: Full Stepper */}
                    <div className="hidden lg:block">
                        <div className="flex items-center justify-between max-w-4xl mx-auto">
                            {steps.map((step, index) => {
                                const StepIcon = step.icon;
                                const isActive = index === currentStep;
                                const isCompleted = index < currentStep;
                                
                                return (
                                    <div key={index} className="flex items-center flex-1">
                                        {/* Step Circle */}
                                        <div className="flex flex-col items-center gap-2 relative">
                                            <div
                                                className={`
                                                    relative w-14 h-14 rounded-full flex items-center justify-center
                                                    transition-all duration-500 transform
                                                    ${isActive
                                                        ? 'bg-primary shadow-2xl shadow-primary/50 scale-110'
                                                        : isCompleted
                                                        ? 'bg-primary/80'
                                                        : 'bg-muted'
                                                    }
                                                `}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle2 className="h-6 w-6 text-white animate-scale-in" />
                                                ) : (
                                                    <StepIcon
                                                        className={`h-6 w-6 transition-colors ${
                                                            isActive ? 'text-white' : 'text-muted-foreground'
                                                        }`}
                                                    />
                                                )}
                                                
                                                {/* Active Ring */}
                                                {isActive && (
                                                    <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
                                                )}
                                            </div>

                                            {/* Label */}
                                            <div className="text-center">
                                                <p
                                                    className={`text-sm font-semibold transition-colors ${
                                                        isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {step.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{step.description}</p>
                                            </div>
                                        </div>

                                        {/* Connector Line */}
                                        {index < steps.length - 1 && (
                                            <div className="flex-1 mx-4 h-1 relative overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={`absolute left-0 top-0 h-full bg-primary transition-all duration-500 ease-out ${
                                                        isCompleted ? 'w-full' : 'w-0'
                                                    }`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    {currentStep === 0 && (
                        <Step1Dimensoes 
                            onNext={() => setCurrentStep(1)}
                            selectedEmbalagem={selectedEmbalagem}
                            setSelectedEmbalagem={setSelectedEmbalagem}
                            clienteSelecionado={clienteSelecionado}
                            setClienteSelecionado={setClienteSelecionado}
                        />
                    )}
                    {currentStep === 1 && (
                        <Step2Destinatario 
                            onNext={() => setCurrentStep(2)}
                            onBack={() => {
                                resetDestinatario();
                                setCurrentStep(0);
                            }}
                            setDestinatarioSelecionado={setDestinatarioSelecionado}
                        />
                    )}
            {currentStep === 2 && (
                <Step3Frete
                    onNext={() => setCurrentStep(3)}
                    onBack={() => {
                        resetCotacoes();
                        setCurrentStep(1);
                    }}
                    clienteSelecionado={clienteSelecionado}
                    cotacaoSelecionado={cotacaoSelecionado}
                    setCotacaoSelecionado={setCotacaoSelecionado}
                />
            )}
                    {currentStep === 3 && (
                        <Step4Confirmacao 
                            onBack={() => setCurrentStep(2)}
                            onSuccess={handleSuccess}
                            cotacaoSelecionado={cotacaoSelecionado}
                            selectedEmbalagem={selectedEmbalagem}
                            clienteSelecionado={clienteSelecionado}
                        />
                    )}
                    {currentStep === 4 && emissaoGerada && pdfData && (
                        <Step5Imprimir 
                            onBack={() => setCurrentStep(3)}
                            onFinish={handleFinish}
                            emissaoGerada={emissaoGerada}
                            pdfData={pdfData}
                        />
                    )}
                </div>
            </div>
        </div>
        </FormProvider>
    );
};
