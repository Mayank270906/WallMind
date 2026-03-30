import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { requestAccess } from '@stellar/freighter-api';
import { Wallet } from 'lucide-react';

function Signup() {
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'wallet'
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [publicKey, setPublicKey] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await api.post('/auth/signup', formData);
      if (response.data.success) {
        setStatus({ type: 'success', message: 'Check your email to verify' });
        setFormData({ username: '', email: '', password: '' });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Signup failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const access = await requestAccess();
      if (access.error) throw new Error(access.error);
      const pubKey = typeof access === 'string' ? access : access.address;
      setPublicKey(pubKey);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to connect wallet.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletSubmit = async (e) => {
    e.preventDefault();
    if (!publicKey) return connectWallet();

    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await api.post('/auth/freighter-signup', { username: formData.username, publicKey });
      if (response.data.success) {
        login(response.data.user);
        navigate('/dashboard');
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Signup failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Create an account</h2>
          <p className="mt-2 text-sm text-gray-600">Choose how you'd like to sign up today.</p>
        </div>

        {status.message && (
          <div className={`p-4 rounded-md ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {status.message}
          </div>
        )}

        <div className="flex rounded-md shadow-sm mb-6 mt-4">
          <button
            onClick={() => { setAuthMethod('email'); setStatus({ type: '', message: '' }); }}
            className={`w-1/2 py-2 text-sm font-medium rounded-l-md border ${authMethod === 'email' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            Email
          </button>
          <button
            onClick={() => { setAuthMethod('wallet'); setStatus({ type: '', message: '' }); }}
            className={`w-1/2 py-2 text-sm font-medium rounded-r-md border-t border-b border-r ${authMethod === 'wallet' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            Web3 Wallet
          </button>
        </div>

        {authMethod === 'email' ? (
          <form className="space-y-6" onSubmit={handleEmailSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Signing up...' : 'Sign up with Email'}
            </button>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleWalletSubmit}>
            <div className="space-y-4">
              {!publicKey ? (
                <button
                  onClick={connectWallet}
                  type="button"
                  disabled={isLoading}
                  className="w-full mt-4 flex justify-center items-center py-3 px-4 border shadow-sm text-sm font-medium text-gray-800 bg-gray-50 border-gray-300 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  <Wallet className="h-5 w-5 mr-3 text-blue-600" />
                  Connect Freighter to Begin
                </button>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Connected Wallet</label>
                    <input
                      type="text"
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-green-300 bg-green-50 text-green-800 rounded-md shadow-sm sm:text-sm font-mono truncate cursor-not-allowed"
                      value={publicKey}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Choose a Username</label>
                    <input
                      type="text"
                      required
                      disabled={isLoading}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !formData.username}
                    className="w-full mt-4 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? 'Linking account...' : 'Create Account'}
                  </button>
                </>
              )}
            </div>
          </form>
        )}

        <div className="text-center text-sm pt-4 border-t border-gray-100 mt-6">
          <span className="text-gray-600">Already have an account? </span>
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Log in</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
