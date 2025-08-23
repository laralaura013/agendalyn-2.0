// src/pages/ServicesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../services/api";

/* ==== helpers ==== */
const toBRL = (v) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ==== Ícones (SVG) ==== */
const PriceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8c8c94]" viewBox="0 0 20 20" fill="currentColor">
    <path d="M8.433 7.418c.158-.103.346-.195.574-.277a6.013 6.013 0 014.271.122c.52.198.975.624 1.222 1.218a.12.12 0 010 .066c-.317.925-.776 1.76-1.336 2.495-1.192 1.484-2.833 2.43-4.673 2.91a.12.12 0 01-.066 0c-.925-.317-1.76-.776-2.495-1.336-1.484-1.192-2.43-2.833-2.91-4.673a.12.12 0 010-.066c.198-.52.624-.975 1.218-1.222a6.013 6.013 0 014.271-.122zM10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
  </svg>
);
const DurationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#8c8c94]" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
  </svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);
const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
  </svg>
);

/* ==== Modal de Formulário ==== */
const ServiceFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? "");
      setPrice(initialData.price ?? "");
      setDuration(
        initialData.duration === null || initialData.duration === undefined
          ? ""
          : String(initialData.duration)
      );
    } else {
      setName("");
      setPrice("");
      setDuration("");
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      price: price === "" ? 0 : Number(price),
      // envia número ou null (backend aceita duration | durationMinutes)
      duration: duration === "" ? null : Number(duration),
    };
    if (!payload.name) return toast.error("Informe o nome.");
    if (!Number.isFinite(payload.price) || payload.price < 0)
      return toast.error("Preço inválido.");

    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 relative border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {initialData ? "Editar Serviço" : "Novo Serviço"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Serviço
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Corte Masculino"
                className="block w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 placeholder-gray-500 focus:border-[#545c57] focus:outline-none focus:ring-2 focus:ring-[#545c57]/40 transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 placeholder-gray-500 focus:border-[#545c57] focus:outline-none focus:ring-2 focus:ring-[#545c57]/40 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duração (min) — opcional
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ex: 30"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 placeholder-gray-500 focus:border-[#545c57] focus:outline-none focus:ring-2 focus:ring-[#545c57]/40 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-lg bg-white border border-gray-300 px-6 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#8c8c94] focus:ring-offset-2 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto rounded-lg bg-[#545c57] hover:bg-[#343c39] px-8 py-2.5 text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#8c8c94] focus:ring-offset-2 transition-all"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==== Modal de Confirmação ==== */
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, serviceName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h3>
        <p className="mt-4 text-gray-600">
          Tem certeza que deseja excluir o serviço <strong>{serviceName}</strong>? Esta
          ação não pode ser desfeita.
        </p>
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-white border border-gray-300 px-6 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#8c8c94] focus:ring-offset-2 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==== Página Principal ==== */
const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchServices = useCallback(async (term) => {
    setLoading(true);
    try {
      // tenta suportar payload {items:[]} e também array direto
      const res = await api.get("/services", {
        params: term ? { q: term } : {},
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setServices(data);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      toast.error("Não foi possível carregar os serviços.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices(debouncedQ);
  }, [debouncedQ, fetchServices]);

  /* CRUD */
  const openModal = (service = null) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };

  const openConfirmModal = (service) => {
    setServiceToDelete(service);
    setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setServiceToDelete(null);
  };

  const handleSave = async (payload) => {
    const isEditing = !!(selectedService && selectedService.id);

    const req = isEditing
      ? api.put(`/services/${selectedService.id}`, payload)
      : api.post("/services", payload);

    toast
      .promise(req, {
        loading: isEditing ? "Atualizando serviço..." : "Criando serviço...",
        success: isEditing ? "Serviço atualizado!" : "Serviço criado!",
        error: (e) => e?.response?.data?.message || "Não foi possível salvar o serviço.",
      })
      .then(() => {
        fetchServices(debouncedQ);
        closeModal();
      });
  };

  const confirmDelete = () => {
    if (!serviceToDelete) return;
    toast
      .promise(api.delete(`/services/${serviceToDelete.id}`), {
        loading: "Excluindo serviço...",
        success: "Serviço excluído com sucesso!",
        error: (e) =>
          e?.response?.data?.message ||
          "Não foi possível excluir o serviço.",
      })
      .then(() => {
        fetchServices(debouncedQ);
        closeConfirmModal();
      });
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gerencie os serviços oferecidos pela empresa.
            </p>
          </div>

          {/* Busca + botão */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex-1 md:w-72">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8c8c94] focus:border-[#8c8c94]"
              />
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-[#545c57] hover:bg-[#343c39] text-white font-medium px-4 py-2 rounded-lg transition-all shadow-sm"
            >
              <AddIcon />
              Novo Serviço
            </button>
          </div>
        </header>

        {/* Lista */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-center text-gray-500">Carregando serviços...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
            <p className="text-gray-600">Nenhum serviço encontrado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between"
                >
                  <div className="flex-1 mb-4 sm:mb-0">
                    <p className="text-lg font-semibold text-gray-900">{service.name}</p>
                    <div className="flex items-center gap-x-6 gap-y-2 text-sm text-gray-600 mt-2 flex-wrap">
                      <span className="flex items-center gap-2">
                        <PriceIcon />
                        {toBRL(service.price)}
                      </span>
                      <span className="flex items-center gap-2">
                        <DurationIcon />
                        {service.duration === null || service.duration === undefined
                          ? "—"
                          : `${service.duration} min`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      onClick={() => openModal(service)}
                      className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100"
                      title="Editar"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => openConfirmModal(service)}
                      className="text-red-600 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-50"
                      title="Excluir"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Modais */}
        <ServiceFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSave}
          initialData={selectedService}
        />

        <ConfirmDeleteModal
          isOpen={isConfirmModalOpen}
          onClose={closeConfirmModal}
          onConfirm={confirmDelete}
          serviceName={serviceToDelete?.name}
        />
      </div>
    </div>
  );
};

export default ServicesPage;
