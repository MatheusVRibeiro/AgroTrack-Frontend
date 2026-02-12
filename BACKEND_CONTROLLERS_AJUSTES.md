# 🔧 Ajustes Necessários nos Controllers do Backend

## 📊 Controller de Fazendas - CRÍTICO

### ✅ O que adicionar no GET `/fazendas`

**Arquivo:** `backend/controllers/fazendasController.js` (ou similar)

```javascript
// Exemplo de implementação
async listarFazendas(req, res) {
  try {
    const query = `
      SELECT 
        f.*,
        COALESCE(SUM(p.quantidade_sacas), 0) as total_sacas_carregadas,
        COALESCE(SUM(p.quantidade_sacas * 25 / 1000), 0) as total_toneladas,
        COALESCE(SUM(p.faturamento_total), 0) as faturamento_total,
        COUNT(p.id) as total_producoes
      FROM fazendas f
      LEFT JOIN producoes p ON p.fazenda_id = f.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `;
    
    const fazendas = await db.query(query);
    
    return res.json({
      success: true,
      message: "Fazendas listadas com sucesso",
      data: fazendas
    });
  } catch (error) {
    console.error("Erro ao listar fazendas:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar fazendas"
    });
  }
}
```

### 📋 Campos obrigatórios que devem retornar:

```javascript
{
  id: number,
  nome: string,
  localizacao: string,
  total_sacas_carregadas: number,  // ⚠️ CAMPO CRÍTICO (soma das produções)
  total_toneladas: number,          // Opcional: (total_sacas * 25) / 1000
  faturamento_total: number,        // Opcional: soma dos faturamentos
  total_producoes: number,          // Opcional: quantidade de produções
  created_at: string,
  updated_at: string
}
```

---

## 🚚 Controller de Fretes - OPCIONAL (mas recomendado)

### ✅ O que adicionar no GET `/fretes`

**Arquivo:** `backend/controllers/fretesController.js`

```javascript
async listarFretes(req, res) {
  try {
    const query = `
      SELECT 
        f.*,
        m.nome as motorista_nome,
        c.placa as caminhao_placa
      FROM fretes f
      LEFT JOIN motoristas m ON m.id = f.motorista_id
      LEFT JOIN caminhoes c ON c.id = f.caminhao_id
      ORDER BY f.data_frete DESC
    `;
    
    const fretes = await db.query(query);
    
    return res.json({
      success: true,
      message: "Fretes listados com sucesso",
      data: fretes
    });
  } catch (error) {
    console.error("Erro ao listar fretes:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao listar fretes"
    });
  }
}
```

### 📋 Campos obrigatórios que devem retornar:

```javascript
{
  id: number,
  data_frete: string,           // ISO 8601: "2025-01-15T10:30:00Z"
  quantidade_sacas: number,
  toneladas: number,
  receita: number,
  custos: number,
  resultado: number,            // ou calcula: receita - custos
  motorista_id: number,
  motorista_nome: string,       // JOIN com tabela motoristas
  caminhao_id: number,
  caminhao_placa: string,       // JOIN com tabela caminhoes
  origem: string,
  destino: string,
  created_at: string,
  updated_at: string
}
```

---

## 🔄 Melhorias Opcionais no Backend

### 1. Adicionar campo `status` nos fretes (OPCIONAL)

```sql
-- Adicionar coluna status à tabela fretes
ALTER TABLE fretes 
ADD COLUMN status VARCHAR(20) DEFAULT 'concluido'
CHECK (status IN ('em_transito', 'concluido', 'pendente', 'cancelado'));

-- Atualizar fretes recentes para 'em_transito'
UPDATE fretes 
SET status = 'em_transito' 
WHERE data_frete >= CURRENT_DATE - INTERVAL '7 days'
  AND data_frete <= CURRENT_DATE;
```

### 2. Endpoint de Estatísticas Dashboard (RECOMENDADO)

Criar um endpoint específico para estatísticas:

