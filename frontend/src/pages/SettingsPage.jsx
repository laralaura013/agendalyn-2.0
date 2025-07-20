import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Link, Copy } from 'lucide-react'; // Importa os ícones

const SettingsPage = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [companyId, setCompanyId] = useState(''); // Novo estado para o ID
  const [loading, setLoading] = useState(true);

  const bookingUrl = `${window.location.origin}/agendar/${companyId}`; // Monta a URL dinâmica

  const fetchCompanyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/company/profile');
      setFormData({
        name: response.data.name || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
      });
      setCompanyId(response.data.id || ''); // Guarda o ID da empresa
    } catch (error) {
      toast.error("Não foi possível carregar os dados da empresa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanyProfile();
  }, [fetchCompanyProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const savePromise = api.put('/company/profile', formData);
    toast.promise(savePromise, {
      loading: 'A salvar alterações...',
      success: 'Configurações salvas com sucesso!',
      error: 'Não foi possível salvar as alterações.',
    });
  };
  
  // Função para copiar o link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success('Link copiado para a área de transferência!');
  };

  if (loading) {
    return <p>A carregar configurações...</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>
      
      {/* Secção de Agendamento Online */}
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex items-center gap-2 mb-2">
            <Link className="h-5 w-5 text-purple-700" />
            <h2 className="text-xl font-semibold">Sua Página de Agendamento</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Partilhe este link com os seus clientes para que eles possam agendar online.</p>
        <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
            <input 
                type="text" 
                value={bookingUrl}
                readOnly
                className="flex-1 bg-transparent outline-none text-sm text-gray-700"
            />
            <button onClick={handleCopyLink} className="p-2 text-gray-500 hover:text-purple-700">
                <Copy size={18} />
            </button>
        </div>
      </div>

      {/* Secção de Dados da Empresa */}
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Dados da Empresa</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone de Contato</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Endereço</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              className="mt-1 block w-full p-2 border rounded-md"
            ></textarea>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:bg-purple-800"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;