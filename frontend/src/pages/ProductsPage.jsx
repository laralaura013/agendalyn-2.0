// src/pages/ProductsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import api from "../services/api";

/* ================= Icons (SVG inline) ================= */
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
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);
const ProductPlaceholderIcon = () => (
  <svg className="w-16 h-16 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.43 2.43h10.268c1.282 0 2.43-1.043 2.43-2.43a2.25 2.25 0 01-2.43-2.43 3 3 0 00-5.78-1.128v.001z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a2.25 2.25 0 002.25-2.25H9.75A2.25 2.25 0 0012 21zm-2.25-4.125a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM12 3.75a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
  </svg>
);

/* ================= Helpers ================= */
const toBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const firstArray = (res) =>
  Array.isArray(res?.data) ? res.data : res?.data?.items || res?.data?.results || [];

/** Tenta uma lista de endpoints até achar um que responda 200 */
async function tryGet(paths = [], config) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, config);
      return { data: firstArray(res) };
    } catch (e) {
      lastErr = e;
      if (e?.response?.status === 404) continue;
    }
  }
  throw lastErr;
}

/* ================= Modal: Formulário Produto ================= */
const ProductFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    categoryId: "",
    brandId: "",
    price: "",
    stock: "0",
    cost: "",
    description: "",
  });

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carrega categorias e marcas quando abrir
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [catRes, brRes] = await Promise.all([
          tryGet(["/categories", "/product-categories", "/categories/select"], { params: { take: 200 } }),
          tryGet(["/brands", "/product-brands", "/brands/select"], { params: { take: 200 } }),
        ]);
        setCategories(catRes.data);
        setBrands(brRes.data);
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível carregar categorias/marcas.");
      } finally {
        setLoadingOptions(false);
      }
    };
    if (isOpen) loadOptions();
  }, [isOpen]);

  // Preenche form com dados de edição
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({
        id: initialData.id ?? null,
        name: initialData.name ?? "",
        categoryId: initialData.categoryId ?? initialData.category?.id ?? "",
        brandId: initialData.brandId ?? initialData.brand?.id ?? "",
        price: initialData.price ?? "",
        stock: String(initialData.stock ?? "0"),
        cost: initialData.cost ?? "",
        description: initialData.description ?? "",
      });
    } else {
      setFormData({
        id: null,
        name: "",
        categoryId: "",
        brandId: "",
        price: "",
        stock: "0",
        cost: "",
        description: "",
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Informe o nome.");
    if (!formData.price) return toast.error("Informe o preço.");
    if (!formData.stock) return toast.error("Informe o estoque.");

    const payloadBase = {
      name: formData.name.trim(),
      price: Number(formData.price),
      stock: Number(formData.stock),
      cost: formData.cost ? Number(formData.cost) : null,
      description: formData.description || "",
      categoryId: formData.categoryId || null,
      brandId: formData.brandId || null,
    };

    setSaving(true);
    try {
      if (formData.id) {
        // UPDATE
        try {
          await api.put(`/products/${formData.id}`, payloadBase);
        } catch (err) {
          if ([400, 404].includes(err?.response?.status)) {
            await api.put(`/products/${formData.id}`, {
              ...payloadBase,
              category: categories.find((c) => c.id === formData.categoryId)?.name || "",
              brand: brands.find((b) => b.id === formData.brandId)?.name || "",
            });
          } else throw err;
        }
        toast.success("Produto atualizado!");
      } else {
        // CREATE
        try {
          await api.post("/products", payloadBase);
        } catch (err) {
          if ([400, 404].includes(err?.response?.status)) {
            await api.post("/products", {
              ...payloadBase,
              category: categories.find((c) => c.id === formData.categoryId)?.name || "",
              brand: brands.find((b) => b.id === formData.brandId)?.name || "",
            });
          } else throw err;
        }
        toast.success("Produto criado!");
      }
      onSave?.(); // avisa o pai pra recarregar
      onClose?.();
    } catch (e2) {
      console.error(e2);
      toast.error(e2?.response?.data?.message || "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <form
        onSubmit={submit}
        className="modal-content bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-8 relative border border-gray-200"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {formData.id ? "Editar Produto" : "Novo Produto"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Gel Fixador"
              className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria (Opcional)
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                disabled={loadingOptions}
              >
                <option value="">Nenhuma</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca (Opcional)
              </label>
              <select
                name="brandId"
                value={formData.brandId}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                disabled={loadingOptions}
              >
                <option value="">Nenhuma</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço de Venda (R$)
              </label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="70.00"
                className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade em Stock
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                placeholder="25.00"
                className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Detalhes sobre o produto..."
              className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-lg bg-white border border-gray-300 px-6 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto rounded-lg bg-[#4A544A] px-8 py-2.5 text-base font-medium text-white hover:bg-opacity-90"
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar Produto"}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ================= Modal: Confirmar Exclusão ================= */
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, productName }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="modal-content bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h3>
        <p className="mt-4 text-gray-600">
          Tem certeza que deseja excluir "<strong>{productName}</strong>"?
        </p>
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-white border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= Card Produto ================= */
const ProductCard = ({ product, onEdit, onDelete }) => {
  const stock = Number(product.stock);
  let stockStatusColor = "bg-green-100 text-green-800";
  if (stock <= 10) stockStatusColor = "bg-yellow-100 text-yellow-800";
  if (stock <= 5) stockStatusColor = "bg-red-100 text-red-800";
  const categoryName = product.category?.name || product.categoryName || "Sem categoria";
  const brandName = product.brand?.name || product.brandName || "";

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <div className="bg-gray-50 h-40 flex items-center justify-center">
        <ProductPlaceholderIcon />
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex-grow">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stockStatusColor}`}>
            {stock} em estoque
          </span>
          <h3 className="text-lg font-bold text-gray-900 mt-2 truncate">{product.name}</h3>
          <p className="text-sm text-gray-500">
            {categoryName}
            {brandName ? ` • ${brandName}` : ""}
          </p>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-gray-900">{toBRL(product.price)}</p>
            {product.cost ? (
              <p className="text-sm text-gray-500 line-through">{toBRL(product.cost)}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200 flex gap-2">
          <button
            onClick={() => onEdit(product)}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            <EditIcon /> Editar
          </button>
          <button
            onClick={() => onDelete(product)}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
          >
            <DeleteIcon /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= Página de Produtos ================= */
export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/products", { params: { take: 200 } });
      const list = firstArray(res).map((p) => ({
        ...p,
        categoryName: p.category?.name ?? p.categoryName ?? p.category ?? "",
        brandName: p.brand?.name ?? p.brandName ?? p.brand ?? "",
      }));
      setProducts(list);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSaved = () => fetchProducts();

  const confirmDelete = () => {
    if (!productToDelete) return;
    const del = api.delete(`/products/${productToDelete.id}`);
    toast
      .promise(del, {
        loading: "Excluindo produto...",
        success: "Produto excluído com sucesso!",
        error: (err) => err?.response?.data?.message || "Não foi possível excluir o produto.",
      })
      .then(fetchProducts)
      .finally(() => {
        setIsConfirmModalOpen(false);
        setProductToDelete(null);
      });
  };

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name?.toLowerCase().includes(searchTerm.toLowerCase())),
    [products, searchTerm]
  );

  const openModal = (product = null) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };
  const openConfirmModal = (product) => {
    setProductToDelete(product);
    setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setProductToDelete(null);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
            <p className="text-md text-gray-600 mt-1">Gerencie seu inventário de produtos.</p>
          </div>
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-64">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-lg border-gray-300 pl-10 py-2 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
              />
            </div>
            <button
              onClick={() => openModal()}
              className="flex-shrink-0 flex items-center justify-center gap-2 bg-[#8C7F8A] hover:bg-opacity-80 text-white font-semibold py-2 px-5 rounded-lg shadow-md"
            >
              <AddIcon /> Novo Produto
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-center text-gray-500 py-10">Carregando produtos...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={openModal}
                  onDelete={openConfirmModal}
                />
              ))}
            </div>
            {!filteredProducts.length && (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-gray-800">Nenhum produto encontrado</h3>
                <p className="text-gray-500 mt-2">Tente ajustar sua busca ou adicione um novo produto.</p>
              </div>
            )}
          </>
        )}

        <ProductFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaved}
          initialData={selectedProduct}
        />
        <ConfirmDeleteModal
          isOpen={isConfirmModalOpen}
          onClose={closeConfirmModal}
          onConfirm={confirmDelete}
          productName={productToDelete?.name}
        />
      </div>
    </div>
  );
}
