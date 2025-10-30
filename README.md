# VSM Form - Envio automático + Google Sheets

Projeto que contém frontend responsivo e backend Node.js para:
- Enviar automaticamente um e-mail via SMTP quando o formulário é submetido.
- Salvar cada submissão como uma linha em uma planilha Google Sheets.
- Frontend moderno e responsivo (arquivo `public/index.html`).

## Estrutura
```
vsm-form/
├─ server.js
├─ package.json
├─ .env.example
├─ public/
│  └─ index.html
└─ README.md
```

## Instalação rápida
1. Copie `.env.example` para `.env` e preencha as variáveis.
2. Instale dependências: `npm install`
3. Rode em dev: `npm run dev` ou produção: `npm start`
4. Abra `http://localhost:3000`

## Google Sheets
- Crie uma Service Account no Google Cloud Console.
- Ative a API Google Sheets para o projeto.
- Gere uma chave JSON e copie `client_email` e `private_key` para `.env`.
- Compartilhe a planilha com o `client_email` da service account com permissão de editor.
- Cole o `SHEET_ID` no `.env`.

## SMTP
- Você pode usar Gmail (recomendado: App Password) ou outro provedor SMTP.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS` no `.env`.

## Segurança
- Nunca comite seu `.env` em repositórios públicos.
- Proteja acesso ao servidor e à planilha.
