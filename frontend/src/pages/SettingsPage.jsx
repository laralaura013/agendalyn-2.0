// src/pages/SettingsPage.jsx
import {
  Copy,
  Link,
  Plus,
  RefreshCw,
  Send,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import GoogleConnectButton from '../components/integrations/GoogleConnectButton';
import WhatsAppInstructions from '../components/integrations/WhatsAppInstructions';
import WhatsAppDeeplinkCard from '../components/integrations/WhatsAppDeeplinkCard';

// Parse seguro do localStorage
function getSafeUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

const SettingsPage = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', slug: '' });
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  // WhatsApp
  const [waLoading, setWaLoading] = useState(true);
  const [waSaving, setWaSaving] = useState(false);
  const [waChecking, setWaChecking] = useState(false);
  const [waTesting, setWaTesting] = useState(false);
  const [waHealth, setWaHealth] = useState({ status: null, at: null });

  const emptyMenu = [{ label: 'Agendar atendimento', value: 'BOOKING' }];
  const [wa, setWa] = useState({
    whatsappEnabled: false,
    useSharedWaba: true,
    wabaAccessToken: '',
    wabaPhoneNumberId: '',
    wabaAppSecret: '',
    botGreeting: 'Olá! 👋 Sou o assistente virtual. Como posso ajudar?',
    botCancelPolicy: 'Cancelamentos com 3h de antecedência.',
    botMenuItems: emptyMenu,
    slug: '',
    subscriptionPlan: '',
    subscriptionStatus: '',
    phoneNumberIdShared: null, // vem do /meta-info
  });

  const [waTestNumber, setWaTestNumber] = useState('');
  const [waTestText, setWaTestText] = useState('Teste do bot ✅');

  const bookingUrl = `${window.location.origin}/agendar/${companyId}`;

  const waChange = (k, v) => setWa((s) => ({ ...s, [k]: v }));
  const addMenuItem = () =>
    setWa((s) => ({ ...s, botMenuItems: [...(s.botMenuItems || []), { label: '', value: '' }] }));
  const removeMenuItem = (idx) =>
    setWa((s) => ({ ...s, botMenuItems: s.botMenuItems.filter((_, i) => i !== idx) }));
  const updateMenuItem = (idx, field, value) =>
    setWa((s) => ({
      ...s,
      botMenuItems: s.botMenuItems.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));

  const usingShared = useMemo(() => {
    if (wa.useSharedWaba) return true;
    return !(wa.wabaAccessToken && wa.wabaPhoneNumberId);
  }, [wa.useSharedWaba, wa.wabaAccessToken, wa.wabaPhoneNumberId]);

  const missingOwnCreds = useMemo(
    () => !usingShared && (!wa.wabaAccessToken || !wa.wabaPhoneNumberId),
    [usingShared, wa.wabaAccessToken, wa.wabaPhoneNumberId]
  );

  const canOperateWhatsApp =
    wa.whatsappEnabled && (usingShared || (!!wa.wabaAccessToken && !!wa.wabaPhoneNumberId));

  const readinessBadge = canOperateWhatsApp ? (
    <span className="badge badge-emerald" title="Configuração suficiente para operar">
      Pronto para uso
    </span>
  ) : (
    <span className="badge badge-gray" title="Faltam ajustes para operar">
      Incompleto
    </span>
  );

  // Empresa
  const fetchCompanyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/company/profile');
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        slug: data.slug || '',
      });
      setCompanyId(data.id || '');
    } catch {
      toast.error('Failed to load company data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Google
  const fetchGoogleStatus = useCallback(async () => {
    try {
      const userData = getSafeUser();
      if (!userData?.id) return;
      const { data } = await api.get(`/integrations/google/status/${userData.id}`);
      setGoogleConnected(!!data.connected);
      setGoogleEmail(data.email || '');
    } catch (err) {
      console.warn('Erro ao buscar status Google:', err);
    }
  }, []);

  // WhatsApp
  const fetchWhatsAppSettings = useCallback(async () => {
    setWaLoading(true);
    try {
      const { data } = await api.get('/integrations/whatsapp/settings');
      setWa((s) => ({
        ...s,
        ...data,
        botMenuItems: Array.isArray(data?.botMenuItems) ? data.botMenuItems : (data?.botMenuJson ? JSON.parse(data.botMenuJson) : emptyMenu),
      }));
      if (data?.whatsappStatus) {
        setWaHealth({ status: data.whatsappStatus, at: data.whatsappLastCheckAt || null });
      }
      // meta-info para descobrir número compartilhado
      const info = await api.get('/integrations/whatsapp/meta-info');
      setWa((s) => ({ ...s, phoneNumberIdShared: info.data?.phoneNumberIdShared || null }));
    } catch (e) {
      console.error(e);
      toast.error('Falha ao carregar configurações do WhatsApp');
    } finally {
      setWaLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('google');
    if (result === 'connected') {
      toast.success('Google Calendar conectado com sucesso!');
      fetchGoogleStatus();
    } else if (result === 'error') {
      toast.error('Erro ao conectar ao Google Calendar.');
    }
    if (result) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchGoogleStatus]);

  useEffect(() => {
    fetchCompanyProfile();
    fetchGoogleStatus();
    fetchWhatsAppSettings();
  }, [fetchCompanyProfile, fetchGoogleStatus, fetchWhatsAppSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const savePromise = api.put('/company/profile', formData);
    toast.promise(savePromise, {
      loading: 'Saving changes...',
      success: 'Settings saved successfully!',
      error: 'Failed to save changes.',
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success('Link copied to clipboard!');
  };

  const saveWhatsApp = async () => {
    setWaSaving(true);
    try {
      const payload = { ...wa, botMenuItems: wa.botMenuItems };
      await api.put('/integrations/whatsapp/settings', payload);
      toast.success('Configurações do WhatsApp salvas!');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao salvar configurações do WhatsApp');
    } finally {
      setWaSaving(false);
    }
  };

  const checkWhatsApp = async () => {
    if (!canOperateWhatsApp) {
      return toast.error('Ative o WhatsApp e configure as credenciais antes de verificar.');
    }
    setWaChecking(true);
    try {
      const { data } = await api.get('/integrations/whatsapp/health');
      setWaHealth({
        status: data?.status,
        at: data?.meta?.whatsappLastCheckAt || new Date().toISOString(),
      });
      toast.success('Conexão verificada!');
    } catch (e) {
      console.error(e);
      setWaHealth({ status: 'ERROR', at: new Date().toISOString() });
      toast.error('Falha ao verificar conexão');
    } finally {
      setWaChecking(false);
    }
  };

  const sendWhatsAppTest = async () => {
    if (!canOperateWhatsApp) {
      return toast.error('Ative o WhatsApp e configure as credenciais antes de enviar teste.');
    }
    if (!waTestNumber) return toast.error('Informe o número destino (com DDI, ex.: 55...)');
    setWaTesting(true);
    try {
      await api.post('/integrations/whatsapp/test', { to: waTestNumber, text: waTestText });
      toast.success('Mensagem enviada!');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao enviar mensagem');
    } finally {
      setWaTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  const userData = getSafeUser();
  const staffId = userData?.id || '';

  // número compartilhado em E.164 (se quiser mostrar no card). Se você tiver o número real,
  // pode preencher aqui manualmente (ex.: +15551402556). Pelo phoneNumberId não dá pra inferir o número.
  const sharedPhoneE164 = ''; // opcional: '+15551402556'

  return (
    <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Company Settings</h1>

      {/* Booking Link */}
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Link className="h-5 w-5 text-purple-700" />
          <h2 className="text-xl font-semibold">Your Booking Page</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Share this link with your clients so they can book online.
        </p>
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

      {/* Google Calendar */}
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Google Calendar</h2>
        <p className="text-sm text-gray-600 mb-4">
          Connect your Google Calendar to sync appointments automatically.
        </p>
        {staffId ? (
          <div className="flex flex-col gap-2">
            <GoogleConnectButton
              staffId={staffId}
              isConnected={googleConnected}
              onStatusChange={(connected, email) => {
                setGoogleConnected(connected);
                setGoogleEmail(email || '');
              }}
            />
            {googleConnected && googleEmail && (
              <p className="text-sm text-green-600">
                ✅ Connected as <strong>{googleEmail}</strong>
              </p>
            )}
          </div>
        ) : (
          <p className="text-red-500">Unable to detect your staff ID.</p>
        )}
      </div>

      {/* Company Form */}
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Company Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
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
            <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              className="mt-1 block w-full p-2 border rounded-md"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug (código da empresa)</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded-md"
              placeholder="ex.: barbearia-x"
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:bg-purple-800"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* WhatsApp (Cloud API) */}
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-semibold">WhatsApp</h2>

          {waHealth.status && (
            <span
              className={`badge ${waHealth.status === 'OK' ? 'badge-green' : 'badge-red'}`}
              title={waHealth.at ? new Date(waHealth.at).toLocaleString() : ''}
            >
              {waHealth.status === 'OK' ? 'OK' : 'ERROR'}
            </span>
          )}

          <span
            className={`badge ${usingShared ? 'badge-blue' : 'badge-amber'}`}
            title={usingShared ? 'Usando número da plataforma (global)' : 'Usando número próprio desta empresa'}
          >
            Usando: {usingShared ? 'Compartilhado' : 'Próprio'}
          </span>

          {readinessBadge}
        </div>

        {!wa.whatsappEnabled && (
          <div className="alert alert-yellow mb-4">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              O WhatsApp está <b>desativado</b> para esta empresa. Ative a opção abaixo para testar a conexão e
              receber mensagens.
            </div>
          </div>
        )}

        {!usingShared && missingOwnCreds && (
          <div className="alert alert-rose mb-4">
            <XCircle className="mt-0.5 h-4 w-4" />
            <div>
              Para usar <b>número próprio</b>, preencha <b>WABA Access Token</b> e <b>WABA Phone Number ID</b>.
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4">
          Configure a conexão com o WhatsApp Cloud API por empresa. Você pode usar um número próprio (token +
          phone_number_id) ou um número compartilhado global da plataforma.
        </p>

        {waLoading ? (
          <p className="text-gray-500">Carregando configurações do WhatsApp…</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!wa.whatsappEnabled}
                  onChange={(e) => waChange('whatsappEnabled', e.target.checked)}
                />
                <span>Ativar WhatsApp para esta empresa</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!wa.useSharedWaba}
                  onChange={(e) => waChange('useSharedWaba', e.target.checked)}
                />
                <span>Usar número compartilhado (global)</span>
              </label>
              <p className="text-xs text-gray-500 -mt-2">
                {usingShared
                  ? 'As mensagens sairão do número global do sistema. Ideal para começar rápido.'
                  : 'As mensagens sairão do número próprio desta empresa. Informe token e phone_number_id abaixo.'}
              </p>
            </div>

            {!usingShared && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">WABA Access Token</label>
                  <input
                    className="mt-1 block w-full p-2 border rounded-md"
                    value={wa.wabaAccessToken || ''}
                    onChange={(e) => waChange('wabaAccessToken', e.target.value)}
                    placeholder="EAAB... (token do WhatsApp Cloud)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">WABA Phone Number ID</label>
                  <input
                    className="mt-1 block w-full p-2 border rounded-md"
                    value={wa.wabaPhoneNumberId || ''}
                    onChange={(e) => waChange('wabaPhoneNumberId', e.target.value)}
                    placeholder="Ex.: 123456789012345"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">WABA App Secret (opcional)</label>
                  <input
                    className="mt-1 block w-full p-2 border rounded-md"
                    value={wa.wabaAppSecret || ''}
                    onChange={(e) => waChange('wabaAppSecret', e.target.value)}
                    placeholder="Para validar assinatura do webhook (x-hub-signature-256)"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={saveWhatsApp}
                disabled={waSaving}
                className="px-4 py-2 rounded-md bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-60"
              >
                {waSaving ? 'Salvando…' : 'Salvar configurações'}
              </button>
              <button
                onClick={checkWhatsApp}
                disabled={waChecking || !canOperateWhatsApp}
                className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center gap-2 disabled:opacity-60"
                title={!canOperateWhatsApp ? 'Ative e configure o WhatsApp para verificar.' : undefined}
              >
                <RefreshCw size={16} />
                {waChecking ? 'Verificando…' : 'Verificar conexão'}
              </button>

              {waHealth.status && (
                <div className="text-sm self-center text-gray-600">
                  Status:&nbsp;
                  <b className={waHealth.status === 'OK' ? 'text-green-700' : 'text-red-700'}>
                    {waHealth.status}
                  </b>
                  {waHealth.at ? ` • ${new Date(waHealth.at).toLocaleString()}` : ''}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700">Saudação</label>
                <textarea
                  className="mt-1 block w-full p-2 border rounded-md"
                  rows={3}
                  value={wa.botGreeting || ''}
                  onChange={(e) => waChange('botGreeting', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Política de Cancelamento</label>
                <textarea
                  className="mt-1 block w-full p-2 border rounded-md"
                  rows={3}
                  value={wa.botCancelPolicy || ''}
                  onChange={(e) => waChange('botCancelPolicy', e.target.value)}
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700">Menu do Bot (itens)</label>
              <div className="space-y-3 mt-2">
                {(wa.botMenuItems || []).map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      className="p-2 border rounded-md"
                      placeholder="Rótulo (ex.: Agendar)"
                      value={it.label}
                      onChange={(e) => updateMenuItem(idx, 'label', e.target.value)}
                    />
                    <input
                      className="p-2 border rounded-md"
                      placeholder="Ação/valor (ex.: BOOKING, RESCHEDULE, HUMAN)"
                      value={it.value}
                      onChange={(e) => updateMenuItem(idx, 'value', e.target.value)}
                    />
                    <button
                      onClick={() => removeMenuItem(idx)}
                      className="px-3 rounded-md bg-gray-100 hover:bg-gray-200"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button
                  onClick={addMenuItem}
                  className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 inline-flex items-center gap-2"
                >
                  <Plus size={16} /> Adicionar item
                </button>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Mensagem de teste</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="p-2 border rounded-md"
                  placeholder="Número destino (ex.: 55XXXXXXXXXXX)"
                  value={waTestNumber}
                  onChange={(e) => setWaTestNumber(e.target.value)}
                />
                <input
                  className="p-2 border rounded-md md:col-span-2"
                  placeholder="Texto"
                  value={waTestText}
                  onChange={(e) => setWaTestText(e.target.value)}
                />
              </div>
              <div className="mt-3">
                <button
                  onClick={sendWhatsAppTest}
                  disabled={waTesting || !canOperateWhatsApp}
                  className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 inline-flex items-center gap-2 disabled:opacity-60"
                  title={!canOperateWhatsApp ? 'Ative e configure o WhatsApp para enviar teste.' : undefined}
                >
                  <Send size={16} />
                  {waTesting ? 'Enviando…' : 'Enviar teste'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Link/QR para WhatsApp com slug (multi-empresa) */}
      <div className="max-w-3xl mx-auto mt-8">
        <WhatsAppDeeplinkCard
          companySlug={formData.slug}
          sharedPhoneE164={sharedPhoneE164 /* opcional: ex. '+15551402556' */}
        />
      </div>

      {/* Instruções de conexão do WhatsApp */}
      <div className="max-w-3xl mx-auto mt-8">
        <WhatsAppInstructions />
      </div>
    </div>
  );
};

export default SettingsPage;
