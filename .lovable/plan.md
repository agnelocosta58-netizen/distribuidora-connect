# Plano — Pix MP, Imagens, Rateio (custo real), Variações e Login

Vou dividir em 5 frentes que serão entregues nesta ordem dentro da mesma sessão.

## 1. Integração Pix via Mercado Pago

**Backend (server functions + webhook):**
- Nova secret `MERCADO_PAGO_ACCESS_TOKEN` (solicitada via add_secret).
- `src/lib/pix-mp.functions.ts`:
  - `createPixCharge({ sale_id, valor, descricao })` → chama `POST https://api.mercadopago.com/v1/payments` com `payment_method_id: "pix"`, salva `pix_transactions` com `txid` = `id` do MP, `qr_code` e `qr_code_base64`.
  - `checkPixStatus({ transaction_id })` → polling de fallback.
- Atualizar `src/routes/api/public/webhooks/pix.ts` para o formato do MP (`type: "payment"`, `data.id`), buscar pagamento por id, validar `x-signature` HMAC com `MERCADO_PAGO_WEBHOOK_SECRET`, marcar `pix_transactions.status = 'pago'`, `pago_em = now()`, e atualizar `sales.status = 'pago'` + `pago_em`.
- Adicionar coluna `pago_em` em `sales` se não existir.

**Frontend:**
- No PDV, ao escolher Pix: gerar cobrança, exibir QR code + copia-e-cola, e abrir canal Realtime na tabela `pix_transactions` filtrando por `id` para mostrar "Pagamento aprovado ✓" + toast em tempo real.
- Página `/app/pix` ganha aba "Histórico" com filtros por status/data.

## 2. Imagens de produtos

- Bucket `product-images` (público) via `storage_create_bucket` + policies `TO authenticated` insert/update/delete por `company_id` (path `{company_id}/{product_id}/...`).
- Componente `<ProductImagePicker>`:
  - **Upload** (`<input type="file" accept="image/*">`).
  - **Câmera** (`capture="environment"`) — botão "Tirar foto".
  - **Buscar na internet**: server function `searchProductImages(query)` usando DuckDuckGo Image API (sem chave) ou Bing via Lovable AI gateway; retorna URLs. Modal mostra grid; ao escolher, server function baixa a imagem, salva no bucket e atualiza `products.imagem_url`.
- Substituir o input de URL atual em `app.produtos.tsx` por esse componente. Miniaturas já aparecem onde houver `imagem_url`; reforçar nas listagens (PDV, estoque).

## 3. Refazer módulo de Rateio (custo real por produto)

Descartar a tela "rateio de despesas entre pessoas". Substituir por **Rateio de custos operacionais**:

**Migration:**
- `DROP TABLE rateio_groups, rateio_participants` (sem uso real ainda).
- `expenses(id, company_id, descricao, categoria, valor, competencia date, recorrente bool)`.
- `cost_allocations(id, company_id, periodo_inicio, periodo_fim, metodo enum('quantidade','faturamento','categoria','percentual'), total_despesas, criado_em)`.
- `product_cost_allocations(allocation_id, product_id, valor_rateado, custo_real, margem_real, lucro_liquido)`.
- Função `recompute_cost_allocation(allocation_id)` que faz o cálculo.

**Frontend (`/app/rateio` reescrita):**
- Aba **Despesas**: CRUD com categorias (Energia, Água, Internet, Aluguel, Salários, Impostos, Combustível, Fretes, Taxas bancárias, Outras).
- Aba **Apuração**: selecionar período (diário/semanal/mensal/custom) e método; mostra total de despesas e tabela por produto com Custo compra | Rateio | Custo real | Preço venda | Margem % | Lucro líquido.
- Botão "Aplicar custo real" persiste no `products.custo_real` (nova coluna).
- Recalcula automaticamente via trigger ao inserir nova despesa no período aberto.

## 4. Variações completas

Tabela `product_variants` já existe. Falta UI completa:
- Gerenciador de variações dentro do produto: nome (auto: Unidade Quente / Fardo Gelado…), código de barras, estoque, preço custo, preço venda, ativo.
- Geração rápida: seleciona embalagens (Unidade/Fardo/Caixa) × temperaturas (Quente/Gelado) e cria todas as combinações.
- **PDV**: ao adicionar produto que tem variações, abrir seletor obrigatório de variação; usar `variant_id` no `sale_items` (já suportado pelos triggers).
- Buscar produto por código de barras encontra também por `product_variants.codigo_barras`.
- Histórico de vendas por variação na tela de Estoque.

## 5. Segurança e Login

Em `auth.tsx` e `reset-password.tsx`:
- Campo "Confirmar senha" no cadastro e no reset.
- Botão olho (mostrar/ocultar) em todos os campos de senha.
- Validação: senhas iguais, mínimo 8 caracteres, mensagens amigáveis com `toast.error`.
- Feedback visual (borda destrutiva) quando não coincidem.

## Detalhes técnicos

```text
Pix MP fluxo
  PDV → createPixCharge → MP API → grava pix_transactions
  Cliente paga → MP envia webhook → /api/public/webhooks/pix
  Webhook valida assinatura → update pix_transactions + sales
  PDV escuta Realtime em pix_transactions.id → mostra "Pago"
```

Secrets necessárias:
- `MERCADO_PAGO_ACCESS_TOKEN` (obrigatória)
- `MERCADO_PAGO_WEBHOOK_SECRET` (assinatura)

URL do webhook a configurar no painel MP:
`https://project--53224896-c153-4a7f-b008-00438dec8de6.lovable.app/api/public/webhooks/pix`

## Ordem de execução
1. Migrations (sales.pago_em, products.custo_real, expenses, cost_allocations, drop rateio_groups).
2. Bucket product-images + policies.
3. Secrets MP (pedir ao usuário).
4. Backend: pix-mp.functions.ts + webhook + image search/upload functions.
5. Frontend: PDV (Pix QR + Realtime + seletor de variação), Produtos (ImagePicker + variações), Rateio reescrito, Auth/Reset com confirmar senha.

Confirme para eu começar — vou pedir o `MERCADO_PAGO_ACCESS_TOKEN` e o `MERCADO_PAGO_WEBHOOK_SECRET` no início da execução.