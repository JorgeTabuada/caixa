# Documentação da Migração para Supabase - Caixa Multipark

## Visão Geral

Este documento descreve a migração da aplicação Caixa Multipark para utilizar o Supabase como base de dados na cloud. A aplicação mantém o mesmo fluxo de trabalho e interface de utilizador, mas agora armazena e recupera dados do Supabase em vez de manter tudo em memória local.

## Estrutura da Base de Dados

A aplicação utiliza as seguintes tabelas no Supabase:

1. **users** - Armazena informações dos utilizadores
2. **teams** - Armazena informações sobre equipas
3. **sales_orders** - Dados do ficheiro 'sales orders' (antigo Odoo)
4. **deliveries** - Dados do ficheiro 'entregas' (antigo Back Office)
5. **cash_records** - Dados do ficheiro 'caixa'
6. **comparisons** - Resultados das comparações entre sales_orders e deliveries
7. **validations** - Resultados das validações de caixa
8. **import_batches** - Informações sobre cada lote de importação
9. **exports** - Informações sobre exportações realizadas

## Fluxo de Trabalho

O fluxo de trabalho da aplicação permanece o mesmo:

1. **Importação de Ficheiros**:
   - Primeiro, importam-se os ficheiros 'sales orders' e 'entregas'
   - Depois, importa-se o ficheiro 'caixa' (pode haver vários uploads por dia)

2. **Comparação**:
   - A aplicação compara os dados dos ficheiros 'sales orders' e 'entregas'
   - Identifica inconsistências e registos ausentes
   - Permite resolver problemas manualmente

3. **Validação de Caixa**:
   - Valida os registos de caixa contra os resultados da comparação
   - Identifica inconsistências permanentes
   - Permite validar entregas por condutor

4. **Dashboard**:
   - Mostra estatísticas e resumos dos dados importados
   - Apresenta totais por método de pagamento
   - Exibe breakdown por parque

5. **Exportação**:
   - Exporta os dados processados para Excel
   - Regista a exportação no Supabase

## Alterações Técnicas

### Integração com Supabase

A aplicação foi integrada com o Supabase através do SDK oficial:

```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uvcmgzhwiibjcygqsjrm.supabase.co';
const SUPABASE_ANON_KEY = '***'; // Chave armazenada como variável de ambiente no Vercel

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Importação de Dados

A importação de dados foi adaptada para criar um lote de importação e armazenar os dados no Supabase:

```javascript
// Criar lote de importação
const batchInfo = {
    batchDate: new Date().toISOString().split('T')[0],
    salesFilename: file.name
};
const batch = await createImportBatch(batchInfo);
currentBatchId = batch.id;

// Importar dados para o Supabase
const result = await importSalesOrders(salesData, currentBatchId);
```

### Leitura de Dados

As funcionalidades de leitura foram adaptadas para buscar dados do Supabase:

```javascript
// Obter dados do Supabase
const salesOrders = await getSalesOrders(batchId);
const deliveries = await getDeliveries(batchId);
const cashRecords = await getCashRecords(batchId);
```

## Deploy no Vercel

A aplicação está configurada para deploy automático no Vercel a partir do repositório GitHub:

1. O ficheiro `vercel.json` define a configuração do projeto
2. As variáveis de ambiente (SUPABASE_URL e SUPABASE_ANON_KEY) são definidas no painel do Vercel
3. Cada push para o branch master aciona um novo deploy

## Segurança

Para garantir a segurança da aplicação:

1. Nenhuma credencial é armazenada no código-fonte
2. As políticas de Row Level Security (RLS) do Supabase controlam o acesso aos dados
3. A autenticação é gerida pelo Supabase Auth

## Manutenção

Para manter a aplicação:

1. Atualizações de código devem ser enviadas para o repositório GitHub
2. O deploy automático no Vercel garante que a versão mais recente esteja sempre disponível
3. Monitorize o painel do Supabase para verificar o uso da base de dados

## Próximos Passos

Possíveis melhorias futuras:

1. Implementar autenticação de utilizadores
2. Adicionar funcionalidades de relatórios avançados
3. Criar um painel de administração para gerir utilizadores e permissões
