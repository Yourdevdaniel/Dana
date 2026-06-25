# Security

## Autenticacao

- JWT com access e refresh
- sessao expira e pode ser renovada
- login com Google validado no backend

## Cadastro

- senha forte obrigatoria
- email unico
- verificacao por link

## Protecoes

- rate limit em login, cadastro e reenvio de verificacao
- bloqueio temporario apos varias falhas
- mensagens neutras para evitar enumeracao
- hash de senha no banco

## Perfil

- avatar em base64 com limite de tamanho
- nao expor campos sensiveis em perfil publico

## Operacao

- audit log para eventos sensiveis
- CORS restrito aos clientes conhecidos

