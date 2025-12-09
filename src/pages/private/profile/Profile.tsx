import { yupResolver } from '@hookform/resolvers/yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Clock, Lock, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import authStore from '../../../authentica/authentication.store';
import { ButtonComponent } from '../../../components/button';
import { InputLabel } from '../../../components/input-label';
import { ProfileSkeleton } from '../../../components/skeletons/ProfileSkeleton';
import { AvatarUpload } from '../../../components/AvatarUpload';
import { useAddress } from '../../../hooks/useAddress';
import { useUsuarioDados } from '../../../hooks/useUsuarioDados';
import { useUserAvatar } from '../../../hooks/useUserAvatar';
import { useLoadingSpinner } from '../../../providers/LoadingSpinnerContext';
import { AccountService } from '../../../services/AccountService';
import type { IUserProfile } from '../../../types/user/IUserProfile';
import { formatCep, formatCpfCnpj, formatTelefone } from '../../../utils/lib.formats';
import { toastError } from '../../../utils/toastNotify';
import { Content } from '../Content';
import { DadosAcesso } from './DadosAcesso';
import { PreferenciaNotificacao } from './PreferenciaNotificacao';

const validationSchema = yup.object().shape({
    name: yup.string().required('O nome do remetente é obrigatório'),
    documento: yup.string().required('O documento é obrigatório'),
    telefone: yup.string().required('O telefone é obrigatório'),
    email: yup.string(),
    senhaAtual: yup.string().when('novaSenha', {
        is: (val: string) => val && val.length > 0,
        then: (schema) => schema.required('A senha atual é obrigatória quando alterar a senha'),
        otherwise: (schema) => schema.optional(),
    }),
    novaSenha: yup.string().optional(),
    confirmarNovaSenha: yup.string().when('novaSenha', {
        is: (val: string) => val && val.length > 0,
        then: (schema) => schema.oneOf([yup.ref('novaSenha')], 'As senhas devem corresponder'),
        otherwise: (schema) => schema.optional(),
    }),
    endereco: yup.object().shape({
        cep: yup.string().required('O cep é obrigatório'),
        logradouro: yup.string().required('O logradouro é obrigatório'),
        numero: yup.string().required('O numero é obrigatório'),
        complemento: yup.string(),
        bairro: yup.string().required('O bairro é obrigatório'),
        localidade: yup.string().required('A cidade é obrigatória'),
        uf: yup.string().required('O estado é obrigatório'),
    }),
    preferenciasNotificacao: yup.object().shape({
        email: yup.boolean().required('A preferência de notificações por e-mail é obrigatória'),
        sms: yup.boolean().required('A preferência de notificações por SMS é obrigatória'),
        push: yup.boolean().required('A preferência de notificações por push é obrigatória'),
        whatsapp: yup.boolean().required('A preferência de notificações por WhatsApp é obrigatória'),
    }),
});

export type ProfileFormData = yup.InferType<typeof validationSchema>;

