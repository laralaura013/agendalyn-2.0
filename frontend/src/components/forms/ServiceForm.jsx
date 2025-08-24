// src/components/forms/ServiceForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { asArray } from "../../utils/asArray";

const sanitize = (obj) => {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === "" || v === undefined || v === null) return;
    if (k === "price") {
      const n = Number(v);
      if (!Number.isNaN(n)) out[k] = n;
      return;
    }
    if (k === "duration") {
      const n = Number(v);
      if (Number.isNaN(n)) return; // se vazio, nem manda
      out[k] = n;
      return;
    }
    if (k === "staffIds") {
      const arr = asArray(v).filter(Boolean);
      if (arr.length) out[k] = arr;
      return;
    }
    out[k] = v;
  });
  return out;
};

const ServiceForm = ({
  initialData,
  categories: categoriesProp = [],
  staff: staffProp = [],
  onSave,
  onCancel,
}) => {
  const isEdit = Boolean(initialData?.id);

  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    description: "",
    color: "",
    categoryId: "",
    showInBooking: true,
    isActive: true,
    staffIds: [],
  });

  const [categories, setCategories] = useState(asArray(categoriesProp));
  const [staff, setStaff] = useState(asArray(staffProp));
  const [loadingLists, setLoadingLists] = useState(false);

  // Carrega selects se não recebidos por props
  useEffect(() => {
    if (categoriesProp.length && staffProp.length) return;

    setLoadingLists(true);
    (async () => {
      try {
        const [cats, st] = await Promise.allSettled([api.get("/categories"), api.get("/staff")]);
        if (!categoriesProp.length) {
          setCategories(
            cats.status === "fulfilled"
              ? asArray(cats.value?.data?.items || cats.value?.data)
              : []
          );
        }
        if (!staffProp.length) {
          setStaff(
            st.status === "fulfilled"
              ? asArray(st.value?.data?.items || st.value?.data)
              : []
          );
        }
      } catch {
        // silencia; lista vazia
      } finally {
        setLoadingLists(false);
      }
    })();
  }, [categoriesProp.length, staffProp.length]);

  // Preenche estado na edição
  useEffect(() => {
    if (!initialData) return;
    setForm({
      name: initialData.name || "",
      price: initialData.price ?? "",
      duration:
        initialData.duration === undefined || initialData.duration === null
          ? ""
          : String(initialData.duration),
      description: initialData.description || "",
      color: initialData.color || "",
      categoryId: initialData.categoryId || initialData.category?.id || "",
      showInBooking:
        typeof initialData.showInBooking === "boolean" ? initialData.showInBooking : true,
      isActive:
        typeof initialData.isActive === "boolean" ? initialData.isActive : true,
      staffIds: asArray(initialData.staff).map((p) => p.id).filter(Boolean),
    });
  }, [initialData]);

  const canSave = useMemo(() => {
    if (!form.name.trim()) return false;
    const priceOk = form.price !== "" && Number(form.price) >= 0;
    if (!priceOk) return false;
    return true; // duração é opcional
  }, [form.name, form.price]);

  const handleChange = (e) => {
    const { name, value, type, checked, multiple, options } = e.target;
    if (multiple) {
      const vals = Array.from(options)
        .filter((o) => o.selected)
        .map((o) => o.value);
      setForm((prev) => ({ ...prev, [name]: vals }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) {
      toast.error("Preencha nome e preço.");
      return;
    }
    const payload = sanitize({
      ...form,
      price: form.price,
      duration: form.duration === "" ? undefined : Number(form.duration),
      categoryId: form.categoryId || undefined,
      color: form.color || undefined,
      description: form.description || undefined,
      staffIds: form.staffIds,
    });
    onSave?.(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-6 w-full max-w-2xl">
      <h2 className="text-2xl font-bold">{isEdit ? "Editar Serviço" : "Novo Serviço"}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Nome*</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-1 block w-full border rounded p-2"
            placeholder="Ex.: Corte Masculino"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Preço (R$)*</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="price"
            value={form.price}
            onChange={handleChange}
            className="mt-1 block w-full border rounded p-2"
            placeholder="50.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Duração (min) — opcional
          </label>
          <input
            type="number"
            name="duration"
            value={form.duration}
            onChange={handleChange}
            className="mt-1 block w-full border rounded p-2"
            placeholder="30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Categoria</label>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            className="mt-1 block w-full border rounded p-2"
            disabled={loadingLists}
          >
            <option value="">—</option>
            {asArray(categories).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Cor (hex)</label>
          <input
            name="color"
            value={form.color}
            onChange={handleChange}
            className="mt-1 block w-full border rounded p-2"
            placeholder="#545c57"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="mt-1 block w-full border rounded p-2"
            rows={3}
            placeholder="Detalhes, observações…"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Profissionais que atendem (opcional)
          </label>
          <select
            multiple
            name="staffIds"
            value={form.staffIds}
            onChange={handleChange}
            className="mt-1 block w-full border rounded p-2 h-32"
            disabled={loadingLists}
          >
            {asArray(staff).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.nickname || p.email}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Use Ctrl/Cmd para selecionar vários.</p>
        </div>

        <div className="sm:col-span-2 flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              checked={!!form.isActive}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <span className="text-sm">Serviço ativo</span>
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              name="showInBooking"
              checked={!!form.showInBooking}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <span className="text-sm">Visível no agendamento público</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="px-4 py-2 bg-purple-700 text-white rounded-md disabled:opacity-60"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

export default ServiceForm;
