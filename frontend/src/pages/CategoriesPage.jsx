// src/pages/CategoriesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../services/api";

/* ========= Icons ========= */
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

/* ========= helpers de compatibilidade ========= */
const CANDIDATE_LIST_PATHS = ["/categories", "/product-categories", "/categories/select"];
const CANDIDATE_CRUD_BASES = ["/categories", "/product-categories"];

const normalizeList = (res) => {
  const raw = Array.isArray(res?.data) ? res.data : res?.data?.items || res?.data?.results || [];
  return raw.map((c) => ({
    id: c.id,
    name: c.name ?? c.title ?? c.label ?? "",
  }));
};

async function tryGet(paths, config) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, config);
      return { data: normalizeList(res), usedPath: p };
    } catch (e) {
      lastErr = e;
      if (e?.response?.status === 404) continue;
    }
  }
  throw lastErr;
}

async function tryPost(bases, payload) {
  let lastErr;
  for (const base of bases) {
    try {
      return await api.post(base, payload);
    } catch (e) {
      lastErr = e;
      if ([400, 404].includes(e?.response?.status)) continue;
      else break;
    }
  }
  throw lastErr;
}

async function tryPut(bases, id, payload) {
  let lastErr;
  for (const base of bases) {
    try {
      return await api.put(`${base}/${id}`, payload);
    } catch (e) {
      lastErr = e;
      if ([400, 404].includes(e?.response?.status)) continue;
      else break;
    }
  }
  throw lastErr;
}

async function tryDelete(bases, id) {
  let lastErr;
  for (const base of bases) {
    try {
      return await api.delete(`${base}/${id}`);
    } catch (e) {
      lastErr = e;
      if ([400, 404].includes(e?.response?.status)) continue;
      else break;
    }
  }
  throw lastErr;
}

/* ========= Modal: Formulário ========= */
const CategoryFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(initialData ? initialData.name : "");
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name: name.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {initialData ? "Editar Categoria" : "Nova Categoria"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Categoria</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Cabelo"
              className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
              required
            />
          </div>
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="rounded-lg bg-white border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-[#4A544A] px-8 py-2.5 font-medium text-white hover:bg-opacity-90">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ========= Modal: Confirmação ========= */
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, categoryName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h3>
        <p className="mt-4 text-gray-600">
          Tem certeza que deseja excluir a categoria "<strong>{categoryName}</strong>"?
        </p>
        <div className="mt-8 flex justify-end gap-4">
          <button onClick={onClose} className="rounded-lg bg-white border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white hover:bg-red-700">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========= Página ========= */
export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      // busca resiliente a diferentes rotas/formatos
      const res = await tryGet(CANDIDATE_LIST_PATHS, { params: { take: 500 } });
      setCategories(res.data);
    } catch (error) {
      console.error("Erro ao listar categorias:", error);
      toast.error("Não foi possível carregar as categorias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSave = async ({ name }) => {
    const isEditing = Boolean(selectedCategory?.id);

    const tryPayloads = [{ name }, { title: name }];
    const call = async () => {
      if (isEditing) {
        for (const payload of tryPayloads) {
          try {
            await tryPut(CANDIDATE_CRUD_BASES, selectedCategory.id, payload);
            return;
          } catch (e) {
            if (![400, 404].includes(e?.response?.status)) throw e;
          }
        }
        throw new Error("Não foi possível atualizar a categoria.");
      } else {
        for (const payload of tryPayloads) {
          try {
            await tryPost(CANDIDATE_CRUD_BASES, payload);
            return;
          } catch (e) {
            if (![400, 404].includes(e?.response?.status)) throw e;
          }
        }
        throw new Error("Não foi possível criar a categoria.");
      }
    };

    toast
      .promise(call(), {
        loading: isEditing ? "Salvando alterações..." : "Criando categoria...",
        success: isEditing ? "Categoria atualizada!" : "Categoria criada!",
        error: (err) => err?.response?.data?.message || "Falha ao salvar categoria.",
      })
      .then(() => {
        setIsModalOpen(false);
        setSelectedCategory(null);
        fetchCategories();
      });
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    toast
      .promise(tryDelete(CANDIDATE_CRUD_BASES, categoryToDelete.id), {
        loading: "Excluindo categoria...",
        success: "Categoria excluída com sucesso!",
        error: (err) =>
          err?.response?.data?.message ||
          "Não foi possível excluir a categoria. Verifique se ela não está em uso.",
      })
      .then(() => {
        setIsConfirmModalOpen(false);
        setCategoryToDelete(null);
        fetchCategories();
      });
  };

  const openModal = (category = null) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setSelectedCategory(null);
    setIsModalOpen(false);
  };
  const openConfirmModal = (category) => {
    setCategoryToDelete(category);
    setIsConfirmModalOpen(true);
  };
  const closeConfirmModal = () => {
    setCategoryToDelete(null);
    setIsConfirmModalOpen(false);
  };

  return (
    <div className="bg-gray-50 min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categorias de Produtos</h1>
          <p className="text-md text-gray-600 mt-1">Organize seus produtos em categorias.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="mt-4 sm:mt-0 flex items-center gap-2 bg-[#8C7F8A] hover:bg-opacity-80 text-white font-semibold py-2 px-5 rounded-lg shadow-md"
        >
          <AddIcon /> Nova Categoria
        </button>
      </header>

      {loading ? (
        <p className="text-center text-gray-500 py-10">Carregando...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {categories.map((category) => (
              <li
                key={category.id}
                className="p-4 sm:p-6 hover:bg-gray-50 flex items-center justify-between"
              >
                <p className="text-lg font-semibold text-gray-900">{category.name}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openModal(category)}
                    className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => openConfirmModal(category)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-500/10"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {!categories.length && (
            <div className="text-center py-12 text-gray-500">Nenhuma categoria cadastrada.</div>
          )}
        </div>
      )}

      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        initialData={selectedCategory}
      />
      <ConfirmDeleteModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmDelete}
        categoryName={categoryToDelete?.name}
      />
    </div>
  );
}
