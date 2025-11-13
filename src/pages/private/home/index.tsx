import ModalNotificacaoFaturaEmAtraso from "../../../components/ModalNotificacaoFaturaEmAtraso";
import { ResumoDashboardCards } from "../../../components/ResumoDashboardCards"
// const params: { periodo?: string, clienteId?: string} = {};
const Home = () => {

    // const dashboardService = new DashboardService()
    // const { data: dashboardData, isLoading } = useFetchQuery<IDashboardGeral>(
    //     ['dashboard-geral', params],
    //     async () => {
    //         return await dashboardService.getDashboard(params);
    //     }
    // )

    return (
        <div className="flex flex-col gap-4 p-4">
            <ResumoDashboardCards />
            {/* {!isLoading && dashboardData && (
                <DashboardAnaliticoSLA entregaAnalitico={dashboardData?.entregaAnalitico} />
            )} */}
            <ModalNotificacaoFaturaEmAtraso />
        </div>
    );
};

export default Home;