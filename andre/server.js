/**
 * server.js
 * Backend Express que:
 * - Recebe POST /api/submit com os campos do formulário
 * - Valida minimamente
 * - Envia e-mail via nodemailer (SMTP)
 * - Salva uma linha na planilha do Google Sheets
 *
 * Requer variáveis de ambiente (ver .env.example)
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const TO_EMAIL = process.env.TO_EMAIL || "cadastro@vsm.com.br";

// --- Nodemailer (SMTP) setup ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// --- Google Sheets setup ---
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const jwtClient = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  SCOPES
);
const sheets = google.sheets({ version: 'v4', auth: jwtClient });
const SHEET_ID = process.env.SHEET_ID;

// Utility: build readable body from object
function buildBody(obj) {
  let s = '';
  for (const key of Object.keys(obj)) {
    s += `${key}: ${obj[key]}\n`;
  }
  return s;
}

// Minimal validation
function validatePayload(p) {
  const required = ['Razao_Social', 'Nome_Fantasia', 'CNPJ_Novo'];
  const errors = [];
  required.forEach(k => {
    if (!p[k] || p[k].toString().trim() === '') errors.push(`${k} é obrigatório`);
  });
  return errors;
}

app.post('/api/submit', async (req, res) => {
  try {
    const payload = req.body || {};
    // Normalize labels: if fields come from "nova" variant, map to main names
    const normalized = {
      Tipo: payload.tipo || payload._tipo || payload.Tipo || 'N/A',
      Razao_Social: payload.razao || payload.razao2 || '',
      Nome_Fantasia: payload.fantasia || payload.fantasia2 || '',
      CNPJ_Novo: payload.cnpj_novo || payload.cnpj_novo2 || '',
      Importacao_Estoque: payload.estoque || '',
      Certificado_Digital: payload.certificado || payload.certificado2 || '',
      Apto_Vendas: payload.vendas || payload.vendas2 || '',
      Modelo_Documento: payload.modelo || '',
      Modelo_Vinculado: payload.vinculado || '',
      SNGPC: payload.sngpc || '',
      Avant_Integration: payload.avant || payload.avant2 || '',
      Finaliza_CNPJ_Antigo: payload.finaliza || payload.finaliza2 || '',
      Observacoes: payload.observacoes || ''
    };

    const validationErrors = validatePayload(normalized);
    if (validationErrors.length) {
      return res.status(400).json({ ok: false, errors: validationErrors });
    }

    // 1) Enviar e-mail
    const subject = normalized.Tipo && normalized.Tipo.toLowerCase().includes('nova')
      ? 'Alteração CNPJ - Nova Loja' : 'Alteração CNPJ - Via Banco de Dados';

    const textBody = `Olá,\n\nSegue solicitação de alteração de CNPJ:\n\n${buildBody(normalized)}\nEnviado em: ${new Date().toLocaleString()}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: TO_EMAIL,
      subject: subject,
      text: textBody
    };

    await transporter.sendMail(mailOptions);

    // 2) Salvar no Google Sheets (append)
    if (!SHEET_ID) {
      console.warn('SHEET_ID não configurado — pulando gravação no Sheets.');
    } else {
      const row = [
        new Date().toISOString(),
        normalized.Tipo,
        normalized.Razao_Social,
        normalized.Nome_Fantasia,
        normalized.CNPJ_Novo,
        normalized.Importacao_Estoque,
        normalized.Certificado_Digital,
        normalized.Apto_Vendas,
        normalized.Modelo_Documento,
        normalized.Modelo_Vinculado,
        normalized.SNGPC,
        normalized.Avant_Integration,
        normalized.Finaliza_CNPJ_Antigo,
        normalized.Observacoes
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'A1', // will append
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row]
        }
      });
    }

    return res.json({ ok: true, message: 'Enviado e salvo com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Erro interno: ' + err.message });
  }
});

// Fallback: serve frontend index
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
