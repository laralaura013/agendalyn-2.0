// src/routes/integrations/google.js
const express = require('express');
const router = express.Router();

/**
 * 👉 Troque por sua lógica real de troca/salva de tokens
 * (se você já tem um serviço pronto, chame-o aqui)
 */
async function exchangeAndSaveTokens(code, state) {
  // Exemplo:
  // await googleService.exchangeAndSave({ code, state })
  return true;
}

/**
 * (Opcional) Endpoint para gerar a URL de OAuth
 * Seu frontend chama GET /api/integrations/google/auth-url
 */
router.get('/auth-url', async (req, res) => {
  try {
    const staffId = req.query.staffId || '';
    const BACK = (process.env.BACKEND_URL || '').replace(/\/$/, '');
    const redirectUri = `${BACK}/api/integrations/google/callback`;

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    if (staffId) url.searchParams.set('state', staffId);

    return res.json({ url: url.toString() });
  } catch (e) {
    console.error('[google] auth-url error:', e);
    return res.status(500).json({ message: 'Falha ao gerar URL de OAuth' });
  }
});

/**
 * ✅ Callback chamado pelo Google
 * Salva tokens (se tiver lógica) e SEMPRE redireciona para o front
 */
router.get('/callback', async (req, res) => {
  const FRONT = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  try {
    const { code, state } = req.query;
    if (code) {
      // troque chaves por tokens e salve
      await exchangeAndSaveTokens(code, state);
    }
    // sucesso → volta para /settings com marcador
    return res.redirect(`${FRONT}/settings?google=success`);
  } catch (e) {
    console.error('[google] callback error:', e);
    // erro → mesmo assim volta para o front (sem tela branca)
    return res.redirect(`${FRONT}/settings?google=error`);
  }
});

module.exports = router;
