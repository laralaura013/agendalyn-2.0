import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const OrderForm = ({ onSave, onCancel }) => {
  const [items, setItems] = useState([{ type: 'service', id: '', quantity: 1 }]);
  const [clientId, setClientId] = useState('');
  const [userId, setUserId] = useState('');

  const [availableServices, setAvailableServices] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsRes, staffRes, servicesRes, productsRes] = await Promise.all([
          api.get('/clients'),
          api.get('/staff'),
          api.get('/services'),
          api.get('/products')
        ]);
        setAvailableClients(clientsRes.data);
        setAvailableStaff(staffRes.data);
        setAvailableServices(servicesRes.data);
        setAvailableProducts(productsRes.data);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        alert("Não foi possível carregar os dados necessários.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    // Reseta o ID se o tipo mudar
    if (field === 'type') {
      newItems[index]['id'] = '';
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { type: 'service', id: '', quantity: 1 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formattedItems = items.map(item => ({
      quantity: item.quantity,
      serviceId: item.type === 'service' ? item.id : null,
      productId: item.type === 'product' ? item.id : null,
    }));
    onSave({ clientId, userId, items: formattedItems });
  };

  if (loading) {
    return <p>A carregar dados...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Nova Comanda</h2>

      <div>
        <label>Cliente</label>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-2 border rounded" required>
          <option value="">Selecione um cliente</option>
          {availableClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label>Colaborador</label>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full p-2 border rounded" required>
          <option value="">Selecione um colaborador</option>
          {availableStaff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <hr />
      <h3 className="text-lg font-medium">Itens</h3>
      {items.map((item, index) => (
         <div key={index} className="grid grid-cols-12 gap-2 p-2 border-b items-end">
          <div className="col-span-3">
            <label className="text-xs">Tipo</label>
            <select value={item.type} onChange={(e) => handleItemChange(index, 'type', e.target.value)} className="w-full p-2 border rounded">
              <option value="service">Serviço</option>
              <option value="product">Produto</option>
            </select>
          </div>
          <div className="col-span-6">
            <label className="text-xs">Item</label>
            <select value={item.id} onChange={(e) => handleItemChange(index, 'id', e.target.value)} className="w-full p-2 border rounded" required>
              <option value="">Selecione um item</option>
              {item.type === 'service' 
                ? availableServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                : availableProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)
              }
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs">Qtd.</label>
            <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10))} className="w-full p-2 border rounded" min="1" required />
          </div>
          <div className="col-span-1">
             <button type="button" onClick={() => removeItem(index)} className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200">X</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addItem} className="w-full py-2 border-dashed border-2 rounded text-purple-700 hover:bg-purple-50 mt-2">+ Adicionar Item</button>

      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>
        <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded-md">Salvar Comanda</button>
      </div>
    </form>
  );
};

export default OrderForm;