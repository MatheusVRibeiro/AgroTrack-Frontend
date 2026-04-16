import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageHeaderActions } from "@/context/PageHeaderContext";
import { KPICard } from "@/components/dashboard/KPICard";
import { MonthlyComparison } from "@/components/dashboard/MonthlyComparison";
import { SmartAlerts, SmartAlert } from "@/components/dashboard/SmartAlerts";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ProfitChart } from "@/components/dashboard/ProfitChart";
import { DriversRanking } from "@/components/dashboard/DriversRanking";
import { Package, Truck, DollarSign, TrendingUp, MapPin, AlertTriangle, Weight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import * as fretesService from "@/services/fretes";
import fazendasService from "@/services/fazendas";
import * as motoristasService from "@/services/motoristas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

// Interface para EstoqueFazenda
interface EstoqueFazenda {
  id: string;
  fazenda: string;
  localizacao: string;
  mercadoria: string;
  variedade: string;
  quantidadeSacas: number;
  quantidadeInicial: number;
  tarifaPorSaca: number;
  pesoMedioSaca: number;
  safra: string;
}

// Interface para Frete Simulado
interface FreteSimulado {
  id: string;
  status: "em_transito" | "concluido" | "pendente" | "cancelado";
  receita: number;
  custos: number;
  resultado: number;
  quantidadeSacas: number;
  motorista: string;
  motoristaId: string;
  mes: string;
  data_frete?: string; // Data do frete em formato ISO
}

// Simulação de dados de fretes - em produção virá do backend
const fretesSimulados = [
  { id: "FRETE-2026-001", status: "em_transito", receita: 6750, custos: 1720, resultado: 5030, quantidadeSacas: 450, motorista: "Carlos Silva", motoristaId: "1", mes: "jan" },
  { id: "FRETE-2026-002", status: "concluido", receita: 7600, custos: 1690, resultado: 5910, quantidadeSacas: 380, motorista: "João Oliveira", motoristaId: "2", mes: "jan" },
  { id: "FRETE-2026-003", status: "pendente", receita: 7500, custos: 0, resultado: 7500, quantidadeSacas: 500, motorista: "Pedro Santos", motoristaId: "3", mes: "jan" },
  { id: "FRETE-2026-004", status: "concluido", receita: 7500, custos: 1720, resultado: 5780, quantidadeSacas: 300, motorista: "André Costa", motoristaId: "4", mes: "jan" },
  { id: "FRETE-2026-005", status: "cancelado", receita: 0, custos: 0, resultado: 0, quantidadeSacas: 0, motorista: "Lucas Ferreira", motoristaId: "5", mes: "jan" },
  { id: "FRETE-2026-007", status: "concluido", receita: 6000, custos: 1650, resultado: 4350, quantidadeSacas: 400, motorista: "Carlos Silva", motoristaId: "1", mes: "jan" },
  { id: "FRETE-2026-008", status: "concluido", receita: 5250, custos: 1580, resultado: 3670, quantidadeSacas: 350, motorista: "João Oliveira", motoristaId: "2", mes: "jan" },
  { id: "FRETE-2026-009", status: "em_transito", receita: 6750, custos: 1700, resultado: 5050, quantidadeSacas: 450, motorista: "Pedro Santos", motoristaId: "3", mes: "jan" },
  // Dados do mês anterior (dez)
  { id: "FRETE-2026-014", status: "concluido", receita: 6000, custos: 1600, resultado: 4400, quantidadeSacas: 400, motorista: "Carlos Silva", motoristaId: "1", mes: "dez" },
  { id: "FRETE-2026-013", status: "concluido", receita: 7200, custos: 1680, resultado: 5520, quantidadeSacas: 360, motorista: "João Oliveira", motoristaId: "2", mes: "dez" },
  { id: "FRETE-2026-012", status: "concluido", receita: 6750, custos: 1620, resultado: 5130, quantidadeSacas: 450, motorista: "Pedro Santos", motoristaId: "3", mes: "dez" },
  { id: "FRETE-2026-011", status: "concluido", receita: 7000, custos: 1700, resultado: 5300, quantidadeSacas: 280, motorista: "André Costa", motoristaId: "4", mes: "dez" },
  { id: "FRETE-2026-010", status: "concluido", receita: 5500, custos: 1550, resultado: 3950, quantidadeSacas: 380, motorista: "Lucas Ferreira", motoristaId: "5", mes: "dez" },
];

const totalCaminhoes = 5;

const smartAlerts: SmartAlert[] = [
  {
    id: "1",
    type: "info",
    icon: "margin",
    title: "Estoques de Fazendas - Monitoramento Ativo",
    description: "2.1 milhões de sacas disponíveis em 4 fazendas ativas. Acompanhamento em tempo real.",
    action: {
      label: "Ver detalhes",
      onClick: () => toast.info("Navegando para gestão de fazendas"),
    },
  },
  {
    id: "2",
    type: "danger",
    icon: "cost",
    title: "⚠️ Fazenda Recanto - Estoque Esgotado",
    description: "Estoque zerado. Aguardando reposição da próxima colheita.",
    action: {
      label: "Conferir",
      onClick: () => toast.error("Estoque crítico - ação necessária"),
    },
  },
  {
    id: "3",
    type: "warning",
    icon: "truck",
    title: "Fazenda São João - Estoque Crítico",
    description: "Apenas 180k sacas restantes (60% consumido). Estoque baixo requer atenção.",
    action: {
      label: "Monitorar",
      onClick: () => toast.warning("Estoque em nível crítico"),
    },
  },
  {
    id: "4",
    type: "info",
    icon: "margin",
    title: "Safra 2024/2025 - Em Andamento",
    description: "Todas as fazendas operando na safra atual. Produção mantendo níveis esperados.",
    action: {
      label: "Histórico",
      onClick: () => toast.info("Abrindo histórico de safras"),
    },
  },
];

export default function Dashboard() {
  const { setHeader } = usePageHeaderActions();

  useEffect(() => {
    setHeader({
      title: "Dashboard",
      subtitle: "Visão geral de estoques de fazendas, operações de logística e resultados financeiros"
    });
  }, [setHeader]);

  const isMobile = useIsMobile();
  const [alerts, setAlerts] = useState(smartAlerts);
  const [modalAberto, setModalAberto] = useState<"sacas" | "ocupacao" | "custos" | "resultado" | null>(null);

  const handleDismissAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
    toast.success("Alerta dispensado");
  };

  // Queries para buscar dados reais do backend
  const { data: fretesData, isLoading: fretesLoading } = useQuery({
    queryKey: ["fretes"],
    queryFn: () => fretesService.listarFretes(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: fazendaResponse, isLoading: fazendaLoading } = useQuery({
    queryKey: ["fazendas"],
    queryFn: () => fazendasService.listarFazendas(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: motoristasResponse } = useQuery({
    queryKey: ["motoristas"],
    queryFn: () => motoristasService.listarMotoristas(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const fretes = fretesData?.data || [];
  const fazendas = fazendaResponse?.data || [];
  const motoristas = motoristasResponse?.data || [];

  // Buscar estoques de fazendas
  const estoquesFazendas = useMemo(() => {
    const getEstoques = (window as any).getEstoquesFazendas;
    if (getEstoques) {
      return getEstoques() as EstoqueFazenda[];
    }
    return [] as EstoqueFazenda[];
  }, []);

  // Calcular KPIs combinados: Fretes + Estoques (usando dados reais)
  const kpisIntegrados = useMemo(() => {
    // Usar dados reais do backend ou fallback para simulados
    const fretesParaCalcular = fretes.length > 0 ? fretes : fretesSimulados;
    
    // Filtrar fretes por data (Mês Atual e Mês Anterior)
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    let mesAnterior = mesAtual - 1;
    let anoAnterior = anoAtual;
    if (mesAnterior < 0) {
      mesAnterior = 11;
      anoAnterior -= 1;
    }
    
    const fretesMesAtual = fretesParaCalcular.filter((f: any) => {
      if (f.mes === "jan") return f.status !== "cancelado"; // Fallback simulado
      if (!f.data_frete) return false;
      const dataFrete = new Date(f.data_frete);
      return dataFrete.getMonth() === mesAtual && dataFrete.getFullYear() === anoAtual;
    });
    
    const fretesMesAnterior = fretesParaCalcular.filter((f: any) => {
      if (f.mes === "dez") return true; // Fallback simulado
      if (!f.data_frete) return false;
      const dataFrete = new Date(f.data_frete);
      return dataFrete.getMonth() === mesAnterior && dataFrete.getFullYear() === anoAnterior;
    });
    
    const fretesAtivos = fretesParaCalcular.filter((f: FreteSimulado) => {
      if (f.status === "em_transito") return true;
      // Se não tem status, considerar ativos os fretes dos últimos 7 dias
      if (!f.data_frete) return false;
      const dataFrete = new Date(f.data_frete);
      const diff = hoje.getTime() - dataFrete.getTime();
      return diff < 7 * 24 * 60 * 60 * 1000;
    }).length;
    
    // Fretes de hoje
    const fretesHoje = fretesParaCalcular.filter((f: FreteSimulado) => {
      if (!f.data_frete) return false;
      const dataFrete = new Date(f.data_frete);
      return dataFrete.toDateString() === hoje.toDateString();
    });
    
    const totalFretesHoje = fretesHoje.length;
    const totalSacasHoje = fretesHoje.reduce((acc: number, f: FreteSimulado) => acc + (Number(f.quantidadeSacas) || 0), 0);
    const totalToneladasHoje = totalSacasHoje * 25 / 1000; // Conversão de sacas para toneladas (25kg por saca)
    
    // KPIs de Fretes (Mês Atual)
    const totalSacasAtual = fretesMesAtual.reduce((acc: number, f: any) => acc + (Number(f.quantidade_sacas || f.quantidadeSacas) || 0), 0);
    const totalReceitaAtual = fretesMesAtual.reduce((acc: number, f: any) => acc + (Number(f.receita) || 0), 0);
    const totalCustosAtual = fretesMesAtual.reduce((acc: number, f: any) => acc + (Number(f.custos) || 0), 0);
    const totalResultadoAtual = totalReceitaAtual - totalCustosAtual;
    
    // KPIs de Fretes (Mês Anterior)
    const totalSacasAnterior = fretesMesAnterior.reduce((acc: number, f: any) => acc + (Number(f.quantidade_sacas || f.quantidadeSacas) || 0), 0);
    const totalReceitaAnterior = fretesMesAnterior.reduce((acc: number, f: any) => acc + (Number(f.receita) || 0), 0);
    const totalCustosAnterior = fretesMesAnterior.reduce((acc: number, f: any) => acc + (Number(f.custos) || 0), 0);
    const totalResultadoAnterior = totalReceitaAnterior - totalCustosAnterior;
    
    // Custo médio por saca (Mês Atual)
    const fretesComCusto = fretesMesAtual.filter((f: any) => (Number(f.custos) || 0) > 0);
    const sacasComCusto = fretesComCusto.reduce((acc: number, f: any) => acc + (Number(f.quantidade_sacas || f.quantidadeSacas) || 0), 0);
    const custoPorSaca = sacasComCusto > 0 ? totalCustosAtual / sacasComCusto : 0;
    
    // Custo médio por saca (Mês Anterior)
    const fretesComCustoAnterior = fretesMesAnterior.filter((f: any) => (Number(f.custos) || 0) > 0);
    const sacasComCustoAnterior = fretesComCustoAnterior.reduce((acc: number, f: any) => acc + (Number(f.quantidade_sacas || f.quantidadeSacas) || 0), 0);
    const custoPorSacaAnterior = sacasComCustoAnterior > 0 ? totalCustosAnterior / sacasComCustoAnterior : 0;
    
    // Taxa de ocupação da frota
    const motoristasAtivosUnicos = new Set(fretesMesAtual.map((f: any) => f.caminhao_placa || f.caminhao_id).filter(Boolean)).size;
    const baseCaminhoes = (fretes.length > 0 && totalCaminhoes < motoristasAtivosUnicos) ? motoristasAtivosUnicos : totalCaminhoes;
    const taxaOcupacao = Math.min((fretesAtivos / Math.max(1, baseCaminhoes)) * 100, 100);
    
    // KPIs de Estoques (Fazendas) - usando dados reais do backend
    const fazendaParaCalcular = fazendas.length > 0 ? fazendas : estoquesFazendas;
    
    // Calcular totais somando os valores globais de cada fazenda
    // Tenta acessar campos de total (total_toneladas, faturamento_total, etc.)
    let totalEstoquesSacas = 0;
    let totalEstoquesToneladas = 0;
    let totalEstoquesValor = 0;

    fazendaParaCalcular.forEach((fazenda: Record<string, any>) => {
      // Usar o campo correto: total_sacas_carregadas
      const sacas = Number(fazenda.total_sacas_carregadas || fazenda.total_sacas || fazenda.sacas || 0);

      // Preferir total_toneladas quando disponível, senão usar peso_medio_saca (se informado), senão fallback 25kg
      const pesoMedio = Number(fazenda.peso_medio_saca || fazenda.peso_medio || 25);
      const toneladas = Number(fazenda.total_toneladas ?? ((sacas * pesoMedio) / 1000));

      // Tentar diferentes nomes para valor/faturamento
      const valor = Number(
        fazenda.faturamento_total ?? fazenda.faturamento ?? fazenda.valor_total ?? fazenda.valor_estoque ?? fazenda.valor ?? 0
      );

      totalEstoquesSacas += sacas;
      totalEstoquesToneladas += toneladas;
      totalEstoquesValor += valor;
    });

    const totalEstoquesSacasInicial = totalEstoquesSacas;
    const fazendaAtivas = fazendaParaCalcular.filter((e: Record<string, any>) => {
      const sacas = Number(e.quantidade_sacas || e.total_sacas || e.sacas || 0);
      return sacas > 0;
    }).length;
    
    const fazendasCriticas = 0; // Será calculado se tiver dados de inicial
    
    // Calcular trends
    const trendSacas = totalSacasAnterior > 0 ? ((totalSacasAtual - totalSacasAnterior) / totalSacasAnterior) * 100 : 0;
    const trendCustoPorSaca = custoPorSacaAnterior > 0 ? ((custoPorSaca - custoPorSacaAnterior) / custoPorSacaAnterior) * 100 : 0;
    const trendResultado = totalResultadoAnterior > 0 ? ((totalResultadoAtual - totalResultadoAnterior) / totalResultadoAnterior) * 100 : 0;
    const trendEstoque = 0; // Sem dados iniciais para calcular trend
    
    return {
      mesAtualIndex: mesAtual,
      mesAnteriorIndex: mesAnterior,
      anoAtual,
      anoAnterior,
      hoje: {
        totalFretes: totalFretesHoje,
        totalSacas: totalSacasHoje,
        totalToneladas: totalToneladasHoje,
      },
      atual: {
        fretesAtivos,
        totalSacas: totalSacasAtual,
        totalReceita: totalReceitaAtual,
        totalCustos: totalCustosAtual,
        totalResultado: totalResultadoAtual,
        custoPorSaca,
        taxaOcupacao,
      },
      anterior: {
        totalSacas: totalSacasAnterior,
        totalReceita: totalReceitaAnterior,
        totalCustos: totalCustosAnterior,
        totalResultado: totalResultadoAnterior,
        custoPorSaca: custoPorSacaAnterior,
      },
      estoques: {
        totalSacas: totalEstoquesSacas,
        totalToneladas: totalEstoquesToneladas,
        totalValor: totalEstoquesValor,
        fazendaAtivas,
        fazendasCriticas,
        percentualConsumido: totalEstoquesSacasInicial > 0 ? ((totalEstoquesSacasInicial - totalEstoquesSacas) / totalEstoquesSacasInicial) * 100 : 0,
      },
      trends: {
        sacas: trendSacas,
        custoPorSaca: trendCustoPorSaca,
        resultado: trendResultado,
        estoque: trendEstoque,
      },
    };
  }, [estoquesFazendas, fazendas, fretes]);

  const formatMesNome = (mIndex: number) => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return meses[mIndex];
  };

  const monthlyData = {
    mesAtual: {
      receita: kpisIntegrados.atual.totalReceita,
      custos: kpisIntegrados.atual.totalCustos,
      resultado: kpisIntegrados.atual.totalResultado,
    },
    mesAnterior: {
      receita: kpisIntegrados.anterior.totalReceita,
      custos: kpisIntegrados.anterior.totalCustos,
      resultado: kpisIntegrados.anterior.totalResultado,
    },
  };

  // Montar 6 meses passados dinamicamente para o Chart
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    let m = kpisIntegrados.mesAtualIndex - 5 + i;
    let y = kpisIntegrados.anoAtual;
    if (m < 0) {
      m += 12;
      y -= 1;
    }
    return { name: `${formatMesNome(m)}`, mesIndex: m, ano: y };
  });

  const getEstatisticasMes = (mes: number, ano: number) => {
    const fretesNoMes = fretes.filter((f: any) => {
      if (!f.data_frete) return false;
      const d = new Date(f.data_frete);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });
    return {
      receita: fretesNoMes.reduce((acc, f) => acc + (Number(f.receita) || 0), 0),
      custos: fretesNoMes.reduce((acc, f) => acc + (Number(f.custos) || 0), 0),
      resultado: fretesNoMes.reduce((acc, f) => acc + ((Number(f.receita) || 0) - (Number(f.custos) || 0)), 0),
    };
  };

  const revenueChartData = last6Months.map(lm => {
    const stat = getEstatisticasMes(lm.mesIndex, lm.ano);
    return { month: lm.name, receita: stat.receita, custos: stat.custos };
  });

  const profitChartData = last6Months.map(lm => {
    const stat = getEstatisticasMes(lm.mesIndex, lm.ano);
    return { month: lm.name, lucro: stat.resultado };
  });

  // Calcular ranking de favorecidos/proprietários por receita
  const driversRanking = useMemo(() => {
    const motoristasReceitaMap: Record<string, { name: string; revenue: number; trips: number }> = {};
    
    fretes.forEach((frete: Record<string, any>) => {
      // Suportar aliases do backend (proprietario_*) e legados (motorista_*)
      const motoristaNome =
        frete.proprietario_nome || frete.motorista_nome || frete.motorista || "Desconhecido";
      const motoristaId =
        frete.proprietario_id || frete.motorista_id || frete.motoristaId || motoristaNome;
      const receita = Number(frete.receita || 0);
      
      if (!motoristasReceitaMap[motoristaId]) {
        motoristasReceitaMap[motoristaId] = {
          name: motoristaNome,
          revenue: 0,
          trips: 0,
        };
      }
      
      motoristasReceitaMap[motoristaId].revenue += receita;
      motoristasReceitaMap[motoristaId].trips += 1;
    });

    return Object.values(motoristasReceitaMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((driver, index) => ({
        ...driver,
        trend: index === 0 ? 12 : index === 1 ? 8 : 5,
      }));
  }, [fretes]);

  // Função auxiliar para determinar status do estoque
  const getStatusEstoque = (estoque: EstoqueFazenda) => {
    const percentual = (estoque.quantidadeSacas / estoque.quantidadeInicial) * 100;
    if (estoque.quantidadeSacas === 0) return "esgotado";
    if (percentual <= 20) return "critico";
    if (percentual <= 50) return "baixo";
    return "normal";
  };

  // Função para pegar estatística dinâmica dos meses
  const getEstatisticaEspecifica = (mes: number, ano: number) => {
    const fretesNoMes = fretes.filter((f: any) => {
      if (!f.data_frete) return false;
      const d = new Date(f.data_frete);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });

    const sacas = fretesNoMes.reduce((acc, f) => acc + (Number(f.quantidade_sacas || (f as any).quantidadeSacas) || 0), 0);
    const receita = fretesNoMes.reduce((acc, f) => acc + (Number(f.receita) || 0), 0);
    const custos = fretesNoMes.reduce((acc, f) => acc + (Number(f.custos) || 0), 0);
    const resultado = receita - custos;
    
    const fretesComCusto = fretesNoMes.filter(f => (Number(f.custos) || 0) > 0);
    const sacasCusto = fretesComCusto.reduce((acc, f) => acc + (Number(f.quantidade_sacas || (f as any).quantidadeSacas) || 0), 0);
    const custoPorSaca = sacasCusto > 0 ? (custos / sacasCusto) : 0;

    return { sacas, receita, custos, resultado, custoPorSaca };
  };

  const dadosSacasMensais = last6Months.map(lm => {
    const st = getEstatisticaEspecifica(lm.mesIndex, lm.ano);
    return { mes: `${lm.name}/${String(lm.ano).substring(2)}`, sacas: st.sacas, meta: 2500 };
  });

  const dadosOcupacaoSemanal = [
    { semana: "Semana 1", ocupacao: 80, disponivel: 20 },
    { semana: "Semana 2", ocupacao: 60, disponivel: 40 },
    { semana: "Semana 3", ocupacao: 100, disponivel: 0 },
    { semana: "Semana Atual", ocupacao: kpisIntegrados.atual.taxaOcupacao, disponivel: 100 - kpisIntegrados.atual.taxaOcupacao },
  ];

  const dadosCustoMensal = last6Months.map(lm => {
    const st = getEstatisticaEspecifica(lm.mesIndex, lm.ano);
    return { 
      mes: `${lm.name}/${String(lm.ano).substring(2)}`, 
      custoPorSaca: st.custoPorSaca, 
      combustivel: st.custoPorSaca * 0.7, 
      motorista: st.custoPorSaca * 0.26, 
      manutencao: st.custoPorSaca * 0.04 
    };
  });

  const dadosResultadoMensal = last6Months.map(lm => {
    const st = getEstatisticaEspecifica(lm.mesIndex, lm.ano);
    return { 
      mes: `${lm.name}/${String(lm.ano).substring(2)}`, 
      receita: st.receita, 
      custos: st.custos, 
      lucro: st.resultado 
    };
  });

  return (
    <div className="animate-in fade-in duration-500">
      {/* ===== SEÇÃO 1: ESTOQUES DE FAZENDAS (INFORMAÇÕES PRINCIPAIS) ===== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Estoques de Fazendas 
          </h2>
          <Badge variant="active">
            {kpisIntegrados.estoques.fazendaAtivas} fazendas ativas
          </Badge>
        </div>



        {/* Resumo de Estoques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-muted-foreground">Total Sacas</span>
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {Number(kpisIntegrados.estoques.totalSacas || 0).toLocaleString("pt-BR")}
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                {(Number(kpisIntegrados.estoques.percentualConsumido || 0)).toFixed(1)}% consumidas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-muted-foreground">Total Peso</span>
                <Weight className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {(Number(kpisIntegrados.estoques.totalToneladas || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ton
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                Peso médio por saca: 25kg
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-muted-foreground">Valor Total</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                R$ {Number(kpisIntegrados.estoques.totalValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                Avaliação de estoque
              </p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${
            kpisIntegrados.estoques.fazendasCriticas > 0
              ? "from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30"
              : "from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30"
          }`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-muted-foreground">Alertas</span>
                <AlertTriangle className={`w-5 h-5 ${
                  kpisIntegrados.estoques.fazendasCriticas > 0 ? "text-red-600" : "text-green-600"
                }`} />
              </div>
              <p className="text-3xl font-bold">
                {kpisIntegrados.estoques.fazendasCriticas}
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                {kpisIntegrados.estoques.fazendasCriticas > 0
                  ? "fazenda(s) em nível crítico"
                  : "todos os estoques normais"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== SEÇÃO 2: KPI CARDS DE FRETES (MANTIDOS) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KPICard
          title="Fretes Hoje"
          value={`${kpisIntegrados.hoje.totalFretes} ${kpisIntegrados.hoje.totalFretes === 1 ? 'frete' : 'Fretes'}`}
          icon={Package}
          variant="primary"
          trend={{
            value: 0,
            isPositive: true,
          }}
          tooltip={`${kpisIntegrados.hoje.totalSacas.toLocaleString("pt-BR")} sacas (${kpisIntegrados.hoje.totalToneladas.toFixed(1)} toneladas) transportadas hoje`}
          onClick={() => setModalAberto("sacas")}
        />
        <KPICard
          title="Taxa de Ocupação"
          value={`${(Number(kpisIntegrados.atual.taxaOcupacao || 0)).toFixed(0)}%`}
          icon={Truck}
          variant="active"
          trend={{
            value: 0,
            isPositive: true,
          }}
          tooltip={`Caminhões ativos nesse mês. Clique para ver histórico`}
          onClick={() => setModalAberto("ocupacao")}
        />
        <KPICard
          title="Custo por Saca"
          value={`R$ ${(Number(kpisIntegrados.atual.custoPorSaca || 0)).toFixed(2)}`}
          icon={DollarSign}
          variant="loss"
          trend={{
            value: Math.abs(Number(kpisIntegrados.trends.custoPorSaca || 0)),
            isPositive: (Number(kpisIntegrados.trends.custoPorSaca || 0)) <= 0,
          }}
          tooltip="Custo médio por saca transportada (combustível + pedágio). Clique para ver breakdown"
          onClick={() => setModalAberto("custos")}
        />
        <KPICard
          title="Resultado do Mês"
          value={`R$ ${((Number(kpisIntegrados.atual.totalResultado || 0)) / 1000).toFixed(1)}k`}
          icon={TrendingUp}
          variant="profit"
          trend={{
            value: Math.abs(Number(kpisIntegrados.trends.resultado || 0)),
            isPositive: (Number(kpisIntegrados.trends.resultado || 0)) >= 0,
          }}
          tooltip={`Receita R$ ${((Number(kpisIntegrados.atual.totalReceita || 0)) / 1000).toFixed(0)}k - Custos R$ ${((Number(kpisIntegrados.atual.totalCustos || 0)) / 1000).toFixed(0)}k = Lucro R$ ${((Number(kpisIntegrados.atual.totalResultado || 0)) / 1000).toFixed(1)}k. Clique para análise detalhada`}
          onClick={() => setModalAberto("resultado")}
        />
      </div>

      {/* ===== SEÇÃO 2B: KPI CARDS DE ESTOQUES (PRODUÇÃO) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <KPICard
          title="Total de Sacas"
          value={`${Number(kpisIntegrados.estoques.totalSacas || 0).toLocaleString("pt-BR")} sacas`}
          icon={Package}
          variant="primary"
          trend={{
            value: 0,
            isPositive: true,
          }}
          tooltip={`Total de sacas em estoque nas fazendas. Equivale a ~${Number(kpisIntegrados.estoques.totalToneladas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}t`}
          onClick={() => {}}
        />
        <KPICard
          title="Peso Total"
          value={`${Number(kpisIntegrados.estoques.totalToneladas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}t`}
          icon={Weight}
          variant="active"
          trend={{
            value: 0,
            isPositive: true,
          }}
          tooltip={`Peso total dos estoques: ${Number(kpisIntegrados.estoques.totalSacas || 0).toLocaleString("pt-BR")} sacas × 25kg/saca`}
          onClick={() => {}}
        />
        <KPICard
          title="Valor Total (Faturamento)"
          value={`R$ ${Number(kpisIntegrados.estoques.totalValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          variant="profit"
          trend={{
            value: 0,
            isPositive: true,
          }}
          tooltip={`Valor total do estoque: R$ ${Number(kpisIntegrados.estoques.totalValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          onClick={() => {}}
        />
        <KPICard
          title="Fazendas Ativas"
          value={`${Number(kpisIntegrados.estoques.fazendaAtivas || 0)}`}
          icon={MapPin}
          variant="active"
          trend={{
            value: 0,
            isPositive: true,
          }}
          tooltip={`${Number(kpisIntegrados.estoques.fazendaAtivas || 0)} fazenda(s) com produção em estoque`}
          onClick={() => {}}
        />
      </div>

      {/* Monthly Comparison & Smart Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <MonthlyComparison
          mesAtual={monthlyData.mesAtual}
          mesAnterior={monthlyData.mesAnterior}
          labelMesAtual={`${formatMesNome(kpisIntegrados.mesAtualIndex)}/${kpisIntegrados.anoAtual}`}
          labelMesAnterior={`${formatMesNome(kpisIntegrados.mesAnteriorIndex)}/${kpisIntegrados.anoAnterior}`}
        />
        <SmartAlerts alerts={alerts} onDismiss={handleDismissAlert} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart data={revenueChartData} />
        <ProfitChart data={profitChartData} />
      </div>

      {/* Drivers Ranking */}
      <div className="grid grid-cols-1">
        <DriversRanking drivers={driversRanking} />
      </div>

      {/* Modal: Sacas Transportadas */}
      <Dialog open={modalAberto === "sacas"} onOpenChange={() => setModalAberto(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sacas Transportadas - Análise Detalhada</DialogTitle>
            <DialogDescription>
              Comparativo mensal dos últimos 6 meses com meta estabelecida
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">Total (6 meses)</p>
                <p className="text-2xl font-bold text-primary">
                  {dadosSacasMensais.reduce((acc, d) => acc + d.sacas, 0).toLocaleString()} sacas
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Média Mensal</p>
                <p className="text-2xl font-bold">
                  {Math.round(dadosSacasMensais.reduce((acc, d) => acc + d.sacas, 0) / 6).toLocaleString()} sacas
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Meta Mensal</p>
                <p className="text-2xl font-bold">2.500 sacas</p>
              </div>
            </div>

            {/* Gráfico de Barras */}
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosSacasMensais}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mes" interval={isMobile ? 1 : 0} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sacas" name="Sacas Transportadas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" radius={[8, 8, 0, 0]} opacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Análise */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-semibold">📊 Análise</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• O mês atual atingiu {((kpisIntegrados.atual.totalSacas / 2500) * 100).toFixed(1)}% da meta mensal</li>
                <li>• Variação de {kpisIntegrados.trends.sacas.toFixed(1)}% em relação ao mês anterior</li>
                <li>• Equivalente a {(kpisIntegrados.atual.totalSacas * 25 / 1000).toFixed(1)} toneladas transportadas no mês atual</li>
                <li>• Estoques de fazendas: {kpisIntegrados.estoques.totalSacas.toLocaleString("pt-BR")} sacas disponíveis</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Custo por Saca */}
      <Dialog open={modalAberto === "custos"} onOpenChange={() => setModalAberto(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Custo por Saca - Análise Detalhada</DialogTitle>
            <DialogDescription>
              Evolução mensal dos custos operacionais por saca de amendoim transportada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-loss/5 rounded-lg border border-loss/20">
                <p className="text-sm text-muted-foreground">Custo Atual</p>
                <p className="text-2xl font-bold text-loss">
                  R$ {kpisIntegrados.atual.custoPorSaca.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Combustível</p>
                <p className="text-xl font-bold">R$ 2,70</p>
                <p className="text-xs text-muted-foreground">70% do custo</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Motorista</p>
                <p className="text-xl font-bold">R$ 1,00</p>
                <p className="text-xs text-muted-foreground">26% do custo</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Manutenção</p>
                <p className="text-xl font-bold">R$ 0,15</p>
                <p className="text-xs text-muted-foreground">4% do custo</p>
              </div>
            </div>

            {/* Gráfico de Linha */}
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosCustoMensal}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mes" interval={isMobile ? 1 : 0} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis domain={[0, 4]} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="custoPorSaca"
                    name="Custo Total/Saca"
                    stroke="hsl(var(--loss))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--loss))", r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="combustivel"
                    name="Combustível"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="motorista"
                    name="Motorista"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Análise */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-semibold">💰 Análise de Custos</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Custo médio dos últimos 6 meses: R$ {(dadosCustoMensal.reduce((acc, d) => acc + d.custoPorSaca, 0) / Math.max(1, dadosCustoMensal.length)).toFixed(2)}/saca</li>
                <li>• Variação de {kpisIntegrados.trends.custoPorSaca.toFixed(1)}% em relação ao mês anterior</li>
                <li>• Custos influenciam diretamente a margem líquida da frota</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Taxa de Ocupação */}
      <Dialog open={modalAberto === "ocupacao"} onOpenChange={() => setModalAberto(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Taxa de Ocupação da Frota - Últimas 4 Semanas</DialogTitle>
            <DialogDescription>
              Monitoramento da utilização dos caminhões e capacidade ociosa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-active/10 rounded-lg border border-active/20">
                <p className="text-sm text-muted-foreground">Ocupação Atual</p>
                <p className="text-2xl font-bold text-active">
                  {kpisIntegrados.atual.taxaOcupacao.toFixed(0)}%
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Caminhões Ativos</p>
                <p className="text-2xl font-bold">
                  {kpisIntegrados.atual.fretesAtivos} / {totalCaminhoes}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold">
                  {Math.max(0, totalCaminhoes - kpisIntegrados.atual.fretesAtivos)} caminhões
                </p>
              </div>
            </div>

            {/* Gráfico de Área */}
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosOcupacaoSemanal}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="semana" interval={0} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => `${value}%`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="ocupacao"
                    name="Taxa de Ocupação"
                    stackId="1"
                    stroke="hsl(var(--active))"
                    fill="hsl(var(--active))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="disponivel"
                    name="Capacidade Ociosa"
                    stackId="1"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Análise */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-semibold">🚛 Análise da Frota</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Ocupação média do mês: {dadosOcupacaoSemanal.reduce((acc, d) => acc + d.ocupacao, 0) / 4}%</li>
                <li>• Pico de ocupação na Semana 3 (100% da frota utilizada)</li>
                <li>• {Math.max(0, totalCaminhoes - kpisIntegrados.atual.fretesAtivos)} caminhões disponíveis para novos fretes</li>
                <li>• Recomendação: {kpisIntegrados.atual.taxaOcupacao > 80 ? "Considerar expansão da frota" : "Capacidade adequada para demanda atual"}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Resultado do Mês */}
      <Dialog open={modalAberto === "resultado"} onOpenChange={() => setModalAberto(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-3xl">
          <DialogHeader>
            <DialogTitle>Resultado Mensal - Análise Financeira</DialogTitle>
            <DialogDescription>
              Comparativo de receitas, custos e lucro líquido dos últimos 6 meses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">Receita Atual</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {(kpisIntegrados.atual.totalReceita / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="p-4 bg-loss/5 rounded-lg border border-loss/20">
                <p className="text-sm text-muted-foreground">Custos Atuais</p>
                <p className="text-2xl font-bold text-loss">
                  R$ {(kpisIntegrados.atual.totalCustos / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="p-4 bg-profit/5 rounded-lg border border-profit/20">
                <p className="text-sm text-muted-foreground">Lucro Atual</p>
                <p className="text-2xl font-bold text-profit">
                  R$ {(kpisIntegrados.atual.totalResultado / 1000).toFixed(1)}k
                </p>
              </div>
            </div>

            {/* Gráfico de Barras Empilhadas */}
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosResultadoMensal}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mes" interval={isMobile ? 1 : 0} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => `R$ ${(value / 1000).toFixed(1)}k`}
                  />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="custos" name="Custos" fill="hsl(var(--loss))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="lucro" name="Lucro Líquido" fill="hsl(var(--profit))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Análise */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-semibold">📊 Análise Financeira</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Lucro total dos últimos 6 meses: R$ {(dadosResultadoMensal.reduce((acc, d) => acc + d.lucro, 0) / 1000).toFixed(1)}k</li>
                <li>• Margem de lucro mensal: {kpisIntegrados.atual.totalReceita > 0 ? ((kpisIntegrados.atual.totalResultado / kpisIntegrados.atual.totalReceita) * 100).toFixed(1) : 0}%</li>
                <li>• Variação de {kpisIntegrados.trends.resultado.toFixed(1)}% no resultado vs. mês anterior</li>
                <li>• Gráfico refletindo fluxo de caixa real das viagens</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}