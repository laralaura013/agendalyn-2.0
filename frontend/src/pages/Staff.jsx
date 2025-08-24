import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  RefreshCcw,
  Download,
  Plus,
  Eye,
  EyeOff,
  Filter,
  Search,
} from 'lucide-react';

import ResourceTable from '../components/dashboard/ResourceTable';
import Modal from '../components/dashboard/Modal';
import StaffForm from '../components/forms/StaffForm'; // ✅ caminho certo
import api from '../services/api';

import { asArray } from '../utils/asArray';

/**
 * Página de Colaboradores
 * - Busca com debounce (nome/email)
 * - Filtros por função e visibilidade
 * - Toggle de visibilidade inline (PATCH dedicado)
 * - Export CSV do dataset filtrado
 * - Toolbar com ações rápidas e contador de resultados
 */

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'BARBER', 'HAIRDRESSER'];

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

const toCSV = (rows) => {
  const cols = [
    'id',
    'name',
    'email',
    'role',
    'commission',
    'phone',
    'nickname',
    'showInBooking',
  ];
  const header = cols.join(',');
  const lines = asArray(rows).map((r) =>
    cols
      .map((c) => {
        const val = r?.[c] ?? '';
        const s = String(val).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
};

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [visibleFilter, setVisibleFilter] = useState('ALL'); // ALL | YES | NO

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/staff');
      setStaff(normalizeList(response.data));
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar os colaboradores.');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Debounce da busca
  useEffect(() => {
    const id = setTimeout(() => setQ(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  const filtered = useMemo(() => {
    let rows = staff;

    if (q.trim()) {
      const term = q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.name || '').toLowerCase().includes(term) ||
          String(r.email || '').toLowerCase().includes(term)
      );
    }

    if (roleFilter !== 'ALL') {
      rows = rows.filter((r) => String(r.role || '') === roleFilter);
    }

    if (visibleFilter !== 'ALL') {
      const expect = visibleFilter === 'YES';
      rows = rows.filter((r) => Boolean(r.showInBooking) === expect);
    }

    return rows;
  }, [staff, q, roleFilter, visibleFilter]);

  const handleSave = async (data) => {
    const payload = { ...data };
    if (!payload.password) delete payload.password;

    const isEditing = Boolean(selectedStaff?.id);
    const req = isEditing
      ? api.put(`/staff/${selectedStaff.id}`, payload)
      : api.post('/staff', payload);

    await toast.promise(req, {
      loading: isEditing ? 'Atualizando colaborador...' : 'Criando colaborador...',
      success: () => {
        fetchStaff();
        setIsModalOpen(false);
        setSelectedStaff(null);
        return `Colaborador ${isEditing ? 'atualizado' : 'criado'} com sucesso!`;
      },
      error: (err) =>
        err?.response?.data?.message || 'Não foi possível salvar o colaborador.',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este colaborador?')) return;

    await toast.promise(api.delete(`/staff/${id}`), {
      loading: 'Excluindo colaborador...',
      success: () => {
        fetchStaff();
        return 'Colaborador excluído com sucesso!';
      },
      error: 'Não foi possível excluir o colaborador.',
    });
  };

  // Toggle usando endpoint dedicado
  const handleToggleVisible = async (row) => {
    const next = !row.showInBooking;
    const id = row.id;

    setStaff((prev) => asArray(prev).map((r) => (r.id === id ? { ...r, showInBooking: next } : r)));

    try {
      await api.patch(`/staff/${id}/visibility`, { showInBooking: next });
      toast.success(next ? 'Visível no agendamento.' : 'Oculto do agendamento.');
    } catch (e) {
      setStaff((prev) => asArray(prev).map((r) => (r.id === id ? { ...r, showInBooking: !next } : r)));
      const msg = e?.response?.data?.message || 'Não foi possível alterar a visibilidade.';
      toast.error(msg);
    }
  };

  const exportCsv = () => {
    try {
      const csv = toCSV(filtered);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `colaboradores-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao exportar CSV.');
    }
  };

  const columns = [
    {
      header: 'Nome',
      accessor: 'name',
      className: 'font-medium',
    },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Função',
      accessor: 'role',
      render: (role) => (
        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
          {role || '—'}
        </span>
      ),
    },
    {
      header: 'Visível',
      accessor: 'showInBooking',
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => handleToggleVisible(row)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition ${
            row.showInBooking
              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
          }`}
          title={row.showInBooking ? 'Ocultar do agendamento' : 'Tornar visível'}
        >
          {row.showInBooking ? <Eye size={14} /> : <EyeOff size={14} />}
          {row.showInBooking ? 'Sim' : 'Não'}
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Colaboradores</h1>
          <p className="text-sm text-gray-500">
            Gerencie sua equipe, disponibilidade e visibilidade pública.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStaff}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            title="Atualizar"
          >
            <RefreshCcw size={16} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            title="Exportar CSV"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            onClick={() => {
              setSelectedStaff(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-700 text-white hover:bg-purple-800 transition shadow"
          >
            <Plus size={16} />
            Novo Colaborador
          </button>
        </div>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-300 outline-none"
          />
        </div>

        <div className="inline-flex items-center gap-2">
          <span className="hidden md:inline text-gray-500">
            <Filter size={16} className="inline mr-1" />
            Filtros:
          </span>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white"
          >
            <option value="ALL">Todas as funções</option>
            {asArray(ROLES).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={visibleFilter}
            onChange={(e) => setVisibleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white"
          >
            <option value="ALL">Todos (visível/oculto)</option>
            <option value="YES">Somente visíveis</option>
            <option value="NO">Somente ocultos</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-500">
          {loading ? 'Carregando…' : `${filtered.length} resultado(s)`}
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-gray-500">Carregando colaboradores...</p>
      ) : (
        <ResourceTable
          columns={columns}
          data={filtered}
          onEdit={(row) => {
            setSelectedStaff(row);
            setIsModalOpen(true);
          }}
          onDelete={(rowId) => handleDelete(rowId)}
        />
      )}

      {/* Modal de criação/edição */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <StaffForm
            initialData={selectedStaff}
            onSave={handleSave}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Staff;
