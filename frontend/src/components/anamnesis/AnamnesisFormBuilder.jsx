import React, { useState } from 'react';

const AnamnesisFormBuilder = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([{ id: Date.now(), text: '', type: 'text' }]);

  const handleAddQuestion = () => {
    setQuestions([...questions, { id: Date.now(), text: '', type: 'text' }]);
  };

  const handleRemoveQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleQuestionTextChange = (id, newText) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text: newText } : q));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Filtra perguntas vazias antes de salvar
    const validQuestions = questions.filter(q => q.text.trim() !== '');
    if (!title || validQuestions.length === 0) {
        alert("Por favor, preencha o título e pelo menos uma pergunta.");
        return;
    }
    onSave({ title, questions: validQuestions });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Criar Modelo de Ficha</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Título da Ficha</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Ficha para Avaliação Facial"
          className="mt-1 block w-full p-2 border rounded-md"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Perguntas</label>
        <div className="space-y-3 mt-2 p-3 border rounded-md bg-gray-50">
          {questions.map((q, index) => (
            <div key={q.id} className="flex items-center gap-2">
              <span className="text-gray-500">{index + 1}.</span>
              <input
                type="text"
                value={q.text}
                onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                placeholder="Digite sua pergunta aqui"
                className="flex-grow p-2 border rounded-md"
              />
              <button 
                type="button" 
                onClick={() => handleRemoveQuestion(q.id)}
                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                aria-label="Remover pergunta"
              >
                X
              </button>
            </div>
          ))}
          <button 
            type="button" 
            onClick={handleAddQuestion}
            className="w-full mt-2 py-2 border-dashed border-2 rounded text-blue-600 hover:bg-blue-50"
          >
            + Adicionar Pergunta
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar Modelo</button>
      </div>
    </form>
  );
};

export default AnamnesisFormBuilder;