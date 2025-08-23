// src/pages/AnamnesisPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../services/api";

/* ========== Ícones ========== */
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
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
  </svg>
);

/* ========== Rotas & helpers de compat ========== */
const LIST_PATHS = ["/anamnesis/forms", "/anamneses", "/anamnesis"];
const CRUD_BASES = ["/anamnesis/forms", "/anamneses", "/anamnesis"];

const normalizeQuestions = (qs) => {
  if (!Array.isArray(qs)) return [];
  // aceita {text} ou string
  return qs.map((q) => (typeof q === "string" ? { text: q } : { text: q?.text ?? "" })).filter((q) => q.text);
};
const normalizeForm = (f) => ({
  id: f.id,
  title: f.title ?? f.name ?? f.label ?? "Sem título",
  questions:
    normalizeQuestions(f.questions ?? f.items ?? f.fields) // backends diferentes
});

const normalizeList = (res) => {
  const raw = Array.isArray(res?.data) ? res.data : res?.data?.items || res?.data?.results || [];
  return raw.map(normalizeForm);
};

async function tryGet(paths) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, { params: { take: 200 } });
      return { data: normalizeList(res), usedPath: p };
    } catch (e) {
      lastErr = e;
      if (e?.response?.status === 404) continue;
    }
  }
  throw lastErr;
}

async function tryPost(bases, payloads) {
  let lastErr;
  for (const base of bases) {
    for (const body of payloads) {
      try {
        return await api.post(base, body);
      } catch (e) {
        lastErr = e;
        if (![400, 404, 422].includes(e?.response?.status)) throw e;
      }
    }
  }
  throw lastErr;
}

async function tryPut(bases, id, payloads) {
  let lastErr;
  for (const base of bases) {
    for (const body of payloads) {
      try {
        return await api.put(`${base}/${id}`, body);
      } catch (e) {
        lastErr = e;
        if (![400, 404, 422].includes(e?.response?.status)) throw e;
      }
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
      if (![400, 404].includes(e?.response?.status)) throw e;
    }
  }
  throw lastErr;
}

/* ========== Modal: Criar/Editar ========== */
const AnamnesisFormBuilder = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([""]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setQuestions(
        initialData.questions?.length
          ? initialData.questions.map((q) => q.text || q)
          : [""]
      );
    } else {
      setTitle("");
      setQuestions([""]);
    }
  }, [initialData]);

  const handleQuestionChange = (idx, value) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? value : q)));
  };
  const addQuestion = () => setQuestions((p) => [...p, ""]);
  const removeQuestion = (idx) => {
    setQuestions((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qs = questions.map((q) => q.trim()).filter(Boolean);
    if (!title.trim()) return toast.error("Informe o título.");
    if (!qs.length) return toast.error("Adicione pelo menos uma pergunta.");
    onSave({ title: title.trim(), questions: qs });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-8 relative flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {initialData ? "Editar Modelo" : "Criar Modelo de Ficha"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título da Ficha</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Ficha de Avaliação Facial"
              className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Perguntas</label>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-gray-500">{idx + 1}.</span>
                  <input
                    value={q}
                    onChange={(e) => handleQuestionChange(idx, e.target.value)}
                    placeholder="Digite a pergunta"
                    className="block w-full rounded-lg border-gray-300 focus:border-[#8C7F8A] focus:ring-2 focus:ring-[#8C7F8A]/50"
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className={`text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 ${questions.length <= 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={questions.length <= 1}
                    title="Remover pergunta"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addQuestion} className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#8C7F8A] hover:text-black">
              <AddIcon /> Adicionar Pergunta
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="rounded-lg bg-white border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-[#4A544A] px-8 py-2.5 font-medium text-white hover:bg-opacity-90">
              Salvar Modelo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ========== Modal: Confirmar exclusão ========== */
const ConfirmDeleteModal = ({ open, onClose, onConfirm, formTitle }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900">Confirmar Exclusão</h3>
        <p className="mt-4 text-gray-600">
          Tem certeza que deseja excluir o modelo "<strong>{formTitle}</strong>"?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg bg-white border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 font-medium">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========== Página ========== */
export default function AnamnesisPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tryGet(LIST_PATHS);
      setForms(res.data);
    } catch (error) {
      console.error("Erro ao listar modelos:", error);
      toast.error("Não foi possível carregar os modelos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const saveForm = async ({ title, questions }) => {
    const isEditing = Boolean(selectedForm?.id);

    // Preparamos vários payloads para backends diferentes
    const payloads = [
      { title, questions: questions.map((q) => ({ text: q })) }, // comum
      { title, questions },                                      // array de string
      { name: title, questions: questions.map((q) => ({ text: q })) }, // title -> name
    ];

    const op = isEditing
      ? () => tryPut(CRUD_BASES, selectedForm.id, payloads)
      : () => tryPost(CRUD_BASES, payloads);

    toast
      .promise(op(), {
        loading: isEditing ? "Salvando alterações..." : "Criando modelo...",
        success: isEditing ? "Modelo atualizado!" : "Modelo criado!",
        error: (err) => err?.response?.data?.message || "Falha ao salvar o modelo.",
      })
      .then(() => {
        setIsBuilderModalOpen(false);
        setSelectedForm(null);
        fetchForms();
      });
  };

  const doDelete = async () => {
    if (!toDelete) return;
    toast
      .promise(tryDelete(CRUD_BASES, toDelete.id), {
        loading: "Excluindo modelo...",
        success: "Modelo excluído!",
        error:
          (toDelete && "Não foi possível excluir. Verifique se não está em uso.") ||
          "Não foi possível excluir.",
      })
      .then(() => {
        setDeleteOpen(false);
        setToDelete(null);
        fetchForms();
      });
  };

  const openCreate = () => {
    setSelectedForm(null);
    setIsBuilderModalOpen(true);
  };
  const openEdit = (form) => {
    setSelectedForm(form);
    setIsBuilderModalOpen(true);
  };
  const askDelete = (form) => {
    setToDelete(form);
    setDeleteOpen(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modelos de Ficha de Anamnese</h1>
          <p className="text-md text-gray-600 mt-1">Crie e gerencie seus modelos de ficha.</p>
        </div>
        <button
          onClick={openCreate}
          className="mt-4 sm:mt-0 flex items-center gap-2 bg-[#8C7F8A] hover:bg-opacity-80 text-white font-semibold py-2 px-5 rounded-lg shadow-md"
        >
          <AddIcon /> Criar Novo Modelo
        </button>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : forms.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {forms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div>
                <h2 className="text-xl font-bold text-gray-900 truncate">{form.title}</h2>
                <p className="text-sm text-gray-500 mt-2">
                  {form.questions?.length || 0}{" "}
                  {(form.questions?.length || 0) === 1 ? "pergunta" : "perguntas"}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => openEdit(form)}
                  className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100"
                  title="Editar Modelo"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => askDelete(form)}
                  className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-500/10"
                  title="Excluir Modelo"
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-200 text-gray-600">
          Nenhum modelo criado. Clique em “Criar Novo Modelo”.
        </div>
      )}

      <AnamnesisFormBuilder
        isOpen={isBuilderModalOpen}
        onClose={() => {
          setIsBuilderModalOpen(false);
          setSelectedForm(null);
        }}
        onSave={saveForm}
        initialData={selectedForm}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setToDelete(null);
        }}
        onConfirm={doDelete}
        formTitle={toDelete?.title}
      />
    </div>
  );
}
