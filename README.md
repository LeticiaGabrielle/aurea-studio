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
- `GET/PUT/DELETE` `/api/orcamentos/:id`
- `POST` `/api/orcamentos/:id/converter-pedido` — só se status `APROVADO`
- `GET/PUT/DELETE` `/api/pedidos/:id`
- `PATCH` `/api/pedidos/:id/status` — corpo `{ "status": "..." }`
- `GET` `/api/dashboard` — totais do painel

## Deploy no Render

1. Crie um **Web Service** ligado ao repositório.
2. **Build command:**

   ```bash
   npm install --prefix server && npm install --prefix client && npm run build --prefix client
   ```

3. **Start command:**

   ```bash
   NODE_ENV=production npm start --prefix server
   ```

4. O Render define `PORT`; o servidor escuta nessa porta e serve `client/dist` em produção.

### Persistência SQLite

O disco do serviço no Render é **efémero**: redeploys podem apagar a base. Para dados persistentes, use um [Render Disk](https://render.com/docs/disks) e defina `SQLITE_PATH` (ou `DATA_DIR`) para um caminho dentro do volume montado.

### Migração futura para PostgreSQL

- Mantenha os controladores finos e as queries em funções dedicadas (como neste projeto).
- Troque a camada `db.js` (hoje `sql.js` + ficheiro) por um cliente `pg`, use `$1,$2,...` nas queries e ajuste tipos (`SERIAL`, `TIMESTAMP`, etc.). A forma dos JSON da API pode permanecer igual.

## Regras de negócio (resumo)

- Orçamento **APROVADO** não pode ser editado; pode ser convertido em **um** pedido.
- Pedido **CANCELADO** não pode ser editado.
- `valorTotal = quantidade × valorUnitario`, `valorSinal = 50%` do total (orçamento e recalculado no pedido ao atualizar `valorTotal`).
- `lucro = valorTotal - custo` no pedido.

## Licença

Uso interno do projeto Aurea Studio.
