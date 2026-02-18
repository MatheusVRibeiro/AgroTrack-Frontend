import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface RevenueData {
  month: string;
  receita: number;
  custos: number;
}

interface RevenueChartProps {
  data?: RevenueData[];
}

export function RevenueChart({ data: propData }: RevenueChartProps) {
  const defaultData = [
    { month: "Jan", receita: 185000, custos: 142000 },
    { month: "Fev", receita: 198000, custos: 155000 },
    { month: "Mar", receita: 220000, custos: 168000 },
    { month: "Abr", receita: 245000, custos: 175000 },
    { month: "Mai", receita: 268000, custos: 190000 },
    { month: "Jun", receita: 295000, custos: 205000 },
  ];

  const data = propData || defaultData;
  const isMobile = useIsMobile();
  return (
    <div className="bg-card rounded-xl border p-4 sm:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Receita vs Custos</h3>
          <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
        </div>
      </div>
      <div className="h-64 sm:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCustos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={isMobile ? 10 : 12}
              interval={isMobile ? 1 : 0}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={isMobile ? 10 : 12}
              interval={isMobile ? 1 : 0}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString("pt-BR")}`,
              ]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="receita"
              name="Receita"
              stroke="hsl(221, 83%, 53%)"
              fillOpacity={1}
              fill="url(#colorReceita)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="custos"
              name="Custos"
              stroke="hsl(0, 84%, 60%)"
              fillOpacity={1}
              fill="url(#colorCustos)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
