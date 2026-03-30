import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestAccess } from '@stellar/freighter-api';
import api from '../api/axios';
import { Link2, Mail, Loader2, X } from 'lucide-react';

export default function AccountLinker() {
    const { user, login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [emailData, setEmailData] = useState({ email: '', password: '' });

    if (!user) return null;
    // If user has both, hide this component
    if (user.publicKey && user.email) return null;

    const handleLinkWallet = async () => {
        setLoading(true);
        setError(null);
        try {
            const access = await requestAccess();
            if (access.error) throw new Error(access.error);
            const publicKey = typeof access === 'string' ? access : access.address;

            const res = await api.post('/auth/link-wallet', { publicKey });
            if (res.data.success) {
                login(res.data.user); // update context
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to link wallet');
            setTimeout(() => setError(null), 4000);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmail = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/auth/add-email', emailData);
            if (res.data.success) {
                login(res.data.user); // update context
                setShowEmailForm(false);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to add email');
            setTimeout(() => setError(null), 4000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center gap-2">
            {error && (
                <span className="absolute top-full mt-2 w-max max-w-xs bg-red-50 text-red-600 border border-red-200 text-xs px-2 py-1 rounded shadow-md z-50">
                    {error}
                </span>
            )}

            {/* Link Wallet Button */}
            {!user.publicKey && (
                <button
                    onClick={handleLinkWallet}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Link Wallet
                </button>
            )}

            {/* Add Email Button & Popup */}
            {!user.email && (
                <div className="relative">
                    <button
                        onClick={() => setShowEmailForm(!showEmailForm)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <Mail className="w-4 h-4" />
                        Add Email
                    </button>

                    {showEmailForm && (
                        <div className="absolute top-full right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-sm font-bold text-gray-800">Set Recovery Email</h4>
                                <button onClick={() => setShowEmailForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleAddEmail} className="space-y-3">
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        required
                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={emailData.email}
                                        onChange={e => setEmailData({ ...emailData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Secure Password"
                                        required
                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={emailData.password}
                                        onChange={e => setEmailData({ ...emailData, password: e.target.value })}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Credentials"}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
