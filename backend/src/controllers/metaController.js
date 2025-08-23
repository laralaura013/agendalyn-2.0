// src/controllers/metaController.js
import axios from 'axios';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';

const {
  META_APP_ID,
  META_APP_SECRET,
  META_REDIRECT_URI, // ex.: https://seu-backend.com/api/integrations/meta/oauth/callback
  JWT_SECRET,
  WABA_VERIFY_TOKEN,
  WABA_APP_SECRET, // opcional (HMAC)
} = process.env;

const FB_VERSION = 'v20.0';
const FB_DIALOG = `https://www.facebook.com/${FB_VERSION}/dialog/oauth`;
const FB_GRAPH = `https://graph.facebook.com/${FB_VERSION}`;

const SCOPES = [
  'whatsapp_business_management',
  'whatsapp_business_messaging',
  'business_management',
].join(',');

// -------- helpers --------
function ensureCompanyFromReq(req) {
  if (req.companyId) return req.companyId;

  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token && JWT_SECRET) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.companyId) return payload.companyId;
    } catch {}
  }
  return null;
}

function signState(payload) {
  return jwt.sign(payload, JWT_SECRET || 'dev_state', { expiresIn: '20m' });
}

function verifyState(token) {
  try {
    return jwt.verify(token, JWT_SECRET || 'dev_state');
  } catch {
    return null;
  }
}

export async function embeddedStart(req, res) {
  try {
    const companyId = ensureCompanyFromReq(req);
    if (!companyId) return res.status(401).json({ message: 'Empresa não identificada.' });

    if (!META_APP_ID || !META_REDIRECT_URI) {
      return res.status(500).json({ message: 'META_APP_ID ou META_REDIRECT_URI não configurados.' });
    }

    const state = signState({ companyId, ts: Date.now() });
    const url =
      `${FB_DIALOG}?client_id=${encodeURIComponent(META_APP_ID)}` +
      `&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(SCOPES)}`;

    return res.json({ url });
  } catch (e) {
    console.error('embeddedStart error:', e);
    return res.status(500).json({ message: 'Falha ao iniciar onboarding.' });
  }
}

export async function oauthCallback(req, res) {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('OAuth error:', error, error_description);
      return redirectFront(res, 'meta=error');
    }

    const decoded = verifyState(state || '');
    const companyId = decoded?.companyId;
    if (!companyId) {
      console.error('State inválido');
      return redirectFront(res, 'meta=error');
    }

    // Troca code -> access_token
    const { data: tokenResp } = await axios.get(
      `${FB_GRAPH}/oauth/access_token`,
      {
        params: {
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          redirect_uri: META_REDIRECT_URI,
          code,
        },
      }
    );
    const accessToken = tokenResp?.access_token;
    if (!accessToken) {
      console.error('Sem access_token na resposta OAuth');
      return redirectFront(res, 'meta=error');
    }

    // Busca WABA e números
    // Dica: dependendo da conta, os campos podem variar; tentamos o mais comum.
    const { data: me } = await axios.get(
      `${FB_GRAPH}/me`,
      {
        params: {
          fields: 'whatsapp_business_accounts{id,phone_numbers{id,display_phone_number,verified_name}}',
          access_token: accessToken,
        },
      }
    );

    const wabas = me?.whatsapp_business_accounts || [];
    const firstWaba = wabas[0] || null;
    const phoneNumbers = firstWaba?.phone_numbers || [];
    const firstPhone = phoneNumbers[0] || null;

    // Persiste credenciais mínimas
    await prisma.company.update({
      where: { id: companyId },
      data: {
        wabaAccessToken: accessToken,
        wabaPhoneNumberId: firstPhone?.id || null,
        useSharedWaba: false,
        whatsappEnabled: true,
      },
    });

    return redirectFront(res, 'meta=connected');
  } catch (e) {
    console.error('oauthCallback error:', e?.response?.data || e.message);
    return redirectFront(res, 'meta=error');
  }
}

function redirectFront(res, qs = '') {
  // tenta FRONTEND_URL; fallback: /
  const front = (process.env.FRONTEND_URL || '').split(',')[0]?.trim() || '';
  const base = front || process.env.PUBLIC_FRONTEND_URL || '/';
  const glue = base.includes('?') ? '&' : '?';
  res.redirect(`${base}${qs ? glue + qs : ''}`);
}

