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

## Rodada de frontend - controles financeiros e sociais

### O que o Codex fez no frontend

- Carteira:
  - Adicionou o bloco `Definir saldo atual`.
  - O front calcula a diferenca entre o saldo atual da carteira e o saldo informado.
  - Se a diferenca for positiva, cria uma transacao `income` com descricao `Ajuste de saldo`.
  - Se a diferenca for negativa, cria uma transacao `expense` com descricao `Ajuste de saldo`.
  - Isso evita saldo manual fora do motor financeiro e usa o calculo existente da carteira.

- Exclusoes:
  - Transacoes agora tem botao de apagar chamando `DELETE /api/transactions/{id}/`.
  - Categorias personalizadas agora tem botao de apagar chamando `DELETE /api/categories/{id}/`.
  - Categorias de sistema nao mostram botao de apagar.
  - Metas agora tem botao de apagar chamando `DELETE /api/goals/{id}/`.
  - Dividas agora tem botao de apagar chamando `DELETE /api/debts/{id}/`.
  - Contas fixas agora tem botao de apagar chamando `DELETE /api/fixed-expenses/{id}/`.
  - Casal/grupo agora tem botao `Sair do casal`, chamando `DELETE /api/couples/`.

- Dividas:
  - Adicionado botao `Paga`.
  - O front chama `PATCH /api/debts/{id}/` com `paid_amount` igual a `amount`.
  - Visualmente considera completa quando `remaining <= 0` ou `status === "paid"`.

- Casal/grupo:
  - Adicionada UI para mudar nome do grupo.
  - Adicionada UI para foto do casal/grupo.
  - A foto e o nome ficam salvos localmente por enquanto:
    - `finance-couple:couple-name:{couple_id}`
    - `finance-couple:couple-avatar:{couple_id}`
  - O front tambem tenta chamar `PATCH /api/couples/` com `{ name, avatar }`, para ficar pronto quando o backend aceitar.
  - Integrantes do casal aparecem com foto/avatar na pagina Casal.
  - Integrantes tambem aparecem na sidebar lateral.

- Sidebar:
  - Sidebar agora pode ser recolhida no desktop.
  - Quando recolhida, mostra apenas icones e fotos dos integrantes.
  - No mobile manteve o comportamento de menu aberto/fechado.

- Perfil/conta:
  - Adicionado bloco `Deletar conta`.
  - O usuario precisa digitar `DELETAR`.
  - O front chama `DELETE /api/users/me/` e limpa a sessao se o backend confirmar.

- Badges/conquistas:
  - A aba de badges do perfil agora permite destacar badges reais e tambem conquistas ganhas pelo motor local de conquistas.
  - Conquistas destacadas ficam salvas no mesmo storage local do perfil com prefixo `achievement:`.

- Rede:
  - A pagina `Rede` deixou de ser busca de pessoas.
  - Agora mostra `Ranking global`, usando `data.ranking` carregado de `/api/gamification/ranking/`.
  - O ranking destaca o usuario atual quando ele aparece no top.

### O que o Claude precisa fazer no backend

- Dividas:
  - Ajustar `DebtCreateSerializer` ou criar serializer de update para aceitar `status`.
  - Quando `paid_amount >= amount`, o backend deve definir `status = "paid"` automaticamente.
  - `remaining` nunca deve retornar valor negativo; usar zero quando pago acima do valor.
  - Criar endpoint explicito opcional:
    - `POST /api/debts/{id}/pay/`
    - Deve marcar `paid_amount = amount`, `status = paid` e retornar a divida atualizada.

- Carteira:
  - Confirmar que o saldo da carteira considera apenas transacoes nao deletadas.
  - Confirmar que transacao de tipo `income` soma e `expense` diminui.
  - Opcional: criar endpoint `POST /api/wallet/adjust-balance/` que recebe `{ target_balance }`, calcula diferenca no backend e cria a transacao de ajuste com auditoria.

- Exclusoes:
  - Garantir que todos os endpoints usados pelo front existem e estao protegidos por usuario:
    - `DELETE /api/transactions/{id}/`
    - `DELETE /api/categories/{id}/`
    - `DELETE /api/goals/{id}/`
    - `DELETE /api/debts/{id}/`
    - `DELETE /api/fixed-expenses/{id}/`
    - `DELETE /api/couples/`
  - Categorias de sistema nao devem poder ser apagadas por usuarios.
  - Deletar transacao deve recalcular carteira/dashboard corretamente.

- Casal/grupo:
  - Adicionar campos ao modelo `CoupleGroup`:
    - `avatar` ou `avatar_base64`, nullable.
    - `updated_at`, se ainda nao existir via `BaseModel`.
  - Implementar `PATCH /api/couples/`:
    - aceita `name`;
    - aceita `avatar`;
    - apenas membro do casal pode editar;
    - retorna `id`, `name`, `avatar`, `invite_code`, `members`, `created_at`.
  - Atualizar serializer `CoupleGroupSerializer` para incluir `avatar`.

- Conta:
  - Implementar `DELETE /api/users/me/`.
  - Comportamento esperado:
    - soft delete preferencial: `is_active = False`;
    - invalidar tokens se houver blacklist;
    - preservar auditoria;
    - impedir login posterior.
  - Retornar envelope padrao de sucesso.

- Ranking global:
  - Confirmar que `/api/gamification/ranking/` ordena por `total_xp desc`.
  - Confirmar que retorna top 10 global no formato:
    - `rank`
    - `user.id`
    - `user.name`
    - `user.avatar`
    - `total_xp`
  - Nao retornar email nem data de nascimento no ranking.

- Badges/conquistas:
  - Se quiser persistencia real dos destaques do perfil, criar endpoint para salvar destaques:
    - `GET/PATCH /api/users/me/featured-badges/`
    - aceitar ids de badges reais e ids de conquistas locais ou transformar conquistas em badges persistidas.

### Validacao feita pelo Codex nesta rodada

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- `npm.cmd test -- --run` passou.
- O build continua emitindo apenas o aviso de chunk grande do Vite.
