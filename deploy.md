# Deploy — Finance Couple

Frontend → Vercel  
Backend → Railway  
Banco de dados → PostgreSQL gerenciado pelo Railway

---

## Pré-requisitos

- Conta no [GitHub](https://github.com) com o código do projeto
- Conta no [Vercel](https://vercel.com) (gratuita)
- Conta no [Railway](https://railway.app) (gratuita, requer cartão de crédito para verificar)
- Senha de app do Gmail já configurada (`ipxiarwyuethqyll`)

---

## 1. Subir o código para o GitHub

Se ainda não tem repositório:

```bash
cd C:/Users/akira/OneDrive/Desktop/DaNa
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/finance-couple.git
git push -u origin main
```

> Certifique-se de que o `.gitignore` está ignorando `backend/.env` antes de dar push.

---

## 2. Deploy do Backend no Railway

### 2.1 Criar o projeto

1. Acesse [railway.app](https://railway.app) e clique em **New Project**
2. Escolha **Deploy from GitHub repo**
3. Selecione o repositório `finance-couple`
4. Railway detecta o `Dockerfile` — confirme

### 2.2 Configurar o Root Directory

Nas configurações do serviço:
- **Root Directory**: `backend`

### 2.3 Adicionar o PostgreSQL

1. No projeto Railway, clique em **+ New** → **Database** → **Add PostgreSQL**
2. Railway cria o banco e adiciona a variável `DATABASE_URL` automaticamente

### 2.4 Configurar as variáveis de ambiente

No serviço do backend, vá em **Variables** e adicione:

| Variável | Valor |
|---|---|
| `SECRET_KEY` | Gere uma chave forte (veja abaixo) |
| `ALLOWED_HOSTS` | `seu-projeto.railway.app` |
| `CORS_ALLOWED_ORIGINS` | `https://seu-projeto.vercel.app` |
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USE_TLS` | `True` |
| `EMAIL_HOST_USER` | `financecouple67@gmail.com` |
| `EMAIL_HOST_PASSWORD` | `ipxiarwyuethqyll` |
| `DEFAULT_FROM_EMAIL` | `Finance Couple <financecouple67@gmail.com>` |
| `FRONTEND_URL` | `https://seu-projeto.vercel.app` |
| `GOOGLE_CLIENT_ID` | *(deixe vazio se não usar OAuth agora)* |

**Gerar SECRET_KEY segura:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 2.5 Configurar o comando de start

Em **Settings** → **Deploy** → **Start Command**:
```
python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

### 2.6 Deploy

Clique em **Deploy**. O Railway vai:
1. Fazer build com o `Dockerfile`
2. Rodar `collectstatic`
3. Executar `migrate`
4. Subir o gunicorn

Quando aparecer **Active**, copie a URL pública do serviço (ex: `https://finance-couple-production.up.railway.app`).

---

## 3. Deploy do Frontend no Vercel

### 3.1 Importar o projeto

1. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**
2. Importe o repositório `finance-couple` do GitHub
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.2 Variáveis de ambiente

Adicione em **Environment Variables** antes de fazer o primeiro deploy:

| Variável | Valor |
|---|---|
| `VITE_API_BASE_URL` | `https://finance-couple-production.up.railway.app/api` |
| `VITE_GOOGLE_CLIENT_ID` | *(deixe vazio se não usar OAuth agora)* |

> A URL é a do Railway do passo 2.6.

### 3.3 Deploy

Clique em **Deploy**. Quando terminar, copie a URL do Vercel (ex: `https://finance-couple.vercel.app`).

---

## 4. Atualizar o Backend com a URL do Vercel

Volte no Railway e atualize as variáveis:

| Variável | Novo valor |
|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://finance-couple.vercel.app` |
| `FRONTEND_URL` | `https://finance-couple.vercel.app` |

Depois clique em **Redeploy** no Railway para aplicar.

---

## 5. Verificar se está funcionando

1. Acesse a URL do Vercel no navegador
2. Crie uma conta — o e-mail de verificação deve chegar em até 1 minuto
3. Clique no link do e-mail — deve validar e liberar o login
4. Faça login e confirme que o dashboard carrega

**Testar o backend diretamente:**
```
https://finance-couple-production.up.railway.app/api/
```
Deve retornar `{"success": true, ...}`.

---

## 6. Deploys futuros

Todo `git push` na branch `main` dispara automaticamente:
- Vercel reconstrói e republica o frontend
- Railway reconstrói e redeploya o backend

Não é necessário fazer nada manualmente.

---

## Resumo das URLs

| Serviço | URL |
|---|---|
| Frontend (Vercel) | `https://finance-couple.vercel.app` |
| Backend (Railway) | `https://finance-couple-production.up.railway.app` |
| API base | `https://finance-couple-production.up.railway.app/api` |

---

## Problemas comuns

**CORS bloqueando requisições**  
Confirme que `CORS_ALLOWED_ORIGINS` no Railway tem exatamente a URL do Vercel, sem barra no final.

**E-mail não chega**  
Confirme que `EMAIL_HOST_PASSWORD` é a senha de app do Gmail (16 caracteres sem espaços), não a senha da conta Google.

**Erro 500 no backend**  
Veja os logs no Railway em **Deployments** → **View Logs**. Geralmente é variável de ambiente faltando ou `SECRET_KEY` não configurada.

**Link de verificação abre página errada**  
Confirme que `FRONTEND_URL` no Railway aponta para a URL correta do Vercel.
