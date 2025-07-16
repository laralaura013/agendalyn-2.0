import React, { useState } from 'react';

const AnamnesisViewer = ({ form, initialAnswers, onSave, onCancel, isReadOnly = false }) => {
  const [answers, setAnswers] = useState(initialAnswers || {});

  const handleChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(answers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold">{form.title}</h2>
      
      <div className="space-y-4">
        {form.questions.map((q) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-gray-700">{q.label}</label>
            <input
              type="text" // Simplificado para 'text', pode ser expandido com base em q.type
              value={answers[q.id] || ''}
              onChange={(e) => handleChange(q.id, e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              readOnly={isReadOnly}
              disabled={isReadOnly}
            />
          </div>
        ))}
      </div>

      {!isReadOnly && (
        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
            Salvar Respostas
          </button>
        </div>
      )}
    </form>
  );
};

export default AnamnesisViewer;