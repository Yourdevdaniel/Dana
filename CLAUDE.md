# Investimentos - handoff para backend

## O que foi feito no frontend

- Adicionada a pagina `Investimentos` no menu lateral do app React.
- A tela permite cadastrar ativos com:
  - nome do ativo;
  - classe: `renda_fixa`, `acoes`, `fundos`, `cripto`, `exterior`, `outros`;
  - instituicao;
  - valor investido;
  - valor atual;
  - aporte mensal;
  - data da compra.
- A tela mostra:
  - total investido;
  - valor atual da carteira;
  - resultado em reais;
  - aporte mensal total;
  - rentabilidade acumulada;
  - grafico de evolucao aportado vs. atual;
  - grafico de distribuicao por classe;
  - grafico de barras por classe;
  - lista de ativos com remocao local.
- Enquanto nao existe API, os investimentos ficam em `localStorage` por usuario:
  - chave: `finance-couple:investments:{user_id}`.
- Campos monetarios relevantes do frontend agora usam mascara BRL visual (`R$ 1.234,56`) e continuam guardando/enviando decimal string (`1234.56`).
- O select nativo foi ajustado para fundo escuro/texto claro, porque as opcoes estavam pouco legiveis.
- O dashboard agora mostra um card `Suas dividas` com o total restante e ate 3 dividas em aberto.

## O que o backend precisa fazer

Criar um app Django para investimentos, preferencialmente `apps/investments`, seguindo o padrao dos apps existentes (`models.py`, `serializers.py`, `repositories.py`, `services.py`, `views.py`, `urls.py`, `tests/`).

### Modelo esperado

`Investment`

- `id`: UUID.
- `user`: FK para usuario dono do investimento.
- `name`: string obrigatoria.
- `asset_type`: enum/string com valores:
  - `renda_fixa`
  - `acoes`
  - `fundos`
  - `cripto`
  - `exterior`
  - `outros`
- `institution`: string opcional.
- `invested_amount`: decimal, maior que zero.
- `current_amount`: decimal, maior ou igual a zero. Se nao enviado, usar `invested_amount`.
- `monthly_contribution`: decimal, maior ou igual a zero, default `0`.
- `purchase_date`: date obrigatoria.
- `created_at` e `updated_at`.

### Endpoints esperados

Base: `/api/investments/`

- `GET /api/investments/`
  - Lista os investimentos do usuario autenticado.
- `POST /api/investments/`
  - Cria investimento.
- `PATCH /api/investments/{id}/`
  - Atualiza investimento do usuario autenticado.
- `DELETE /api/investments/{id}/`
  - Remove investimento do usuario autenticado.
- `GET /api/investments/summary/`
  - Retorna resumo consolidado para os cards/graficos.

### Payload de item

```json
{
  "id": "uuid",
  "name": "Tesouro Selic",
  "asset_type": "renda_fixa",
  "institution": "NuInvest",
  "invested_amount": "1000.00",
  "current_amount": "1040.00",
  "monthly_contribution": "200.00",
  "purchase_date": "2026-06-26",
  "created_at": "2026-06-26T12:00:00Z",
  "updated_at": "2026-06-26T12:00:00Z"
}
```

### Payload de resumo

```json
{
  "total_invested": "1000.00",
  "total_current": "1040.00",
  "result": "40.00",
  "profitability_percent": "4.00",
  "monthly_contribution": "200.00",
  "by_type": [
    { "name": "Renda fixa", "value": "1040.00" }
  ],
  "evolution": [
    { "date": "2026-06-26", "invested": "1000.00", "current": "1040.00" }
  ]
}
```

## Comportamento esperado depois da API

- Substituir `localStorage` no frontend por chamadas reais para `/api/investments/`.
- Carregar investimentos junto com `loadData`.
- Criar investimento via `POST`.
- Remover investimento via `DELETE`.
- Se o backend entregar `/summary/`, preferir os dados do backend para cards e graficos.
- Investimentos devem ser sempre isolados por usuario autenticado; um usuario nao pode listar, editar ou apagar ativos de outro usuario.
- Retornar erros no envelope padrao do projeto (`success`, `data`, `message`, `errors`).

## Validacao feita

- `npm.cmd run build` passou no frontend.
- O build gerou apenas o aviso existente de chunk grande do Vite.
