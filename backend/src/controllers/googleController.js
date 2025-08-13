import prisma from '../prismaClient.js';
import {
  createAuthUrl,
  handleOAuthCallback,
  disconnectStaffGoogle,
} from '../services/googleCalendarService.js';

/**
 * Gera a URL de autenticação do Google
 */
export const getAuthUrl = async (req, res) => {
  try {
    const { staffId } = req.query;
    if (!staffId) return res.status(400).json({ message: 'staffId é obrigatório' });

    const url = createAuthUrl({ staffId });
    res.json({ url });
  } catch (e) {
    console.error('Erro getAuthUrl', e);
    res.status(500).json({ message: 'Erro ao gerar URL de autenticação' });
  }
};

/**
 * Callback do Google OAuth
 */
export const oauthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    await handleOAuthCallback({ code, state });

    const frontend = process.env.FRONTEND_URL || 'https://frontlyn.netlify.app';
    return res.redirect(`${frontend}/settings?google=connected`);
  } catch (e) {
    console.error('Erro oauthCallback', e);
    const frontend = process.env.FRONTEND_URL || 'https://frontlyn.netlify.app';
    return res.redirect(`${frontend}/settings?google=error`);
  }
};

/**
 * Desconecta o Google Calendar do profissional
 */
export const disconnect = async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ message: 'staffId é obrigatório' });

    await disconnectStaffGoogle(staffId);
    res.json({ ok: true });
  } catch (e) {
    console.error('Erro disconnect', e);
    res.status(500).json({ message: 'Erro ao desconectar Google' });
  }
};

/**
 * Retorna status da integração do Google para um profissional
 */
export const getGoogleStatus = async (req, res) => {
  try {
    const { staffId } = req.params;
    if (!staffId) {
      return res.status(400).json({ message: 'staffId é obrigatório' });
    }

    const integration = await prisma.googleIntegration.findUnique({
      where: { staffId },
      select: { googleEmail: true },
    });

    if (!integration) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      email: integration.googleEmail,
    });
  } catch (e) {
    console.error('Erro ao buscar status Google:', e);
    res.status(500).json({ message: 'Erro ao buscar status Google' });
  }
};
