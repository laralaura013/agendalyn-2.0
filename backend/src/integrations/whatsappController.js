// src/controllers/integrations/whatsappController.js
import crypto from 'crypto';

/**
 * GET /webhook — usado pela Meta para verificação inicial
 * ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = (process.env.WABA_VERIFY_TOKEN || '').trim();

  if (mode === 'subscribe' && token === expected) {
    return res.status(200).send(challenge);
  }

  console.log('❌ Falha na verificação do webhook', {
    mode,
    tokenReceived: token,
    expectedLength: expected.length,
  });
  return res.sendStatus(403);
};

/**
 * (Opcional) valida a assinatura do POST da Meta quando WABA_APP_SECRET estiver setado.
 * Funciona se o server tiver sido configurado com req.rawBody (veja ajuste no server.js).
 */
function isValidSignature(req) {
  const appSecret = (process.env.WABA_APP_SECRET || '').trim();
  if (!appSecret) return true; // sem secret, não valida

  try {
    const signature = req.get('x-hub-signature-256') || '';
    if (!signature.startsWith('sha256=')) return false;

    const expected = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(req.rawBody || '')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

/**
 * POST /webhook — recebe eventos (mensagens/status)
 */
export const receiveWebhook = (req, res) => {
  // Responde 200 imediatamente (Meta reenvia se não for 200)
  if (!isValidSignature(req)) {
    console.log('⚠️ Assinatura inválida do webhook');
    return res.sendStatus(401);
  }
  res.sendStatus(200);

  try {
    const body = req.body || {};
    const entries = body.entry || [];
    for (const e of entries) {
      const changes = e.changes || [];
      for (const ch of changes) {
        // Log completo do evento
        console.log('📩 Webhook change:', JSON.stringify(ch, null, 2));

        // Se vier mensagem
        const value = ch.value || {};
        const messages = value.messages || [];
        if (messages.length) {
          for (const m of messages) {
            const from = m.from; // telefone do cliente (E.164)
            const type = m.type;
            let text = '';

            if (type === 'text') text = m.text?.body || '';
            if (type === 'button') text = m.button?.text || '';
            if (type === 'interactive') {
              text =
                m.interactive?.button_reply?.title ||
                m.interactive?.list_reply?.title ||
                '';
            }

            console.log(`👤 ${from} disse: "${text}" (tipo ${type})`);
            // 👉 aqui você pode enfileirar/rotear para seu chatbot
          }
        }

        // Se vier status de mensagem
        const statuses = value.statuses || [];
        if (statuses.length) {
          for (const s of statuses) {
            console.log('✅ Status:', {
              id: s.id,
              status: s.status,
              timestamp: s.timestamp,
              recipient_id: s.recipient_id,
              errors: s.errors,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro ao processar webhook:', err);
  }
};
