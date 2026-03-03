import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type TipoVisualizacao = "mensal" | "trimestral" | "semestral" | "anual";

interface UsePeriodoFilterProps<T> {
  data: T[];
  getDataField: (item: T) => string; // Função para extrair o campo de data do item
}

export function usePeriodoFilter<T>({ data, getDataField }: UsePeriodoFilterProps<T>) {
  const [tipoVisualizacao, setTipoVisualizacao] = useState<TipoVisualizacao>(() => {
    return (localStorage.getItem("periodo_tipoVisualizacao") as TipoVisualizacao) || "mensal";
  });
  const [selectedPeriodo, setSelectedPeriodo] = useState(() => {
    const salvo = localStorage.getItem("periodo_tipoVisualizacao") || "mensal";
    const hoje = new Date();
    if (salvo === "mensal") return format(hoje, "yyyy-MM");
    if (salvo === "trimestral") return `${hoje.getFullYear()}-T${Math.ceil((hoje.getMonth() + 1) / 3)}`;
    if (salvo === "semestral") return `${hoje.getFullYear()}-S${hoje.getMonth() <= 5 ? 1 : 2}`;
    return String(hoje.getFullYear());
  });

  useEffect(() => {
    localStorage.setItem("periodo_tipoVisualizacao", tipoVisualizacao);
  }, [tipoVisualizacao]);

  // Função auxiliar para parsear datas
  const parseDateBR = (value: unknown) => {
    // Guard robusta contra null, undefined, números, objetos, etc.
    if (value === null || value === undefined) return new Date();
    const str = String(value).trim();
    if (!str || str === "null" || str === "undefined") return new Date();

    // Formato brasileiro: dd/MM/yyyy
    if (str.includes("/")) {
      const parts = str.split("/");
      if (parts.length === 3) {
        const [dia, mes, ano] = parts;
        const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
        return Number.isNaN(d.getTime()) ? new Date() : d;
      }
    }

    // Formato ISO completo: 2026-02-10T03:00:00.000Z ou ISO simples: 2026-02-10
    const date = new Date(str);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  };

  // Extrair períodos disponíveis baseado nos dados reais
  const periodosDisponiveis = useMemo(() => {
    const hoje = new Date();
    let periodoAtual = "";
    if (tipoVisualizacao === "mensal") periodoAtual = format(hoje, "yyyy-MM");
    else if (tipoVisualizacao === "trimestral") periodoAtual = `${hoje.getFullYear()}-T${Math.ceil((hoje.getMonth() + 1) / 3)}`;
    else if (tipoVisualizacao === "semestral") periodoAtual = `${hoje.getFullYear()}-S${hoje.getMonth() <= 5 ? 1 : 2}`;
    else if (tipoVisualizacao === "anual") periodoAtual = String(hoje.getFullYear());

    if (!Array.isArray(data) || data.length === 0) return [periodoAtual];

    const periodos = data.map((item) => {
      const dataStr = getDataField(item);
      const itemDate = parseDateBR(dataStr);
      const anoItem = itemDate.getFullYear();
      const mesItem = itemDate.getMonth() + 1; // 1-12

      if (tipoVisualizacao === "mensal") {
        return `${anoItem}-${String(mesItem).padStart(2, "0")}`;
      } else if (tipoVisualizacao === "trimestral") {
        const trimestreItem = Math.ceil(mesItem / 3);
        return `${anoItem}-T${trimestreItem}`;
      } else if (tipoVisualizacao === "semestral") {
        const semestreItem = mesItem <= 6 ? 1 : 2;
        return `${anoItem}-S${semestreItem}`;
      } else if (tipoVisualizacao === "anual") {
        return String(anoItem);
      }
      return "";
    });

    periodos.push(periodoAtual);

    // Remover duplicatas e ordenar
    const periodosUnicos = Array.from(new Set(periodos)).filter(Boolean).sort();
    return periodosUnicos;
  }, [data, tipoVisualizacao, getDataField]);

  // Filtrar dados por período
  const dadosFiltrados = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data.filter((item) => {
      const dataStr = getDataField(item);
      const itemDate = parseDateBR(dataStr);
      const anoItem = itemDate.getFullYear();
      const mesItem = itemDate.getMonth() + 1; // 1-12

      if (tipoVisualizacao === "mensal") {
        const periodoItem = `${anoItem}-${String(mesItem).padStart(2, "0")}`;
        return periodoItem === selectedPeriodo;
      } else if (tipoVisualizacao === "trimestral") {
        const trimestreItem = Math.ceil(mesItem / 3);
        const periodoItem = `${anoItem}-T${trimestreItem}`;
        return periodoItem === selectedPeriodo;
      } else if (tipoVisualizacao === "semestral") {
        const semestreItem = mesItem <= 6 ? 1 : 2;
        const periodoItem = `${anoItem}-S${semestreItem}`;
        return periodoItem === selectedPeriodo;
      } else if (tipoVisualizacao === "anual") {
        return String(anoItem) === selectedPeriodo;
      }
      return false;
    });
  }, [data, selectedPeriodo, tipoVisualizacao, getDataField]);

  // Formatar label do período para exibição
  const formatPeriodoLabel = (periodo: string) => {
    if (tipoVisualizacao === "mensal") {
      const [ano, mes] = periodo.split("-");
      const nomeMes = format(new Date(parseInt(ano), parseInt(mes) - 1), "MMMM yyyy", { locale: ptBR });
      return nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    } else if (tipoVisualizacao === "trimestral") {
      const [ano, trimestre] = periodo.split("-T");
      return `${trimestre}º Trimestre ${ano}`;
    } else if (tipoVisualizacao === "semestral") {
      const [ano, semestre] = periodo.split("-S");
      return `${semestre}º Semestre ${ano}`;
    } else if (tipoVisualizacao === "anual") {
      return periodo;
    }
    return periodo;
  };

  // Validar se período selecionado existe nos dados
  useEffect(() => {
    if (periodosDisponiveis.length === 0) return;

    // Se período atual não existe, usar o mais recente (ignorando se tiver vazio)
    if (!periodosDisponiveis.includes(selectedPeriodo) && periodosDisponiveis.length > 0) {
      setSelectedPeriodo(periodosDisponiveis[periodosDisponiveis.length - 1]);
    }
  }, [periodosDisponiveis, selectedPeriodo]);

  // Handler para mudança de tipo de visualização
  const handleTipoChange = (novoTipo: TipoVisualizacao) => {
    setTipoVisualizacao(novoTipo);

    // Resetar período para valor adequado ao tipo
    setTimeout(() => {
      const hoje = new Date();
      let periodoIdeal = "";

      if (novoTipo === "mensal") {
        periodoIdeal = format(hoje, "yyyy-MM");
      } else if (novoTipo === "trimestral") {
        const trimestre = Math.ceil((hoje.getMonth() + 1) / 3);
        periodoIdeal = `${hoje.getFullYear()}-T${trimestre}`;
      } else if (novoTipo === "semestral") {
        const semestre = hoje.getMonth() + 1 <= 6 ? 1 : 2;
        periodoIdeal = `${hoje.getFullYear()}-S${semestre}`;
      } else if (novoTipo === "anual") {
        periodoIdeal = String(hoje.getFullYear());
      }

      setSelectedPeriodo(periodoIdeal);
    }, 0);
  };

  return {
    tipoVisualizacao,
    selectedPeriodo,
    periodosDisponiveis,
    dadosFiltrados,
    formatPeriodoLabel,
    setTipoVisualizacao: handleTipoChange,
    setSelectedPeriodo,
  };
}
