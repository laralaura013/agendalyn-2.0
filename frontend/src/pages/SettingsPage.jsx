import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Copy,
  Link,
  Loader2,
  PlugZap,
  QrCode,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import GoogleConnectButton from '../components/integrations/GoogleConnectButton';
import WhatsAppDeeplinkCard from '../components/integrations/WhatsAppDeeplinkCard';

// ------------- helpers -------------
const getSafeUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const Label = ({ children, hint }) => (
  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
    {children}
    {hint ? (
      <span
        className="ml-1 text-gray-400 text-xs cursor-help"
        title={hint}
        aria-label={hint}
      >
        ⓘ
      </span>
    ) : null}
  </label>
);

const Section = ({ title, icon: Icon, desc, right, children }) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 md:p-6 transition hover:shadow-md">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <div className="flex items-center gap-2">
          {Icon ? (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
              <Icon className="h-4 w-4 text-purple-700" />
            </span>
          ) : null}
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        {desc ? <p className="text-sm text-gray-500 mt-1">{desc}</p> : null}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Toggle = ({ checked, onChange, label, helper }) => (
  <div className="flex items-start gap-3">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition ${
        checked ? 'bg-purple-600' : 'bg-gray-300'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
    <div className="flex-1">
      <p
        className="select-none cursor-pointer text-sm font-medium text-gray-800"
        onClick={() => onChange(!checked)}
      >
        {label}
      </p>
      {helper ? <p className="text-xs text-gray-500 mt-0.5">{helper}</p> : null}
    </div>
  </div>
);

// ------------- page -------------
const SettingsPage = () => {
  const [loading, setLoading] = useState(true);

  // company
  const [companyId, setCompanyId] = useState('');
  const [companyForm, setCompanyForm] = useState({ name: '', phone: '', address: '' });

  // google
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  // whatsapp
  const [wa, setWa] = useState({
    whatsappEnabled: false,
    useSharedWaba: true,
    wabaAccessToken: '',
    wabaPhoneNumberId: '',
    wabaAppSecret: '',
    botGreeting: 'Olá! 👋 Sou o assistente virtual. Como posso ajudar?',
    botCancelPolicy: '',
    botMenuItems: [{ label: 'Agendar atendimento', value: 'BOOKING' }],
    slug: '',
    subscriptionPlan: '',
    subscriptionStatus: '',
    whatsappStatus: null,
    whatsappLastCheckAt: null,
  });

  const [savingWa, setSavingWa] = useState(false);
  const [testing, setTesting] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testText, setTestText] = useState('Teste do bot ✅');

  const bookingUrl = useMemo(() => `${window.location.origin}/agendar/${companyId}`, [companyId]);

  // ------------ fetchers ------------
  const fetchCompanyProfile = useCallback(async () => {
    const { data } = await api.get('/company/profile');
    setCompanyId(data.id || '');
    setCompanyForm({
      name: data.name || '',
      phone: data.phone || '',
      address: data.address || '',
    });
  }, []);

  const fetchGoogleStatus = useCallback(async () => {
    const userData = getSafeUser();
    if (!userData?.id) return;
    try {
      const { data } = await api.get(`/integrations/google/status/${userData.id}`);
      setGoogleConnected(!!data.connected);
      setGoogleEmail(data.email || '');
    } catch (e) {
      // silencioso
    }
  }, []);

  const fetchWhatsSettings = useCallback(async () => {
    const { data } = await api.get('/integrations/whatsapp/settings');
    setWa((prev) => ({ ...prev, ...data }));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([fetchCompanyProfile(), fetchGoogleStatus(), fetchWhatsSettings()]);
      } catch (e) {
        console.error(e);
        toast.error('Falha ao carregar configurações.');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchCompanyProfile, fetchGoogleStatus, fetchWhatsSettings]);

  // ------------ actions ------------
  const saveCompany = async (e) => {
    e?.preventDefault?.();
    const p = api.put('/company/profile', companyForm);
    toast.promise(p, {
      loading: 'Salvando empresa...',
      success: 'Empresa atualizada!',
      error: 'Falha ao salvar.',
    });
  };

  const saveWhats = async () => {
    setSavingWa(true);
    try {
      await api.put('/integrations/whatsapp/settings', wa);
      toast.success('Configurações do WhatsApp salvas!');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Falha ao salvar configurações.');
    } finally {
      setSavingWa(false);
    }
  };

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const { data } = await api.get('/integrations/whatsapp/health');
      toast.success('Conexão OK!');
      setWa((prev) => ({
        ...prev,
        whatsappStatus: data.status,
        whatsappLastCheckAt: new Date().toISOString(),
      }));
    } catch (e) {
      toast.error('Falha ao verificar conexão.');
    } finally {
      setHealthLoading(false);
    }
  };

  const sendTest = async () => {
    if (!testTo || !testText) return toast.error('Preencha o número e a mensagem.');
    setTesting(true);
    try {
      await api.post('/integrations/whatsapp/test', { to: testTo, text: testText });
      toast.success('Mensagem enviada!');
    } catch (e) {
      toast.error('Falha ao enviar teste.');
    } finally {
      setTesting(false);
    }
  };

  const userData = getSafeUser();
  const staffId = userData?.id || '';

  // ------------ UI helpers ------------
  const StatusBadge = ({ status }) => {
    if (status === 'OK')
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
          <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
        </span>
      );
    if (status === 'ERROR')
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
          <AlertTriangle className="h-3.5 w-3.5" /> Erro
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200">
        <PlugZap className="h-3.5 w-3.5" /> Desconectado
      </span>
    );
  };

  // ------------ loading ------------
  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-24 sm:px-6 md:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-24 sm:px-6 md:px-10">
      {/* header */}
      <div className="mx-auto max-w-5xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Configurações
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Ajuste informações da empresa, integrações e o bot do WhatsApp.
            </p>
          </div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-purple-700 transition"
          >
            <Link className="h-4 w-4" />
            Página de agendamento
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* WhatsApp */}
          <Section
            title="WhatsApp"
            icon={Smartphone}
            desc="Configure o bot por empresa. Você pode usar número compartilhado (global) ou o seu próprio (Meta)."
            right={
              <div className="flex items-center gap-2">
                <StatusBadge status={wa.whatsappStatus} />
                <button
                  onClick={checkHealth}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {healthLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Verificar conexão
                    </>
                  )}
                </button>
              </div>
            }
          >
            {/* banner status */}
            {!wa.whatsappEnabled ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <div>
                  O WhatsApp está <strong>desativado</strong> para esta empresa. Ative e salve para
                  começar a receber mensagens.
                </div>
              </div>
            ) : null}

            {/* toggles */}
            <div className="grid gap-4">
              <Toggle
                checked={wa.whatsappEnabled}
                onChange={(v) => setWa((s) => ({ ...s, whatsappEnabled: v }))}
                label="Ativar WhatsApp para esta empresa"
              />
              <Toggle
                checked={wa.useSharedWaba}
                onChange={(v) => setWa((s) => ({ ...s, useSharedWaba: v }))}
                label="Usar número compartilhado (global)"
                helper="Se marcado, o sistema usará o número global configurado no backend."
              />
            </div>

            {/* credenciais (colapsa quando usa compartilhado) */}
            {!wa.useSharedWaba ? (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label hint="Token do usuário de sistema do Meta (escopos: whatsapp_business_messaging, whatsapp_business_management)">
                    WABA Access Token
                  </Label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                    value={wa.wabaAccessToken}
                    onChange={(e) => setWa((s) => ({ ...s, wabaAccessToken: e.target.value }))}
                    placeholder="EAAG... (nunca exponha no front)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label hint="ID do número WhatsApp (Phone Number ID) da configuração do WhatsApp Cloud API.">
                    WABA Phone Number ID
                  </Label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                    value={wa.wabaPhoneNumberId}
                    onChange={(e) => setWa((s) => ({ ...s, wabaPhoneNumberId: e.target.value }))}
                    placeholder="ex.: 770384329493099"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label hint="Recomendado para validar a assinatura HMAC do webhook.">
                    WABA App Secret (opcional)
                  </Label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                    value={wa.wabaAppSecret}
                    onChange={(e) => setWa((s) => ({ ...s, wabaAppSecret: e.target.value }))}
                    placeholder="App secret do app no Meta"
                  />
                </div>
              </div>
            ) : null}

            {/* textos do bot */}
            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label>Saudação</Label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                  value={wa.botGreeting}
                  onChange={(e) => setWa((s) => ({ ...s, botGreeting: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Política de Cancelamento</Label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                  value={wa.botCancelPolicy || ''}
                  onChange={(e) => setWa((s) => ({ ...s, botCancelPolicy: e.target.value }))}
                />
              </div>

              {/* menu do bot */}
              <div className="space-y-2">
                <Label hint="Itens apresentados no menu 1, 2, 3...">Menu do Bot (itens)</Label>
                <div className="space-y-2">
                  {wa.botMenuItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <input
                        type="text"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white"
                        value={item.label}
                        onChange={(e) => {
                          const v = e.target.value;
                          setWa((s) => {
                            const list = [...s.botMenuItems];
                            list[idx] = { ...list[idx], label: v };
                            return { ...s, botMenuItems: list };
                          });
                        }}
                        placeholder="Rótulo (ex.: Agendar atendimento)"
                      />
                      <input
                        type="text"
                        className="w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white uppercase"
                        value={item.value}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase();
                          setWa((s) => {
                            const list = [...s.botMenuItems];
                            list[idx] = { ...list[idx], value: v };
                            return { ...s, botMenuItems: list };
                          });
                        }}
                        placeholder="CÓDIGO (ex.: BOOKING)"
                        title="Código usado internamente (ex.: BOOKING, RESCHEDULE, HUMAN)"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setWa((s) => ({
                            ...s,
                            botMenuItems: s.botMenuItems.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-sm text-gray-600 hover:text-red-600"
                        title="Remover"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setWa((s) => ({
                      ...s,
                      botMenuItems: [...s.botMenuItems, { label: '', value: '' }],
                    }))
                  }
                  className="inline-flex items-center gap-2 text-sm text-purple-700 hover:text-purple-800"
                >
                  + Adicionar item
                </button>
              </div>

              {/* ações */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={saveWhats}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-purple-700"
                >
                  {savingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar configurações
                </button>

                <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                  Última verificação:{' '}
                  {wa.whatsappLastCheckAt ? (
                    <span className="font-medium">
                      {new Date(wa.whatsappLastCheckAt).toLocaleString()}
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
            </div>

            {/* teste rápido */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Número destino (ex.: 5599999999999)</Label>
                  <input
                    type="tel"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Mensagem de teste</Label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                    />
                    <button
                      onClick={sendTest}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Enviar teste
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Empresa */}
          <Section
            title="Informações da empresa"
            icon={BadgeCheck}
            desc="Esses dados aparecem no agendamento e em recibos."
            right={
              <button
                onClick={saveCompany}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Save className="h-4 w-4" />
                Salvar
              </button>
            }
          >
            <form onSubmit={saveCompany} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome da empresa</Label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm((s) => ({ ...s, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm((s) => ({ ...s, phone: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Endereço</Label>
                <textarea
                  rows={3}
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm((s) => ({ ...s, address: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
                />
              </div>
            </form>
          </Section>
        </div>

        {/* Coluna direita (1/3) */}
        <div className="space-y-6">
          {/* Google */}
          <Section
            title="Google Calendar"
            icon={CalendarIcon}
            desc="Sincronize seus agendamentos com seu Google Calendar."
          >
            {staffId ? (
              <>
                <GoogleConnectButton
                  staffId={staffId}
                  isConnected={googleConnected}
                  onStatusChange={(connected, email) => {
                    setGoogleConnected(connected);
                    setGoogleEmail(email || '');
                  }}
                />
                {googleConnected && googleEmail ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Conectado como <strong className="font-semibold">{googleEmail}</strong>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-red-600">Não foi possível detectar seu usuário.</p>
            )}
          </Section>

          {/* Link/QR multi-empresa */}
          <Section
            title="Link/QR para WhatsApp (multi-empresa)"
            icon={QrCode}
            desc="Defina o slug da empresa nas configurações para gerar o link."
          >
            <WhatsAppDeeplinkCard slug={wa.slug} />
          </Section>

          {/* Webhook info / ajuda rápida */}
          <Section
            title="Como conectar o WhatsApp"
            icon={PlugZap}
            desc="Use no Meta Business (Webhooks) quando for usar número próprio."
            right={
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Seguro
              </span>
            }
          >
            <WebhookHelp />
          </Section>
        </div>
      </div>
    </div>
  );
};

// ícone simples para evitar mais imports
const CalendarIcon = (props) => <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v2H2V6a2 2 0 0 1 2-2h1V3a1 1 0 1 1 2 0v1Zm15 8v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9h20ZM6 14h4v4H6v-4Z"/></svg>;

const WebhookHelp = () => {
  const [meta, setMeta] = useState({ webhookUrl: '', verifyToken: '', phoneNumberIdShared: '' });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/integrations/whatsapp/meta-info');
        setMeta(data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <div className="space-y-3 text-sm">
      <div>
        <Label>Webhook URL</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            readOnly
            value={meta.webhookUrl || ''}
            className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              navigator.clipboard.writeText(meta.webhookUrl || '');
              toast.success('Webhook URL copiada!');
            }}
          >
            <Copy className="h-4 w-4" /> Copiar
          </button>
        </div>
      </div>

      <div>
        <Label>Verify Token</Label>
        <div className="mt-1 flex items-center gap-2">
          <input
            readOnly
            value={meta.verifyToken || 'Defina WABA_VERIFY_TOKEN no backend'}
            className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {meta.phoneNumberIdShared ? (
        <p className="text-xs text-gray-500">
          Número compartilhado (global) configurado: <strong>{meta.phoneNumberIdShared}</strong>
        </p>
      ) : null}

      <ol className="mt-2 list-decimal pl-5 text-gray-600 text-xs space-y-1">
        <li>Acesse o Meta Business → WhatsApp → Configuração → Webhooks.</li>
        <li>Edite e cole a Webhook URL acima.</li>
        <li>Defina o mesmo Verify Token no Meta e no backend.</li>
        <li>Salve e verifique: o status deve ficar <em>Verificado</em>.</li>
      </ol>
    </div>
  );
};

export default SettingsPage;
