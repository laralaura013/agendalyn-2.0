import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Sparkles, Clock, Tag, User } from 'lucide-react';

const BookingPage = () => {
  const { companyId } = useParams();

  // Estados para controlar o fluxo
  const [step, setStep] = useState(1); // 1: Serviço, 2: Profissional, 3: Horário, 4: Confirmação
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null); // Novo estado

  // Estados para guardar os dados da API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyData, setCompanyData] = useState({
    company: null,
    services: [],
    staff: [],
  });

  // Busca os dados iniciais da empresa
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

  // --- LÓGICA DE NAVEGAÇÃO E SELEÇÃO ---
  const handleSelectService = (service) => {
    setSelectedService(service);
    setStep(2); // Avança para o passo 2
  };

  const handleSelectStaff = (staffMember) => {
    setSelectedStaff(staffMember);
    setStep(3); // Avança para o passo 3 (que construiremos a seguir)
  };

  const handleBack = () => {
    setStep((prevStep) => prevStep - 1); // Volta para o passo anterior
  };


  if (loading) {
    return <div className="flex justify-center items-center h-screen"><p>A carregar informações do estabelecimento...</p></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen"><p className="text-red-500">{error}</p></div>;
  }

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
                <div className="bg-purple-100 p-2 rounded-full">
                  <Sparkles className="h-5 w-5 text-purple-700" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold">Escolha um Serviço</h2>
              </div>
              <ul className="space-y-3">
                {companyData.services.map(service => (
                  <li key={service.id}>
                    <button 
                      onClick={() => handleSelectService(service)}
                      className="w-full text-left p-4 border rounded-md flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock size={14} className="inline mr-1" />{service.duration} min
                          <span className="mx-2">|</span>
                          <Tag size={14} className="inline mr-1" />R$ {Number(service.price).toFixed(2)}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-purple-700 text-white text-xs font-semibold rounded-lg">
                        Selecionar
                      </span>
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
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100">
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="bg-purple-100 p-2 rounded-full">
                  <User className="h-5 w-5 text-purple-700" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold">Escolha um Profissional</h2>
              </div>
              <ul className="space-y-3">
                {companyData.staff.map(staffMember => (
                  <li key={staffMember.id}>
                    <button
                      onClick={() => handleSelectStaff(staffMember)}
                      className="w-full text-left p-4 border rounded-md flex justify-between items-center hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-semibold">{staffMember.name}</p>
                      <span className="px-3 py-1 bg-purple-700 text-white text-xs font-semibold rounded-lg">
                        Selecionar
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

           {/* Os próximos passos (3 e 4) virão aqui */}
           {step === 3 && (
            <div>
              <button onClick={handleBack} className="text-sm text-gray-600 hover:text-black mb-4 flex items-center">
                <ArrowLeft size={16} className="mr-1" /> Voltar
              </button>
              <h2 className="text-2xl font-semibold mb-4">Passo 3: Escolher Data e Hora</h2>
              <p>Serviço: <strong>{selectedService?.name}</strong></p>
              <p>Profissional: <strong>{selectedStaff?.name}</strong></p>
              <p className="mt-4">Vamos construir esta etapa a seguir.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BookingPage;