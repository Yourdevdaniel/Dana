# Backend Spec

## Entrada

- `backend/config/urls.py`
- `backend/config/settings/base.py`
- `backend/apps/*`

## Responsabilidades

- autenticao
- verificacao de email
- Google login
- dados do usuario
- dashboard financeiro
- gamificacao
- auditar eventos

## Apps

- `auth_app`
- `users`
- `couples`
- `wallet`
- `transactions`
- `categories`
- `goals`
- `debts`
- `fixed_expenses`
- `gamification`
- `dashboard`
- `notifications`
- `audit`

## Regras de contrato

- manter envelope JSON padrao
- nao retornar campos sensiveis
- seguir rate limit e politicas de seguranca

