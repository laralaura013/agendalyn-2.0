import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // Importa nosso serviço de API

const OrderForm = ({ onSave, onCancel }) => {
  const [items, setItems] = useState([{ serviceId: '', quantity: 1 }]);
  const [clientId, setClientId] = useState('');
  const [userId, setUserId] = useState('');

  // Estados para armazenar os dados reais da API
  const [availableServices, setAvailableServices] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // useEffect para buscar os dados da API quando o formulário abrir
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Busca clientes, colaboradores e serviços em paralelo
        const [clientsRes, staffRes, servicesRes] = await Promise.all([
          api.get('/clients'),
          api.get('/staff'),
          api.get('/services')
        ]);
        setAvailableClients(clientsRes.data);
        setAvailableStaff(staffRes.data);
        setAvailableServices(servicesRes.data);
      } catch (error) {
        console.error("Erro ao carregar dados para o formulário:", error);
        alert("Não foi possível carregar os dados necessários. Verifique se há clientes, colaboradores e serviços cadastrados.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { serviceId: '', quantity: 1 }]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ clientId, userId, items });
  };

  if (loading) {
    return <p>Carregando dados do formulário...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Nova Comanda</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700">Cliente</label>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="mt-1 block w-full p-2 border rounded" required>
          <option value="">Selecione um cliente</option>
          {availableClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

       <div>
        <label className="block text-sm font-medium text-gray-700">Colaborador</label>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-1 block w-full p-2 border rounded" required>
          <option value="">Selecione um colaborador</option>
          {availableStaff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <hr />

      <h3 className="text-lg font-medium">Itens</h3>
      {items.map((item, index) => (
         <div key={index} className="flex items-end gap-2 p-2 border-b">
          <div className="flex-grow">
            <label className="text-xs">Serviço</label>
            <select value={item.serviceId} onChange={(e) => handleItemChange(index, 'serviceId', e.target.value)} className="w-full p-2 border rounded" required>
              <option value="">Selecione um serviço</option>
              {availableServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs">Qtd.</label>
            <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10))} className="w-20 p-2 border rounded" min="1" required />
          </div>
          <button type="button" onClick={() => removeItem(index)} className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200">X</button>
       </div>
      ))}
      <button type="button" onClick={addItem} className="w-full py-2 border-dashed border-2 rounded text-blue-600 hover:bg-blue-50 mt-2">+ Adicionar Item</button>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Salvar Comanda</button>
      </div>
    </form>
  );
};

export default OrderForm;