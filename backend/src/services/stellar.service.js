import StellarSdk from 'stellar-sdk';
import crypto from 'crypto';

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Master Project Wallet for Testnet
let PROJECT_KEYPAIR = null;

// Initialize the master wallet
export const initStellarWallet = async () => {
    if (process.env.STELLAR_SECRET) {
        PROJECT_KEYPAIR = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SECRET);
        console.log("Stellar: Using provided secret key.");
    } else {
        // For MVP: generate a new one if none provided
        PROJECT_KEYPAIR = StellarSdk.Keypair.random();
        console.log("Stellar: Generated new master wallet.");
        console.log("Public Key:", PROJECT_KEYPAIR.publicKey());
        console.log("Secret Key:", PROJECT_KEYPAIR.secret());

        // Fund it using Friendbot
        try {
            console.log("Stellar: Funding master wallet via Friendbot...");
            const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(PROJECT_KEYPAIR.publicKey())}`);
            const responseJSON = await response.json();
            console.log("Stellar: Master wallet funded successfully.");
        } catch (e) {
            console.error("Stellar: Failed to fund wallet via Friendbot.", e);
        }
    }
};

export const getProjectPublicKey = () => {
    return PROJECT_KEYPAIR ? PROJECT_KEYPAIR.publicKey() : null;
};

export const anchorReportOnStellar = async (reportJson) => {
    if (!PROJECT_KEYPAIR) await initStellarWallet();

    try {
        const reportString = JSON.stringify(reportJson);
        const hash = crypto.createHash('sha256').update(reportString).digest('hex');

        // We use the 32-byte hex hash directly
        const memo = StellarSdk.Memo.hash(hash);

        // Load account sequence
        const account = await server.loadAccount(PROJECT_KEYPAIR.publicKey());

        // Build transaction (0 value to itself just to append the memo)
        const fee = await server.fetchBaseFee();
        const transaction = new StellarSdk.TransactionBuilder(account, {
            fee,
            networkPassphrase: StellarSdk.Networks.TESTNET
        })
            .addOperation(StellarSdk.Operation.payment({
                destination: PROJECT_KEYPAIR.publicKey(),
                asset: StellarSdk.Asset.native(),
                amount: '0.0000001' // Minimal amount
            }))
            .addMemo(memo)
            .setTimeout(30)
            .build();

        transaction.sign(PROJECT_KEYPAIR);

        const response = await server.submitTransaction(transaction);
        console.log('Stellar Anchor Success! Hash:', response.hash);
        return response.hash;

    } catch (e) {
        console.error("Stellar Anchor Error:", e);
        return null;
    }
};

export const verifyPaymentTx = async (txHash) => {
    // Check if the transaction exists, is successful, and sends XLM to our project wallet
    if (!PROJECT_KEYPAIR) await initStellarWallet();

    try {
        const tx = await server.transactions().transaction(txHash).call();

        if (!tx || !tx.successful) {
            return { valid: false, error: "Transaction not found or failed" };
        }

        // Fetch operations for this transaction
        const opsInfo = await tx.operations();
        const operations = opsInfo.records;

        let validPayment = false;
        let amountPaid = 0;

        for (const op of operations) {
            if (op.type === 'payment' && op.to === PROJECT_KEYPAIR.publicKey() && op.asset_type === 'native') {
                validPayment = true;
                amountPaid = parseFloat(op.amount);
                break;
            }
        }

        if (validPayment) {
            return { valid: true, amount: amountPaid };
        } else {
            return { valid: false, error: "Transaction did not send XLM to the project wallet." };
        }

    } catch (e) {
        console.error("Stellar Verify Payment Error:", e);
        return { valid: false, error: "Error verifying transaction on Stellar network." };
    }
};
