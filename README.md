# Pão na Chapa

Padaria e doceria com pedidos, reserva de fornada, encomendas e fidelidade.

> **Demonstração pública.** Telefones, WhatsApp, e-mail, endereço, CNPJ, redes sociais e dados de clientes são fictícios. Nenhum pedido, mensagem ou formulário é enviado a um canal real.

[**Ver demonstração**](https://pao-na-chapa.vercel.app) · Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL + Drizzle ORM · Tailwind CSS 4

## O que tem

- Cardápio com produtos e disponibilidade
- Pedido e reserva de fornada
- Encomendas personalizadas com sinal
- Cupons e programa de fidelidade
- Painel de produção e clientes

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- PostgreSQL + Drizzle ORM
- Tailwind CSS 4

## Rodando localmente

```bash
npm ci
cp .env.example .env.local
# edite .env.local com a sua connection string
npm run dev
```

Acesse `http://localhost:3000`.

## Variáveis de ambiente

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Connection string PostgreSQL/Neon |

## Banco de dados

PostgreSQL no Neon (banco `padaria`). O schema fica em `src/db/schema.ts` e é aplicado com `npx drizzle-kit push`. Em produção, use uma connection string Neon com `sslmode=require`.

## Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Vitrine e pedidos |
| `/loja` | Experiência de loja |

## Testes e qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Deploy

O deploy é feito na Vercel. Configure as variáveis acima no painel do projeto, conecte o repositório e use `npm run build`.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/app/` | Rotas e API |
| `src/components/` | Storefront, painel e UI |
| `src/db/` | Schema Drizzle |
| `src/lib/` | Store, seed e regras de pedido |

## Licença

MIT — veja [LICENSE](LICENSE).