const Profile = () => {
    const { setIsLoading } = useLoadingSpinner();
    const user = authStore.getUser();
    const [isEditing, setIsEditing] = useState(false);

    const { onBuscaCep } = useAddress();
    const service = new AccountService();

    const methods = useForm<ProfileFormData>({
        resolver: yupResolver(validationSchema),
        defaultValues: {} as ProfileFormData,
    });
    const {
        handleSubmit,
        reset,
        setValue,
        register,
        clearErrors,
        setFocus,
        formState: { errors },
    } = methods;

    const queryClient = useQueryClient();
    const { data: avatarUrl } = useUserAvatar();

    const {
        data: usuarioDados,
        isLoading,
        isError,
    } = useUsuarioDados();

    // Mapeia dados do remetente principal para o formato de perfil
    const remetente = usuarioDados?.remetentes?.[0];
    const profile = remetente ? {
        id: remetente.id || '',
        name: remetente.nome || '',
        documento: remetente.cpfCnpj || '',
        document: remetente.cpfCnpj || '',
        telefone: remetente.telefone || remetente.celular || '',
        email: remetente.email || '',
        dataNascimento: '',
        endereco: {
            cep: remetente.endereco?.cep || '',
            logradouro: remetente.endereco?.logradouro || '',
            numero: remetente.endereco?.numero || '',
            complemento: remetente.endereco?.complemento || '',
            bairro: remetente.endereco?.bairro || '',
            localidade: remetente.endereco?.localidade || '',
            uf: remetente.endereco?.uf || '',
        },
        preferenciasNotificacao: {
            email: true,
            sms: false,
            push: true,
        },
        lastLogin: {
            lastLoginAt: '',
            ipAddress: '',
        },
    } : null;

    const mutation = useMutation({
        mutationFn: async (data: ProfileFormData) => {
            const profileData: Partial<IUserProfile> = {
                ...data,
                endereco: {
                    ...data.endereco,
                    complemento: data.endereco.complemento || '',
                },
            };
            await service.updateProfile(profileData);
        },
        onSuccess: () => {
            reset();
            setIsEditing(false);
        },
        onError: (_error) => {
            toastError('Erro ao atualizar perfil:');
        },
    });

    const onSubmit = async (_data: ProfileFormData) => {
        try {
            await mutation.mutateAsync(_data);
            setIsEditing(false);
        } catch (_error) {}
    };

    const [activeTab, setActiveTab] = useState('personal');

    const tabs = [
        { id: 'personal', label: 'Dados Pessoais', icon: User },
        { id: 'access', label: 'Dados de Acesso', icon: Lock },
        { id: 'notifications', label: 'Notificações', icon: Bell },
        { id: 'activity', label: 'Atividade', icon: Clock },
    ];

    useEffect(() => {
        if (remetente) {
            const formData = {
                name: remetente.nome || '',
                documento: remetente.cpfCnpj || '',
                telefone: remetente.telefone || remetente.celular || '',
                email: remetente.email || '',
                endereco: {
                    cep: remetente.endereco?.cep || '',
                    logradouro: remetente.endereco?.logradouro || '',
                    numero: remetente.endereco?.numero || '',
                    complemento: remetente.endereco?.complemento || '',
                    bairro: remetente.endereco?.bairro || '',
                    localidade: remetente.endereco?.localidade || '',
                    uf: remetente.endereco?.uf || '',
                },
                preferenciasNotificacao: {
                    email: true,
                    sms: false,
                    push: true,
                    whatsapp: true,
                },
            };
            reset(formData);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [remetente?.id]);

    if (isLoading) {
        return (
            <Content titulo="Meu Perfil" subTitulo="Gerencie suas informações pessoais">
                <ProfileSkeleton />
            </Content>
        );
    }

    if (isError) {
        return (
            <Content titulo="Meu Perfil" subTitulo="Gerencie suas informações pessoais">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <p className="text-red-800 dark:text-red-200">Ocorreu um erro ao carregar os dados do perfil. Por favor, tente novamente mais tarde.</p>
                </div>
            </Content>
        );
    }

    const userName = profile?.name || user?.name || 'Usuário';
    const userEmail = profile?.email || user?.email || '';

    return (
        <Content titulo="Meu Perfil" subTitulo="Gerencie suas informações pessoais">
            <div className="flex flex-col gap-6">
                {/* Header do perfil com avatar */}
                <div className="bg-card rounded-xl p-6 border border-border">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <AvatarUpload 
                            name={userName} 
                            currentAvatarUrl={avatarUrl}
                            onAvatarChange={() => queryClient.invalidateQueries({ queryKey: ['user-avatar'] })}
                            size="xl"
                        />
                        <div className="text-center sm:text-left">
                            <h2 className="text-2xl font-bold text-foreground">{userName}</h2>
                            <p className="text-muted-foreground">{userEmail}</p>
                            {(profile as any)?.documento && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {formatCpfCnpj((profile as any).documento)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Aside com as abas */}
                    <aside className="w-full md:w-56 bg-card rounded-xl p-4 border border-border h-fit">
                        <nav className="flex md:flex-col gap-2 overflow-x-auto">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors whitespace-nowrap text-sm ${
                                            activeTab === tab.id 
                                                ? 'bg-primary text-primary-foreground' 
                                                : 'hover:bg-accent text-foreground'
                                        }`}
                                    >
                                        <Icon size={18} />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                {/* Conteúdo principal */}
                <div className="flex-1 bg-card rounded-xl p-6 border border-border">
                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {activeTab !== 'activity' && (
                                <div className="flex justify-end mb-4">
                                    <ButtonComponent variant="primary" onClick={() => setIsEditing(!isEditing)} type="button">
                                        {isEditing ? 'Cancelar' : 'Editar Perfil'}
                                    </ButtonComponent>
                                </div>
                            )}
                            {activeTab === 'personal' && (
                                <div className="space-y-8">
                                    {/* Dados Principais */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Dados Principais</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputLabel labelTitulo="Nome Completo" {...register('name')} disabled={!isEditing} isDisabled={!isEditing} />
                                            <InputLabel
                                                labelTitulo="CPF/CNPJ"
                                                {...register('documento', {
                                                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                        const valor = formatCpfCnpj(e.target.value);
                                                        setValue('documento', valor);
                                                    },
                                                })}
                                                disabled={!isEditing}
                                                isDisabled={!isEditing}
                                            />
                                        </div>
                                    </div>

                                    {/* Contatos */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Contatos</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputLabel
                                                labelTitulo="Telefone Fixo"
                                                {...register('telefone', {
                                                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                        const valor = formatTelefone(e.target.value, 'celular');
                                                        setValue('telefone', valor);
                                                    },
                                                })}
                                                disabled={!isEditing}
                                                isDisabled={!isEditing}
                                            />
                                        </div>
                                    </div>

                                    {/* Endereço */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Endereço</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputLabel
                                                type="text"
                                                labelTitulo="CEP"
                                                {...register('endereco.cep', {
                                                    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
                                                        const valor = formatCep(e.target.value);
                                                        setValue('endereco.cep', valor);
                                                        clearErrors('endereco.cep');
                                                        //valida o cep com 8 caracteres e so podemos buscar o cep se o cep for valido e remover caracteres
                                                        const responseAddress = await onBuscaCep(e.target.value, setIsLoading);

                                                        if (responseAddress) {
                                                            setValue('endereco.logradouro', responseAddress?.logradouro ?? '');

                                                            setValue('endereco.bairro', responseAddress?.bairro ?? '');
                                                            setValue('endereco.localidade', responseAddress?.localidade ?? '');
                                                            setValue('endereco.uf', responseAddress?.uf ?? '');
                                                            setFocus('endereco.numero');
                                                        }
                                                    },
                                                })}
                                                isDisabled={!isEditing}
                                                disabled={!isEditing}
                                                fieldError={errors.endereco?.cep && errors.endereco.cep.message}
                                            />

                                            <InputLabel
                                                labelTitulo="Logradouro"
                                                {...register('endereco.logradouro')}
                                                disabled={!isEditing}
                                                isDisabled={!isEditing}
                                            />
                                            <InputLabel labelTitulo="Número" {...register('endereco.numero')} disabled={!isEditing} isDisabled={!isEditing} />
                                            <InputLabel
                                                labelTitulo="Complemento"
                                                {...register('endereco.complemento')}
                                                disabled={!isEditing}
                                                isDisabled={!isEditing}
                                            />
                                            <InputLabel labelTitulo="Bairro" {...register('endereco.bairro')} disabled={!isEditing} isDisabled={!isEditing} />
                                            <InputLabel
                                                labelTitulo="Cidade"
                                                {...register('endereco.localidade')}
                                                disabled={!isEditing}
                                                isDisabled={!isEditing}
                                            />
                                            <InputLabel labelTitulo="Estado" {...register('endereco.uf')} disabled={!isEditing} isDisabled={!isEditing} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'access' && <DadosAcesso />}

                            {activeTab === 'notifications' && <PreferenciaNotificacao />}

                            {isEditing && (
                                <div className="flex justify-end mt-6">
                                    <ButtonComponent type="submit">Salvar Alterações</ButtonComponent>
                                </div>
                            )}
                        </form>
                    </FormProvider>

                    {/* Última Atividade */}
                    {activeTab === 'activity' && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Última Atividade</h3>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        Último acesso: {profile?.lastLogin?.lastLoginAt || 'Não disponível'}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">IP: {profile?.lastLogin?.ipAddress || 'Não disponível'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>
        </Content>
    );
};

export default Profile;
