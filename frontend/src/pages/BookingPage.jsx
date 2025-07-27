import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft, Sparkles, Clock, Tag, User, Calendar, CheckCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const BookingPage = () => {
  const { companyId } = useParams();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T'));
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyData, setCompanyData] = useState({ company: null, services: [], staff: [] });

  useEffect(() => {
    const clientToken = localStorage.getItem('clientToken');
    const storedClientData = JSON.parse(localStorage.getItem('clientData'));
    if (clientToken && storedClientData) {
      setCustomerDetails({
        name: storedClientData.name || '',
        phone: storedClientData.phone || '',
        email: storedClientData.email || '',
      });
    }

    const fetchBookingData = async () => {
      if (!companyId) return;
      try {
        setLoading(true);
        // Este trecho já estava correto, usando crases ``
        const response = await api.get(`/public/booking-page/${companyId}`);
        setCompanyData(response.data);
      } catch (err) {
        setError("Não foi possível carregar a página de agendamento. Verifique o link e tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    fetchBookingData();
  }, [companyId]);

  useEffect(() => {
    if (step === 3 && selectedDate && selectedService && selectedStaff) {
      const fetchSlots = async () => {
        setLoadingSlots(true);
        setAvailableSlots([]);
        try {
          const params = {
            date: selectedDate,
            serviceId: selectedService.id,
            staffId: selectedStaff.id
          };
          const response = await api.get('/public/available-slots', { params });
          setAvailableSlots(response.data);
        } catch (err) {
          toast.error("Não foi possível buscar os horários.");
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchSlots();
    }
  }, [step, selectedDate, selectedService, selectedStaff]);

  const handleSelectService = (service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleSelectStaff = (staffMember) => {
    setSelectedStaff(staffMember);
    setStep(3);
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setStep(4);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleCustomerDetailsChange = (e) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    const bookingPromise = api.post('/public/create-appointment', {
      companyId,
      serviceId: selectedService.id,
      staffId: selectedStaff.id,
      slotTime: selectedSlot.time,
      clientName: customerDetails.name,
      clientPhone: customerDetails.phone,
      clientEmail: customerDetails.email,
    });

    toast.promise(bookingPromise, {
      loading: 'A confirmar o seu agendamento...',
      success: () => {
        setStep(5);
        return 'Agendamento confirmado com sucesso!';
      },
      error: 'Não foi possível confirmar o seu agendamento.',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>A carregar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-white pb-10">
      <div className="fixed top-0 w-full bg-white shadow z-40 p-4 text-center font-bold text-purple-700 text-lg">
        {companyData.company?.name || 'Agendamento'}
      </div>

      <div className="fixed top-0 right-4 z-50 pt-4">
        <div className="flex gap-2">
          {/* CORREÇÃO APLICADA AQUI */}
          <a
            href={`/portal/login/${companyId}`}
            className="bg-purple-600 text-white px-4 py-1 rounded-md text-sm hover:bg-purple-700 transition"
          >
            Entrar
          </a>
          {/* CORREÇÃO APLICADA AQUI */}
          <a
            href={`/portal/register/${companyId}`}
            className="bg-gray-200 text-gray-800 px-4 py-1 rounded-md text-sm hover:bg-gray-300 transition"
          >
            Criar Conta
          </a>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto px-4 pt-[80px]">
        <main className="bg-white p-6 rounded-2xl shadow-lg">
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-purple-100 p-3 rounded-full text-purple-700 shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">Escolha um Serviço</h2>
              </div>
              <ul className="space-y-3">
                {companyData.services.map(service => (
                  <li key={service.id}>
                    <button onClick={() => handleSelectService(service)} className="w-full text-left p-4 border rounded-xl flex justify-between items-center hover:bg-purple-50 transition">
                      <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock size={14} className="inline mr-1" />
                          {service.duration} min
                          <span className="mx-2">|</span>
                          <Tag size={14} className="inline mr-1" />
                          R$ {Number(service.price).toFixed(2)}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-purple-700 text-white text-xs font-semibold rounded-lg">Selecionar</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100">
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="bg-purple-100 p-3 rounded-full text-purple-700 shadow-sm">
                  <User className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">Escolha um Profissional</h2>
              </div>
              <ul className="space-y-3">
                {companyData.staff.map(staffMember => (
                  <li key={staffMember.id}>
                    <button onClick={() => handleSelectStaff(staffMember)} className="w-full text-left p-4 border rounded-xl flex justify-between items-center hover:bg-purple-50 transition">
                      <p className="font-semibold">{staffMember.name}</p>
                      <span className="px-3 py-1 bg-purple-700 text-white text-xs font-semibold rounded-lg">Selecionar</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100">
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="bg-purple-100 p-3 rounded-full text-purple-700 shadow-sm">
                  <Calendar className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">Escolha Data e Hora</h2>
              </div>
              <div className="mb-4">
                <label htmlFor="date-picker" className="block text-sm font-medium text-gray-700 mb-1">
                  Selecione o dia
                </label>
                <input
                  type="date"
                  id="date-picker"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <p className="text-center font-semibold my-2">
                {format(parseISO(`${selectedDate}T00:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {loadingSlots ? (
                  <p className="col-span-full text-center py-4">A procurar horários...</p>
                ) : availableSlots.length > 0 ? (
                  availableSlots.map(slot => (
                    <button
                      key={slot.time}
                      onClick={() => handleSelectSlot(slot)}
                      className="p-2 border rounded-xl text-center bg-purple-700 text-white hover:bg-purple-800 transition-colors"
                    >
                      {format(parseISO(slot.time), 'HH:mm')}
                    </button>
                  ))
                ) : (
                  <p className="col-span-full text-center text-gray-500 py-4">
                    Nenhum horário disponível para este dia.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <button onClick={handleBack} className="text-sm text-gray-600 hover:text-black mb-4 flex items-center">
                <ArrowLeft size={16} className="mr-1" /> Voltar
              </button>
              <h2 className="text-2xl font-semibold mb-4">Confirme seu Agendamento</h2>
              <div className="p-4 bg-gray-50 rounded-md space-y-2 text-gray-700">
                <p><strong>Serviço:</strong> {selectedService?.name}</p>
                <p><strong>Profissional:</strong> {selectedStaff?.name}</p>
                <p><strong>Horário:</strong> {selectedSlot ? format(parseISO(selectedSlot.time), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}</p>
              </div>
              <form onSubmit={handleConfirmBooking} className="space-y-4 mt-6">
                <h3 className="font-semibold">Seus Dados</h3>
                <div>
                  <label className="block text-sm">Nome Completo</label>
                  <input type="text" name="name" value={customerDetails.name} onChange={handleCustomerDetailsChange} className="w-full p-2 border rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm">Telemóvel (WhatsApp)</label>
                  <input type="tel" name="phone" value={customerDetails.phone} onChange={handleCustomerDetailsChange} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm">Email</label>
                  <input type="email" name="email" value={customerDetails.email} onChange={handleCustomerDetailsChange} className="w-full p-2 border rounded-md" />
                </div>
                <button type="submit" className="w-full py-3 bg-purple-700 text-white font-semibold rounded-xl text-lg hover:bg-purple-800 mt-4">
                  Confirmar Agendamento
                </button>
              </form>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-10">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Tudo Certo!</h2>
              <p className="text-gray-600 mt-2">O seu agendamento foi confirmado com sucesso.</p>
              <p className="text-sm text-gray-500 mt-6">Pode fechar esta janela.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BookingPage;
