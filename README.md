# Aurea Studio — Gestão de orçamentos e pedidos

Sistema web para empresa de produtos personalizados (impressão 3D, NFC, etc.): **orçamentos** e **pedidos** separados, com SQLite, API REST e interface React.

## Stack

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express
- **Banco:** SQLite em ficheiro via **`sql.js`** (sem módulos nativos; fácil no Windows e no Render)
- **PDF:** `html2pdf.js` no navegador (a partir do preview do orçamento)

## Estrutura

```
/client   → React (Vite)
/server   → Express + SQLite
```

Organização sugerida no código: `components/`, `pages/`, `services/` (cliente) e `controllers/`, `models/` (servidor).

## Rodar localmente

### 1. Dependências

Na raiz do repositório:

```bash
npm install --prefix server
npm install --prefix client
```

### 2. API

```bash
npm run dev --prefix server
```

Por padrão a API sobe em `http://localhost:3001` (porta configurável com `PORT`).

### 3. Frontend

Em outro terminal:

```bash
npm run dev --prefix client
```

O Vite usa proxy de `/api` → `http://localhost:3001`, então **não é obrigatório** definir `VITE_API_URL` em desenvolvimento.

Opcional: copie `client/.env.example` para `client/.env` e ajuste.

### 4. Produção local (como no Render)

```bash
npm run build --prefix client
set NODE_ENV=production
set PORT=3001
npm start --prefix server
```

No PowerShell:

```powershell
$env:NODE_ENV="production"; $env:PORT="3001"; npm start --prefix server
```

Abra `http://localhost:3001` — o Express entrega o build estático do React e as rotas `/api/*`.

## Variáveis de ambiente (servidor)

| Variável       | Descrição |
|----------------|-----------|
| `PORT`         | Porta HTTP (Render injeta automaticamente). |
| `NODE_ENV`     | Use `production` para servir o React build. |
| `SQLITE_PATH`  | Caminho do ficheiro SQLite (opcional). |
| `DATA_DIR`     | Pasta onde criar `app.db` se `SQLITE_PATH` não for usado. |
| `CORS_ORIGIN`  | Origem permitida no CORS (opcional; por omissão reflete o pedido). |

## API REST

- `GET/POST` `/api/orcamentos` — listar (query: `status`, `search`) / criar  
  - Cada item pode incluir `possuiPedido` (boolean): se já existe pedido ligado ao orçamento.
- `GET/PUT/DELETE` `/api/orcamentos/:id`
- `POST` `/api/orcamentos/:id/converter-pedido` — só se status `APROVADO` e ainda **sem** pedido (reserva; ao aprovar no formulário o pedido é criado sozinho — ver regras abaixo).
- Ao **criar** ou **atualizar** orçamento com status `APROVADO`, o servidor **cria o pedido automaticamente** se ainda não existir. A resposta pode incluir `pedidoCriadoAutomaticamente` (objeto do pedido) **apenas nessa criação automática**.
- `GET/PUT/DELETE` `/api/pedidos/:id`
- `PUT` `/api/pedidos/:id` — corpo pode incluir `registroPagamento`: `A_COBRAR` | `PAGO_50` | `PAGO_100` (controlo interno de cobrança; **não** entra no PDF do orçamento).
- `PATCH` `/api/pedidos/:id/status` — corpo `{ "status": "..." }`
- `PATCH` `/api/pedidos/:id/registro-pagamento` — corpo `{ "registroPagamento": "A_COBRAR" | "PAGO_50" | "PAGO_100" }`
- `GET` `/api/dashboard` — totais do painel

## Deploy no Render

### Opção A — Blueprint (ficheiro `render.yaml` na raiz)

1. No [Render](https://render.com): **New** → **Blueprint**.
2. Ligue o repositório GitHub; o Render lê `render.yaml` e cria o **Web Service**.
3. Confirme **Build** e **Start** (já definidos no ficheiro). O **health check** usa `GET /api/health`.

### Opção B — Web Service manual

1. **New** → **Web Service** → escolha o repositório.
2. **Root directory:** raiz do projeto (`.`).
3. **Build command:**

   ```bash
   npm install --prefix server && npm install --prefix client && npm run build --prefix client
   ```

4. **Start command:**

   ```bash
   NODE_ENV=production npm start --prefix server
   ```

5. O Render define `PORT`; o servidor escuta nessa porta e serve `client/dist` em produção. **Não** defina `VITE_API_URL` se front e API forem o mesmo URL (produção única).

### Persistência SQLite

O disco do serviço no Render é **efémero**: redeploys podem apagar a base. Para dados persistentes, use um [Render Disk](https://render.com/docs/disks) e defina `SQLITE_PATH` (ou `DATA_DIR`) para um caminho dentro do volume montado.

### Migração futura para PostgreSQL

- Mantenha os controladores finos e as queries em funções dedicadas (como neste projeto).
- Troque a camada `db.js` (hoje `sql.js` + ficheiro) por um cliente `pg`, use `$1,$2,...` nas queries e ajuste tipos (`SERIAL`, `TIMESTAMP`, etc.). A forma dos JSON da API pode permanecer igual.

## Regras de negócio (resumo)

- Ao **guardar** um orçamento com status **APROVADO** (criação ou edição), o sistema **gera o pedido automaticamente** (um pedido por orçamento). Assim o pedido passa a aparecer na lista e no dashboard sem precisar clicar em «Converter em pedido» (esse botão só aparece se, por algum motivo, ainda não existir pedido).
- Orçamento **APROVADO** não pode ser editado depois de aprovado.
- Pedido **CANCELADO** não pode ser editado.
- No **pedido**, o campo **`registroPagamento`** (`A_COBRAR`, `PAGO_50`, `PAGO_100`) serve só para controlo interno (saber se falta cobrar, se já recebeu o sinal ou o total). **Não** é mostrado no PDF do orçamento.
- `valorTotal = quantidade × valorUnitario`, `valorSinal = 50%` do total (orçamento e recalculado no pedido ao atualizar `valorTotal`).
- `lucro = valorTotal - custo` no pedido.

## Licença

Uso interno do projeto Aurea Studio.
