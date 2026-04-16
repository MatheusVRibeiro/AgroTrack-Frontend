import { useEffect } from "react";
import { usePageHeaderActions } from "@/context/PageHeaderContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Fuel,
  Weight,
  Percent,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RevenueVsCostBarChart } from "@/components/dashboard/RevenueVsCostBarChart";

const custoKmData = [
  { mes: "Jan", valor: 2.45 },
  { mes: "Fev", valor: 2.52 },
  { mes: "Mar", valor: 2.38 },
  { mes: "Abr", valor: 2.41 },
  { mes: "Mai", valor: 2.35 },
  { mes: "Jun", valor: 2.28 },
];

const distribuicaoCustos = [
  { name: "Combustível", value: 45, color: "hsl(38, 92%, 50%)" },
  { name: "Manutenção", value: 25, color: "hsl(0, 84%, 60%)" },
  { name: "Pedágios", value: 18, color: "hsl(221, 83%, 53%)" },
  { name: "Outros", value: 12, color: "hsl(215, 16%, 47%)" },
];

const indicadores = [
  {
    title: "Custo por KM",
    value: "R$ 2,28",
    trend: -5.2,
    icon: Fuel,
    description: "Média dos últimos 30 dias",
  },
  {
    title: "Custo por Tonelada",
    value: "R$ 85,50",
    trend: -3.1,
    icon: Weight,
    description: "Baseado em carga transportada",
  },
  {
    title: "Margem de Lucro",
    value: "30,5%",
    trend: 2.8,
    icon: Percent,
    description: "Margem média por frete",
  },
  {
    title: "Taxa de Ocupação",
    value: "87%",
    trend: 4.5,
    icon: Target,
    description: "Frota em operação",
  },
];

const receitaVsCustosData = [
  { mes: "Jan", receita: 62000, custos: 39000 },
  { mes: "Fev", receita: 68000, custos: 41000 },
  { mes: "Mar", receita: 64000, custos: 40500 },
  { mes: "Abr", receita: 71000, custos: 43800 },
  { mes: "Mai", receita: 74500, custos: 45200 },
  { mes: "Jun", receita: 78600, custos: 47000 },
];

const rankingMotoristas = [
  { nome: "Carlos Silva", margem: 35.2, fretes: 24, eficiencia: 94 },
  { nome: "João Oliveira", margem: 32.8, fretes: 21, eficiencia: 91 },
  { nome: "Pedro Santos", margem: 30.5, fretes: 19, eficiencia: 88 },
  { nome: "André Costa", margem: 28.1, fretes: 17, eficiencia: 85 },
  { nome: "Lucas Ferreira", margem: 26.7, fretes: 15, eficiencia: 82 },
];

export default function Indicadores() {
  const { setHeader } = usePageHeaderActions();

  useEffect(() => {
    setHeader({
      title: "Indicadores",
      subtitle: "KPIs e métricas de desempenho"
    });
  }, [setHeader]);

  return (
    <div className="animate-in fade-in duration-500">
      <PageHeader
        title="Indicadores de Desempenho"
        description="Acompanhe as principais métricas do negócio"
      />

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {indicadores.map((ind) => {
          const Icon = ind.icon;
          const isPositive = ind.trend > 0;
          const isGood =
            ind.title === "Margem de Lucro" || ind.title === "Taxa de Ocupação"
              ? isPositive
              : !isPositive;

          return (
            <Card key={ind.title} className="animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      isGood ? "text-profit" : "text-loss"
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {Math.abs(ind.trend)}%
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {ind.value}
                </p>
                <p className="text-sm text-muted-foreground">{ind.title}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {ind.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cost per KM Chart */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Custo por KM - Evolução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={custoKmData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="mes"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `R$ ${v.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Custo/KM"]}
                  />
                  <Bar dataKey="valor" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost Distribution */}
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={distribuicaoCustos}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {distribuicaoCustos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}%`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3">
                {distribuicaoCustos.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-foreground flex-1">{item.name}</span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Comparativo mensal: Receita vs Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueVsCostBarChart data={receitaVsCustosData} />
        </CardContent>
      </Card>

      {/* Drivers Ranking */}
      <Card className="animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Ranking de Motoristas</CardTitle>
          <Badge variant="secondary">Por margem de lucro</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rankingMotoristas.map((motorista, index) => (
              <div
                key={motorista.nome}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm",
                    index === 0
                      ? "bg-warning/20 text-warning"
                      : index === 1
                      ? "bg-muted-foreground/20 text-muted-foreground"
                      : index === 2
                      ? "bg-warning/10 text-warning/80"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index === 0 ? (
                    <Award className="h-5 w-5" />
                  ) : (
                    `${index + 1}º`
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{motorista.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {motorista.fretes} fretes realizados
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-profit">{motorista.margem}%</p>
                  <p className="text-xs text-muted-foreground">margem</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{motorista.eficiencia}%</p>
                  <p className="text-xs text-muted-foreground">eficiência</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
