const prisma = require('../../prisma/client');

const cancelClientAppointment = async (req, res) => {
  try {
    const clientId = req.client.id;
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment || appointment.clientId !== clientId) {
      return res.status(403).json({ message: 'Não autorizado.' });
    }

    await prisma.appointment.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Agendamento cancelado com sucesso.' });
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ message: 'Erro interno.' });
  }
};

module.exports = {
  cancelClientAppointment,
};
