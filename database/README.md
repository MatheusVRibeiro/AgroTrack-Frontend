# Database Schema - RN Logística

Scripts SQL para criação completa do banco de dados do sistema RN Logística.

## 📁 Arquivos

- **`init_database.sql`** - Script master para inicializar todo o banco
- **`create_usuarios.sql`** - Tabela de usuários (autenticação)
- **`create_motoristas.sql`** - Tabela de motoristas
- **`create_frota.sql`** - Tabela de caminhões
- **`create_fazendas.sql`** - Tabela de fazendas
- **`create_fretes.sql`** - Tabela de fretes (operacional)
- **`create_custos.sql`** - Tabela de custos operacionais
- **`create_pagamentos.sql`** - Tabela de pagamentos
- **`create_notas_fiscais.sql`** - Tabela de notas fiscais (documentação)
- **`create_locais_entrega.sql`** - Tabela de locais de entrega (legado)

## 🚀 Como usar

### Opção 1: Script Master (Recomendado)

Execute o script master que criará todas as tabelas na ordem correta:

```bash
mysql -u root -p < database/init_database.sql
```

**Ou dentro do MySQL:**

```sql
SOURCE /caminho/completo/database/init_database.sql;
```

### Opção 2: Executar arquivos individualmente

**IMPORTANTE:** Respeite a ordem de dependências:

```bash
# 1. Usuários (sem dependências)
mysql -u root -p rn_logistica < database/create_usuarios.sql

# 2. Motoristas (sem dependências)
mysql -u root -p rn_logistica < database/create_motoristas.sql

# 3. Frota (depende de motoristas)
mysql -u root -p rn_logistica < database/create_frota.sql

# 4. Fazendas (sem dependências)
mysql -u root -p rn_logistica < database/create_fazendas.sql

# 5. Fretes (depende de motoristas, Frota, fazendas)
mysql -u root -p rn_logistica < database/create_fretes.sql

# 6. Custos (depende de fretes)
mysql -u root -p rn_logistica < database/create_custos.sql

# 7. Pagamentos (depende de motoristas)
mysql -u root -p rn_logistica < database/create_pagamentos.sql

# 8. Notas Fiscais (depende de fretes, motoristas)
mysql -u root -p rn_logistica < database/create_notas_fiscais.sql
```

## 📊 Estrutura do Banco

### Diagrama de Dependências

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   usuarios   │     │  motoristas  │     │   fazendas   │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                     ┌──────┴───────┐            │
                     │              │            │
                ┌────▼────┐    ┌────▼────────────▼───┐
                │  Frota  │    │      fretes         │
                └─────────┘    └────┬────────────────┘
                                    │
                         ┌──────────┴─────────────┐
                         │                        │
                    ┌────▼─────┐         ┌────────▼─────┐         ┌─────────────┐
                    │  custos  │         │  pagamentos  │         │ notas_      │
                    └──────────┘         └──────────────┘         │ fiscais     │
                                                                  └─────────────┘
