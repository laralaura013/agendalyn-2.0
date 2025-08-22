// ✅ ARQUIVO: src/pages/BookingPage.jsx (robusto contra map em não-array)
import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { ArrowLeft, Sparkles, Clock, Tag, User, Calendar, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";


import { asArray } from '../utils/asArray';

/* -------- Helpers seguros -------- */
// A linha abaixo foi removida pois 'asArray' já foi importado acima.
// const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

function toDateISO(dateStr /* YYYY-MM-DD */, hhmm /* HH:mm */) {
  const [h = "00", m = "00"] = String(hhmm || "").split(":");
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toISOString();
}

function normalizeSlots(list) {
  return asArray(list)
    .map((s) => (typeof s === "string" ? s : s?.formatted || s?.time || s?.label || ""))
    .filter(Boolean);
}

const BookingPage = () => {
  const { companyId } = useParams();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]); // YYYY-MM-DD

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // string "HH:mm"

  const [customerDetails, setCustomerDetails] = useState({ name: "", phone: "", email: "" });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyData, setCompanyData] = useState({ company: null, services: [], staff: [] });
  const [client, setClient] = useState(null);

  // Carrega cliente logado (se houver) e preenche dados
  useEffect(() => {
    const storedClient = localStorage.getItem("clientData");
    if (storedClient) {
      const parsed = JSON.parse(storedClient);
      setClient(parsed);
      setCustomerDetails({
        name: parsed.name || "",
        phone: parsed.phone || "",
        email: parsed.email || "",
      });
    }
  }, []);

  // Carrega dados da página pública
  useEffect(() => {
    if (!companyId) return;
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/public/booking-page/${companyId}`, { signal: ac.signal });

        // 🔒 Blindagem: garanta arrays sempre
        const services = asArray(data?.services);
        // Opcional: só mostra quem é visível
        const staff = asArray(data?.staff).filter((s) => s?.showInBooking !== false);

        setCompanyData({
          company: data?.company ?? null,
          services,
          staff,
        });
      } catch (err) {
        if (err?.code === "ERR_CANCELED") return;
        setError("Não foi possível carregar a página de agendamento. Verifique o link e tente novamente.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [companyId]);

  // Busca horários quando entrar no passo 3 (com seleções válidas)
  useEffect(() => {
    if (step !== 3 || !selectedDate || !selectedService || !selectedStaff) return;

    const ac = new AbortController();
    (async () => {
      setLoadingSlots(true);
      setAvailableSlots([]);
      try {
        const params = {
          date: selectedDate,
          serviceId: selectedService.id, // permite duração custom
          staffId: selectedStaff.id,     // conforme seus logs públicos
        };
        const res = await api.get("/public/available-slots", { params, signal: ac.signal });
        setAvailableSlots(normalizeSlots(res.data));
      } catch (err) {
        if (err?.code !== "ERR_CANCELED") toast.error("Não foi possível buscar os horários.");
      } finally {
        setLoadingSlots(false);
      }
    })();

    return () => ac.abort();
  }, [step, selectedDate, selectedService, selectedStaff]);

  const handleSelectService = (service) => {
    setSelectedService(service);
    setSelectedStaff(null);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleSelectStaff = (staffMember) => {
    setSelectedStaff(staffMember);
    setSelectedSlot(null);
    setStep(3);
  };

  const handleSelectSlot = (slotHHmm /* string */) => {
    setSelectedSlot(slotHHmm);
    setStep(4);
  };

  const handleBack = () => setStep((prev) => Math.max(1, prev - 1));

  const handleCustomerDetailsChange = (e) => {
    const { name, value } = e.target;
    setCustomerDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();

    if (!companyId || !selectedService || !selectedStaff || !selectedDate || !selectedSlot) {
      toast.error("Preencha todas as etapas antes de confirmar.");
      return;
    }

    const payload = {
      companyId,
      serviceId: selectedService.id,
      staffId: selectedStaff.id,
      date: selectedDate,     // opcional — se o backend usa junto com slotTime
      slotTime: selectedSlot, // "HH:mm"
      clientName: customerDetails.name,
      clientPhone: customerDetails.phone,
      clientEmail: customerDetails.email,
      clientId: client?.id ?? null,
    };

    const bookingPromise = api.post("/public/create-appointment", payload);

    toast.promise(bookingPromise, {
      loading: "Confirmando o seu agendamento...",
      success: () => {
        setStep(5);
        return "Agendamento confirmado com sucesso!";
      },
      error: (err) => err?.response?.data?.message || "Não foi possível confirmar o seu agendamento.",
    });
  };

  const normalizedSlots = useMemo(() => normalizeSlots(availableSlots), [availableSlots]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Carregando...</p>
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
      <div className="fixed top-0 w-full bg-white shadow z-40 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Agendar Novo Horário</h1>
          {client ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">Oi, {client.name}</span>
              <button
                onClick={() => {
                  localStorage.removeItem("clientToken");
                  localStorage.removeItem("clientData");
                  setClient(null);
                  toast.success("Sessão encerrada.");
                }}
                className="text-sm text-purple-600 hover:underline"
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <Link to={`/portal/login/${companyId}`} className="text-sm text-purple-600 hover:underline">
                Entrar
              </Link>
              <Link to={`/portal/register/${companyId}`} className="text-sm text-purple-600 hover:underline">
                Criar Conta
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto px-4 pt-[80px]">
        <main className="bg-white p-6 rounded-2xl shadow-lg">
          {/* ETAPA 1 - Serviço */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-purple-100 p-3 rounded-full text-purple-700 shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold">Escolha um Serviço</h2>
              </div>
              <ul className="space-y-3">
                {asArray(companyData.services).map((service) => (
                  <li key={service.id || service.name}>
                    <button
                      onClick={() => handleSelectService(service)}
                      className="w-full text-left p-4 border rounded-xl flex justify-between items-center hover:bg-purple-50 transition"
                    >
                      <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Clock size={14} className="inline mr-1" />
                          {service.duration} min
                          <span className="mx-2">|</span>
                          <Tag size={14} className="inline mr-1" />
                          R$ {Number(service.price || 0).toFixed(2)}
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

          {/* ETAPA 2 - Profissional */}
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
                {asArray(companyData.staff).map((staffMember) => (
                  <li key={staffMember.id || staffMember.name}>
                    <button
                      onClick={() => handleSelectStaff(staffMember)}
                      className="w-full text-left p-4 border rounded-xl flex justify-between items-center hover:bg-purple-50 transition"
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

          {/* ETAPA 3 - Data e Hora */}
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

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {loadingSlots ? (
                  <p className="col-span-full text-center py-4">Carregando horários...</p>
                ) : normalizedSlots.length > 0 ? (
                  asArray(normalizedSlots).map((hhmm) => (
                    <button
                      key={hhmm}
                      onClick={() => handleSelectSlot(hhmm)}
                      className={`p-2 rounded-full border font-medium text-sm transition-all ${
                        selectedSlot === hhmm
                          ? "bg-purple-700 text-white border-purple-700"
                          : "bg-white text-purple-700 border-purple-300 hover:bg-purple-100"
                      }`}
                      title={hhmm}
                    >
                      {hhmm}
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

          {/* ETAPA 4 - Confirmação */}
          {step === 4 && (
            <div>
              <button onClick={handleBack} className="text-sm text-gray-600 hover:text-black mb-4 flex items-center">
                <ArrowLeft size={16} className="mr-1" /> Voltar
              </button>
              <h2 className="text-2xl font-semibold mb-4">Confirme seu Agendamento</h2>
              <div className="p-4 bg-gray-50 rounded-md space-y-2 text-gray-700">
                <p>
                  <strong>Serviço:</strong> {selectedService?.name}
                </p>
                <p>
                  <strong>Profissional:</strong> {selectedStaff?.name}
                </p>
                <p>
                  <strong>Horário:</strong>{" "}
                  {selectedSlot
                    ? format(parseISO(toDateISO(selectedDate, selectedSlot)), "EEEE, dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : ""}
                </p>
              </div>
              <form onSubmit={handleConfirmBooking} className="space-y-4 mt-6">
                <h3 className="font-semibold">Seus Dados</h3>
                <div>
                  <label className="block text-sm">Nome Completo</label>
                  <input
                    type="text"
                    name="name"
                    value={customerDetails.name}
                    onChange={handleCustomerDetailsChange}
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm">Telefone (WhatsApp)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={customerDetails.phone}
                    onChange={handleCustomerDetailsChange}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={customerDetails.email}
                    onChange={handleCustomerDetailsChange}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-purple-700 text-white font-semibold rounded-xl text-lg hover:bg-purple-800 mt-4"
                >
                  Confirmar Agendamento
                </button>
              </form>
            </div>
          )}

          {/* ETAPA 5 - Sucesso */}
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