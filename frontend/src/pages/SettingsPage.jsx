// ✅ ARQUIVO: src/pages/SettingsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import GoogleConnectButton from "../components/integrations/GoogleConnectButton";
import WhatsAppDeeplinkCard from "../components/integrations/WhatsAppDeeplinkCard";
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Copy,
  Globe,
  Link as LinkIcon,
  Loader2,
  LogOut,
  MessageSquare,
  PlugZap,
  QrCode,
  Save,
  Settings,
  ShieldCheck,
  Smartphone,
  Send,
} from "lucide-react";

/* ========================== Tema ========================== */
const theme = {
  colors: {
    primary: "#4a544a",
    primaryHover: "#3b433b",
    primaryLight: "#e8eae8",
    success: "#4a544a",
    successLight: "#e8eae8",
    textHeading: "#2d2d2d",
    textBody: "#555555",
    textMuted: "#888888",
    background: "#f9f9f9",
    border: "#e5e5e5",
  },
};

/* ========================== UI ========================== */
const Section = ({ title, icon: Icon, desc, right, children }) => (
  <div className="bg-white border rounded-xl shadow-sm" style={{ borderColor: theme.colors.border }}>
    <div className="p-6 border-b" style={{ borderColor: theme.colors.border }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-6 w-6" style={{ color: theme.colors.primary }} />}
          <div>
            <h2 className="text-lg font-semibold" style={{ color: theme.colors.textHeading }}>
              {title}
            </h2>
            {desc && (
              <p className="text-sm mt-1" style={{ color: theme.colors.textMuted }}>
                {desc}
              </p>
            )}
          </div>
        </div>
        {right}
      </div>
    </div>
    <div className="p-6 bg-slate-50/30">{children}</div>
  </div>
);

const Label = ({ children }) => (
  <label className="text-sm font-semibold block" style={{ color: theme.colors.textBody }}>
    {children}
  </label>
);

const Input = (props) => (
  <input
    {...props}
    className="w-full mt-1 rounded-lg border px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition"
    style={{
      borderColor: theme.colors.border,
      color: theme.colors.textHeading,
      "--tw-ring-color": theme.colors.primary,
    }}
  />
);

const Textarea = (props) => (
  <textarea
    {...props}
    className="w-full mt-1 rounded-lg border px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 transition"
    style={{
      borderColor: theme.colors.border,
      color: theme.colors.textHeading,
      "--tw-ring-color": theme.colors.primary,
    }}
  />
);

const Toggle = ({ checked, onChange, label, helper }) => (
  <div className="flex items-start gap-4">
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition"
      style={{ backgroundColor: checked ? theme.colors.primary : "#ccc" }}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
    <div className="flex-1">
      <p
        className="select-none cursor-pointer text-sm font-medium"
        style={{ color: theme.colors.textBody }}
        onClick={() => onChange(!checked)}
      >
        {label}
      </p>
      {helper && <p className="text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>{helper}</p>}
    </div>
  </div>
);

const Button = ({ children, onClick, variant = "primary", loading = false, icon: Icon, ...props }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const style = {
    primary: { backgroundColor: theme.colors.primary, color: "white", "--tw-ring-color": theme.colors.primary },
    secondary: {
      backgroundColor: "white",
      color: theme.colors.textBody,
      borderColor: theme.colors.border,
      "--tw-ring-color": theme.colors.primary,
      borderWidth: 1,
      borderStyle: "solid",
    },
    danger: { backgroundColor: "#fef2f2", color: "#dc2626", "--tw-ring-color": "#ef4444" },
  };
  const [hover, setHover] = useState(false);
  const hoverStyle = {
    primary: { backgroundColor: theme.colors.primaryHover },
    secondary: { backgroundColor: "#f8f8f8" },
    danger: { backgroundColor: "#fee2e2" },
  };
  const current = hover ? { ...style[variant], ...hoverStyle[variant] } : style[variant];

  return (
    <button
      onClick={onClick}
      className={base}
      style={current}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
};

/* ========================== Helpers ========================== */
const getSafeUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

/* ========================== Tabs ========================== */
const GeneralSettingsTab = ({ companyForm, setCompanyForm, saveCompany }) => (
  <div className="space-y-6">
    <Section title="Informações da Empresa" icon={Building} desc="Esses dados aparecem no agendamento e em recibos.">
      <form onSubmit={saveCompany} className="space-y-4">
        <div>
          <Label>Nome da empresa</Label>
          <Input
            type="text"
            value={companyForm.name}
            onChange={(e) => setCompanyForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input
            type="tel"
            value={companyForm.phone}
            onChange={(e) => setCompanyForm((s) => ({ ...s, phone: e.target.value }))}
          />
        </div>
        <div>
          <Label>Endereço</Label>
          <Textarea
            rows={3}
            value={companyForm.address}
            onChange={(e) => setCompanyForm((s) => ({ ...s, address: e.target.value }))}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" icon={Save}>
            Salvar Informações
          </Button>
        </div>
      </form>
    </Section>
  </div>
);

const WhatsappSettingsTab = ({
  wa,
  setWa,
  saveWhats,
  savingWa,
  checkHealth,
  healthLoading,
  metaStatus,
  handleConnectMeta,
  handleDisconnectMeta,
  metaLoading,
  disconnecting,
  testTo,
  setTestTo,
  testText,
  setTestText,
  useTemplate,
  setUseTemplate,
  templateName,
  setTemplateName,
  lang,
  setLang,
  sendTest,
}) => {
  const StatusBadge = ({ status }) => {
    if (status === "OK")
      return (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: theme.colors.successLight, color: theme.colors.success }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
        </span>
      );
    if (status === "ERROR")
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
          <AlertTriangle className="h-3.5 w-3.5" /> Erro
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
        <PlugZap className="h-3.5 w-3.5" /> Desconectado
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Section
        title="Configurações do WhatsApp"
        icon={Smartphone}
        desc="Ative e personalize o bot de atendimento para sua empresa."
        right={
          <div className="flex items-center gap-2">
            <StatusBadge status={wa.whatsappStatus} />
            <Button onClick={checkHealth} loading={healthLoading} variant="secondary" icon={ShieldCheck}>
              Verificar Conexão
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="space-y-4 p-4 bg-white rounded-lg border" style={{ borderColor: theme.colors.border }}>
            <Toggle
              checked={wa.whatsappEnabled}
              onChange={(v) => setWa((s) => ({ ...s, whatsappEnabled: v }))}
              label="Ativar WhatsApp para esta empresa"
            />
            <Toggle
              checked={wa.useSharedWaba}
              onChange={(v) => setWa((s) => ({ ...s, useSharedWaba: v }))}
              label="Usar número compartilhado (global)"
              helper="O sistema usará um número global, sem custo adicional."
            />
          </div>

          {!wa.useSharedWaba && (
            <div className="p-4 bg-white rounded-lg border" style={{ borderColor: theme.colors.border }}>
              <Label>Conexão com número próprio (via Meta)</Label>
              <p className="text-xs mt-1 mb-3" style={{ color: theme.colors.textMuted }}>
                Conecte sua própria conta do WhatsApp Business Platform.
              </p>
              {metaStatus.connected ? (
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: theme.colors.successLight, color: theme.colors.success }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Conectado via Meta
                  </span>
                  <Button onClick={handleDisconnectMeta} loading={disconnecting} variant="danger" icon={LogOut}>
                    Desconectar
                  </Button>
                </div>
              ) : (
                <Button onClick={handleConnectMeta} loading={metaLoading} icon={PlugZap}>
                  Conectar com Facebook
                </Button>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Mensagem de Saudação</Label>
              <Input
                value={wa.botGreeting || ""}
                onChange={(e) => setWa((s) => ({ ...s, botGreeting: e.target.value }))}
              />
            </div>
            <div>
              <Label>Política de Cancelamento</Label>
              <Textarea
                rows={3}
                value={wa.botCancelPolicy || ""}
                onChange={(e) => setWa((s) => ({ ...s, botCancelPolicy: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: theme.colors.border }}>
            <div className="flex items-center gap-2">
              <StatusBadge status={wa.whatsappStatus} />
            </div>
            <Button onClick={saveWhats} loading={savingWa} icon={Save}>
              Salvar Configurações
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Teste rápido" icon={Send} desc="Envie uma mensagem de teste para validar a integração.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Número destino (ex.: 5599999999999)</Label>
            <Input type="tel" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Mensagem de teste</Label>
            <div className="mt-1 flex gap-2">
              <Input value={testText} onChange={(e) => setTestText(e.target.value)} disabled={useTemplate} />
              <Button onClick={sendTest} variant="secondary" icon={Send}>
                Enviar
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="flex items-center gap-2">
            <input
              id="useTemplate"
              type="checkbox"
              checked={useTemplate}
              onChange={(e) => setUseTemplate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="useTemplate" className="text-sm" style={{ color: theme.colors.textBody }}>
              Usar template (primeiro contato)
            </label>
          </div>
          <div>
            <Label>Template name</Label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} disabled={!useTemplate} />
          </div>
          <div>
            <Label>Idioma</Label>
            <Input value={lang} onChange={(e) => setLang(e.target.value)} disabled={!useTemplate} />
          </div>
        </div>
      </Section>
    </div>
  );
};

const IntegrationsTab = ({ staffId, googleConnected, setGoogleConnected, googleEmail, setGoogleEmail, wa }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Section title="Google Calendar" icon={Globe} desc="Sincronize agendamentos com sua agenda pessoal.">
      {staffId ? (
        <>
          <GoogleConnectButton
            staffId={staffId}
            isConnected={googleConnected}
            onStatusChange={(connected, email) => {
              setGoogleConnected(connected);
              setGoogleEmail(email || "");
            }}
          />
          {googleConnected && googleEmail && (
            <p className="mt-3 text-xs flex items-center gap-1.5" style={{ color: theme.colors.success }}>
              <CheckCircle2 className="h-4 w-4" />
              Conectado como <strong>{googleEmail}</strong>
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-red-600">Erro: ID do usuário não encontrado.</p>
      )}
    </Section>

    <Section title="Link de Agendamento" icon={QrCode} desc="Compartilhe para que seus clientes agendem via WhatsApp.">
      <WhatsAppDeeplinkCard slug={wa.slug} />
    </Section>

    <div className="md:col-span-2">
      <Section
        title="Dados para Webhook (Meta)"
        icon={PlugZap}
        desc="Use estas informações para conectar um número próprio na plataforma da Meta."
      >
        <WebhookHelp />
      </Section>
    </div>
  </div>
);

/* ========================== ErrorBoundary ========================== */
class SettingsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("[Settings] crash:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
          <div className="max-w-3xl mx-auto p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-700">Ops! Algo quebrou ao renderizar as Configurações.</p>
              <p className="text-sm text-red-700/80 mt-1">
                Clique em <b>Limpar URL</b> para remover parâmetros do OAuth, ou recarregue.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => window.location.replace(window.location.pathname + (window.location.hash || ""))}
                  className="px-3 py-1.5 rounded-lg border bg-white text-sm"
                >
                  Limpar URL
                </button>
                <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg bg-[#4a544a] text-white text-sm">
                  Recarregar
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ========================== Página ========================== */
const SettingsPageInner = () => {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);

  const [companyId, setCompanyId] = useState("");
  const [companyForm, setCompanyForm] = useState({ name: "", phone: "", address: "" });

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");

  const [wa, setWa] = useState({
    whatsappEnabled: false,
    useSharedWaba: true,
    wabaAccessToken: "",
    wabaPhoneNumberId: "",
    wabaAppSecret: "",
    botGreeting: "Olá! 👋 Sou o assistente virtual. Como posso ajudar?",
    botCancelPolicy: "",
    botMenuItems: [{ label: "Agendar atendimento", value: "BOOKING" }],
    slug: "",
    subscriptionPlan: "",
    subscriptionStatus: "",
    whatsappStatus: null,
    whatsappLastCheckAt: null,
  });

  const [savingWa, setSavingWa] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);

  const [testTo, setTestTo] = useState("");
  const [testText, setTestText] = useState("Teste do bot ✅");
  const [useTemplate, setUseTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("hello_world");
  const [lang, setLang] = useState("pt_BR");

  const [metaStatus, setMetaStatus] = useState({ connected: false });
  const [metaLoading, setMetaLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const userData = getSafeUser();
  const staffId = userData?.id || "";
  const bookingUrl = useMemo(() => `${window.location.origin}/agendar/${companyId}`, [companyId]);

  // quando voltar de /settings?google=success|error
  useEffect(() => {
    const s = new URLSearchParams(window.location.search || "");
    const googleFlag = s.get("google");
    if (!googleFlag) return;

    if (googleFlag === "success") toast.success("Google Calendar conectado!");
    if (googleFlag === "error") toast.error("Falha ao conectar Google Calendar.");

    // busca status atualizado e limpa URL
    (async () => {
      if (staffId) {
        try {
          const { data } = await api.get(`/integrations/google/status/${staffId}`);
          setGoogleConnected(!!data?.connected);
          setGoogleEmail(data?.email || "");
        } catch {}
      }
      const { pathname, hash } = window.location;
      window.history.replaceState({}, "", pathname + (hash || ""));
    })();
  }, [staffId]);

  const fetchCompanyProfile = useCallback(async () => {
    const { data } = await api.get("/company/profile");
    setCompanyId(data.id || "");
    setCompanyForm({
      name: data.name || "",
      phone: data.phone || "",
      address: data.address || "",
    });
  }, []);

  const fetchGoogleStatus = useCallback(async () => {
    if (!staffId) return;
    try {
      const { data } = await api.get(`/integrations/google/status/${staffId}`);
      setGoogleConnected(!!data.connected);
      setGoogleEmail(data.email || "");
    } catch {}
  }, [staffId]);

  const fetchWhatsSettings = useCallback(async () => {
    const { data } = await api.get("/integrations/whatsapp/settings");
    setWa((prev) => ({ ...prev, ...data }));
  }, []);

  const fetchMetaStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/integrations/meta/status");
      setMetaStatus(data || { connected: false });
    } catch {
      setMetaStatus({ connected: false });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([fetchCompanyProfile(), fetchGoogleStatus(), fetchWhatsSettings(), fetchMetaStatus()]);
      } catch (e) {
        console.error(e);
        toast.error("Falha ao carregar configurações.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchCompanyProfile, fetchGoogleStatus, fetchWhatsSettings, fetchMetaStatus]);

  const saveCompany = async (e) => {
    e?.preventDefault?.();
    const p = api.put("/company/profile", companyForm);
    toast.promise(p, { loading: "Salvando...", success: "Empresa atualizada!", error: "Falha ao salvar." });
  };

  const saveWhats = async () => {
    setSavingWa(true);
    try {
      await api.put("/integrations/whatsapp/settings", wa);
      toast.success("Configurações do WhatsApp salvas!");
      await fetchWhatsSettings();
      await fetchMetaStatus();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Falha ao salvar configurações.");
    } finally {
      setSavingWa(false);
    }
  };

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const { data } = await api.get("/integrations/whatsapp/health");
      toast.success("Conexão OK!");
      setWa((prev) => ({
        ...prev,
        whatsappStatus: data.status || "OK",
        whatsappLastCheckAt: new Date().toISOString(),
      }));
    } catch {
      toast.error("Falha ao verificar conexão.");
    } finally {
      setHealthLoading(false);
    }
  };

  const sendTest = async () => {
    if (!testTo) return toast.error("Preencha o número de destino.");
    try {
      if (useTemplate) {
        await api.post("/integrations/meta/send/template", { to: testTo, templateName, lang });
        toast.success("Template enviado!");
      } else {
        await api.post("/integrations/whatsapp/test", { to: testTo, text: testText, useTemplate: false });
        toast.success("Mensagem enviada!");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Falha ao enviar teste.");
    }
  };

  const handleConnectMeta = async () => {
    try {
      setMetaLoading(true);
      const { data } = await api.post("/integrations/meta/embedded/start");
      const win = window.open(data.url, "metaOnboard", "width=850,height=750");
      const timer = setInterval(async () => {
        if (win?.closed) {
          clearInterval(timer);
          await fetchMetaStatus();
          await fetchWhatsSettings();
        }
      }, 900);
    } catch (e) {
      toast.error("Falha ao abrir o onboarding do Meta.");
    } finally {
      setMetaLoading(false);
    }
  };

  const handleDisconnectMeta = async () => {
    try {
      setDisconnecting(true);
      await api.post("/integrations/meta/disconnect");
      toast.success("Conexão removida.");
      await fetchMetaStatus();
      await fetchWhatsSettings();
    } catch {
      toast.error("Falha ao desconectar.");
    } finally {
      setDisconnecting(false);
    }
  };

  const TabButton = ({ id, label, icon: Icon }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors"
        style={{
          backgroundColor: isActive ? theme.colors.primaryLight : "transparent",
          color: isActive ? theme.colors.primary : theme.colors.textBody,
        }}
      >
        <Icon className="h-5 w-5" />
        {label}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: theme.colors.background }}>
        <div className="flex items-center gap-3" style={{ color: theme.colors.textBody }}>
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-lg">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.colors.textHeading }}>
              Configurações
            </h1>
            <p className="text-sm mt-1" style={{ color: theme.colors.textMuted }}>
              Ajuste informações da empresa, integrações e o bot do WhatsApp.
            </p>
          </div>
          <a href={bookingUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary" icon={LinkIcon}>
              Página de Agendamento
            </Button>
          </a>
        </div>

        <div
          className="flex items-center gap-2 p-1.5 bg-white border rounded-xl shadow-sm mb-8"
          style={{ borderColor: theme.colors.border }}
        >
          <TabButton id="general" label="Geral" icon={Settings} />
          <TabButton id="whatsapp" label="WhatsApp" icon={MessageSquare} />
          <TabButton id="integrations" label="Integrações" icon={PlugZap} />
        </div>

        {activeTab === "general" && (
          <GeneralSettingsTab companyForm={companyForm} setCompanyForm={setCompanyForm} saveCompany={saveCompany} />
        )}

        {activeTab === "whatsapp" && (
          <WhatsappSettingsTab
            wa={wa}
            setWa={setWa}
            saveWhats={saveWhats}
            savingWa={savingWa}
            checkHealth={checkHealth}
            healthLoading={healthLoading}
            metaStatus={metaStatus}
            handleConnectMeta={handleConnectMeta}
            handleDisconnectMeta={handleDisconnectMeta}
            metaLoading={metaLoading}
            disconnecting={disconnecting}
            testTo={testTo}
            setTestTo={setTestTo}
            testText={testText}
            setTestText={setTestText}
            useTemplate={useTemplate}
            setUseTemplate={setUseTemplate}
            templateName={templateName}
            setTemplateName={setTemplateName}
            lang={lang}
            setLang={setLang}
            sendTest={sendTest}
          />
        )}

        {activeTab === "integrations" && (
          <IntegrationsTab
            staffId={staffId}
            googleConnected={googleConnected}
            setGoogleConnected={setGoogleConnected}
            googleEmail={googleEmail}
            setGoogleEmail={setGoogleEmail}
            wa={wa}
          />
        )}
      </main>
    </div>
  );
};

/* ========================== Auxiliar: Webhook Help ========================== */
const WebhookHelp = () => {
  const [meta, setMeta] = useState({ webhookUrl: "", verifyToken: "", phoneNumberIdShared: "" });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/integrations/whatsapp/meta-info");
        setMeta(data);
      } catch {}
    })();
  }, []);

  return (
    <div className="space-y-3 text-sm">
      <div>
        <Label>Webhook URL</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input readOnly value={meta.webhookUrl || ""} />
          <Button
            variant="secondary"
            icon={Copy}
            onClick={() => {
              navigator.clipboard.writeText(meta.webhookUrl || "");
              toast.success("Webhook URL copiada!");
            }}
          >
            Copiar
          </Button>
        </div>
      </div>

      <div>
        <Label>Verify Token</Label>
        <Input readOnly value={meta.verifyToken || "Defina WABA_VERIFY_TOKEN no backend"} />
      </div>

      {meta.phoneNumberIdShared ? (
        <p className="text-xs" style={{ color: theme.colors.textMuted }}>
          Número compartilhado (global) configurado: <strong>{meta.phoneNumberIdShared}</strong>
        </p>
      ) : null}

      <ol className="mt-2 list-decimal pl-5 text-xs space-y-1" style={{ color: theme.colors.textMuted }}>
        <li>Acesse o Meta Business → WhatsApp → Configuração → Webhooks.</li>
        <li>Edite e cole a Webhook URL acima.</li>
        <li>Defina o mesmo Verify Token no Meta e no backend.</li>
        <li>
          Salve e verifique: o status deve ficar <em>Verificado</em>.
        </li>
      </ol>
    </div>
  );
};

/* ===== Export com ErrorBoundary ===== */
export default function SettingsPage() {
  return (
    <SettingsErrorBoundary>
      <SettingsPageInner />
    </SettingsErrorBoundary>
  );
}
