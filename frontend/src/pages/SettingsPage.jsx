import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Link, Copy } from 'lucide-react';
// import AdminLayout from '../components/layouts/AdminLayout'; // REMOVIDO

const CompanySettingsPage = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);

  const bookingUrl = `${window.location.origin}/agendar/${companyId}`;

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
      toast.error("Failed to load company data.");
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

export default CompanySettingsPage;
