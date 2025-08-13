import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Link, Copy } from 'lucide-react';
import GoogleConnectButton from '../components/integrations/GoogleConnectButton';

const SettingsPage = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  const bookingUrl = `${window.location.origin}/agendar/${companyId}`;

  // Busca dados da empresa
  const fetchCompanyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/company/profile');
      setFormData({
        name: response.data.name || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
      });
      setCompanyId(response.data.id || '');
    } catch (error) {
      toast.error('Failed to load company data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca status do Google Calendar
  const fetchGoogleStatus = useCallback(async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData'));
      if (!userData?.id) return;
      const { data } = await api.get(`/integrations/google/status/${userData.id}`);
      setGoogleConnected(data.connected);
      setGoogleEmail(data.email || '');
    } catch (err) {
      console.warn('Erro ao buscar status Google:', err);
    }
  }, []);

  // Detecta retorno do Google OAuth na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      toast.success('Google Calendar conectado com sucesso!');
      fetchGoogleStatus();
      params.delete('google');
      window.history.replaceState({}, '', `${window.location.pathname}`);
    } else if (params.get('google') === 'error') {
      toast.error('Erro ao conectar ao Google Calendar.');
      params.delete('google');
      window.history.replaceState({}, '', `${window.location.pathname}`);
    }
  }, [fetchGoogleStatus]);

  useEffect(() => {
    fetchCompanyProfile();
    fetchGoogleStatus();
  }, [fetchCompanyProfile, fetchGoogleStatus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-4 pb-20 sm:px-6 md:px-8">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  const userData = JSON.parse(localStorage.getItem('userData'));
  const staffId = userData?.id || '';

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

      {/* Google Calendar Integration */}
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
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
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
    </div>
  );
};

export default SettingsPage;
