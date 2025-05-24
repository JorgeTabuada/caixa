# Plano de Schema para Supabase - Caixa Multipark

## Visão Geral

Este documento descreve o schema proposto para a migração da aplicação Caixa Multipark para o Supabase, mantendo a compatibilidade com os ficheiros Excel atuais ('entregas', 'sales orders', 'caixa') e implementando as regras de visibilidade por role de utilizador.

## Tabelas Principais

### 1. users
Armazena informações dos utilizadores do sistema.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'team leader', 'front office', 'back office', 'supervisão', 'admin', 'super admin')),
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. teams
Armazena informações sobre equipas de utilizadores.

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  leader_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. sales_orders
Armazena dados do ficheiro 'sales orders' (equivalente ao antigo Odoo).

```sql
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate TEXT NOT NULL,
  booking_price DECIMAL(10, 2),
  park_brand TEXT,
  share DECIMAL(10, 2) DEFAULT 0,
  booking_date TIMESTAMP WITH TIME ZONE,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  price_on_delivery DECIMAL(10, 2),
  payment_method TEXT,
  driver TEXT,
  campaign TEXT,
  campaign_pay BOOLEAN DEFAULT FALSE,
  has_online_payment BOOLEAN DEFAULT FALSE,
  original_data JSONB,
  import_batch_id UUID REFERENCES import_batches(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_orders_license_plate ON sales_orders(license_plate);
```

### 4. deliveries
Armazena dados do ficheiro 'entregas' (equivalente ao antigo Back Office).

```sql
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate TEXT NOT NULL,
  alocation TEXT,
  booking_price DECIMAL(10, 2),
  park_brand TEXT,
  campaign TEXT,
  check_in TIMESTAMP WITH TIME ZONE,
  driver TEXT,
  campaign_pay BOOLEAN DEFAULT FALSE,
  has_online_payment BOOLEAN DEFAULT FALSE,
  original_data JSONB,
  import_batch_id UUID REFERENCES import_batches(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deliveries_license_plate ON deliveries(license_plate);
```

### 5. cash_records
Armazena dados do ficheiro 'caixa'.

```sql
CREATE TABLE cash_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate TEXT NOT NULL,
  driver TEXT,
  payment_method TEXT,
  booking_price DECIMAL(10, 2),
  price_on_delivery DECIMAL(10, 2),
  price_difference DECIMAL(10, 2),
  campaign TEXT,
  import_batch_id UUID REFERENCES import_batches(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cash_records_license_plate ON cash_records(license_plate);
CREATE INDEX idx_cash_records_driver ON cash_records(driver);
```

### 6. comparisons
Armazena os resultados das comparações entre 'sales orders' e 'deliveries'.

```sql
CREATE TABLE comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate TEXT NOT NULL,
  status TEXT CHECK (status IN ('valid', 'inconsistent', 'missing_in_sales', 'missing_in_deliveries')),
  sales_order_id UUID REFERENCES sales_orders(id),
  delivery_id UUID REFERENCES deliveries(id),
  inconsistencies JSONB,
  resolution TEXT,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comparisons_license_plate ON comparisons(license_plate);
CREATE INDEX idx_comparisons_status ON comparisons(status);
```

### 7. validations
Armazena os resultados das validações de caixa.

```sql
CREATE TABLE validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate TEXT NOT NULL,
  comparison_id UUID REFERENCES comparisons(id),
  cash_record_id UUID REFERENCES cash_records(id),
  status TEXT CHECK (status IN ('valid', 'inconsistent', 'permanent_inconsistency')),
  inconsistency_type TEXT,
  original_payment_method TEXT,
  corrected_payment_method TEXT,
  original_price DECIMAL(10, 2),
  corrected_price DECIMAL(10, 2),
  notes TEXT,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_validations_license_plate ON validations(license_plate);
CREATE INDEX idx_validations_status ON validations(status);
```

### 8. import_batches
Armazena informações sobre cada lote de importação.

```sql
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_date DATE NOT NULL,
  sales_filename TEXT,
  deliveries_filename TEXT,
  cash_filename TEXT,
  sales_count INTEGER DEFAULT 0,
  deliveries_count INTEGER DEFAULT 0,
  cash_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_import_batches_batch_date ON import_batches(batch_date);
CREATE INDEX idx_import_batches_status ON import_batches(status);
```

### 9. exports
Armazena informações sobre exportações realizadas.

```sql
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  export_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  filename TEXT,
  record_count INTEGER DEFAULT 0,
  export_data JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Políticas de Segurança (RLS)

Implementaremos políticas de Row Level Security (RLS) para garantir que os utilizadores só possam ver os dados conforme suas permissões:

### Política para users
```sql
CREATE POLICY users_policy ON users
  USING (
    auth.uid() = id OR                                      -- próprio utilizador
    (auth.jwt() ->> 'role' = 'team leader' AND team_id = (SELECT team_id FROM users WHERE id = auth.uid())) OR  -- team leader vê membros da equipa
    (auth.jwt() ->> 'role' IN ('front office', 'back office', 'supervisão', 'admin', 'super admin'))  -- roles superiores vêem todos
  );
```

### Política para sales_orders, deliveries, cash_records
```sql
CREATE POLICY data_access_policy ON sales_orders
  USING (
    created_by = auth.uid() OR                              -- próprio utilizador
    (auth.jwt() ->> 'role' = 'team leader' AND created_by IN (SELECT id FROM users WHERE team_id = (SELECT team_id FROM users WHERE id = auth.uid()))) OR  -- team leader vê dados da equipa
    (auth.jwt() ->> 'role' IN ('front office', 'back office', 'supervisão', 'admin', 'super admin'))  -- roles superiores vêem todos
  );
```

Políticas similares serão aplicadas às tabelas deliveries, cash_records, comparisons, validations, import_batches e exports.

## Funções RPC

Criaremos funções RPC para operações comuns:

1. `import_files(sales_data JSONB, deliveries_data JSONB, cash_data JSONB)` - Importa dados dos ficheiros Excel
2. `compare_data(batch_id UUID)` - Executa comparação entre sales_orders e deliveries
3. `validate_cash(batch_id UUID)` - Executa validação de caixa
4. `export_data(batch_id UUID)` - Gera exportação de dados

## Índices Adicionais

Para otimizar o desempenho, criaremos índices adicionais conforme necessário durante a implementação, especialmente para campos frequentemente usados em consultas de junção e filtragem.

## Próximos Passos

1. Criar as tabelas no Supabase
2. Configurar autenticação e RLS
3. Implementar funções RPC
4. Adaptar o código da aplicação para usar o Supabase SDK
