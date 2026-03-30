import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { requestAccess } from '@stellar/freighter-api';
import { Wallet } from 'lucide-react';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', formData);
      if (response.data.success) {
        login(response.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreighterLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const access = await requestAccess();
      if (access.error) throw new Error(access.error);
      const publicKey = typeof access === 'string' ? access : access.address;

      const response = await api.post('/auth/freighter-login', { publicKey });
      if (response.data.success) {
        login(response.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No account found for this Wallet. Please sign up first.');
      } else {
        setError(err.message || err.response?.data?.message || 'Wallet login failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Sign in</h2>
          <p className="mt-2 text-sm text-gray-600">Access your account dashboard.</p>
        </div>

        {error && (
          <div className="p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
            {isLoading ? 'Signing in...' : 'Sign in with Email'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        <button
          onClick={handleFreighterLogin}
          type="button"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          <Wallet className="h-5 w-5 mr-2" />
          Connect Freighter Wallet
        </button>

        <div className="text-center text-sm pt-4 border-t border-gray-100 mt-6">
          <span className="text-gray-600">Don't have an account? </span>
          <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
