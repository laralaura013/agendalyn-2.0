// src/components/forms/ClientForm.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import NeuCard from "../../components/ui/NeuCard";
import NeuButton from "../../components/ui/NeuButton";
import "../../styles/neumorphism.css";

const initial = {
  name: "",
  email: "",
  phone: "",
  cpf: "",
  rg: "",
  gender: "",
  birthDate: "",
  notes: "",
  avatarUrl: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  tags: "", // input de texto separado por vírgula -> vira array
  originId: "",
  isActive: true,
};

const ClientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(`/clients/${id}`);
        setForm({
          ...initial,
          ...data,
          birthDate: data.birthDate ? data.birthDate.slice(0, 10) : "",
          tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
        });
      } catch {
        toast.error("Erro ao carregar cliente");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      birthDate: form.birthDate || null,
      gender: form.gender || null,
      originId: form.originId || null,
    };

    try {
      if (id) {
        await api.put(`/clients/${id}`, payload);
        toast.success("Cliente atualizado!");
      } else {
        await api.post("/clients", payload);
        toast.success("Cliente criado!");
      }
      navigate("/dashboard/clients");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar cliente");
    }
  };

  if (loading) {
    return (
      <p className="text-center py-20 text-[var(--text-color)] opacity-70 animate-pulse">
        Carregando...
      </p>
    );
  }

  return (
    <div className="space-y-6 neu-surface">
      <h1 className="text-2xl font-semibold text-[var(--text-color)]">
        {id ? "Editar Cliente" : "Novo Cliente"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <NeuCard className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-color)] mb-4">
            Dados pessoais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Nome*
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="neu-input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                value={form.email || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Telefone*
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className="neu-input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                CPF
              </label>
              <input
                name="cpf"
                value={form.cpf || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                RG
              </label>
              <input
                name="rg"
                value={form.rg || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Sexo
              </label>
              <select
                name="gender"
                value={form.gender || ""}
                onChange={handleChange}
                className="neu-select mt-1 w-full"
              >
                <option value="">—</option>
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Data de Nascimento
              </label>
              <input
                type="date"
                name="birthDate"
                value={form.birthDate || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Avatar (URL)
              </label>
              <input
                name="avatarUrl"
                value={form.avatarUrl || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
                placeholder="https://…"
              />
            </div>
          </div>
        </NeuCard>

        {/* Endereço */}
        <NeuCard className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-color)] mb-4">
            Endereço
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-color)]">
                CEP
              </label>
              <input
                name="zipCode"
                value={form.zipCode || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
                placeholder="00000-000"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Rua
              </label>
              <input
                name="street"
                value={form.street || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Número
              </label>
              <input
                name="number"
                value={form.number || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Complemento
              </label>
              <input
                name="complement"
                value={form.complement || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Bairro
              </label>
              <input
                name="district"
                value={form.district || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Cidade
              </label>
              <input
                name="city"
                value={form.city || ""}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                UF
              </label>
              <input
                name="state"
                value={form.state || ""}
                onChange={handleChange}
                maxLength={2}
                className="neu-input mt-1 w-full uppercase"
              />
            </div>
          </div>
        </NeuCard>

        {/* Outros */}
        <NeuCard className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-color)] mb-4">
            Outros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Tags (separe por vírgula)
              </label>
              <input
                name="tags"
                value={form.tags}
                onChange={handleChange}
                className="neu-input mt-1 w-full"
                placeholder="VIP, Preferência João, Atrasos"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                name="isActive"
                checked={!!form.isActive}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <label
                htmlFor="isActive"
                className="text-sm font-medium text-[var(--text-color)]"
              >
                Cliente ativo
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-color)]">
                Observações
              </label>
              <textarea
                name="notes"
                value={form.notes || ""}
                onChange={handleChange}
                rows={4}
                className="neu-textarea mt-1 w-full"
              />
            </div>
          </div>
        </NeuCard>

        {/* Ações */}
        <div className="flex justify-end gap-2">
          <NeuButton onClick={() => navigate("/dashboard/clients")}>Cancelar</NeuButton>
          <NeuButton type="submit" variant="primary">
            Salvar
          </NeuButton>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
