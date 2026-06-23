
CREATE TYPE public.app_role AS ENUM ('admin','gerente','vendedor');
CREATE TYPE public.payment_method AS ENUM ('dinheiro','pix','debito','credito','fiado');
CREATE TYPE public.sale_status AS ENUM ('aberta','concluida','cancelada');
CREATE TYPE public.stock_move_type AS ENUM ('entrada','saida','ajuste','venda','devolucao');
CREATE TYPE public.cash_status AS ENUM ('aberto','fechado');
CREATE TYPE public.cash_move_type AS ENUM ('abertura','suprimento','sangria','venda','recebimento','despesa','fechamento');
CREATE TYPE public.ar_status AS ENUM ('pendente','parcial','pago','cancelado');
CREATE TYPE public.ap_status AS ENUM ('pendente','parcial','pago','cancelado');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL, cnpj TEXT, telefone TEXT, email TEXT,
  endereco TEXT, cidade TEXT, estado TEXT, cep TEXT,
  logo_url TEXT, cor_primaria TEXT DEFAULT '#2563EB', pix_chave TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  nome TEXT NOT NULL, email TEXT NOT NULL, telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;

CREATE POLICY "ver propria empresa" ON public.companies FOR SELECT TO authenticated USING (id = public.current_company_id());
CREATE POLICY "admin atualiza empresa" ON public.companies FOR UPDATE TO authenticated USING (id = public.current_company_id() AND public.has_role(auth.uid(),'admin')) WITH CHECK (id = public.current_company_id() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "cria empresa no signup" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ver perfis da empresa" ON public.profiles FOR SELECT TO authenticated USING (company_id = public.current_company_id() OR id = auth.uid());
CREATE POLICY "atualizar proprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin atualiza perfis" ON public.profiles FOR UPDATE TO authenticated USING (company_id = public.current_company_id() AND public.has_role(auth.uid(),'admin')) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "inserir proprio perfil" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "admin deleta perfil" ON public.profiles FOR DELETE TO authenticated USING (company_id = public.current_company_id() AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "ver roles" ON public.user_roles FOR SELECT TO authenticated USING (company_id = public.current_company_id() OR user_id = auth.uid());
CREATE POLICY "admin gerencia roles" ON public.user_roles FOR ALL TO authenticated USING (company_id = public.current_company_id() AND public.has_role(auth.uid(),'admin')) WITH CHECK (company_id = public.current_company_id() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "inserir proprio role no signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, cor TEXT DEFAULT '#64748B',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.categories FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.categories FOR ALL TO authenticated USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[])) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.brands FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.brands FOR ALL TO authenticated USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[])) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, cnpj TEXT, telefone TEXT, email TEXT,
  endereco TEXT, observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.suppliers FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.suppliers FOR ALL TO authenticated USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[])) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, codigo_barras TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  unidade TEXT DEFAULT 'un', tamanho TEXT, volume TEXT,
  estoque NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
  preco_custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  validade DATE, imagem_url TEXT, descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_barcode ON public.products(company_id, codigo_barras);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.products FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.products FOR ALL TO authenticated USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[])) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tipo public.stock_move_type NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL,
  preco_unitario NUMERIC(12,2), observacao TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sale_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stockmov_company ON public.stock_movements(company_id);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.stock_movements FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, cpf_cnpj TEXT, telefone TEXT,
  endereco TEXT, cidade TEXT, bairro TEXT,
  limite_credito NUMERIC(12,2) NOT NULL DEFAULT 0, observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_company ON public.customers(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.customers FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.customers FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status public.cash_status NOT NULL DEFAULT 'aberto',
  valor_abertura NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_fechamento NUMERIC(12,2),
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ, observacao TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.cash_registers TO authenticated;
GRANT ALL ON public.cash_registers TO service_role;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.cash_registers FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.cash_registers FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  tipo public.cash_move_type NOT NULL,
  valor NUMERIC(12,2) NOT NULL, descricao TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.cash_movements FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant insert" ON public.cash_movements FOR INSERT TO authenticated WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  cash_register_id UUID REFERENCES public.cash_registers(id),
  numero BIGSERIAL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.sale_status NOT NULL DEFAULT 'concluida',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_company_date ON public.sales(company_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.sales FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.sales FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  nome_produto TEXT NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL,
  preco_unitario NUMERIC(12,2) NOT NULL,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.sale_items FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.sale_items FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  metodo public.payment_method NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  troco NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO authenticated;
GRANT ALL ON public.sale_payments TO service_role;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.sale_payments FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.sale_payments FOR ALL TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  vencimento DATE NOT NULL,
  pago_em TIMESTAMPTZ,
  status public.ar_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts_receivable TO authenticated;
GRANT ALL ON public.accounts_receivable TO service_role;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.accounts_receivable FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.accounts_receivable FOR ALL TO authenticated USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[])) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  categoria TEXT, descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  vencimento DATE NOT NULL, pago_em TIMESTAMPTZ,
  status public.ap_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts_payable TO authenticated;
