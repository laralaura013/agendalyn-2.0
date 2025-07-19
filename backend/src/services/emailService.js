import { Resend } from 'resend';

// Inicializa o cliente do Resend com a chave de API do ambiente
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envia um email de confirmação de agendamento.
 * @param {object} appointmentDetails - Detalhes do agendamento.
 * @param {string} appointmentDetails.toEmail - Email do destinatário.
 * @param {string} appointmentDetails.clientName - Nome do cliente.
 * @param {string} appointmentDetails.serviceName - Nome do serviço agendado.
 * @param {string} appointmentDetails.staffName - Nome do profissional.
 * @param {Date} appointmentDetails.appointmentDate - Data e hora do agendamento.
 */
export const sendAppointmentConfirmationEmail = async (appointmentDetails) => {
  const { toEmail, clientName, serviceName, staffName, appointmentDate } = appointmentDetails;

  try {
    await resend.emails.send({
      // Como você ainda não tem um domínio, usamos o endereço padrão do Resend.
      // Isto funciona perfeitamente, mas o email aparecerá como "enviado via resend.dev".
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
    // Não retornamos um erro para a aplicação principal,
    // pois o agendamento não deve falhar se o email falhar.
  }
};