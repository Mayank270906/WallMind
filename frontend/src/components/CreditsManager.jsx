import React, { useState, useEffect } from 'react';
import { requestAccess, signTransaction } from '@stellar/freighter-api';
import * as StellarSdk from 'stellar-sdk';
import api from '../api/axios';
import { Coins, Loader2, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CreditsManager() {
    const { user, login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [projectWallet, setProjectWallet] = useState(null);

    useEffect(() => {
        // Fetch project's wallet address from backend
        api.get('/payment/wallet').then(res => {
            if (res.data.success) {
                setProjectWallet(res.data.address);
            }
        }).catch(err => console.error("Could not fetch project wallet", err));
    }, []);

    const handleBuyCredits = async () => {
        if (!projectWallet) {
            setError('Project wallet address not loaded yet.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Connect Freighter
            const accessResponse = await requestAccess();
            if (accessResponse.error) {
                throw new Error(accessResponse.error);
            }
            const userPublicKey = typeof accessResponse === 'string' ? accessResponse : accessResponse.address;

            // 2. Build Transaction
            const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

            let account;
            try {
                account = await server.loadAccount(userPublicKey);
            } catch (e) {
                throw new Error('Your wallet account is not funded on Testnet.');
            }

            const fee = await server.fetchBaseFee();
            const transaction = new StellarSdk.TransactionBuilder(account, {
                fee,
                networkPassphrase: StellarSdk.Networks.TESTNET
            })
                .addOperation(StellarSdk.Operation.payment({
                    destination: projectWallet,
                    asset: StellarSdk.Asset.native(),
                    amount: '5' // Pay 5 XLM
                }))
                .setTimeout(30)
                .build();

            const xdr = transaction.toXDR();

            // 3. Sign Transaction via Freighter
            const signedTransactionResponse = await signTransaction(xdr, {
                network: 'TESTNET',
                networkPassphrase: 'Test SDF Network ; September 2015'
            });

            if (signedTransactionResponse.error) {
                throw new Error(signedTransactionResponse.error);
            }

            const finalXdr = signedTransactionResponse.signedTxXdr || signedTransactionResponse;

            // 4. Submit to Horizon
            const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(finalXdr, StellarSdk.Networks.TESTNET);
            const submitResponse = await server.submitTransaction(signedTransaction);

            // 5. Verify payment via Backend
            const verifyRes = await api.post('/payment/verify', { txHash: submitResponse.hash });
            if (verifyRes.data.success) {
                // Update user context
                const updatedUser = { ...user, credits: verifyRes.data.totalCredits };
                login(updatedUser);
            } else {
                throw new Error(verifyRes.data.error || 'Payment verification failed');
            }

        } catch (err) {
            console.error(err);
            setError(err.message || 'Payment failed or was cancelled');
            // Hide error after 4 seconds
            setTimeout(() => setError(null), 4000);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="flex items-center gap-3 relative">
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg text-sm font-semibold">
                <Coins className="w-4 h-4 text-blue-600" />
                {user.credits ?? 0} Credits
            </div>
            <button
                onClick={handleBuyCredits}
                disabled={loading || !projectWallet}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Buy (5 XLM)
            </button>
            {error && <span className="text-xs text-red-500 absolute top-full right-0 mt-2 bg-white px-2 py-1 rounded shadow-md border whitespace-nowrap z-50">{error}</span>}
        </div>
    );
}
