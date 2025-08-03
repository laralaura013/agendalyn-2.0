// src/components/forms/ClientForm.jsx

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'

const ClientForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const { data } = await api.get(`/admin/clients/${id}`) // ✅ CORRIGIDO
          setForm({ name: data.name, email: data.email, phone: data.phone })
        } catch {
          toast.error('Erro ao carregar cliente')
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [id])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (id) {
        await api.put(`/admin/clients/${id}`, form) // ✅ CORRIGIDO
        toast.success('Cliente atualizado!')
      } else {
        await api.post('/admin/clients', form) // ✅ CORRIGIDO
        toast.success('Cliente criado!')
      }
      navigate('/dashboard/clients')
    } catch {
      toast.error('Erro ao salvar cliente')
    }
  }

  if (loading) {
    return <p className="text-center py-20 text-gray-500 animate-pulse">Carregando...</p>
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        {id ? 'Editar Cliente' : 'Novo Cliente'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl shadow p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/dashboard/clients')}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 mr-2"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}

export default ClientForm
