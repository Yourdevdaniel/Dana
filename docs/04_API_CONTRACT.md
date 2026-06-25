# API Contract

## Envelope

Todas as respostas usam o formato:

```json
{
  "success": true,
  "data": {},
  "message": "",
  "errors": []
}
```

## Auth

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `POST /api/auth/refresh/`
- `GET /api/auth/verify-email/<token>/`
- `POST /api/auth/resend-verification/`
- `POST /api/auth/google/`

## Users

- `GET /api/users/me/`
- `PATCH /api/users/me/`
- `GET /api/users/profiles/`
- `GET /api/users/profiles/<id>/`

## Couples

- `GET /api/couples/`
- `POST /api/couples/`
- `POST /api/couples/join/`
- `POST /api/couples/leave/`

## Dashboard

- `GET /api/dashboard/`
- `GET /api/dashboard/couple/`

## Finance

- wallet
- salaries
- transactions
- categories
- goals
- debts
- fixed expenses

## Gamification

- `GET /api/gamification/badges/`
- `GET /api/gamification/xp/`
- `GET /api/gamification/ranking/`