```javascript
// GET /api/dashboard/stats
async getDashboardStats(req, res) {
  try {
    const stats = await db.query(`
      SELECT 
        -- Fretes do mês atual
        (SELECT COUNT(*) FROM fretes 
         WHERE EXTRACT(MONTH FROM data_frete) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM data_frete) = EXTRACT(YEAR FROM CURRENT_DATE)) as fretes_mes_atual,
        
        (SELECT COALESCE(SUM(quantidade_sacas), 0) FROM fretes 
         WHERE EXTRACT(MONTH FROM data_frete) = EXTRACT(MONTH FROM CURRENT_DATE)) as sacas_mes_atual,
        
        (SELECT COALESCE(SUM(receita), 0) FROM fretes 
         WHERE EXTRACT(MONTH FROM data_frete) = EXTRACT(MONTH FROM CURRENT_DATE)) as receita_mes_atual,
        
        (SELECT COALESCE(SUM(custos), 0) FROM fretes 
         WHERE EXTRACT(MONTH FROM data_frete) = EXTRACT(MONTH FROM CURRENT_DATE)) as custos_mes_atual,
        
        -- Fretes do mês anterior
        (SELECT COALESCE(SUM(quantidade_sacas), 0) FROM fretes 
         WHERE EXTRACT(MONTH FROM data_frete) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')) as sacas_mes_anterior,
        
        -- Total de fazendas
        (SELECT COUNT(*) FROM fazendas) as total_fazendas,
        
        -- Total de sacas em estoque
        (SELECT COALESCE(SUM(quantidade_sacas), 0) FROM producoes) as total_sacas_estoque
    `);
    
    return res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar estatísticas"
    });
  }
}
```

---

## 📋 Checklist de Implementação

### ✅ Prioridade ALTA (Necessário para dashboard funcionar):
- [ ] **Fazendas Controller**: Adicionar campo `total_sacas_carregadas` (agregado de produções)
- [ ] **Fazendas Controller**: Retornar JOIN com tabela `producoes` para calcular totais
- [ ] **Fretes Controller**: Garantir que `data_frete` seja retornada em formato ISO

### ⚙️ Prioridade MÉDIA (Recomendado):
- [ ] **Fretes Controller**: Adicionar JOIN com `motoristas` para retornar `motorista_nome`
- [ ] **Fretes Controller**: Adicionar JOIN com `caminhoes` para retornar `caminhao_placa`
- [ ] **Fretes Controller**: Campo `resultado` calculado (se não existir na tabela)

### 🎯 Prioridade BAIXA (Opcional):
- [ ] Adicionar coluna `status` na tabela `fretes`
- [ ] Criar endpoint `/api/dashboard/stats` para estatísticas agregadas
- [ ] Adicionar cache/otimização de queries com índices

---

## 🧪 Teste dos Endpoints

### Teste Fazendas:
```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://192.168.0.174:3000/fazendas
```

**Esperado:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome": "Fazenda São João",
      "total_sacas_carregadas": 150000,  // ⚠️ Deve existir
      "total_toneladas": 3750,
      "faturamento_total": 4500000
    }
  ]
}
```

### Teste Fretes:
```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://192.168.0.174:3000/fretes
```

**Esperado:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "data_frete": "2025-01-15T10:00:00Z",  // ⚠️ ISO format
      "quantidade_sacas": 500,
      "receita": 7500,
      "custos": 1800,
      "resultado": 5700,
      "motorista_nome": "Carlos Silva"
    }
  ]
}
```

---

## 📌 Resumo Executivo

**O que é OBRIGATÓRIO implementar agora:**
1. ✅ Controller de Fazendas: agregar `total_sacas_carregadas` das produções
2. ✅ Garantir que `data_frete` retorna em formato ISO String

**O que é OPCIONAL mas melhora muito:**
- Adicionar campo `status` nos fretes
- Criar endpoint de estatísticas agregadas
- Retornar nomes de motoristas e placas nos fretes (JOINs)

---

## 💡 Dúvidas ou Problemas?

Se após implementar ainda não funcionar, verifique:
1. Os nomes dos campos retornados pelo backend (case sensitive!)
2. O formato da data: deve ser string ISO, não timestamp
3. Os valores numéricos não devem ser strings
4. Console do navegador (`F12` → Console) para ver erros
