import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { MonthlyComparison } from "@/components/dashboard/MonthlyComparison";
import { SmartAlerts, SmartAlert } from "@/components/dashboard/SmartAlerts";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ProfitChart } from "@/components/dashboard/ProfitChart";
import { DriversRanking } from "@/components/dashboard/DriversRanking";
import { Route, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

// Demo data for monthly comparison
const monthlyData = {
  mesAtual: { receita: 295000, custos: 205000, resultado: 90000 },
  mesAnterior: { receita: 272000, custos: 195000, resultado: 77000 },
};

// Demo smart alerts
const smartAlerts: SmartAlert[] = [
  {
    id: "1",
    type: "danger",
    icon: "margin",
    title: "Frete com margem abaixo de 10%",
    description: "Frete #1247 (SP → RJ) está com margem de apenas 8%. Considere revisar os custos.",
    action: {
      label: "Ver frete",
      onClick: () => toast.info("Navegando para detalhes do frete #1247"),
    },
  },
  {
    id: "2",
    type: "warning",
    icon: "cost",
    title: "Caminhão com custo elevado",
    description: "O caminhão ABC-1234 teve custo 25% acima da média este mês.",
    action: {
      label: "Analisar custos",
      onClick: () => toast.info("Abrindo análise de custos"),
    },
  },
  {
    id: "3",
    type: "warning",
    icon: "margin",
    title: "3 fretes com margem baixa",
    description: "Fretes para a região Sul estão com margens entre 5% e 10%.",
    action: {
      label: "Ver fretes",
      onClick: () => toast.info("Filtrando fretes da região Sul"),
    },
  },
  {
    id: "4",
    type: "info",
    icon: "truck",
    title: "Manutenção programada",
    description: "2 caminhões precisam de revisão nos próximos 7 dias.",
    action: {
      label: "Ver agenda",
      onClick: () => toast.info("Abrindo agenda de manutenção"),
    },
  },
];

export default function Dashboard() {
  const handleDismissAlert = (id: string) => {
    toast.success("Alerta dispensado");
  };

  return (
    <MainLayout title="Dashboard" subtitle="Visão geral do sistema">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Fretes Ativos"
          value="47"
          icon={<Route className="h-5 w-5" />}
          trend={{ value: 12, isPositive: true }}
          tooltip="Número de fretes em andamento no momento"
        />
        <KPICard
          title="Receita Total"
          value="R$ 295.000"
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: 8, isPositive: true }}
          tooltip="Soma de todas as receitas do mês atual"
        />
        <KPICard
          title="Custos Totais"
          value="R$ 205.000"
          icon={<TrendingDown className="h-5 w-5" />}
          variant="loss"
          trend={{ value: 5, isPositive: false }}
          tooltip="Total de despesas operacionais do mês"
        />
        <KPICard
          title="Lucro Líquido"
          value="R$ 90.000"
          icon={<TrendingUp className="h-5 w-5" />}
          variant="profit"
          trend={{ value: 15, isPositive: true }}
          tooltip="Receita menos custos do período"
        />
      </div>

      {/* Monthly Comparison & Smart Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <MonthlyComparison
          mesAtual={monthlyData.mesAtual}
          mesAnterior={monthlyData.mesAnterior}
          labelMesAtual="Jan/2024"
          labelMesAnterior="Dez/2023"
        />
        <SmartAlerts alerts={smartAlerts} onDismiss={handleDismissAlert} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart />
        <ProfitChart />
      </div>

      {/* Drivers Ranking */}
      <div className="grid grid-cols-1">
        <DriversRanking />
      </div>
    </MainLayout>
  );
}
