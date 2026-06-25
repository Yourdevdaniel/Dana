# Atualizações de Backend para o Frontend

## 1. Política de Senha Forte (causa do erro 400 no cadastro)

O backend agora valida a senha com as seguintes regras. O frontend deve validar **antes** de enviar para evitar round-trip desnecessário:

- Mínimo 8 caracteres
- Ao menos 1 letra maiúscula
- Ao menos 1 letra minúscula
- Ao menos 1 número
- Ao menos 1 caractere especial (`!@#$%^&*-_=+?`)

Se a senha não atender, o backend retorna:
```json
{
  "success": false,
  "errors": [{ "field": "password", "message": "Senha deve conter: ao menos uma letra maiúscula, ao menos um caractere especial." }]
}
```

---

## 2. Verificação de Email (novo fluxo de cadastro)

Após o cadastro, o usuário recebe um email com link de verificação. **O login fica bloqueado até verificar o email.**

### Fluxo:
1. `POST /api/auth/register/` → cria conta, envia email, retorna tokens
2. Usuário clica no link → `GET /api/auth/verify-email/<token>/`
3. `POST /api/auth/login/` → só funciona após verificação

### Resposta do register agora inclui:
```json
{
  "success": true,
  "message": "Conta criada. Verifique seu email para ativar o login.",
  "data": {
    "user": { "is_email_verified": false, ... },
    "access": "...",
    "refresh": "..."
  }
}
```

### Erro ao tentar login sem verificar:
```json
{
  "success": false,
  "errors": [{ "field": "non_field_errors", "message": "Verifique seu email antes de fazer login. Acesse sua caixa de entrada." }]
}
```

### Reenviar email de verificação:
```
POST /api/auth/resend-verification/
Body: { "email": "usuario@email.com" }
```
Sempre retorna 200 (não confirma se o email existe — segurança).

### Rota de verificação (o link no email aponta para o frontend):
```
http://localhost:5173/verify-email/<token>
```
O frontend deve pegar o `<token>` da URL e chamar:
```
GET /api/auth/verify-email/<token>/
```

---

## 3. Bloqueio por Tentativas Falhas de Login

Após **5 tentativas erradas**, a conta é bloqueada por 15 minutos.

```json
{
  "success": false,
  "errors": [{ "field": "non_field_errors", "message": "Conta temporariamente bloqueada. Tente novamente em 15 minutos." }]
}
```

---

## 4. Login com Google

Novo endpoint disponível:
```
POST /api/auth/google/
Body: { "id_token": "<token do Google>" }
```
Retorna os mesmos tokens JWT do login normal. Cria a conta automaticamente se o email ainda não existir.

---

## 5. Avatar em Base64

O campo `avatar` agora armazena **base64** em vez de URL de arquivo.

- Formato aceito: `data:image/jpeg;base64,...` ou `data:image/png;base64,...`
- Tamanho máximo: **2 MB** (decoded)
- Formatos permitidos: JPEG e PNG

Enviar via `PATCH /api/users/me/`:
```json
{ "avatar": "data:image/jpeg;base64,/9j/4AAQ..." }
```

---

## 6. Campo Novo no Usuário

O objeto `user` agora inclui `is_email_verified`:
```json
{
  "id": "uuid",
  "email": "...",
  "name": "...",
  "avatar": null,
  "date_of_birth": null,
  "total_xp": 0,
  "is_email_verified": false,
  "created_at": "..."
}
```

---

## 7. Descoberta de Perfis Públicos (novo)

```
GET /api/users/profiles/              → lista todos os usuários ativos
GET /api/users/profiles/?search=nome  → busca por nome ou email
GET /api/users/profiles/<uuid>/       → detalhe de um perfil
```

Retorna apenas campos públicos (sem email, sem data de nascimento):
```json
{ "id": "uuid", "name": "...", "avatar": null, "total_xp": 0, "created_at": "..." }
```