export async function status(req, res) {
  try {
    const companyId = ensureCompanyFromReq(req);
    if (!companyId) return res.status(401).json({ message: 'Empresa não identificada.' });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { wabaAccessToken: true, wabaPhoneNumberId: true },
    });

    if (!company?.wabaAccessToken || !company?.wabaPhoneNumberId) {
      return res.json({ connected: false });
    }

    try {
      const { data } = await axios.get(
        `${FB_GRAPH}/${company.wabaPhoneNumberId}`,
        { headers: { Authorization: `Bearer ${company.wabaAccessToken}` } }
      );
      return res.json({
        connected: true,
        phoneNumberId: company.wabaPhoneNumberId,
        info: data,
      });
    } catch (e) {
      return res.json({
        connected: false,
        error: e?.response?.data || e.message,
      });
    }
  } catch (e) {
    console.error('status error:', e);
    return res.status(500).json({ message: 'Falha ao verificar status.' });
  }
}

export function webhookVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === WABA_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

// (Opcional) valida HMAC, se WABA_APP_SECRET estiver setado
function isValidSignature(req) {
  if (!WABA_APP_SECRET) return true;
  const sigHeader = req.get('x-hub-signature-256');
  if (!sigHeader) return true;
  const raw =
    typeof req.rawBody === 'string' ? Buffer.from(req.rawBody, 'utf8') : req.rawBody;
  const hmac = require('crypto').createHmac('sha256', WABA_APP_SECRET);
  hmac.update(raw);
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return require('crypto').timingSafeEqual(Buffer.from(sigHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function webhookReceive(req, res) {
  try {
    if (!isValidSignature(req)) {
      console.warn('⚠️ Assinatura inválida (Meta webhook)');
      return res.sendStatus(403);
    }
    console.log('📩 META WEBHOOK:', JSON.stringify(req.body, null, 2));
    // Se preferir, você pode delegar para o mesmo handler do whatsappRoutes.
    return res.sendStatus(200);
  } catch (e) {
    console.error('webhookReceive error:', e);
    return res.sendStatus(200);
  }
}

export async function disconnect(req, res) {
  try {
    const companyId = ensureCompanyFromReq(req);
    if (!companyId) return res.status(401).json({ message: 'Empresa não identificada.' });

    await prisma.company.update({
      where: { id: companyId },
      data: {
        wabaAccessToken: null,
        wabaPhoneNumberId: null,
        whatsappEnabled: false,
        useSharedWaba: true,
      },
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error('disconnect error:', e);
    return res.status(500).json({ message: 'Falha ao desconectar.' });
  }
}

// ---- envio de template (útil para primeiro contato) ----
function getWabaSendConfig(company) {
  const token = company?.wabaAccessToken || null;
  const pnid  = company?.wabaPhoneNumberId || null;
  if (!token || !pnid) return null;
  return {
    token,
    graphUrl: `${FB_GRAPH}/${pnid}/messages`,
  };
}

export async function sendTemplate(req, res) {
  try {
    const companyId = ensureCompanyFromReq(req);
    if (!companyId) return res.status(401).json({ message: 'Empresa não identificada.' });

    const { to, templateName = 'hello_world', lang = 'pt_BR', components = [] } = req.body || {};
    if (!to) return res.status(400).json({ message: 'Parâmetro "to" é obrigatório.' });

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const cfg = getWabaSendConfig(company);
    if (!cfg) return res.status(400).json({ message: 'Empresa não conectada ao WhatsApp (Meta).' });

    const normTo = to.startsWith('+') ? to : `+${to.replace(/\D/g, '')}`;

    const payload = {
      messaging_product: 'whatsapp',
      to: normTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: lang },
        ...(Array.isArray(components) && components.length ? { components } : {}),
      },
    };

    const { data } = await axios.post(cfg.graphUrl, payload, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });

    return res.json({ ok: true, data });
  } catch (e) {
    console.error('sendTemplate error:', e?.response?.data || e.message);
    return res.status(500).json({ message: 'Falha ao enviar template.', error: e?.response?.data || e.message });
  }
}
