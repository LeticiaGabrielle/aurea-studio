# Aurea Studio — Gestão de orçamentos e pedidos

Sistema web para empresa de produtos personalizados (impressão 3D, NFC, etc.): **orçamentos** e **pedidos** separados, com API REST e interface React. O servidor usa **SQLite** (ficheiro local) por omissão ou **PostgreSQL** quando existe `DATABASE_URL` (recomendado no Render para os dados não sumirem).

## Stack

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express
- **Banco:** SQLite (`sql.js`) por omissão; **PostgreSQL** (`pg`) se definires `DATABASE_URL` (persistência real em hosting efémero)
- **PDF:** `html2pdf.js` no navegador (a partir do preview do orçamento)

## Estrutura

```
/client   → React (Vite)
/server   → Express + SQLite ou PostgreSQL
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
| `DATABASE_URL` | URL PostgreSQL; se definida, **não** usa SQLite (dados persistentes no host). |
| `DATABASE_SSL` | `false` para Postgres local sem TLS. |
| `SQLITE_PATH`  | Caminho do ficheiro SQLite (opcional; ignorado se `DATABASE_URL` existir). |
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

## Deploy no Render (guia completo)

Um único **Web Service** serve a API e o React compilado. O browser usa URLs **relativas** (`/api/...`) — **não** precisa de `VITE_API_URL` neste modo.

### Variáveis de ambiente no painel Render

| Variável | Obrigatória? | Valor recomendado | Notas |
|----------|----------------|-------------------|--------|
| `NODE_ENV` | Sim | `production` | Sem isto o Express **não** envia o ficheiros estáticos do React. |
| `PORT` | Não mexer | *(Render preenche)* | O Render injeta a porta; o `server` já usa `process.env.PORT`. |
| `VITE_API_URL` | Não | *(vazio / não criar)* | Só para monólito: o build do Vite fica com `""` e o `fetch` usa o mesmo host. |
| `DATA_DIR` ou `SQLITE_PATH` | Opcional | ex. `/data` | Só SQLite: com **Persistent Disk** montado; ver abaixo. |
| `DATABASE_URL` | **Recomendado no Render** | *(URL interna do Postgres)* | Com **PostgreSQL** no Render (ou Neon, etc.): os dados **persistem** entre deploys. Se existir, o servidor **ignora** o ficheiro SQLite. |
| `DATABASE_SSL` | Opcional | `false` | Postgres local sem SSL (ex. Docker em `localhost`). |
| `CORS_ORIGIN` | Opcional | URL do site | Só se o front estiver noutro domínio; no deploy único pode omitir. |

**Onde configurar:** no Render → o teu serviço → **Environment** → *Add Environment Variable*.

### Opção A — Blueprint (`render.yaml`)

1. [render.com](https://render.com) → **New** → **Blueprint**.
2. Conecta o repositório GitHub (ex. `LeticiaGabrielle/aurea-studio`).
3. O Render propõe o serviço `aurea-studio`; confirma **Apply**.
4. Garante que existe `NODE_ENV` = `production` (já vem no `render.yaml`).
5. Espera o **deploy** ficar verde; abre o URL `https://<nome>-<hash>.onrender.com`.

### Opção B — Web Service manual

1. **New** → **Web Service** → escolhe o repo.
2. **Name:** à tua escolha.
3. **Region:** ex. Oregon (ou mais perto dos utilizadores).
4. **Branch:** `main` (ou a que usas).
5. **Root directory:** `.` (raiz do repo).
6. **Runtime:** Node.
7. **Build command:**

   ```bash
   npm install --prefix server && npm install --prefix client && npm run build --prefix client
   ```

8. **Start command:**

   ```bash
   NODE_ENV=production npm start --prefix server
   ```

9. **Health check path:** `/api/health`
10. Em **Environment**, adiciona `NODE_ENV` = `production` (se não estiver).
11. **Create Web Service**.

### Depois do primeiro deploy

- **Auto Deploy:** Settings → *Auto-Deploy* → **Yes** (deploy a cada push na branch).
- O primeiro arranque no plano gratuito pode demorar (~1 min) após inatividade (*cold start*).

### Persistência no Render (orçamentos que não somem)

**Recomendado:** cria uma base **PostgreSQL** no Render (**New** → **PostgreSQL**), espera ficar disponível e, no **Web Service** da app, em **Environment** → **Add** → cola a variável **`DATABASE_URL`** com o valor que o Render mostra (ligações *Internal Database URL* ao mesmo serviço/rede). Volta a fazer **deploy** da app. O endpoint `GET /api/health` devolve `"db": "postgresql"` quando está ativo.

**Alternativa:** SQLite com disco persistente (abaixo) — costuma exigir plano pago no Render.

### Persistência SQLite (dados que não se perdem no redeploy)

Sem `DATABASE_URL` e sem disco, o ficheiro `app.db` fica no disco **efémero** do contentor: cada deploy pode apagar os dados.

1. No serviço → **Disks** → **Add Disk** (plano pago ou conforme a tua conta Render).
2. Monta por exemplo em **`/data`**.
3. Em **Environment** adiciona:

   - `DATA_DIR` = `/data`

   (o servidor grava `app.db` dentro de `DATA_DIR`; ver `server/db.js`.)

Alternativa: `SQLITE_PATH` = `/data/app.db` (caminho completo do ficheiro).

Documentação: [Render Disks](https://render.com/docs/disks).

### Erro de build `Exited with status 127` ou `vite: not found`

Em muitos hosts (ex. Vercel), o `npm install` em produção **não instala** `devDependencies`. O script `vite build` precisa do pacote `vite`, que estava em `devDependencies` — daí o comando não existir (**127**).

Neste projeto, **Vite e ferramentas de build do client estão em `dependencies`**, para o build funcionar com `NODE_ENV=production`.

Também foi removida a dependência inválida `file:..` do `client/package.json` (quebrava instalações em CI).

**Nota:** Este sistema completo (API + SQLite + React) combina com **um Web Service no Render** (ou similar). Se publicares **só** o front noutro serviço, tens de definir `VITE_API_URL` para a URL da API e esse serviço não servirá `/api` sozinho.

## Regras de negócio (resumo)

- Ao **guardar** um orçamento com status **APROVADO** (criação ou edição), o sistema **gera o pedido automaticamente** (um pedido por orçamento). Assim o pedido passa a aparecer na lista e no dashboard sem precisar clicar em «Converter em pedido» (esse botão só aparece se, por algum motivo, ainda não existir pedido).
- Orçamento **APROVADO** não pode ser editado depois de aprovado.
- Pedido **CANCELADO** não pode ser editado.
- No **pedido**, o campo **`registroPagamento`** (`A_COBRAR`, `PAGO_50`, `PAGO_100`) serve só para controlo interno (saber se falta cobrar, se já recebeu o sinal ou o total). **Não** é mostrado no PDF do orçamento.
- `valorTotal = quantidade × valorUnitario`, `valorSinal = 50%` do total (orçamento e recalculado no pedido ao atualizar `valorTotal`).
- `lucro = valorTotal - custo` no pedido.

## Licença

Uso interno do projeto Aurea Studio.
