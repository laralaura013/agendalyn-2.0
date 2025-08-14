import prisma from '../prismaClient.js';

const toCsv = (rows) => {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  return lines.join('\n');
};

export const exportCsv = async (req, res) => {
  try {
    const { entity } = req.params;
    const companyId = req.company.id;

    let rows = [];
    if (entity === 'clients') {
      const data = await prisma.client.findMany({
        where: { companyId },
        select: { id: true, name: true, phone: true, email: true, birthDate: true, createdAt: true },
        orderBy: { name: 'asc' },
      });
      rows = data.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        birthDate: c.birthDate ? c.birthDate.toISOString().slice(0, 10) : '',
        createdAt: c.createdAt.toISOString(),
      }));
    } else if (entity === 'appointments') {
      const data = await prisma.appointment.findMany({
        where: { companyId },
        include: { client: true, user: true, service: true },
        orderBy: { start: 'desc' },
        take: 2000,
      });
      rows = data.map((a) => ({
        id: a.id,
        start: a.start.toISOString(),
        end: a.end.toISOString(),
        status: a.status,
        client: a.client?.name || '',
        professional: a.user?.name || '',
        service: a.service?.name || '',
        notes: a.notes || '',
      }));
    } else if (entity === 'payables') {
      const data = await prisma.payable.findMany({
        where: { companyId },
        include: { supplier: true, category: true, paymentMethod: true },
        orderBy: { dueDate: 'desc' },
        take: 5000,
      });
      rows = data.map((p) => ({
        id: p.id,
        dueDate: p.dueDate.toISOString().slice(0, 10),
        amount: p.amount.toString(),
        status: p.status,
        supplier: p.supplier?.name || '',
        category: p.category?.name || '',
        paymentMethod: p.paymentMethod?.name || '',
        notes: p.notes || '',
      }));
    } else if (entity === 'receivables') {
      const data = await prisma.receivable.findMany({
        where: { companyId },
        include: { client: true, order: true, category: true, paymentMethod: true },
        orderBy: { dueDate: 'desc' },
        take: 5000,
      });
      rows = data.map((r) => ({
        id: r.id,
        dueDate: r.dueDate.toISOString().slice(0, 10),
        amount: r.amount.toString(),
        status: r.status,
        client: r.client?.name || '',
        orderId: r.order?.id || '',
        category: r.category?.name || '',
        paymentMethod: r.paymentMethod?.name || '',
        notes: r.notes || '',
      }));
    } else {
      return res.status(400).json({ message: 'Entidade inválida para exportação.' });
    }

    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    console.error('Erro export csv:', e);
    res.status(500).json({ message: 'Erro ao exportar CSV.' });
  }
};
