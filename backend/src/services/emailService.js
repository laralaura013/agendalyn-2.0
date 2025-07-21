import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Função para enviar confirmação de agendamento (já existe)
export const sendAppointmentConfirmationEmail = async (appointmentDetails) => {
  const { toEmail, clientName, serviceName, staffName, appointmentDate } = appointmentDetails;
  try {
    await resend.emails.send({
      from: 'Agendalyn <onboarding@resend.dev>',
      to: toEmail,
      subject: 'Seu agendamento foi confirmado!',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6;">
          <h2>Olá, ${clientName}!</h2>
          <p>O seu agendamento para o serviço de <strong>${serviceName}</strong> foi confirmado com sucesso.</p>
          <hr>
          <h3>Detalhes do Agendamento:</h3>
          <ul>
            <li><strong>Profissional:</strong> ${staffName}</li>
            <li><strong>Data e Hora:</strong> ${new Date(appointmentDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</li>
          </ul>
          <hr>
          <p>Obrigado por escolher os nossos serviços!</p>
          <p><small>Este é um email automático, por favor, não responda.</small></p>
        </div>
      `,
    });
    console.log(`✅ Email de confirmação enviado para ${toEmail}`);
  } catch (error) {
    console.error(`❌ Erro ao enviar email de confirmação para ${toEmail}:`, error);
  }
};

// --- FUNÇÃO EM FALTA ---
// Função para enviar o link mágico de login
export const sendMagicLinkEmail = async (details) => {
  const { toEmail, clientName, magicLink } = details;
  try {
    await resend.emails.send({
      from: 'Agendalyn <onboarding@resend.dev>',
      to: toEmail,
      subject: 'Seu Link de Acesso ao Portal do Cliente',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6;">
          <h2>Olá, ${clientName}!</h2>
          <p>Recebemos uma solicitação de acesso ao seu portal do cliente. Clique no botão abaixo para entrar de forma segura. Este link é válido por 15 minutos.</p>
          <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background-color: #6B21A8; color: white; text-decoration: none; border-radius: 8px;">Aceder ao Portal</a>
          <p><small>Se você não solicitou este acesso, pode ignorar este email.</small></p>
        </div>
      `,
    });
    console.log(`✅ Email de Link Mágico enviado para ${toEmail}`);
  } catch (error) {
    console.error(`❌ Erro ao enviar email de link mágico para ${toEmail}:`, error);
    throw new Error("Não foi possível enviar o email de acesso.");
  }
};