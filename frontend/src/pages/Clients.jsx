// src/pages/Clients.jsx

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { UserPlus, Edit2 as Edit, Trash2 } from 'lucide-react'
import api from '../services/api'

const Clients = () => {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Carrega a lista de clientes
  const fetchClients = async () => {
    try {
      const res = await api.get('/clients/admin') 
      setClients(res.data)
    } catch {
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  // Navegação para criação/edição
  const handleNew = () => navigate('new')       // relativa a /dashboard/clients
  const handleEdit = (id) => navigate(`${id}/edit`)
  const handleDelete = async (id) => {
    if (!window.confirm('Confirma exclusão deste cliente?')) return
    try {
      await api.delete(`/clients/${id}`)
      toast.success('Cliente excluído')
      fetchClients()
    } catch {
      toast.error('Erro ao excluir cliente')
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Clientes</h1>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
        >
          <UserPlus size={18} /> Novo Cliente
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Carregando clientes…</p>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="px-6 py-3 text-left">Nome</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Telefone</th>
                <th className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.length > 0 ? (
                clients.map(cli => (
                  <tr key={cli.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{cli.name}</td>
                    <td className="px-6 py-4">{cli.email}</td>
                    <td className="px-6 py-4">{cli.phone || '—'}</td>
                    <td className="px-6 py-4 text-center space-x-4">
                      <button
                        onClick={() => handleEdit(cli.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(cli.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Clients
