import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getMyAppointments,
  getMyPackages,
  cancelAppointment
} from '../services/clientService';
import toast from 'react-hot-toast';
import {
  CalendarDays, LogOut, Clock, PlusCircle, PackageCheck, History, XCircle
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClientDashboardPage = () => {
  const navigate = useNavigate();
  const [clientData, setClientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    const clientInfo = JSON.parse(localStorage.getItem('clientData'));
    if (!token || !clientInfo) {
      navigate('/portal/login/cmdep95530000pspaolfy7dod');
      return;
    }
    setClientData(clientInfo);
    fetchAppointments();
    fetchPackages();
  }, []);

  const fetchAppointments = async () => {
    try {
      const data = await getMyAppointments();
      setAppointments(data);
    } catch (err) {
      toast.error('Erro ao carregar agendamentos.');
    }
  };

  const fetchPackages = async () => {
    try {
      const data = await getMyPackages();
      setPackages(data);
    } catch (err) {
      toast.error('Erro ao carregar pacotes.');
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelAppointment(id);
      toast.success('Agendamento cancelado!');
      fetchAppointments();
    } catch (err) {
      toast.error('Erro ao cancelar agendamento.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientData');
    navigate('/portal/login/cmdep95530000pspaolfy7dod');
  };

  const upcoming = appointments.filter((appt) => !isBefore(new Date(appt.start), new Date()));
  const history = appointments.filter((appt) => isBefore(new Date(appt.start), new Date()));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">

        {/* TOPO COM AÇÕES */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-700">Olá, {clientData?.name}</h1>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-500 hover:underline">
              <LogOut size={16} /> Sair
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to={`/agendar/${clientData?.companyId}`}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-700 text-white py-2 px-4 rounded-lg hover:bg-purple-800 transition text-center"
            >
              <PlusCircle size={16} /> Agendar Novo Horário
            </Link>

            <Link
              to={`/portal/register/${clientData?.companyId}`}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition text-center"
            >
              Criar Conta
            </Link>
          </div>
        </div>

        {/* AGENDAMENTOS FUTUROS */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-purple-600" /> Próximos Agendamentos
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-gray-500 text-sm">Você não tem agendamentos futuros.</p>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((appt) => (
                <li key={appt.id} className="p-4 border rounded-lg">
                  <p className="font-medium">{appt.service?.name}</p>
                  <p className="text-sm text-gray-500">{appt.user?.name}</p>
                  <p className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                    <Clock size={14} />
                    {format(parseISO(appt.start), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <button
                    onClick={() => handleCancel(appt.id)}
                    className="mt-3 flex items-center gap-2 text-red-500 text-sm hover:underline"
                  >
                    <XCircle size={14} /> Cancelar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* HISTÓRICO */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <History size={18} className="text-gray-600" /> Histórico de Agendamentos
          </h2>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum agendamento anterior encontrado.</p>
          ) : (
            <ul className="space-y-4">
              {history.map((appt) => (
                <li key={appt.id} className="p-4 border rounded-lg bg-gray-50">
                  <p className="font-medium">{appt.service?.name}</p>
                  <p className="text-sm text-gray-500">{appt.user?.name}</p>
                  <p className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                    <Clock size={14} />
                    {format(parseISO(appt.start), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* PACOTES */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PackageCheck size={18} className="text-green-600" /> Meus Pacotes
          </h2>
          {packages.length === 0 ? (
            <p className="text-gray-500 text-sm">Você não possui pacotes ativos.</p>
          ) : (
            <ul className="space-y-2">
              {packages.map((pkg) => (
                <li key={pkg.id} className="border p-3 rounded-md">
                  <p className="font-medium">{pkg.package.name}</p>
                  <p className="text-xs text-gray-500">
                    Ativado em {format(parseISO(pkg.createdAt), 'dd/MM/yyyy')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardPage;
