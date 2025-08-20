// src/controllers/orderController.js
import prisma from '../prismaClient.js';
import * as cashbox from '../services/cashboxService.js';

/* ========================= Helpers ========================= */
function toNumber(v, def = 0) {
  const n = Number(v);
  return isFinite(n) ? n : def;
}
function assertPositive(n, field) {
  if (!(Number(n) > 0)) {
    const err = new Error(`${field || 'valor'} inválido.`);
    err.status = 400;
    throw err;
  }
}
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/* ========================= LISTAR ========================= */
export const listOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { companyId: req.company.id },
      include: {
        client: { select: { name: true } },
        user: { select: { name: true } },
        items: {
          include: {
            service: { select: { name: true } },
            product: { select: { name: true } },
          },
        },
        payments: {
          include: { paymentMethod: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Erro ao listar comandas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/* ========================= CRIAR ========================= */
export const createOrder = async (req, res) => {
  try {
    const { clientId, userId, items } = req.body;
    const companyId = req.company.id;

    if (!clientId || !userId || !items || items.length === 0) {
      return res
        .status(400)
        .json({ message: 'Cliente, colaborador e pelo menos um item são obrigatórios.' });
    }

    let total = 0;
    const stockUpdates = [];
    const preparedItems = [];

    for (const item of items) {
      if (item.serviceId) {
        const service = await prisma.service.findUnique({ where: { id: item.serviceId } });
        if (!service) throw new Error(`Serviço com ID ${item.serviceId} não encontrado.`);
        total += Number(service.price) * item.quantity;
        preparedItems.push({
          quantity: item.quantity,
          price: Number(service.price),
          serviceId: item.serviceId,
        });
      } else if (item.productId) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Produto com ID ${item.productId} não encontrado.`);
        if (product.stock < item.quantity)
          throw new Error(`Stock insuficiente para o produto: ${product.name}.`);

        total += Number(product.price) * item.quantity;
        preparedItems.push({
          quantity: item.quantity,
          price: Number(product.price),
          productId: item.productId,
        });

        stockUpdates.push(
          prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        );
      }
    }

    total = round2(total);

    const transactionResult = await prisma.$transaction([
      prisma.order.create({
        data: {
          total,
          // ✅ inicia totais persistidos
          discountAmount: 0,
          discountMode: 'R$',
          tipAmount: 0,
          tipMode: 'R$',
          totalToPay: total, // subtotal - 0 + 0
          paidTotal: 0,

          status: 'OPEN',
          companyId,
          clientId,
          userId,
          items: { create: preparedItems },
        },
        include: { items: true, payments: true },
      }),
      ...stockUpdates,
    ]);

    res.status(201).json(transactionResult[0]);
  } catch (error) {
    console.error('--- ERRO AO CRIAR COMANDA ---', error);
    res.status(400).json({ message: error.message || 'Erro ao criar comanda.' });
  }
};

/* ========================= PAGAMENTOS (definir lista) =========================
 * Substitui TODAS as formas de pagamento (enquanto OPEN).
 * body: {
 *   payments: [{ paymentMethodId, amount, installments?, cardBrand?, insertIntoCashier? }],
 *   discount?: number,
 *   discountMode?: "R$" | "%",
 *   tip?: number,
 *   tipMode?: "R$" | "%",
 *   expectedTotal?: number // total calculado no front (subtotal - desconto + gorjeta)
 * }
 */
export const setOrderPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;
    const {
      payments,
      discount = 0,
      discountMode = 'R$',
      tip = 0,
      tipMode = 'R$',
      expectedTotal,
    } = req.body || {};

    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ message: 'Envie ao menos uma forma de pagamento.' });
    }

    const order = await prisma.order.findFirst({
      where: { id, companyId, status: 'OPEN' },
    });
    if (!order) {
      return res
        .status(404)
        .json({ message: 'Comanda não encontrada ou não está ABERTA.' });
    }

    // valida cada pagamento
    const toCreate = [];
    let sum = 0;

    for (const p of payments) {
      const paymentMethodId = String(p.paymentMethodId || '').trim();
      const amount = toNumber(p.amount, NaN);
      const installments = Math.max(1, parseInt(p.installments || 1, 10));
      const cardBrand = p.cardBrand ? String(p.cardBrand).trim() : null;
      const insertIntoCashier = p.insertIntoCashier !== false; // default true

      if (!paymentMethodId) {
        return res
          .status(400)
          .json({ message: 'paymentMethodId é obrigatório em cada pagamento.' });
      }
      assertPositive(amount, 'amount');

      const pm = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, companyId },
        select: { id: true },
      });
      if (!pm) {
        return res
          .status(400)
          .json({ message: 'Forma de pagamento inválida para esta empresa.' });
      }

      sum += amount;

      toCreate.push({
        orderId: order.id,
        paymentMethodId,
        amount: round2(amount),
        installments,
        cardBrand,
        insertIntoCashier,
      });
    }

    // valida com o total do front (subtotal - desconto + gorjeta)
    if (typeof expectedTotal === 'number') {
      if (round2(sum) !== round2(expectedTotal)) {
        return res.status(400).json({
          message: 'A soma dos pagamentos deve ser igual ao total a pagar.',
          details: { expectedTotal: round2(expectedTotal), sum: round2(sum) },
        });
      }
    }

    // calcula e persiste os totais
    const subtotal = Number(order.total);
    const discountAmount =
      discountMode === '%'
        ? round2((subtotal * Number(discount || 0)) / 100)
        : round2(Number(discount || 0));
    const tipAmount =
      tipMode === '%'
        ? round2((subtotal * Number(tip || 0)) / 100)
        : round2(Number(tip || 0));
    const totalToPay = round2(Math.max(0, subtotal - discountAmount) + tipAmount);
    const paidTotal = round2(sum);

    await prisma.$transaction(async (tx) => {
      await tx.orderPayment.deleteMany({ where: { orderId: order.id } });
      await tx.orderPayment.createMany({ data: toCreate });
      await tx.order.update({
        where: { id: order.id },
        data: {
          discountAmount,
          discountMode,
          tipAmount,
          tipMode,
          totalToPay,
          paidTotal,
        },
      });
    });

    const updated = await prisma.order.findFirst({
      where: { id: order.id },
      include: {
        payments: { include: { paymentMethod: { select: { id: true, name: true } } } },
      },
    });
    return res.status(200).json(updated);
  } catch (error) {
    console.error('--- ERRO setOrderPayments ---', error);
    return res.status(500).json({ message: 'Erro ao salvar pagamentos da comanda.' });
  }
};

/* ========================= FINALIZAR ========================= */
export const finishOrder = async (req, res) => {
  const { id } = req.params;
  const companyId = req.company.id;

  try {
    const order = await prisma.order.findFirst({
      where: { id, companyId },
      include: {
        payments: true,
        client: { select: { id: true, name: true } },
      },
    });
    if (!order || order.status !== 'OPEN') {
      return res
        .status(404)
        .json({ message: 'Comanda não encontrada ou já finalizada/cancelada.' });
    }

    if (!order.payments || order.payments.length === 0) {
      return res
        .status(400)
        .json({ message: 'Defina as formas de pagamento antes de finalizar a comanda.' });
    }

    const sum = round2(order.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0));
    if (!(sum > 0)) {
      return res.status(400).json({ message: 'O valor total dos pagamentos precisa ser maior que zero.' });
    }

    const requiresCashier = order.payments.some((p) => p.insertIntoCashier);
    if (requiresCashier) {
      const activeCashier = await prisma.cashierSession.findFirst({
        where: { companyId, status: 'OPEN' },
      });
      if (!activeCashier) {
        return res.status(400).json({
          message:
            'Nenhum caixa aberto. Abra um caixa antes de finalizar a comanda com recebimento imediato.',
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'FINISHED', paidTotal: sum }, // garante paidTotal
      });

      const today = new Date();

      for (const pay of order.payments) {
        const totalPay = round2(pay.amount || 0);
        const installments = Math.max(1, parseInt(pay.installments || 1, 10));
        const notesBase = `Comanda #${order.id.slice(0, 8)}${pay.cardBrand ? ` (${pay.cardBrand})` : ''}`;

        if (installments <= 1) {
          const recv = await tx.receivable.create({
            data: {
              companyId,
              clientId: order.clientId || null,
              orderId: order.id,
              paymentMethodId: pay.paymentMethodId,
              dueDate: today,
              amount: totalPay,
              status: pay.insertIntoCashier ? 'RECEIVED' : 'OPEN',
              receivedAt: pay.insertIntoCashier ? today : null,
              notes: notesBase,
            },
          });

          if (pay.insertIntoCashier) {
            await cashbox.ensureIncomeForReceivable(tx, companyId, {
              id: recv.id,
              amount: recv.amount,
              description: recv.notes || `Recebível #${recv.id}`,
              receivedAt: recv.receivedAt || today,
            });
          }
        } else {
          const base = Math.floor((totalPay * 100) / installments) / 100;
          let acc = 0;

          for (let i = 0; i < installments; i++) {
            const isFirst = i === 0;
            const isLast = i === installments - 1;
            let amt = isLast ? round2(totalPay - acc) : round2(base);
            acc = round2(acc + amt);

            const due = i === 0 ? today : addMonths(today, i);
            const receivedNow = isFirst && pay.insertIntoCashier;

            const recv = await tx.receivable.create({
              data: {
                companyId,
                clientId: order.clientId || null,
                orderId: order.id,
                paymentMethodId: pay.paymentMethodId,
                dueDate: due,
                amount: amt,
                status: receivedNow ? 'RECEIVED' : 'OPEN',
                receivedAt: receivedNow ? today : null,
                notes: `${notesBase} - Parcela ${i + 1}/${installments}`,
              },
            });

            if (receivedNow) {
              await cashbox.ensureIncomeForReceivable(tx, companyId, {
                id: recv.id,
                amount: recv.amount,
                description: recv.notes || `Recebível #${recv.id}`,
                receivedAt: recv.receivedAt || today,
              });
            }
          }
        }
      }
    });

    return res.status(200).json({ message: 'Comanda finalizada com sucesso!' });
  } catch (error) {
    console.error('--- ERRO AO FINALIZAR COMANDA ---', error);
    return res.status(500).json({ message: 'Erro ao finalizar a comanda.' });
  }
};

/* ========================= CANCELAR ========================= */
export const cancelOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const orderToCancel = await prisma.order.findUnique({
      where: { id, companyId: req.company.id },
      include: { items: true },
    });

    if (!orderToCancel || orderToCancel.status !== 'OPEN') {
      return res
        .status(404)
        .json({ message: 'Apenas comandas abertas podem ser canceladas.' });
    }

    const stockRestores = orderToCancel.items
      .filter((item) => item.productId)
      .map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      );

    await prisma.$transaction([
      ...stockRestores,
      prisma.order.update({
        where: { id },
        data: { status: 'CANCELED' },
      }),
    ]);

    res.status(200).json({ message: 'Comanda cancelada e stock devolvido com sucesso.' });
  } catch (error) {
    console.error('--- ERRO AO CANCELAR COMANDA ---', error);
    res.status(500).json({ message: 'Erro ao cancelar comanda.' });
  }
};
