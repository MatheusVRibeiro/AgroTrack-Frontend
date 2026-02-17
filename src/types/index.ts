export type Role = "admin" | "operador" | "motorista";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Caminhao {
  id: string;
  placa: string;
  placa_carreta?: string | null;
  modelo: string;
  ano_fabricacao: number | string;
  status: "disponivel" | "em_viagem" | "em_manutencao" | "inativo";
  motorista_fixo_id?: string | null;
  capacidade_toneladas: number;
  km_atual: number;
  tipo_combustivel: "DIESEL" | "GASOLINA" | "ETANOL" | "GNV";
  tipo_veiculo: "BITREM" | "CARRETA" | "TRUCK" | "TOCO";
  renavam?: string | null;
  chassi?: string | null;
  registro_antt?: string | null;
  validade_seguro?: string | null;
  validade_licenciamento?: string | null;
  proprietario_tipo: "PROPRIO" | "TERCEIRO" | "AGREGADO";
  ultima_manutencao_data?: string | null;
  proxima_manutencao_km?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CriarCaminhaoPayload {
  id?: string;
  placa: string;
  placa_carreta?: string;
  modelo: string;
  ano_fabricacao: number | string;
  capacidade_toneladas: number;
  tipo_veiculo: "BITREM" | "CARRETA" | "TRUCK" | "TOCO";
  status?: "disponivel" | "em_viagem" | "em_manutencao" | "inativo";
  motorista_fixo_id?: string;
  km_atual?: number;
  tipo_combustivel?: "DIESEL" | "GASOLINA" | "ETANOL" | "GNV";
  renavam?: string;
  chassi?: string;
  registro_antt?: string;
  validade_seguro?: string;
  validade_licenciamento?: string;
  proprietario_tipo?: "PROPRIO" | "TERCEIRO" | "AGREGADO";
  ultima_manutencao_data?: string;
  proxima_manutencao_km?: number;
}

export interface Motorista {
    codigo_motorista: string;
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  cnh: string;
  cnh_validade: string;
  cnh_categoria?: "A" | "B" | "C" | "D" | "E";
  status: "ativo" | "inativo" | "ferias";
  tipo: "proprio" | "terceirizado" | "agregado";
  receita_gerada: number;
  viagens_realizadas: number;
  // data_admissao removido
  // data_desligamento removido
  caminhao_atual?: string;
  endereco?: string;
  veiculo_id?: string | null;
  // Dados Bancários
  tipo_pagamento?: "pix" | "transferencia_bancaria";
  chave_pix_tipo?: "cpf" | "email" | "telefone" | "aleatoria" | "cnpj";
  chave_pix?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: "corrente" | "poupanca" | null;
  created_at?: string;
  updated_at?: string;
}

export type FreteStatus = "em_transito" | "concluido" | "pendente" | "cancelado";

export interface Frete {
  id: string;
  origem: string;
  destino: string;
  motorista_id: string;
  motorista_nome: string;
  caminhao_id: string;
  caminhao_placa: string;
  fazenda_id?: string | null;
  fazenda_nome?: string | null;
  mercadoria: string;
  mercadoria_id?: string | null;
  variedade?: string | null;
  data_frete: string; // ISO date string
  quantidade_sacas: number;
  toneladas: number;
  valor_por_tonelada: number;
  receita: number;
  custos: number;
  resultado: number;
  pagamento_id?: string | null;
  ticket?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CriarFretePayload {
  id?: string;
  origem: string;
  destino: string;
  motorista_id: string;
  motorista_nome: string;
  caminhao_id: string;
  caminhao_placa: string;
  fazenda_id?: string;
  fazenda_nome?: string;
  mercadoria: string;
  mercadoria_id?: string;
  variedade?: string;
  data_frete: string;
  quantidade_sacas: number;
  toneladas: number;
  valor_por_tonelada: number;
  receita?: number;
  custos?: number;
  resultado?: number;
  ticket?: string;
  pagamento_id?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message?: string;
  // HTTP status code when available (useful for service-to-UI mapping)
  status?: number;
}

export interface Fazenda {
  id: string;
  codigo_fazenda: string;
  fazenda: string;
  localizacao?: string | null;
  proprietario?: string | null;
  mercadoria: string;
  variedade?: string | null;
  safra?: string | null;
  preco_por_tonelada?: number | null;
  peso_medio_saca?: number | null;
  total_sacas_carregadas?: number | null;
  total_toneladas?: number | null;
  faturamento_total?: number | null;
  ultimo_frete?: string | null;
  ultimo_frete_data?: string | null;
  ultimo_frete_motorista?: string | null;
  ultimo_frete_placa?: string | null;
  ultimo_frete_origem?: string | null;
  ultimo_frete_destino?: string | null;
  total_custos_operacionais?: number | null;
  lucro_liquido?: number | null;
  total_fretes_realizados?: number | null;
  colheita_finalizada?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CriarFazendaPayload {
  id?: string;
  fazenda: string;
  localizacao?: string;
  proprietario?: string;
  mercadoria: string;
  variedade?: string;
  safra?: string;
  preco_por_tonelada?: number;
  peso_medio_saca?: number;
  total_sacas_carregadas?: number;
  total_toneladas?: number;
  faturamento_total?: number;
  ultimo_frete?: string;
  colheita_finalizada?: boolean;
}

export interface Custo {
  id: string;
  frete_id: string;
  tipo: "combustivel" | "pedagio" | "manutencao" | "outros";
  descricao: string;
  valor: number;
  data: string;
  comprovante?: boolean;
  observacoes?: string;
  motorista: string;
  caminhao: string;
  rota: string;
  litros?: number | null;
  tipo_combustivel?: "diesel" | "gasolina" | "etanol" | "gnv" | null;
  created_at: string;
  updated_at: string;
}

export interface CriarCustoPayload {
  id?: string;
  frete_id: string;
  tipo: "combustivel" | "pedagio" | "manutencao" | "outros";
  descricao: string;
  valor: number;
  data: string;
  comprovante?: boolean;
  observacoes?: string;
  litros?: number;
  tipo_combustivel?: "diesel" | "gasolina" | "etanol" | "gnv";
}

export interface Pagamento {
  id: string;
  motorista_id: string;
  motorista_nome: string;
  periodo_fretes: string;
  quantidade_fretes: number;
  fretes_incluidos?: string | null;
  total_toneladas: number;
  valor_por_tonelada: number;
  valor_total: number;
  data_pagamento: string;
  status: "pendente" | "processando" | "pago" | "cancelado";
  metodo_pagamento: "pix" | "transferencia_bancaria";
  comprovante_nome?: string | null;
  comprovante_url?: string | null;
  comprovante_data_upload?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CriarPagamentoPayload {
  id?: string;
  motorista_id: string;
  motorista_nome: string;
  periodo_fretes: string;
  quantidade_fretes: number;
  fretes_incluidos?: string;
  total_toneladas: number;
  valor_por_tonelada: number;
  valor_total: number;
  data_pagamento: string;
  status?: "pendente" | "processando" | "pago" | "cancelado";
  metodo_pagamento: "pix" | "transferencia_bancaria";
  comprovante_nome?: string;
  comprovante_url?: string;
  observacoes?: string;
}

export interface AtualizarPagamentoPayload {
  motorista_id?: string;
  motorista_nome?: string;
  periodo_fretes?: string;
  quantidade_fretes?: number;
  fretes_incluidos?: string;
  total_toneladas?: number;
  valor_por_tonelada?: number;
  valor_total?: number;
  data_pagamento?: string;
  status?: "pendente" | "processando" | "pago" | "cancelado";
  metodo_pagamento?: "pix" | "transferencia_bancaria";
  comprovante_nome?: string;
  comprovante_url?: string;
  observacoes?: string;
}
