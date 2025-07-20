import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Sparkles, Clock, Tag, User, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BookingPage = () => {
  const { companyId } = useParams();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyData, setCompanyData] = useState({ company: null, services: [], staff: [] });

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!companyId) return;
      try {
        setLoading(true);
        const response = await api.get(`/public/booking-page/${companyId}`);
        setCompanyData(response.data);
      } catch (err) {
        console.error("Erro ao buscar dados de agendamento:", err);
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
            staffId: selectedStaff.id,
            companyId: companyId,
          };
          const response = await api.get('/public/available-slots', { params });
          setAvailableSlots(response.data);
        } catch (err) {
          console.error("Erro ao buscar horários:", err);
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchSlots();
    }
  }, [step, selectedDate, selectedService, selectedStaff, companyId]);

  const handleSelectService = (service) => { setSelectedService(service); setStep(2); };
  const handleSelectStaff = (staffMember) => { setSelectedStaff(staffMember); setStep(3); };
  const handleSelectSlot = (slot) => { setSelectedSlot(slot); setStep(4); };
  const handleBack = () => { setStep(prev => prev - 1); };

  if (loading) return <div className="flex justify-center items-center h-screen"><p>A carregar...</p></div>;
  if (error) return <div className="flex justify-center items-center h-screen"><p className="text-red-500">{error}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-lg mx-auto p-4 sm:p-6">
        <header className="text-center my-6 sm:my-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{companyData.company.name}</h1>
          <p className="text-gray-500 mt-2">{companyData.company.address}</p>
        </header>

        <main className="bg-white p-6 rounded-lg shadow-md">
          {/* Passo 1: Seleção de Serviço */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-purple-100 p-2 rounded-full"><Sparkles className="h-5 w-5 text-purple-700" /></div>
                <h2 className="text-xl sm:text-2xl font-semibold">Escolha um Serviço</h2>
              </div>
              <ul className="space-y-3">
                {companyData.services.map(service => (
                  <li key={service.id}>
                    <button onClick={() => handleSelectService(service)} className="w-full text-left p-4 border rounded-md flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock size={14} className="inline mr-1" />{service.duration} min
                          <span className="mx-2">|</span>
                          <Tag size={14} className="inline mr-1" />R$ {Number(service.price).toFixed(2)}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-purple-700 text-white text-xs font-semibold rounded-lg">Selecionar</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Passo 2: Seleção de Profissional */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
                <div className="bg-purple-100 p-2 rounded-full"><User className="h-5 w-5 text-purple-700" /></div>
                <h2 className="text-xl sm:text-2xl font-semibold">Escolha um Profissional</h2>
              </div>
              <ul className="space-y-3">
                {companyData.staff.map(staffMember => (
                  <li key={staffMember.id}>
                    <button onClick={() => handleSelectStaff(staffMember)} className="w-full text-left p-4 border rounded-md flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <p className="font-semibold">{staffMember.name}</p>
                      <span className="px-3 py-1 bg-purple-700 text-white text-xs font-semibold rounded-lg">Selecionar</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Passo 3: Data e Hora */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
                <div className="bg-purple-100 p-2 rounded-full"><Calendar className="h-5 w-5 text-purple-700" /></div>
                <h2 className="text-xl sm:text-2xl font-semibold">Escolha Data e Hora</h2>
              </div>
              <div className="mb-4">
                <label htmlFor="date-picker" className="block text-sm font-medium text-gray-700 mb-1">Selecione o dia</label>
                <input type="date" id="date-picker" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-2 border rounded-md" />
              </div>
              <p className="text-center font-semibold my-2">
                {format(parseISO(`${selectedDate}T00:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {loadingSlots ? <p className="col-span-full text-center">A procurar horários...</p> : 
                  availableSlots.length > 0 ? availableSlots.map(slot => (
                    <button key={slot.time} onClick={() => handleSelectSlot(slot)} className="p-2 border rounded-md text-center bg-purple-700 text-white hover:bg-purple-800">
                      {format(parseISO(slot.time), 'HH:mm')}
                    </button>
                  )) : <p className="col-span-full text-center text-gray-500">Nenhum horário disponível para este dia.</p>
                }
              </div>
            </div>
          )}

          {/* Placeholder para o Passo 4 */}
          {step === 4 && (
            <div>
              <button onClick={handleBack} className="text-sm text-gray-600 hover:text-black mb-4 flex items-center">
                <ArrowLeft size={16} className="mr-1" /> Voltar
              </button>
              <h2 className="text-2xl font-semibold mb-4">Passo 4: Confirmação</h2>
              <p>Serviço: <strong>{selectedService?.name}</strong></p>
              <p>Profissional: <strong>{selectedStaff?.name}</strong></p>
              <p>Horário: <strong>{selectedSlot ? format(parseISO(selectedSlot.time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}</strong></p>
              <p className="mt-4">Vamos construir esta etapa a seguir.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BookingPage;