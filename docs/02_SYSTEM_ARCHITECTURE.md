# System Architecture

```text
React + TypeScript + Vite
        |
        v
   Django REST API
        |
        v
Service Layer + Repositories
        |
        v
   PostgreSQL
```

## Frontend

- renderiza telas e fluxo local
- consome API via `apiRequest`
- guarda sessao no browser
- trata erro de autenticacao

## Backend

- fornece contratos REST
- aplica regras de negocio
- envia email de verificacao
- valida Google OAuth
- produz dados financeiros e gamificacao

## Infra

- `docker compose` sobe banco, backend, frontend e SonarQube
- frontend usa `VITE_API_BASE_URL`
- backend usa `FRONTEND_URL` e `GOOGLE_CLIENT_ID`

