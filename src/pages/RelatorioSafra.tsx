import { useState, useMemo, useEffect } from "react";
import { usePageHeaderActions } from "@/context/PageHeaderContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sprout, TrendingUp, Truck, Package, Download, MapPin, Target, Landmark, Loader2, X, User } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import fazendasService from "@/services/fazendas";
import { listarFretes } from "@/services/fretes";

interface FazendaData {
  id: string;
  nome: string;
  producaoToneladas: number;
  producaoSacas: number;
  gastoFretes: number;
  numeroViagens: number;
  custosOperacionais: number;
}

interface FilialData {
  id: string;
  nome: string;
  quantidadeRecebida: number;
  quantidadeSacasRecebida: number;
  viagens: number;
}

interface FreteData {
  id: string;
  origem: string;
  destino: string;
  toneladas: number;
  custo: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#EC4899', '#14B8A6', '#F59E0B'];

export default function RelatorioSafra() {
  const { setHeader } = usePageHeaderActions();
  const [activeTab, setActiveTab] = useState("geral");
  const [safraSelecionada, setSafraSelecionada] = useState("");
  const [fazendaFiltro, setFazendaFiltro] = useState<string | null>(null);

  useEffect(() => {
    setHeader({
      title: "Relatório de Safra",
      subtitle: "Análise consolidada de produção, custos e fretes"
    });
  }, [setHeader]);

  // Fetch API Data
  const { data: fazendasRes, isLoading: loadingFazendas } = useQuery({
    queryKey: ["fazendas-relatorio"],
    queryFn: () => fazendasService.listarFazendas({ limit: 10000 }),
  });

  const { data: fretesRes, isLoading: loadingFretes } = useQuery({
    queryKey: ["fretes-relatorio"],
    queryFn: () => listarFretes({ fetchAll: true }),
  });

  const fazendas = fazendasRes?.data || [];
  const fretes = fretesRes?.data || [];
  const isLoading = loadingFazendas || loadingFretes;

  // Extrair safras únicas disponíveis
  const safras = useMemo(() => {
    const s = new Set<string>();
    fazendas.forEach(f => {
      if (f.safra) s.add(f.safra);
    });
    // Fallback: se nenhuma safra estiver definida nas fazendas, tenta pelo ano dos fretes
    if (s.size === 0 && fretes.length > 0) {
      fretes.forEach(f => {
        const year = new Date(f.data_frete).getFullYear();
        if (year && !isNaN(year)) s.add(`${year}`);
      });
    }
    const arr = Array.from(s).sort();
    return ["Todas", ...arr];
  }, [fazendas, fretes]);

  // Setar a safra inicial e limpar filtro ao mudar de safra
  useEffect(() => {
    if (!isLoading && !safraSelecionada) {
      if (safras.length > 1) {
        setSafraSelecionada(safras[safras.length - 1]);
      } else {
        setSafraSelecionada("Todas");
      }
    }
  }, [safras, isLoading, safraSelecionada]);

  useEffect(() => {
    setFazendaFiltro(null);
  }, [safraSelecionada]);

  // Calcular Dados Dinamicamente
  const { mockFazendas, mockFiliais, motoristasDesempenho, evolucaoTemporalData, topMotorista } = useMemo(() => {
    if (!safraSelecionada) return { mockFazendas: [], mockFiliais: [], motoristasDesempenho: [], evolucaoTemporalData: [], topMotorista: { nome: "N/A", viagens: 0 } };

    const isTodas = safraSelecionada === "Todas";

    // Filtra fazendas pela safra
    const fazendasSafra = isTodas 
      ? fazendas 
      : fazendas.filter(f => f.safra === safraSelecionada || !f.safra);

    const calcFazendas: FazendaData[] = fazendasSafra.map(f => {
      const fretesDaFazenda = fretes.filter(fr => {
        if (fr.fazenda_id) return String(fr.fazenda_id) === String(f.id);
        if (!fr.origem) return false;
        
        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const stripFazenda = (s: string) => s.replace(/^fazenda\s+/i, "").trim();
        
        const origemLimpa = stripFazenda(normalize(fr.origem.split("-")[0]));
        const fazendaLimpa = stripFazenda(normalize(f.fazenda));
        
        return origemLimpa === fazendaLimpa;
      });
      const gastoFretes = fretesDaFazenda.reduce((acc, fr) => {
        const valor = Number(fr.receita) || (Number(fr.toneladas) * Number(fr.valor_por_tonelada)) || 0;
        return acc + valor;
      }, 0);
      const producaoToneladas = fretesDaFazenda.reduce((acc, fr) => acc + (Number(fr.toneladas) || 0), 0);
      const producaoSacas = fretesDaFazenda.reduce((acc, fr) => acc + (Number(fr.quantidade_sacas) || 0), 0);

      return {
        id: f.id,
        nome: f.fazenda || "Sem Nome",
        producaoToneladas: Number(f.total_toneladas) || producaoToneladas,
        producaoSacas: Number(f.total_sacas_carregadas) || producaoSacas,
        gastoFretes: gastoFretes,
        numeroViagens: fretesDaFazenda.length,
        custosOperacionais: Number(f.total_custos_operacionais) || 0,
      };
    })
    .filter(f => f.producaoToneladas > 0 || f.numeroViagens > 0) // Ocultar inativas
    .sort((a, b) => b.producaoToneladas - a.producaoToneladas); // Maior para menor

    // Extrair Destinos (Filiais) dos fretes ligados a essas fazendas
    const filiaisMap = new Map<string, FilialData>();
    
    // Obter fretes ativos gerais da safra
    const fretesSafraAtivos = fretes.filter(fr => calcFazendas.some(f => {
      if (fr.fazenda_id) return String(fr.fazenda_id) === String(f.id);
      if (!fr.origem) return false;
      const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      return normalize(fr.origem.split("-")[0]) === normalize(f.nome);
    }));

    // Se houver filtro de fazenda, restringir os fretes ativos APENAS à fazenda clicada
    const fretesAtivos = fazendaFiltro 
      ? fretesSafraAtivos.filter(fr => {
          const fazendaAlvo = calcFazendas.find(f => f.id === fazendaFiltro);
          if (!fazendaAlvo) return false;
          if (fr.fazenda_id) return String(fr.fazenda_id) === String(fazendaFiltro);
          if (!fr.origem) return false;
          const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          const stripFazenda = (s: string) => s.replace(/^fazenda\s+/i, "").trim();
          
          const origemLimpa = stripFazenda(normalize(fr.origem.split("-")[0]));
          const fazendaLimpa = stripFazenda(normalize(fazendaAlvo.nome));
          
          return origemLimpa === fazendaLimpa;
        })
      : fretesSafraAtivos;

    fretesAtivos.forEach(fr => {
      const destino = fr.destino || "Outros";
      if (!filiaisMap.has(destino)) {
        filiaisMap.set(destino, { id: destino, nome: destino, quantidadeRecebida: 0, quantidadeSacasRecebida: 0, viagens: 0 });
      }
      const filial = filiaisMap.get(destino)!;
      const ton = Number(fr.toneladas) || (Number((fr as any).peso_liquido) / 1000) || 0;
      filial.quantidadeRecebida += ton;
      filial.quantidadeSacasRecebida += (Number(fr.quantidade_sacas) || 0);
      filial.viagens += 1;
    });

    const calcFiliais = Array.from(filiaisMap.values()).sort((a, b) => b.quantidadeRecebida - a.quantidadeRecebida);

    // Evolução Temporal (Agrupamento por Semana)
    const evolucaoMap = new Map<number, { mes: string, toneladas: number, sacas: number, fretes: number, timestamp: number }>();
    
    fretesAtivos.forEach(fr => {
        if (!fr.data_frete) return;
        const date = new Date(fr.data_frete);
        
        // Encontrar o início da semana (Segunda-feira)
        const day = date.getDay() || 7;
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - day + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const timestamp = startOfWeek.getTime();
        
        const dia = String(startOfWeek.getDate()).padStart(2, '0');
        const mesStr = startOfWeek.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        const mesFormatado = mesStr.charAt(0).toUpperCase() + mesStr.slice(1);
        const label = `${dia}/${mesFormatado}`; // Ex: 05/Jan

        const ton = Number(fr.toneladas) || (Number((fr as any).peso_liquido) / 1000) || 0;
        if (!evolucaoMap.has(timestamp)) evolucaoMap.set(timestamp, { mes: label, toneladas: 0, sacas: 0, fretes: 0, timestamp });
        evolucaoMap.get(timestamp)!.toneladas += ton;
        evolucaoMap.get(timestamp)!.sacas += Number(fr.quantidade_sacas) || 0;
        evolucaoMap.get(timestamp)!.fretes += 1;
    });
    
    const evolucaoTemporalData = Array.from(evolucaoMap.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(({ mes, toneladas, sacas, fretes }) => ({ mes, toneladas, sacas, fretes }));

    // Motoristas Desempenho
    const motoristasListMap = new Map<string, { nome: string, viagens: number, toneladas: number, valorFrete: number }>();
    fretesAtivos.forEach(fr => {
        const nome = (fr.proprietario_nome || fr.motorista_nome || "Desconhecido").trim();
        if (!nome || nome === "Desconhecido") return;
        
        if (!motoristasListMap.has(nome)) motoristasListMap.set(nome, { nome, viagens: 0, toneladas: 0, valorFrete: 0 });
        const m = motoristasListMap.get(nome)!;
        
        const ton = Number(fr.toneladas) || (Number((fr as any).peso_liquido) / 1000) || 0;
        const valorFrete = Number(fr.receita) || (ton * Number(fr.valor_por_tonelada)) || 0;
        
        m.viagens += 1;
        m.toneladas += ton;
        m.valorFrete += valorFrete;
    });
    const calcMotoristasDesempenho = Array.from(motoristasListMap.values()).sort((a, b) => b.viagens - a.viagens);

    // Motorista Destaque (ignorando Transportadora Contelli)
    const calcTopMotorista = calcMotoristasDesempenho.find(m => !m.nome.toLowerCase().includes("contelli")) || { nome: "N/A", viagens: 0 };

    return { mockFazendas: calcFazendas, mockFiliais: calcFiliais, motoristasDesempenho: calcMotoristasDesempenho, evolucaoTemporalData, topMotorista: calcTopMotorista };
  }, [fazendas, fretes, safraSelecionada, fazendaFiltro]);

  // Derived metrics
  const kpiFazendas = fazendaFiltro 
    ? mockFazendas.filter(f => f.id === fazendaFiltro)
    : mockFazendas;

  const totalProducao = kpiFazendas.reduce((acc, f) => acc + f.producaoToneladas, 0);
  const totalSacas = kpiFazendas.reduce((acc, f) => acc + f.producaoSacas, 0);
  const totalGastoFretes = kpiFazendas.reduce((acc, f) => acc + f.gastoFretes, 0);
  const totalViagens = kpiFazendas.reduce((acc, f) => acc + f.numeroViagens, 0);
  const totalCustos = kpiFazendas.reduce((acc, f) => acc + f.custosOperacionais, 0);
  
  const maiorFazenda = mockFazendas.length > 0 
    ? mockFazendas.reduce((max, f) => f.producaoToneladas > max.producaoToneladas ? f : max, mockFazendas[0])
    : { nome: "N/A", producaoToneladas: 0, producaoSacas: 0 };
    
  const maiorDestino = mockFiliais.length > 0
    ? mockFiliais.reduce((max, f) => f.quantidadeRecebida > max.quantidadeRecebida ? f : max, mockFiliais[0])
    : { nome: "N/A", quantidadeRecebida: 0, viagens: 0 };

  const carregarLogoBase64 = async () => {
    try {
      const response = await fetch("/principal.png");
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return base64;
    } catch {
      return null;
    }
  };

  const exportarPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    // ============================================================
    //  HELPER: Rodapé em todas as páginas
    // ============================================================
    const addFooter = () => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
        
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("Transcontelli Logística", margin, pageHeight - 13);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 13, { align: "center" });
        doc.text("Documento Gerencial Interno", pageWidth - margin, pageHeight - 13, { align: "right" });
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Este relatório foi gerado automaticamente e contém informações confidenciais da operação.", pageWidth / 2, pageHeight - 8, { align: "center" });
      }
    };

    // ============================================================
    //  HELPER: Header da página
    // ============================================================
    const addHeader = (titulo: string, subtitulo: string): number => {
      // Texto "Transportadora Contelli" no lugar da imagem
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("TRANSPORTADORA CONTELLI", pageWidth / 2, 12, { align: "center" });
      
      doc.setFontSize(17);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(titulo, pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(subtitulo, pageWidth / 2, 26, { align: "center" });
      doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, pageWidth / 2, 31, { align: "center" });

      // Linha separadora do header
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, 34, pageWidth - margin, 34);
      
      return 39; // y de início do conteúdo
    };

    // ============================================================
    //  HELPER: Mini KPI card
    // ============================================================
    const drawKpiCard = (x: number, y: number, w: number, label: string, value: string, bgColor: number[], borderColor: number[], valueColor: number[]) => {
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(x, y, w, 16, 2, 2, "FD");
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(label, x + 3, y + 5.5);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
      doc.text(value, x + 3, y + 12.5);
    };

    // ============================================================
    //  PÁGINA 1 — Resumo Executivo + Desempenho por Fazenda
    // ============================================================
    let y = addHeader("Relatório de Safra e Operações", `Safra ${safraSelecionada}${fazendaFiltro ? ` — Filtro: ${mockFazendas.find(f => f.id === fazendaFiltro)?.nome || ""}` : ""}`);

    // KPI Cards (4 cards em linha)
    const cardW = (contentWidth - 9) / 4;
    drawKpiCard(margin, y, cardW, "PRODUÇÃO TOTAL", `${totalProducao.toLocaleString()} t`, [240, 253, 244], [187, 247, 208], [22, 101, 52]);
    drawKpiCard(margin + cardW + 3, y, cardW, "TOTAL DE FRETES", `${totalViagens} fretes`, [239, 246, 255], [191, 219, 254], [30, 64, 175]);
    drawKpiCard(margin + (cardW + 3) * 2, y, cardW, "GASTO C/ FRETES", `R$ ${totalGastoFretes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, [255, 247, 237], [253, 186, 116], [154, 52, 18]);
    drawKpiCard(margin + (cardW + 3) * 3, y, cardW, "CUSTOS TOTAIS", `R$ ${totalCustos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, [254, 242, 242], [252, 165, 165], [153, 27, 27]);
    y += 20;

    // Destaques
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Maior Produtora:", margin + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${maiorFazenda.nome} (${maiorFazenda.producaoToneladas.toLocaleString()}t)`, margin + 30, y + 6);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Principal Destino:", margin + 4, y + 11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${maiorDestino.nome} (${maiorDestino.viagens} viagens)`, margin + 30, y + 11);

    const shortName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
    };

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Motorista Destaque:", contentWidth / 2 + margin, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${shortName(topMotorista.nome)} (${topMotorista.viagens} viagens)`, contentWidth / 2 + margin + 28, y + 6);
    y += 20;

    // Tabela de Fazendas
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Desempenho por Fazenda", margin, y);
    y += 2;

    autoTable(doc, {
      startY: y + 3,
      head: [["#", "Fazenda", "Produção (t)", "Sacas", "Fretes", "Gasto Frete", "R$/ton"]],
      body: mockFazendas.map((f, i) => {
        const fpt = f.producaoToneladas > 0 ? f.gastoFretes / f.producaoToneladas : 0;
        return [
          i + 1,
          f.nome,
          f.producaoToneladas.toLocaleString(),
          f.producaoSacas.toLocaleString(),
          f.numeroViagens,
          `R$ ${f.gastoFretes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          fpt > 0 ? `R$ ${fpt.toFixed(2)}` : "-"
        ];
      }),
      headStyles: { fillColor: [37, 99, 235], fontSize: 8, fontStyle: "bold", halign: "center", cellPadding: 2.5 },
      bodyStyles: { fontSize: 8, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 42 },
        2: { halign: "right", cellWidth: 24 },
        3: { halign: "right", cellWidth: 22 },
        4: { halign: "center", cellWidth: 16 },
        5: { halign: "right", cellWidth: 32 },
        6: { halign: "right", cellWidth: 22 },
      },
      styles: { cellPadding: 2.5, overflow: "linebreak" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
      tableWidth: "auto",
    });

    // ============================================================
    //  PÁGINA 2 — Destinos + Motoristas
    // ============================================================
    doc.addPage();
    y = addHeader("Relatório de Safra e Operações", `Safra ${safraSelecionada} — Destinos & Motoristas`);

    // Filiais / Destinos
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Distribuição por Destino (Filiais)", margin, y);

    autoTable(doc, {
      startY: y + 5,
      head: [["#", "Filial / Destino", "Volume Recebido (t)", "Sacas", "Nº de Fretes"]],
      body: mockFiliais.map((f, i) => [
        i + 1,
        f.nome,
        f.quantidadeRecebida.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
        f.quantidadeSacasRecebida.toLocaleString(),
        f.viagens
      ]),
      headStyles: { fillColor: [37, 99, 235], fontSize: 8, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 8, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 65 },
        2: { halign: "right", cellWidth: 35 },
        3: { halign: "right", cellWidth: 30 },
        4: { halign: "center", cellWidth: 25 },
      },
      styles: { cellPadding: 2.5, overflow: "linebreak" },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      margin: { left: margin, right: margin },
      tableWidth: "auto",
    });

    // Motoristas
    const autoTableDoc = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
    let yMotoristas = (autoTableDoc.lastAutoTable?.finalY ?? y) + 15;

    // Se não cabe, nova página
    if (yMotoristas > pageHeight - 60) {
      doc.addPage();
      yMotoristas = addHeader("Relatório de Safra e Operações", `Safra ${safraSelecionada} — Desempenho por Motorista`);
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Desempenho por Motorista / Transportadora", margin, yMotoristas);

    autoTable(doc, {
      startY: yMotoristas + 5,
      head: [["#", "Motorista / Transportadora", "Viagens", "Carga (t)", "Frete Gerado (R$)"]],
      body: motoristasDesempenho.slice(0, 40).map((m, i) => [
        i + 1,
        shortName(m.nome),
        m.viagens,
        m.toneladas.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
        `R$ ${m.valorFrete.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      ]),
      headStyles: { fillColor: [249, 115, 22], fontSize: 8, fontStyle: "bold", halign: "center" },
      bodyStyles: { fontSize: 8, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 55 },
        2: { halign: "center", cellWidth: 25 },
        3: { halign: "right", cellWidth: 35 },
        4: { halign: "right", cellWidth: 40 },
      },
      styles: { cellPadding: 2.5, overflow: "linebreak" },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      margin: { left: margin, right: margin },
      tableWidth: "auto",
    });

    // Aplicar rodapé em todas as páginas
    addFooter();

    doc.save(`Relatorio_Safra_${safraSelecionada.replace("/", "_")}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Calculando relatórios da safra...</p>
      </div>
    );
  }

  if (mockFazendas.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Safra & Produção</h1>
            <p className="text-muted-foreground mt-1">Análise completa de resultados, custos e fretes por fazenda</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={safraSelecionada} onValueChange={setSafraSelecionada}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Selecione a Safra" />
              </SelectTrigger>
              <SelectContent>
                {safras.map(s => (
                  <SelectItem key={s} value={s}>{s === "Todas" ? "Todas as Safras" : `Safra ${s}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card className="border-dashed flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum dado encontrado para a safra selecionada.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Safra & Produção</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Análise completa de resultados, custos e fretes por fazenda</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full lg:w-auto">
          {fazendaFiltro && (
            <Button 
              variant="outline" 
              onClick={() => setFazendaFiltro(null)} 
              className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 gap-2 h-10"
            >
              <X className="h-4 w-4" />
              <span className="truncate max-w-[150px] sm:max-w-none">Limpar: {mockFazendas.find(f => f.id === fazendaFiltro)?.nome}</span>
            </Button>
          )}
          <Select value={safraSelecionada} onValueChange={setSafraSelecionada}>
            <SelectTrigger className="w-full sm:w-[200px] bg-background">
              <SelectValue placeholder="Selecione a Safra" />
            </SelectTrigger>
            <SelectContent>
              {safras.map(s => (
                <SelectItem key={s} value={s}>{s === "Todas" ? "Todas as Safras" : `Safra ${s}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportarPDF} className="gap-2 shadow-sm">
            <Download className="h-4 w-4" />
            Emitir PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 border-l-4 border-l-green-500">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Produzido</p>
                <div className="mt-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-500">
                    {totalProducao.toLocaleString()} <span className="text-xs sm:text-base font-medium text-green-600/70">t</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-green-600/70 font-medium">
                    {totalSacas.toLocaleString()} sc
                  </p>
                </div>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
                <Sprout className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 border-l-4 border-l-blue-500">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Fretes</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <h2 className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-500">{totalViagens}</h2>
                </div>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 border-l-4 border-l-orange-500">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Gasto c/ Fretes</p>
                <div className="mt-1">
                  <h2 className="text-sm sm:text-2xl font-bold text-orange-700 dark:text-orange-500 truncate">
                    R$ {totalGastoFretes.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </h2>
                </div>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-xl">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 border-l-4 border-l-red-500">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Custos Totais</p>
                <div className="mt-1">
                  <h2 className="text-sm sm:text-2xl font-bold text-red-700 dark:text-red-500 truncate">
                    R$ {totalCustos.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </h2>
                </div>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-xl">
                <Landmark className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Destaques e Evolução Temporal */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Gráfico de Evolução Temporal (Ocupa 2 colunas) */}
        <Card className="md:col-span-2 shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução da Colheita
            </CardTitle>
            <CardDescription>
              Volume transportado ao longo do tempo {fazendaFiltro ? (
                <span>(<strong className="text-foreground font-semibold">{mockFazendas.find(f => f.id === fazendaFiltro)?.nome}</strong>)</span>
              ) : "(Geral)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {evolucaoTemporalData.length > 0 ? (
              <div className="h-[200px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolucaoTemporalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorToneladas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis dataKey="mes" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}
                      formatter={(value: number, name: string, props: any) => [<strong key="v" className="text-[14px]">{value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} t / {Number(props.payload.sacas).toLocaleString("pt-BR")} sc</strong>, "Produção"]}
                    />
                    <Area type="monotone" dataKey="toneladas" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorToneladas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Dados insuficientes para evolução temporal.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Destaques (Ocupa 1 coluna) */}
        <Card className="shadow-sm border-border/50 flex flex-col justify-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Destaques da Safra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div>
              <p className="text-sm text-muted-foreground">Maior Produtora</p>
              <p className="text-lg font-bold truncate" title={maiorFazenda.nome}>{maiorFazenda.nome}</p>
              <p className="text-xs text-green-600 font-medium">
                {maiorFazenda.producaoToneladas.toLocaleString()}t / {maiorFazenda.producaoSacas.toLocaleString()}sc
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Principal Destino</p>
              <p className="text-lg font-bold truncate" title={maiorDestino.nome}>{maiorDestino.nome}</p>
              <p className="text-xs text-blue-600 font-medium">{maiorDestino.viagens} viagens recebidas</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Motorista Destaque</p>
              <p className="text-lg font-bold truncate" title={topMotorista.nome}>{topMotorista.nome}</p>
              <p className="text-xs text-orange-600 font-medium">{topMotorista.viagens} viagens realizadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas Detalhadas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 sm:mt-8">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 rounded-lg">
          <TabsTrigger value="geral" className="py-2 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <span className="hidden sm:inline">Visão Geral (Gráficos)</span>
            <span className="sm:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="fazendas" className="py-2 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            Fazendas
          </TabsTrigger>
          <TabsTrigger value="fretes" className="py-2 sm:py-2.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
            <span className="hidden sm:inline">Fretes & Destinos</span>
            <span className="sm:hidden">Fretes</span>
          </TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL COM GRÁFICOS */}
        <TabsContent value="geral" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">Produção por Fazenda (Toneladas)</CardTitle>
                  <CardDescription>Volume (t) por fazenda. Clique em uma barra para filtrar.</CardDescription>
                </div>
                {fazendaFiltro && (
                  <Button variant="ghost" size="sm" onClick={() => setFazendaFiltro(null)} className="h-8 px-2 text-muted-foreground hover:text-foreground">
                    Limpar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockFazendas} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="nome" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" />
                    <YAxis />
                    <RechartsTooltip 
                      cursor={{fill: 'transparent'}} 
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}
                      formatter={(value: number, name: string, props: any) => [<strong key="v" className="text-[14px]">{value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} t / {Number(props.payload.producaoSacas).toLocaleString("pt-BR")} sc</strong>, "Produção"]}
                    />
                    <Bar 
                      dataKey="producaoToneladas" 
                      fill="#22c55e" 
                      radius={[4, 4, 0, 0]} 
                      name="Toneladas"
                      onClick={(data) => setFazendaFiltro(prev => prev === data.id ? null : data.id)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {mockFazendas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={fazendaFiltro === entry.id ? "#16a34a" : (fazendaFiltro ? "#bbf7d0" : "#22c55e")} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Destino</CardTitle>
                <CardDescription>Volume (t) direcionado para cada filial</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockFiliais}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="quantidadeRecebida"
                      nameKey="nome"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {mockFiliais.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}
                      formatter={(value: number, name: string, props: any) => [<strong key="v" className="text-[14px]">{value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} t / {Number(props.payload.quantidadeSacasRecebida).toLocaleString("pt-BR")} sc</strong>, "Volume"]}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* VISÃO FAZENDAS (COMPLETAMENTE DETALHADA) */}
        <TabsContent value="fazendas" className="mt-6 animate-in fade-in slide-in-from-bottom-4">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Comparativo Analítico de Fazendas</CardTitle>
              <CardDescription>Análise detalhada de performance, volume e custos logísticos</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile: Cards */}
              <div className="space-y-3 md:hidden">
                {mockFazendas.map((fazenda) => {
                  const fretePorTon = fazenda.producaoToneladas > 0 ? fazenda.gastoFretes / fazenda.producaoToneladas : 0;
                  const mediaFretePorTon = totalProducao > 0 ? totalGastoFretes / totalProducao : 0;
                  const eficienciaBoa = fretePorTon > 0 && fretePorTon <= (mediaFretePorTon || 100);
                  const maxProducao = Math.max(...mockFazendas.map(f => f.producaoToneladas), 1);

                  return (
                    <div key={fazenda.id} className="border rounded-xl p-4 bg-card space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Sprout className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{fazenda.nome}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3 w-3" /> {fazenda.numeroViagens} viagens
                          </p>
                        </div>
                        {fretePorTon > 0 && (
                          <Badge variant="outline" className={cn(
                            "shrink-0 text-[10px] font-bold border",
                            eficienciaBoa
                              ? "bg-green-100/50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                              : "bg-orange-100/50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                          )}>
                            R$ {fretePorTon.toFixed(2)}/t
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-green-700 dark:text-green-500">{fazenda.producaoToneladas.toLocaleString()} t</span>
                          <span className="text-xs text-muted-foreground">{fazenda.producaoSacas.toLocaleString()} sc</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${(fazenda.producaoToneladas / maxProducao) * 100}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Landmark className="h-3.5 w-3.5 text-red-500/70" />
                          <span className="text-muted-foreground">R$ {fazenda.custosOperacionais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs justify-end">
                          <TrendingUp className="h-3.5 w-3.5 text-orange-500/70" />
                          <span className="font-medium">R$ {fazenda.gastoFretes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: Table */}
              <div className="rounded-xl border overflow-x-auto hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left font-medium text-muted-foreground">
                      <th className="p-4 pl-6">Fazenda</th>
                      <th className="p-4 w-[250px]">Produção</th>
                      <th className="p-4">Custo Operacional</th>
                      <th className="p-4">Gasto c/ Fretes</th>
                      <th className="p-4 pr-6 text-right">Eficiência (Frete/t)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-card">
                    {mockFazendas.map((fazenda) => {
                      const fretePorTon = fazenda.producaoToneladas > 0 ? fazenda.gastoFretes / fazenda.producaoToneladas : 0;
                      const mediaFretePorTon = totalProducao > 0 ? totalGastoFretes / totalProducao : 0;
                      const eficienciaBoa = fretePorTon > 0 && fretePorTon <= (mediaFretePorTon || 100);
                      const maxProducao = Math.max(...mockFazendas.map(f => f.producaoToneladas), 1);
                      
                      return (
                        <tr key={fazenda.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Sprout className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground text-base">{fazenda.nome}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Truck className="h-3 w-3" /> {fazenda.numeroViagens} viagens
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-end text-sm">
                                <span className="font-bold text-green-700 dark:text-green-500">
                                  {fazenda.producaoToneladas.toLocaleString()} t
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {fazenda.producaoSacas.toLocaleString()} sc
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 rounded-full transition-all duration-1000" 
                                  style={{ width: `${(fazenda.producaoToneladas / maxProducao) * 100}%` }} 
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Landmark className="h-4 w-4 text-purple-500/70" />
                              <span className="font-medium text-muted-foreground">R$ {fazenda.custosOperacionais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-orange-500/70" />
                              <span className="font-medium text-foreground">R$ {fazenda.gastoFretes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            </div>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            {fretePorTon > 0 ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <Badge variant="outline" className={cn(
                                  "ml-auto flex w-fit font-bold border",
                                  eficienciaBoa 
                                    ? "bg-green-100/50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" 
                                    : "bg-orange-100/50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                                )}>
                                  R$ {fretePorTon.toFixed(2)} / t
                                </Badge>
                                <span className={cn(
                                  "text-[10px] uppercase tracking-wider font-semibold",
                                  eficienciaBoa ? "text-green-600/70" : "text-orange-600/70"
                                )}>
                                  {eficienciaBoa ? "Abaixo da Média" : "Acima da Média"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">S/ Fretes</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VISÃO FRETES */}
        <TabsContent value="fretes" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <Card>
            <CardHeader>
              <CardTitle>Recepção por Filial</CardTitle>
              <CardDescription>Resumo de chegadas em cada destino</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockFiliais.map(filial => (
                  <div key={filial.id} className="border rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 bg-card">
                    <Package className="h-8 w-8 text-blue-500 mb-2" />
                    <h3 className="font-semibold text-lg leading-tight">{filial.nome}</h3>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{filial.quantidadeRecebida.toLocaleString()} t / {filial.quantidadeSacasRecebida.toLocaleString()} sc</span>
                      <span>•</span>
                      <span>{filial.viagens} fretes</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Desempenho por Motorista</CardTitle>
              <CardDescription>Ranking de viagens, volume transportado e frete gerado</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile: Cards */}
              <div className="space-y-3 md:hidden">
                {motoristasDesempenho.slice(0, 50).map((motorista, index) => (
                  <div key={index} className="border rounded-xl p-4 bg-card space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{motorista.nome}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 font-medium text-xs">
                        {motorista.viagens} viagens
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Package className="h-3.5 w-3.5 text-blue-500/70" />
                        <span className="font-bold text-blue-700 dark:text-blue-500">{motorista.toneladas.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} t</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs justify-end">
                        <TrendingUp className="h-3.5 w-3.5 text-green-500/70" />
                        <span className="font-bold text-green-700 dark:text-green-500">R$ {motorista.valorFrete.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="rounded-xl border overflow-x-auto hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left font-medium text-muted-foreground">
                      <th className="p-4 pl-6">Motorista / Transportadora</th>
                      <th className="p-4">Viagens</th>
                      <th className="p-4">Carga Transportada</th>
                      <th className="p-4 pr-6 text-right">Frete Gerado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-card">
                    {motoristasDesempenho.slice(0, 50).map((motorista, index) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                              <User className="h-4 w-4 text-orange-600" />
                            </div>
                            <span className="font-semibold text-foreground text-base">{motorista.nome}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="font-medium bg-secondary text-secondary-foreground hover:bg-secondary">
                            {motorista.viagens} viagens
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-500/70" />
                            <span className="font-bold text-blue-700 dark:text-blue-500">{motorista.toneladas.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} t</span>
                          </div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500/70" />
                            <span className="font-bold text-green-700 dark:text-green-500">R$ {motorista.valorFrete.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