GRANT ALL ON public.accounts_payable TO service_role;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.accounts_payable FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.accounts_payable FOR ALL TO authenticated USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[])) WITH CHECK (company_id = public.current_company_id());

CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  preco_promocional NUMERIC(12,2) NOT NULL,
  inicio DATE NOT NULL, fim DATE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant select" ON public.promotions FOR SELECT TO authenticated USING (company_id = public.current_company_id());
CREATE POLICY "tenant write" ON public.promotions FOR ALL TO authenticated USING (company_id = public.current_company_id() AND public.has_any_role(auth.uid(), ARRAY['admin','gerente']::public.app_role[])) WITH CHECK (company_id = public.current_company_id());

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ar_updated BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ap_updated BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_promotions_updated BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.apply_sale_item_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products SET estoque = estoque - NEW.quantidade WHERE id = NEW.product_id;
    INSERT INTO public.stock_movements (company_id, product_id, tipo, quantidade, preco_unitario, sale_id, user_id)
      VALUES (NEW.company_id, NEW.product_id, 'venda', NEW.quantidade, NEW.preco_unitario, NEW.sale_id, auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET estoque = estoque + OLD.quantidade WHERE id = OLD.product_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_sale_item_stock AFTER INSERT OR DELETE ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.apply_sale_item_stock();

CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo IN ('entrada','devolucao') THEN
    UPDATE public.products SET estoque = estoque + NEW.quantidade WHERE id = NEW.product_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.products SET estoque = estoque - NEW.quantidade WHERE id = NEW.product_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public.products SET estoque = NEW.quantidade WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_stock_movement AFTER INSERT ON public.stock_movements FOR EACH ROW WHEN (NEW.tipo IN ('entrada','saida','ajuste','devolucao')) EXECUTE FUNCTION public.apply_stock_movement();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company_id UUID;
BEGIN
  INSERT INTO public.companies (nome, cnpj, telefone, email, endereco, cidade, estado, cep)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_nome', 'Minha Distribuidora'),
    NEW.raw_user_meta_data->>'company_cnpj',
    NEW.raw_user_meta_data->>'company_telefone',
    NEW.email,
    NEW.raw_user_meta_data->>'company_endereco',
    NEW.raw_user_meta_data->>'company_cidade',
    NEW.raw_user_meta_data->>'company_estado',
    NEW.raw_user_meta_data->>'company_cep'
  )
  RETURNING id INTO v_company_id;

  INSERT INTO public.profiles (id, company_id, nome, email, telefone)
  VALUES (NEW.id, v_company_id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
    NEW.email, NEW.raw_user_meta_data->>'telefone');

  INSERT INTO public.user_roles (user_id, company_id, role) VALUES (NEW.id, v_company_id, 'admin');

  INSERT INTO public.categories (company_id, nome, cor) VALUES
    (v_company_id,'Água','#0EA5E9'),(v_company_id,'Refrigerante','#EF4444'),
    (v_company_id,'Cerveja','#F59E0B'),(v_company_id,'Energético','#10B981'),
    (v_company_id,'Whisky','#A16207'),(v_company_id,'Vinho','#7C2D12'),
    (v_company_id,'Gelo','#38BDF8'),(v_company_id,'Petiscos','#F97316'),
    (v_company_id,'Outros','#64748B');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