```

### Tabelas

| Tabela | Descrição | Dependências |
|--------|-----------|--------------|
| **usuarios** | Autenticação e autorização | Nenhuma |
| **motoristas** | Cadastro de motoristas (CNH, dados bancários) | Nenhuma |
| **Frota** | Cadastro de caminhões | motoristas (opcional) |
| **fazendas** | Cadastro de fazendas produtoras | Nenhuma |
| **fretes** | Registro de fretes realizados | motoristas, Frota, fazendas |
| **custos** | Custos operacionais por frete | fretes |
| **pagamentos** | Pagamentos realizados aos motoristas | motoristas |

## 🔑 Dados de Exemplo

Cada tabela vem com **5 registros de exemplo** para facilitar testes:

- **Usuario admin**: `admin@rnlogistica.com` / senha: `Admin@2026`
- **5 Motoristas** com dados completos (CNH, PIX/banco)
- **5 Caminhões** variados (truck, carreta bitrem, vanderleia)
- **5 Fazendas** com produção ativa
- **5 Fretes** concluídos com receitas e custos
- **10 Custos** distribuídos entre os fretes
- **5 Pagamentos** em diferentes status

## ⚙️ Configurações do Banco

```sql
Charset: utf8mb4
Collation: utf8mb4_unicode_ci
Engine: InnoDB
```

## 🔐 Usuário Padrão

```
Email: admin@rnlogistica.com
Senha: Admin@2026
Role: admin
```

**IMPORTANTE:** Altere a senha após primeira instalação!

## 📝 Convenções

- **IDs**: VARCHAR(255) com padrão customizado (ex: `FRETE-2026-001`)
- **Datas**: DATE ou TIMESTAMP conforme necessidade
- **Valores**: DECIMAL(10,2) para precisão financeira
- **Foreign Keys**: RESTRICT (protege dados históricos) ou CASCADE (limpeza automática)
- **Nomenclatura**: snake_case (SQL) ↔ camelCase (TypeScript)

## 🛠️ Próximos Passos

1. **Triggers**: Implementar triggers sugeridos nos arquivos (auto-cálculos, totalizadores)
2. **Views**: Criar views úteis comentadas em cada arquivo
3. **Índices**: Já incluídos nos CREATEs para otimização
4. **Backup**: Configurar backup automático diário
5. **Usuário App**: Criar usuário específico para a aplicação com permissões limitadas

## 📚 Documentação Adicional

Cada arquivo SQL contém:
- ✅ Comentários explicativos detalhados
- ✅ Queries de exemplo para consultas comuns
- ✅ Sugestões de triggers
- ✅ Views úteis comentadas
- ✅ Análises e relatórios SQL

## � Detalhes das Tabelas

### `notas_fiscais`
Gerencia notas fiscais de transporte vinculadas aos fretes:
- **Campos principais**: id, frete_id, numero_nf, data_emissao, status, valor_bruto, icms_valor, valor_liquido
- **Status**: emitida, cancelada, devolvida
- **Funcionalidades**:
  - Cálculo automático de ICMS (18% padrão)
  - Chave de acesso NF-e
  - Armazenamento de PDF e XML
  - Rastreamento de datas de saída e entrega
- **Exemplo de uso**: 
  ```sql
  SELECT * FROM notas_fiscais 
  WHERE frete_id = 'FRETE-2026-001' 
  AND status = 'emitida';
  ```

### `fretes`
Operações de frete (passado: `FRETE-2026-001` em formato YYYY-##-NNN):
- Vínculo com motorista, caminhão, fazenda
- Receita, custos e resultado calculados
- Campo `pagamento_id` para rastreamento de pagamentos
- **Exemplo de uso**:
  ```sql
  SELECT * FROM fretes 
  WHERE motorista_id = '1' 
  AND data_frete BETWEEN '2026-01-01' AND '2026-01-31';
  ```

### `pagamentos`
Pagamentos semanais aos motoristas:
- Vínculo com múltiplos fretes (campo `fretes_incluidos`)
- Status: pendente, processando, pago, cancelado
- Métodos: PIX ou transferência bancária
- **Triggers automáticos**: Vincula/desvincula fretes ao status

## 2. **Views**: Criar views úteis comentadas em cada arquivo
3. **Índices**: Já incluídos nos CREATEs para otimização
4. **Backup**: Configurar backup automático diário
5. **Usuário App**: Criar usuário específico para a aplicação com permissões limitadas

Após executar o script master, verifique:

```sql
-- Listar tabelas criadas
SHOW TABLES;

-- Verificar estrutura
DESCRIBE fretes;

-- Contar registros
SELECT COUNT(*) FROM fretes;

-- Verificar Foreign Keys
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'rn_logistica'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## 🐛 Troubleshooting

### Erro de Foreign Key

Se encontrar erro de Foreign Key, verifique a ordem de execução. Use o script master que garante a ordem correta.

### Caracteres especiais

Certifique-se de que o terminal está configurado para UTF-8:

```bash
mysql --default-character-set=utf8mb4 -u root -p
```

### Permissões

```sql
-- Criar usuário para aplicação
CREATE USER 'rn_app'@'localhost' IDENTIFIED BY 'senha_segura_aqui';
GRANT SELECT, INSERT, UPDATE, DELETE ON rn_logistica.* TO 'rn_app'@'localhost';
FLUSH PRIVILEGES;
```

## 📧 Contato

Matheus Ribeiro - TCC 2026
Repository: rn-log-stica-fretes-inteligentes
