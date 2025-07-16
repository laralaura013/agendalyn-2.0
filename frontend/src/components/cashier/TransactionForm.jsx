import React, { useState } from 'react';

const TransactionForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'INCOME',
    amount: '',
    description: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) {
        alert("Por favor, preencha todos os campos.");
        return;
    }
    onSave({
        ...formData,
        amount: parseFloat(formData.amount)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">Lançamento no Caixa</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Tipo de Lançamento</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        >
          <option value="INCOME">Entrada (Recebimento)</option>
          <option value="EXPENSE">Saída (Pagamento)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          placeholder="Ex: 25.50"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Descrição</label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          placeholder="Ex: Pagamento de conta de luz"
          required
        />
      </div>
      
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Salvar Lançamento
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;