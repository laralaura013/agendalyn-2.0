// src/jobs/reminders.js
import cron from 'node-cron';
import prisma from '../prismaClient.js';
import { sendText } from '../integrations/whatsapp/wabaApi.js';

// Janela 24h ±30min e 2h ±20min
function between(now, minutesFrom, minutesTo) {
  const from = new Date(now.getTime() + minutesFrom * 60000);
  const to   = new Date(now.getTime() + minutesTo   * 60000);
  return { from, to };
}
const toBRDate = (d) => new Intl.DateTimeFormat('pt-BR').format(new Date(d));
const toBRTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ⚠️ Simples: não marca "já enviado". Em produção, crie uma tabela/flag para evitar duplicidade.
cron.schedule('*/15 * * * *', async () => {
  try {
    const now = new Date();

    const win24 = between(now, 24 * 60 - 30, 24 * 60 + 30);   // 23h30 .. 24h30
    const win2  = between(now, 120 - 20, 120 + 20);           // 1h40 .. 2h20

    const appts = await prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        OR: [
          { start: { gte: win24.from, lte: win24.to } },
          { start: { gte: win2.from,  lte: win2.to  } },
        ],
      },
      select: {
        id: true,
        start: true,
        client: { select: { phone: true, name: true } },
        service: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    for (const a of appts) {
      const tel = `+${String(a.client?.phone || '').replace(/\D/g, '')}`;
      if (!tel || tel.length < 8) continue;

      const d = toBRDate(a.start);
      const t = toBRTime(a.start);
      const svc = a.service?.name || 'Atendimento';
      const pro = a.user?.name ? ` com ${a.user.name}` : '';

      await sendText(tel, `Lembrete: ${svc}${pro} em ${d} às ${t}. Até lá!`);
      console.log('🔔 Lembrete enviado para', tel, 'agendamento', a.id);
    }
  } catch (e) {
    console.error('Cron reminder error:', e.message);
  }
});
