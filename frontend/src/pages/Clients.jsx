import React, { useState, useEffect } from 'react'; // Adicionei a importação do React
import toast from 'react-hot-toast';
import api from '../services/api';
import { UserPlus, Pencil, Trash2 } from 'lucide-react'; // <-- ESTA É A LINHA QUE FALTAVA

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.get('/clients/admin');
        setClients(res.data);
      } catch (err) {
        toast.error('Erro ao carregar clientes');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Adicionei funções de placeholder para os botões de editar e excluir
  // para que eles não causem erros se você ainda não as implementou.
  const handleEdit = (client) => {
    toast.success(`Editar cliente: ${client.name}`);
    // Aqui você abriria um modal de edição no futuro
  };

  const handleDelete = (client) => {
    if (window.confirm(`Tem certeza que deseja excluir ${client.name}?`)) {
      toast.success(`Excluir cliente: ${client.name}`);
      // Aqui você chamaria a API para deletar o cliente no futuro
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800 transition shadow-md">
          <UserPlus size={18} /> Novo Cliente
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando clientes...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow border">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Nome</th>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">Telefone</th>
                <th className="px-6 py-3 text-left font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{client.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap flex gap-4">
                    <button onClick={() => handleEdit(client)} className="text-blue-600 hover:text-blue-800" title="Editar">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(client)} className="text-red-600 hover:text-red-800" title="Excluir">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Clients;
