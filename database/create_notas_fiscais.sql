-- ============================================================================
-- Tabela: notas_fiscais
-- Descrição: Gerencia notas fiscais de transporte vinculadas aos fretes
-- Relacionamentos: frete_id (FK -> fretes), motorista_id (FK -> motoristas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id VARCHAR(20) PRIMARY KEY COMMENT 'ID da nota fiscal (ex: NF-2026-001)',
  frete_id VARCHAR(20) NOT NULL COMMENT 'FK: Frete vinculado',
  motorista_id VARCHAR(20) NOT NULL COMMENT 'FK: Motorista responsável',
  numero_nf INT NOT NULL COMMENT 'Número sequencial da nota fiscal',
  serie_nf VARCHAR(5) NOT NULL DEFAULT '1' COMMENT 'Série da NF',
  data_emissao DATE NOT NULL COMMENT 'Data de emissão',
  data_saida DATETIME COMMENT 'Data/hora de saída da fazenda',
  data_entrega DATETIME COMMENT 'Data/hora de entrega no destino',
  
  -- Detalhes da mercadoria
  mercadoria VARCHAR(100) NOT NULL COMMENT 'Tipo de mercadoria transportada',
  quantidade_sacas INT NOT NULL COMMENT 'Quantidade de sacas',
  toneladas DECIMAL(10, 2) NOT NULL COMMENT 'Peso total em toneladas',
  
  -- Origem e Destino
  origem VARCHAR(150) NOT NULL COMMENT 'Local de origem (fazenda)',
  destino VARCHAR(150) NOT NULL COMMENT 'Local de destino (secador/filial)',
  
  -- Valores
  valor_bruto DECIMAL(12, 2) NOT NULL COMMENT 'Valor bruto do frete',
  icms_aliquota DECIMAL(5, 2) DEFAULT 18.00 COMMENT 'Alíquota de ICMS (%)',
  icms_valor DECIMAL(12, 2) DEFAULT 0 COMMENT 'Valor do ICMS',
  valor_liquido DECIMAL(12, 2) COMMENT 'Valor líquido (bruto - impostos)',
  
  -- Status e documentação
  status ENUM('emitida', 'cancelada', 'devolvida') NOT NULL DEFAULT 'emitida' COMMENT 'Status da NF',
  chave_acesso VARCHAR(44) COMMENT 'Chave de acesso da NF-e',
  
  -- Comprovantes
  arquivo_pdf VARCHAR(255) COMMENT 'Caminho do arquivo PDF',
  arquivo_xml VARCHAR(255) COMMENT 'Caminho do arquivo XML (NF-e)',
  
  -- Observações
  observacoes TEXT COMMENT 'Observações ou informações adicionais',
  
  -- Rastreamento
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do registro',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última atualização',
  
  -- Índices e Constraints
  FOREIGN KEY (frete_id) REFERENCES fretes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY unique_numero_serie (numero_nf, serie_nf),
  INDEX idx_frete_id (frete_id),
  INDEX idx_motorista_id (motorista_id),
  INDEX idx_data_emissao (data_emissao),
  INDEX idx_status (status),
  INDEX idx_chave_acesso (chave_acesso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Notas fiscais de transporte';

-- ============================================================================
-- DADOS DEMO: 5 notas fiscais vinculadas aos fretes existentes
-- ============================================================================

INSERT INTO notas_fiscais (
  id, frete_id, motorista_id, numero_nf, serie_nf, data_emissao, 
  data_saida, data_entrega, mercadoria, quantidade_sacas, toneladas, 
  origem, destino, valor_bruto, icms_aliquota, icms_valor, valor_liquido, 
  status, chave_acesso, arquivo_pdf, observacoes
) VALUES
(
  'NF-2026-001',
  'FRETE-2026-001',
  '1',
  '1001',
  '1',
  '2026-01-20',
  '2026-01-20 06:30:00',
  '2026-01-20 14:45:00',
  'Amendoim em Casca',
  450,
  11.25,
  'Fazenda Santa Maria',
  'Secador Central - Filial 1',
  7600.00,
  18.00,
  1368.00,
  6232.00,
  'emitida',
  '35260193151816000160550010001001001234567890',
  '/docs/nf/NF-2026-001.pdf',
  'Frete realizado conforme contrato. Carga verificada.'
),
(
  'NF-2026-002',
  'FRETE-2026-002',
  '2',
  '1002',
  '1',
  '2026-01-18',
  '2026-01-18 07:00:00',
  '2026-01-18 15:20:00',
  'Amendoim Descascado',
  380,
  9.50,
  'Fazenda Boa Esperança',
  'Secador Central - Filial 2',
  7600.00,
  18.00,
  1368.00,
  6232.00,
  'emitida',
  '35260193151816000160550010001002001234567891',
  '/docs/nf/NF-2026-002.pdf',
  'Produto de qualidade premium. Entrega no horário.'
),
(
  'NF-2026-003',
  'FRETE-2026-003',
  '3',
  '1003',
  '1',
  '2026-01-15',
  '2026-01-15 06:00:00',
  '2026-01-15 13:30:00',
  'Amendoim em Casca',
  500,
  12.50,
  'Fazenda Vale Verde',
  'Secador Central - Filial 1',
  7500.00,
  18.00,
  1350.00,
  6150.00,
  'emitida',
  '35260193151816000160550010001003001234567892',
  '/docs/nf/NF-2026-003.pdf',
  'Rota executada sem incidentes.'
),
(
  'NF-2026-004',
  'FRETE-2026-004',
  '4',
  '1004',
  '1',
  '2026-01-12',
  '2026-01-12 08:00:00',
  '2026-01-12 18:15:00',
  'Amendoim Premium',
  300,
  7.50,
  'Fazenda São João',
  'Secador Central - Filial 3',
  7500.00,
  18.00,
  1350.00,
  6150.00,
  'emitida',
  '35260193151816000160550010001004001234567893',
  '/docs/nf/NF-2026-004.pdf',
  'Produto com certificação especial.'
),
(
  'NF-2026-005',
  'FRETE-2026-005',
  '5',
  '1005',
  '1',
  '2026-01-10',
  '2026-01-10 05:30:00',
  '2026-01-10 14:00:00',
  'Amendoim em Casca',
  420,
  10.50,
  'Fazenda Recanto',
  'Secador Central - Filial 2',
  8400.00,
  18.00,
  1512.00,
  6888.00,
  'emitida',
  '35260193151816000160550010001005001234567894',
  '/docs/nf/NF-2026-005.pdf',
  'Frete de retorno com carga completa.'
);

-- ============================================================================
-- TRIGGER: Atualizar ICMS automaticamente
-- ============================================================================

DELIMITER $$

CREATE TRIGGER trg_calcula_icms_nf 
BEFORE INSERT ON notas_fiscais
FOR EACH ROW
BEGIN
  SET NEW.icms_valor = NEW.valor_bruto * (NEW.icms_aliquota / 100);
  SET NEW.valor_liquido = NEW.valor_bruto - NEW.icms_valor;
END$$

CREATE TRIGGER trg_atualiza_icms_nf 
BEFORE UPDATE ON notas_fiscais
FOR EACH ROW
BEGIN
  IF NEW.valor_bruto <> OLD.valor_bruto OR NEW.icms_aliquota <> OLD.icms_aliquota THEN
    SET NEW.icms_valor = NEW.valor_bruto * (NEW.icms_aliquota / 100);
    SET NEW.valor_liquido = NEW.valor_bruto - NEW.icms_valor;
  END IF;
END$$

DELIMITER ;

-- ============================================================================
-- QUERIES ÚTEIS
-- ============================================================================

-- Obter todas as notas fiscais de um frete específico
-- SELECT * FROM notas_fiscais WHERE frete_id = 'FRETE-2026-001';

-- Obter notas fiscais emitidas por um motorista
-- SELECT * FROM notas_fiscais WHERE motorista_id = '1' AND status = 'emitida';

-- Obter notas fiscais por período
-- SELECT * FROM notas_fiscais WHERE data_emissao BETWEEN '2026-01-01' AND '2026-01-31';

-- Total de impostos (ICMS) por período
-- SELECT SUM(icms_valor) as total_icms FROM notas_fiscais WHERE data_emissao BETWEEN '2026-01-01' AND '2026-01-31';

-- Receita líquida após impostos
-- SELECT SUM(valor_liquido) as receita_liquida FROM notas_fiscais WHERE status = 'emitida';

-- Notas fiscais pendentes de documentação
-- SELECT * FROM notas_fiscais WHERE arquivo_pdf IS NULL OR arquivo_xml IS NULL;
