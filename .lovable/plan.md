## Visão geral

Você escolheu os 4 blocos. Vou entregar em ondas para garantir qualidade — cada onda é um turno meu. Se aprovar este plano, **começo agora pela Onda 1**.

---

## Onda 1 — Correções de UI + Vendedores + Leitor de código de barras

**Correção da sidebar**
- Refatoro `src/routes/app.tsx` para usar o padrão shadcn `Sidebar` + `SidebarTrigger` + `Sheet` no mobile (em vez do drawer manual atual). Isso elimina o "X" fantasma que sobrepõe o hambúrguer.
- Botão do menu sempre visível no header mobile, com área de toque de 44px, e o trigger desktop colado ao topo.
- Varro as páginas internas (`page-header`, listagens) aplicando o padrão grid `minmax(0,1fr) auto` + `min-w-0`/`shrink-0`/`truncate` para nada sobrepor.

**Vendedores (CRUD completo)**
- Migração: adiciona `cpf` (único por empresa) em `profiles`, índice e validação. `ativo` já existe.
- Server function `admin-invite-user` (`createServerFn` + `requireSupabaseAuth` + checagem de role admin) que cria o usuário no Auth (via `supabaseAdmin`), cria profile vinculado à empresa atual e atribui o role `vendedor` (ou gerente).
- Tela `/app/vendedores` (ou aba dentro de Usuários): criar, editar, bloquear (`ativo=false`), reativar e excluir.
- PDV: continua gravando `created_by` na venda (já existe). Adiciono coluna "Vendedor" nos relatórios e no histórico de vendas.

**Leitor de código de barras no cadastro de produto**
- Campo "Código de barras" passa a ter:
  - input manual (já existe);
  - botão "Escanear com câmera" → abre um `Dialog` com leitor via `@zxing/browser` (suporta EAN-13/UPC/Code128/QR);
  - suporte nativo a leitores USB/Bluetooth: o input fica em modo "scanner" detectando entrada rápida + Enter, então qualquer leitor que se comporte como teclado funciona automaticamente.
- Mesmo leitor reaproveitado no PDV (botão "scanner" ao lado da busca).

---

## Onda 2 — Estoque por temperatura/embalagem + tela Estoque completo

- Migração: nova tabela `product_variants` (product_id, tipo ∈ {unidade, fardo, caixa}, temperatura ∈ {quente, gelado}, estoque, estoque_minimo, preco_custo, preco_venda, ativo). Variantes opcionais por produto (você só ativa as que existem).
- Trigger atualiza `products.estoque` agregado para retrocompatibilidade.
- `stock_movements` e `sale_items` ganham `variant_id` (nullable para histórico).
- PDV mostra seletor de variante quando o produto tem mais de uma.
- Nova tela **Estoque** (`/app/estoque`) com tabela detalhada: imagem, categoria, código, mínimo, quente/gelado, un/fardo/caixa, custo, venda, **margem (%)**, validade, última movimentação, e drawer com histórico completo.

---

## Onda 3 — Rateio + Gerador de Posts + IA de Promoções

- **Rateio:** tabelas `rateio_groups` e `rateio_participants` (nome, valor, pago?, data). Tela cria grupo, calcula valor individual, registra pagamentos, mostra pendentes e gera relatório.
- **Gerador de Posts:** módulo de marketing que renderiza arte promocional num `<canvas>` (3 templates), usando imagem do produto + logo + preço + telefone + endereço da empresa. Botão "Copiar legenda" + "Compartilhar no WhatsApp" (link `wa.me`). Tudo client-side, sem custo de IA.
- **IA de promoções e metas:** server function chamando Lovable AI (Gemini 3 Flash) que recebe produtos com baixo giro / parados / perto do vencimento e devolve sugestões estruturadas (desconto sugerido, meta de unidades, previsão de lucro, tempo estimado para zerar). Exibido num painel `/app/inteligencia` com alertas no Dashboard.

---

## Onda 4 — Pix dinâmico com confirmação automática

- Tela de **Configurações → Chaves Pix**: CRUD de chaves (tipo, valor, banco, titular, status), com uma marcada como padrão.
- PDV: ao escolher Pix, chama server function que gera QR dinâmico vinculado à venda (via provedor escolhido — Mercado Pago, Asaas ou Efí, decidiremos antes desta onda).
- Webhook público em `/api/public/webhooks/pix` valida assinatura, marca a venda como Paga, registra data/hora e dispara realtime para a tela do PDV mudar para "Pagamento confirmado ✅".
- Painel admin com histórico de transações Pix (pendentes/pagas/canceladas) por chave.

> Para a Onda 4 vou precisar das credenciais do provedor — pedirei via `add_secret` no momento certo.

---

## O que entrego neste turno

Onda 1 inteira: correção do menu/overlap, CRUD de vendedores com CPF e bloqueio, e leitor de código de barras (câmera + USB/BT) no cadastro de produto e PDV.

Confirma que sigo?