// src/components/forms/ProductForm.jsx
import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { asArray } from "../../utils/asArray";

/**
 * Formulário de Produto “inteligente”:
 * - Busca categorias e marcas para select
 * - Validação simples
 * - Retorna os dados normalizados via onSave(payload)
 *
 * Props:
 * - initialData (obj opcional)
 * - onSave(payload) (obrigatório)
 * - onCancel() (opcional)
 */
const ProductForm = ({ initialData, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    cost: "",
    stock: "0",
    categoryId: "",
    brandId: "",
    isActive: true,
  });

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loadingOpts, setLoadingOpts] = useState(false);

  useEffect(() => {
    // preencher com initialData
    if (initialData) {
      setForm({
        name: initialData.name ?? "",
        description: initialData.description ?? "",
        price: initialData.price ?? "",
        cost: initialData.cost ?? "",
        stock: String(initialData.stock ?? "0"),
        categoryId: initialData.categoryId ?? initialData.category?.id ?? "",
        brandId: initialData.brandId ?? initialData.brand?.id ?? "",
        isActive: !(initialData.isActive === false),
      });
    } else {
      setForm({
        name: "",
        description: "",
        price: "",
        cost: "",
        stock: "0",
        categoryId: "",
        brandId: "",
        isActive: true,
      });
    }
  }, [initialData]);

  useEffect(() => {
    const load = async () => {
      setLoadingOpts(true);
      try {
        const [c, b] = await Promise.allSettled([api.get("/categories"), api.get("/brands")]);
        setCategories(c.status === "fulfilled" ? (Array.isArray(c.value.data) ? c.value.data : c.value.data?.items || []) : []);
        setBrands(b.status === "fulfilled" ? (Array.isArray(b.value.data) ? b.value.data : b.value.data?.items || []) : []);
      } catch {
        setCategories([]);
        setBrands([]);
      } finally {
        setLoadingOpts(false);
      }
    };
    load();
  }, []);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Informe o nome.");
    const price = form.price === "" ? 0 : Number(form.price);
    const stock = form.stock === "" ? 0 : Number(form.stock);
    if (!(price >= 0)) return alert("Preço inválido.");
    if (!(stock >= 0)) return alert("Estoque inválido.");

    const payload = {
      name: form.name.trim(),
      description: form.description || "",
      price,
      stock,
      cost: form.cost === "" ? null : Number(form.cost),
      categoryId: form.categoryId || null,
      brandId: form.brandId || null,
      isActive: !!form.isActive,
    };
    onSave?.(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Nome*</label>
          <input
            name="name"
            value={form.name}
            onChange={change}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            required
            placeholder="Ex.: Pomada Modeladora"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Categoria</label>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={change}
            disabled={loadingOpts}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Nenhuma</option>
            {asArray(categories).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Marca</label>
          <select
            name="brandId"
            value={form.brandId}
            onChange={change}
            disabled={loadingOpts}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Nenhuma</option>
            {asArray(brands).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Preço de venda (R$)*</label>
          <input
            type="number"
            step="0.01"
            name="price"
            value={form.price}
            onChange={change}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="70.00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Estoque*</label>
          <input
            type="number"
            name="stock"
            value={form.stock}
            onChange={change}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            min="0"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Preço de custo (R$) — opcional</label>
          <input
            type="number"
            step="0.01"
            name="cost"
            value={form.cost}
            onChange={change}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="25.00"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            name="description"
            value={form.description}
            onChange={change}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Detalhes do produto…"
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            checked={!!form.isActive}
            onChange={change}
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">Produto ativo</label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#8C7F8A] text-white hover:bg-opacity-90">
          Salvar Produto
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
