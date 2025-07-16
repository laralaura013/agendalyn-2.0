import React, { useState } from 'react';

const AnamnesisFormBuilder = ({ initialData, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [questions, setQuestions] = useState(initialData?.questions || []);

  const addQuestion = () => {
    const newQuestion = {
      id: `q${Date.now()}`,
      label: '',
      type: 'text', // Tipos podem ser 'text', 'textarea', 'radio', 'checkbox'
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleQuestionChange = (id, field, value) => {
    setQuestions(
      questions.map(q => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ title, questions });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold">{initialData ? 'Editar Modelo' : 'Novo Modelo de Anamnese'}</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Título da Ficha</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          required
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Perguntas</h3>
        {questions.map((q, index) => (
          <div key={q.id} className="p-4 border rounded-md bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Pergunta {index + 1}</span>
              <button
                type="button"
                onClick={() => removeQuestion(q.id)}
                className="text-red-500 hover:text-red-700"
              >
                Remover
              </button>
            </div>
            <label className="block text-xs font-medium text-gray-600">Texto da Pergunta</label>
            <input
              type="text"
              value={q.label}
              onChange={(e) => handleQuestionChange(q.id, 'label', e.target.value)}
              className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md"
              placeholder="Ex: Você possui alguma alergia?"
            />
            {/* Futuramente, adicionar seletor de tipo de pergunta (texto, múltipla escolha, etc.) */}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="w-full py-2 px-4 border border-dashed rounded-md text-blue-600 hover:bg-blue-50"
      >
        + Adicionar Pergunta
      </button>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Salvar Modelo
        </button>
      </div>
    </form>
  );
};

export default AnamnesisFormBuilder;