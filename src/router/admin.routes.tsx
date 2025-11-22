import { generateProtectedRoutes, type ProtectedRouteItem } from './route.utils';

export const adminRoutesConfig: ProtectedRouteItem[] = [
    {
        path: '/admin',
        permission: 'clientes_gerenciar',
        component: () => import('../pages/private/admin/home'),
    },
    {
        path: 'relatorios/envios',
        permission: 'relatorios_envios_gerenciar',
        component: () => import('../pages/private/admin/relatorios/rltEnvios'),
    },
    {
        path: 'planos',
        permission: 'planos_gerenciar',
        component: () => import('../pages/private/admin/planos'),
    },
    {
        path: 'planos/adicionar',
        permission: 'planos_criar',
        component: () => import('../pages/private/admin/planos/FormularioPlano'),
    },
    {
        path: 'planos/editar/:planoId',
        permission: 'planos_editar',
        component: () => import('../pages/private/admin/planos/FormularioPlano'),
    },
    {
        path: 'clientes',
        permission: 'clientes_gerenciar',
        component: () => import('../pages/private/admin/clientes'),
    },
    {
        path: 'clientes/adicionar',
        permission: 'clientes_criar',
        component: () => import('../pages/private/admin/clientes/FormularioCliente'),
    },
    {
        path: 'clientes/editar/:clienteId',
        permission: 'clientes_editar',
        component: () => import('../pages/private/admin/clientes/FormularioCliente'),
    },
    {
        path: 'clientes/:clienteId/remetentes',
        permission: 'clientes_editar',
        component: () => import('../pages/private/admin/clientes/remetentes/ListaDeRemetentes'),
    },
    {
        path: 'clientes/:clienteId/remetentes/:remetenteId/configuracoes',
        permission: 'clientes_editar',
        component: () => import('../pages/private/admin/clientes/remetentes/ConfiguracoesRemetente'),
    },
    {
        path: 'financeiro/faturas-a-receber',
        permission: 'financeiro_fechamentos_gerenciar',
        component: () => import('../pages/private/admin/financeiro/FaturasAReceber'),
    },
    {
        path: 'financeiro/fatura/:faturaId/:subfatura?',
        permission: 'financeiro_fechamentos_gerenciar',
        component: () => import('../pages/private/admin/financeiro/FaturaViewDetail'),
    },
    {
        path: 'ferramentas/cancelar-emissao',
        component: () => import('../pages/private/admin/ferramentas/EmissaoCancelar'),
    },
    {
        path: 'acompanhamento/ordem-coleta',
        component: () => import('../pages/private/admin/ferramentas/OrdemColeta'),
    },
    {
        path: 'relatorios/envios/detail/:emissaoId',
        component: () => import('../pages/private/emissao/EmissaoViewDetail'),
    },
    {
        path: 'logs',
        component: () => import('../pages/private/admin/Logs'),
    },
    {
        path: 'jobs-cron',
        component: () => import('../pages/private/admin/jobs-cron/CronJobList'),
    },
    {
        path: 'jobs-cron/adicionar',
        component: () => import('../pages/private/admin/jobs-cron/CronJobForm'),
    },
    {
        path: 'jobs-cron/:id/edit',
        component: () => import('../pages/private/admin/jobs-cron/CronJobForm'),
    },
    {
        path: 'ferramentas/reprocessar-emissao-etiqueta',
        component: () => import('../pages/private/admin/ferramentas/ReprocessarEmissaoEmitiEtiqueta'),
    },
    {
        path: 'ferramentas/realizar-fechamento',
        component: () => import('../pages/private/admin/ferramentas/RealizarFechamento'),
    },
    {
        path: 'ferramentas/importacao-etiquetas',
        component: () => import('../pages/private/admin/ferramentas/ImportacaoEtiquetas'),
    },
    {
        path: 'ferramentas/gerenciar-etiquetas',
        component: () => import('../pages/private/admin/ferramentas/GerenciarEtiquetas'),
    },
    {
        path: 'transportadoras',
        component: () => import('../pages/private/admin/transportadoras/index'),
    },
    {
        path: 'transportadoras/adicionar',
        component: () => import('../pages/private/admin/transportadoras/Formulario'),
    },
    {
        path: 'transportadoras/correios/credenciais',
        component: () => import('../pages/private/admin/transportadoras/correios'),
    },
    {
        path: 'transportadoras/correios/credenciais/adicionar',
        component: () => import('../pages/private/admin/transportadoras/correios/FormularioCorreiosCredencial'),
    },
    {
        path: 'transportadoras/correios/credenciais/editar/:correiosId',
        component: () => import('../pages/private/admin/transportadoras/correios/FormularioCorreiosCredencial'),
    },
    // {
    //     path: 'transportadoras/editar/:transportadoraId',
    //     permission: 'transportadoras_editar',
    //     component: () => import('../pages/private/admin/transportadoras/FormularioTransportadora'),
    // },
];

export const AdminRoutes = generateProtectedRoutes(adminRoutesConfig);
