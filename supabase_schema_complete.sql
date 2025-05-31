-- Script SQL para criar o schema completo do Supabase
-- Caixa Multipark Database Schema

-- Ativar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de equipas
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  leader_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de utilizadores (estende auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'team leader', 'front office', 'back office', 'supervisão', 'admin', 'super admin')),
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de lotes de importação
CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_date DATE NOT NULL,
  sales_filename TEXT,
  deliveries_filename TEXT,
  cash_filename TEXT,
  sales_count INTEGER DEFAULT 0,
  deliveries_count INTEGER DEFAULT 0,
  cash_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'error')) DEFAULT 'pending',
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de sales orders (antigo Odoo)
CREATE TABLE IF NOT EXISTS sales_orders (
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
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de entregas (antigo Back Office)
CREATE TABLE IF NOT EXISTS deliveries (
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
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de registos de caixa
CREATE TABLE IF NOT EXISTS cash_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate TEXT NOT NULL,
  driver TEXT,
  payment_method TEXT,
  booking_price DECIMAL(10, 2),
  price_on_delivery DECIMAL(10, 2),
  price_difference DECIMAL(10, 2),
  campaign TEXT,
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de comparações
CREATE TABLE IF NOT EXISTS comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate TEXT NOT NULL,
  status TEXT CHECK (status IN ('valid', 'inconsistent', 'missing_in_sales', 'missing_in_deliveries')),
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  inconsistencies JSONB,
  resolution TEXT,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabela de validações
CREATE TABLE IF NOT EXISTS validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate TEXT NOT NULL,
  comparison_id UUID REFERENCES comparisons(id) ON DELETE CASCADE,
  cash_record_id UUID REFERENCES cash_records(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('valid', 'inconsistent', 'permanent_inconsistency')),
  inconsistency_type TEXT,
  original_payment_method TEXT,
  corrected_payment_method TEXT,
  original_price DECIMAL(10, 2),
  corrected_price DECIMAL(10, 2),
  notes TEXT,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabela de exportações
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  export_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  filename TEXT,
  record_count INTEGER DEFAULT 0,
  export_data JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_license_plate ON sales_orders(license_plate);
CREATE INDEX IF NOT EXISTS idx_sales_orders_batch ON sales_orders(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_license_plate ON deliveries(license_plate);
CREATE INDEX IF NOT EXISTS idx_deliveries_batch ON deliveries(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_cash_records_license_plate ON cash_records(license_plate);
CREATE INDEX IF NOT EXISTS idx_cash_records_driver ON cash_records(driver);
CREATE INDEX IF NOT EXISTS idx_cash_records_batch ON cash_records(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_comparisons_license_plate ON comparisons(license_plate);
CREATE INDEX IF NOT EXISTS idx_comparisons_status ON comparisons(status);

CREATE INDEX IF NOT EXISTS idx_validations_license_plate ON validations(license_plate);
CREATE INDEX IF NOT EXISTS idx_validations_status ON validations(status);

CREATE INDEX IF NOT EXISTS idx_import_batches_batch_date ON import_batches(batch_date);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);

-- Adicionar constraint de foreign key para team leader
ALTER TABLE teams ADD CONSTRAINT fk_teams_leader FOREIGN KEY (leader_id) REFERENCES users(id);

-- Ativar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança básicas (podem ser refinadas depois)
-- Por agora, permitir acesso total para utilizadores autenticados
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON teams FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON import_batches FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON sales_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON deliveries FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON cash_records FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON comparisons FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON validations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON exports FOR ALL USING (auth.role() = 'authenticated');

-- Função para atualizar timestamps automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_batches_updated_at BEFORE UPDATE ON import_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_records_updated_at BEFORE UPDATE ON cash_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comparisons_updated_at BEFORE UPDATE ON comparisons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validations_updated_at BEFORE UPDATE ON validations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funções RPC para operações específicas

-- 1. Função para importar dados de sales orders
CREATE OR REPLACE FUNCTION import_sales_orders_rpc(
  sales_data JSONB,
  batch_id UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
  record_count INTEGER := 0;
BEGIN
  -- Inserir dados de sales orders
  INSERT INTO sales_orders (
    license_plate, booking_price, park_brand, share, booking_date,
    check_in, check_out, price_on_delivery, payment_method, driver,
    campaign, campaign_pay, has_online_payment, original_data,
    import_batch_id, created_by
  )
  SELECT 
    item->>'licensePlate',
    (item->>'bookingPrice')::DECIMAL,
    item->>'parkBrand',
    (item->>'share')::DECIMAL,
    (item->>'bookingDate')::TIMESTAMP WITH TIME ZONE,
    (item->>'checkIn')::TIMESTAMP WITH TIME ZONE,
    (item->>'checkOut')::TIMESTAMP WITH TIME ZONE,
    (item->>'priceOnDelivery')::DECIMAL,
    item->>'paymentMethod',
    item->>'driver',
    item->>'campaign',
    (item->>'campaignPay')::BOOLEAN,
    (item->>'hasOnlinePayment')::BOOLEAN,
    item,
    batch_id,
    auth.uid()
  FROM jsonb_array_elements(sales_data) AS item;

  GET DIAGNOSTICS record_count = ROW_COUNT;

  -- Atualizar contador no batch
  UPDATE import_batches 
  SET sales_count = record_count 
  WHERE id = batch_id;

  result := json_build_object('success', true, 'count', record_count);
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object('success', false, 'error', SQLERRM);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para importar dados de entregas
CREATE OR REPLACE FUNCTION import_deliveries_rpc(
  deliveries_data JSONB,
  batch_id UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
  record_count INTEGER := 0;
BEGIN
  -- Inserir dados de entregas
  INSERT INTO deliveries (
    license_plate, alocation, booking_price, park_brand, campaign,
    check_in, driver, campaign_pay, has_online_payment, original_data,
    import_batch_id, created_by
  )
  SELECT 
    item->>'licensePlate',
    item->>'alocation',
    (item->>'bookingPrice')::DECIMAL,
    item->>'parkBrand',
    item->>'campaign',
    (item->>'checkIn')::TIMESTAMP WITH TIME ZONE,
    item->>'driver',
    (item->>'campaignPay')::BOOLEAN,
    (item->>'hasOnlinePayment')::BOOLEAN,
    item,
    batch_id,
    auth.uid()
  FROM jsonb_array_elements(deliveries_data) AS item;

  GET DIAGNOSTICS record_count = ROW_COUNT;

  -- Atualizar contador no batch
  UPDATE import_batches 
  SET deliveries_count = record_count 
  WHERE id = batch_id;

  result := json_build_object('success', true, 'count', record_count);
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object('success', false, 'error', SQLERRM);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para importar dados de caixa
CREATE OR REPLACE FUNCTION import_cash_records_rpc(
  cash_data JSONB,
  batch_id UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
  record_count INTEGER := 0;
BEGIN
  -- Inserir dados de caixa
  INSERT INTO cash_records (
    license_plate, driver, payment_method, booking_price,
    price_on_delivery, price_difference, campaign,
    import_batch_id, created_by
  )
  SELECT 
    item->>'licensePlate',
    COALESCE(item->>'driver', item->>'condutorEntrega'),
    item->>'paymentMethod',
    (item->>'bookingPrice')::DECIMAL,
    (item->>'priceOnDelivery')::DECIMAL,
    (item->>'priceOnDelivery')::DECIMAL - (item->>'bookingPrice')::DECIMAL,
    item->>'campaign',
    batch_id,
    auth.uid()
  FROM jsonb_array_elements(cash_data) AS item;

  GET DIAGNOSTICS record_count = ROW_COUNT;

  -- Atualizar contador no batch e marcar como completo
  UPDATE import_batches 
  SET cash_count = record_count, status = 'completed'
  WHERE id = batch_id;

  result := json_build_object('success', true, 'count', record_count);
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object('success', false, 'error', SQLERRM);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para executar comparação entre sales orders e deliveries
CREATE OR REPLACE FUNCTION compare_data_rpc(batch_id UUID) 
RETURNS JSON AS $$
DECLARE
  result JSON;
  comparison_count INTEGER := 0;
BEGIN
  -- Criar comparações para registos que existem em ambas as tabelas
  INSERT INTO comparisons (
    license_plate, status, sales_order_id, delivery_id, inconsistencies
  )
  SELECT 
    COALESCE(s.license_plate, d.license_plate),
    CASE 
      WHEN s.id IS NULL THEN 'missing_in_sales'
      WHEN d.id IS NULL THEN 'missing_in_deliveries'
      WHEN s.booking_price != d.booking_price THEN 'inconsistent'
      ELSE 'valid'
    END,
    s.id,
    d.id,
    CASE 
      WHEN s.booking_price != d.booking_price THEN 
        json_build_object('price_mismatch', true, 'sales_price', s.booking_price, 'delivery_price', d.booking_price)
      ELSE NULL
    END::JSONB
  FROM 
    sales_orders s 
    FULL OUTER JOIN deliveries d ON LOWER(s.license_plate) = LOWER(d.license_plate)
  WHERE 
    s.import_batch_id = batch_id OR d.import_batch_id = batch_id;

  GET DIAGNOSTICS comparison_count = ROW_COUNT;

  result := json_build_object('success', true, 'count', comparison_count);
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object('success', false, 'error', SQLERRM);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para validar dados de caixa
CREATE OR REPLACE FUNCTION validate_cash_rpc(batch_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  validation_count INTEGER := 0;
BEGIN
  -- Criar validações comparando cash_records com comparisons
  INSERT INTO validations (
    license_plate, comparison_id, cash_record_id, status,
    inconsistency_type, original_payment_method, original_price
  )
  SELECT 
    c.license_plate,
    comp.id,
    c.id,
    CASE 
      WHEN comp.status = 'valid' AND c.price_difference = 0 THEN 'valid'
      WHEN comp.status = 'inconsistent' THEN 'permanent_inconsistency'
      ELSE 'inconsistent'
    END,
    CASE 
      WHEN c.price_difference != 0 THEN 'price_difference'
      WHEN comp.status = 'inconsistent' THEN 'data_mismatch'
      ELSE NULL
    END,
    c.payment_method,
    c.booking_price
  FROM 
    cash_records c
    LEFT JOIN comparisons comp ON LOWER(c.license_plate) = LOWER(comp.license_plate)
  WHERE 
    c.import_batch_id = batch_id;

  GET DIAGNOSTICS validation_count = ROW_COUNT;

  result := json_build_object('success', true, 'count', validation_count);
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object('success', false, 'error', SQLERRM);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função para obter estatísticas do dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats_rpc(batch_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  stats RECORD;
BEGIN
  SELECT 
    COUNT(DISTINCT s.id) as sales_count,
    COUNT(DISTINCT d.id) as deliveries_count,
    COUNT(DISTINCT c.id) as cash_count,
    COUNT(DISTINCT comp.id) FILTER (WHERE comp.status = 'inconsistent') as inconsistencies_count,
    SUM(cr.booking_price) FILTER (WHERE cr.payment_method = 'cash') as total_cash,
    SUM(cr.booking_price) FILTER (WHERE cr.payment_method = 'card') as total_card,
    SUM(cr.booking_price) FILTER (WHERE cr.payment_method = 'online') as total_online,
    SUM(cr.booking_price) FILTER (WHERE cr.payment_method = 'no pay') as total_no_pay
  INTO stats
  FROM 
    sales_orders s
    FULL OUTER JOIN deliveries d ON s.import_batch_id = d.import_batch_id
    LEFT JOIN cash_records cr ON cr.import_batch_id = COALESCE(s.import_batch_id, d.import_batch_id)
    LEFT JOIN comparisons comp ON comp.sales_order_id = s.id OR comp.delivery_id = d.id
  WHERE 
    (batch_id IS NULL OR s.import_batch_id = batch_id OR d.import_batch_id = batch_id);

  result := json_build_object(
    'sales_count', COALESCE(stats.sales_count, 0),
    'deliveries_count', COALESCE(stats.deliveries_count, 0),
    'cash_count', COALESCE(stats.cash_count, 0),
    'inconsistencies_count', COALESCE(stats.inconsistencies_count, 0),
    'total_cash', COALESCE(stats.total_cash, 0),
    'total_card', COALESCE(stats.total_card, 0),
    'total_online', COALESCE(stats.total_online, 0),
    'total_no_pay', COALESCE(stats.total_no_pay, 0)
  );

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object('success', false, 'error', SQLERRM);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Views úteis para consultas frequentes

-- View para dados de comparação completos
CREATE OR REPLACE VIEW comparison_details AS
SELECT 
  c.id,
  c.license_plate,
  c.status,
  c.inconsistencies,
  s.booking_price as sales_price,
  s.park_brand as sales_brand,
  s.driver as sales_driver,
  d.booking_price as delivery_price,
  d.park_brand as delivery_brand,
  d.driver as delivery_driver,
  d.alocation,
  c.created_at
FROM comparisons c
LEFT JOIN sales_orders s ON c.sales_order_id = s.id
LEFT JOIN deliveries d ON c.delivery_id = d.id;

-- View para dados de validação completos  
CREATE OR REPLACE VIEW validation_details AS
SELECT 
  v.id,
  v.license_plate,
  v.status,
  v.inconsistency_type,
  v.original_payment_method,
  v.corrected_payment_method,
  v.original_price,
  v.corrected_price,
  v.notes,
  cr.driver,
  cr.price_difference,
  comp.status as comparison_status,
  v.created_at
FROM validations v
LEFT JOIN cash_records cr ON v.cash_record_id = cr.id
LEFT JOIN comparisons comp ON v.comparison_id = comp.id;

-- Comentário final
-- Este script cria toda a estrutura necessária para a aplicação Caixa Multipark
-- Execute este script no SQL Editor do Supabase para configurar a base de dados