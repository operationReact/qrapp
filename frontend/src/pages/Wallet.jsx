import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { walletCreateOrder, walletVerifyPayment, walletGetBalance, walletGetTransactions } from '../services/api';

// Simple toast helper
function useToast() {
  const [message, setMessage] = useState(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);
  const show = useCallback((m) => setMessage(m), []);
  return useMemo(() => ({ message, show }), [message, show]);
}

// Load Razorpay script dynamically
function loadRazorpayScript(src = 'https://checkout.razorpay.com/v1/checkout.js') {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
    document.body.appendChild(script);
  });
}

export default function Wallet() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const toast = useToast();
  const { show } = toast; // stable function reference
  const mounted = useRef(true);
  const navigate = useNavigate();
  const { setUser } = useUserAuth();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // If not authenticated, redirect to login and don't call backend
    const raw = localStorage.getItem('userCreds');
    const creds = raw ? JSON.parse(raw) : null;
    if (!creds || !creds.token) {
      setLoading(false);
      show('Please login to access wallet');
      navigate('/login');
      return;
    }
    try {
      const b = await walletGetBalance();
      const t = await walletGetTransactions({ page: 0, size: 20 });
      if (!mounted.current) return;
      setBalance(b.data?.balance ?? 0);
      setTransactions(t.data?.content ?? t.data ?? []);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        // token invalid/expired — clear user and redirect to login
        if (setUser) setUser(null);
        show('Session expired. Please login again');
        navigate('/login');
        return;
      }
      console.error('Wallet load failed', err?.message || err);
      show('Failed to load wallet');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [show, navigate, setUser]);

  useEffect(() => {
    mounted.current = true;
    fetchAll();
    return () => { mounted.current = false; }
  }, [fetchAll]);

  async function handleAddMoney() {
    if (!addAmount || Number(addAmount) <= 0) return show('Enter a valid amount');
    setAdding(true);
    try {
      // convert to paise (assuming INR) — expect user to input rupees
      const amountPaise = Math.round(Number(addAmount) * 100);
      const resp = await walletCreateOrder({ amount: amountPaise });
      const orderId = resp.data?.razorpayOrderId;
      if (!orderId) { show('No order id from server'); return; }

      await loadRazorpayScript();

      const key = import.meta?.env?.VITE_RAZORPAY_KEY || window?.RAZORPAY_KEY_ID || undefined;
      const options = {
        key,
        order_id: orderId,
        amount: amountPaise,
        currency: 'INR',
        name: 'Bro & Bro',
        description: 'Add money to wallet',
        handler: async function (response) {
          try {
            // send payment details to backend for verification
            await walletVerifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            show('Wallet credited');
            await fetchAll();
          } catch (e) {
            console.error('verify failed', e);
            show('Payment verification failed');
          }
        }
      };

      if (!key) {
        show('Razorpay key not configured. Set VITE_RAZORPAY_KEY or window.RAZORPAY_KEY_ID');
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.error('payment.failed', response);
        show('Payment failed');
      });
      rzp.open();

    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        if (setUser) setUser(null);
        show('Session expired. Please login again');
        navigate('/login');
        return;
      }
      console.error('Payment init failed', err?.message || err);
      show('Failed to initiate payment');
    } finally {
      if (mounted.current) setAdding(false);
    }
  }

  const formattedBalance = balance == null ? '—' : `₹ ${(Number(balance)/100).toFixed(2)}`;
  const numericAmount = balance == null ? '—' : (Number(balance)/100).toFixed(2);

  return (
      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Wallet</h1>
            <button onClick={fetchAll} className="text-sm text-gray-600">Refresh</button>
          </div>
        </div>

        {/* Content container */}
        <div className="p-4 space-y-5">
          {/* Balance panel (mobile-first stacked) */}
          <div className="rounded-2xl p-5 bg-white shadow">
            <div className="text-sm text-gray-500">Available balance</div>
            <div className="mt-2 flex items-end gap-3">
              <div className="flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-amber-50 border border-amber-100">
                <div className="text-xs text-amber-600">₹</div>
                <div className="text-2xl font-extrabold text-amber-700">{numericAmount}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Balance</div>
                <div className="text-lg font-semibold">{loading ? '...' : formattedBalance}</div>
              </div>
            </div>

            {/* Add money - full width input + CTA */}
            <div className="mt-4">
              <label className="text-xs text-gray-500">Add money (₹)</label>
              <div className="mt-2 flex gap-2">
                <input
                    type="number"
                    inputMode="numeric"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="flex-1 rounded-xl border px-3 py-3 outline-none"
                />
                <button onClick={handleAddMoney} disabled={adding} className="px-4 py-3 rounded-xl bg-amber-500 text-white font-semibold min-w-[96px]">
                  {adding ? 'Processing' : 'Add'}
                </button>
              </div>
            </div>

            {/* Quick amounts - horizontally scrollable for mobile */}
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">Quick amounts</div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {[50,100,200,500,1000].map(a => (
                    <button key={a} onClick={() => { setAddAmount(String(a)); handleAddMoney(); }} className="flex-none px-4 py-2 rounded-full bg-gray-100">₹{a}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent transactions</h2>
            {loading ? (
                <div className="p-4 bg-white rounded-xl text-center text-gray-500">Loading...</div>
            ) : transactions.length === 0 ? (
                <div className="p-6 bg-white rounded-xl text-center text-gray-400">No transactions yet</div>
            ) : (
                <div className="space-y-3">
                  {transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
                        <div>
                          <div className="font-medium text-gray-800">{tx.type === 'CREDIT' ? 'Money added' : 'Payment'}</div>
                          <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</div>
                        </div>
                        <div className={`font-semibold ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'CREDIT' ? '+' : '-'}₹{(tx.amount/100).toFixed(2)}</div>
                      </div>
                  ))}
                </div>
            )}
          </div>
        </div>

        {/* Bottom fixed action bar on mobile for quick access (Add only) */}
        <div className="fixed left-0 right-0 bottom-0 p-3 bg-white/80 backdrop-blur-md border-t sm:hidden">
          <div className="max-w-4xl mx-auto flex gap-3">
            <button onClick={() => { const v = prompt('Enter amount to add (₹)'); if (v) { setAddAmount(v); handleAddMoney(); } }} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-semibold">Add</button>
          </div>
        </div>

        {/* TOAST */}
        {toast.message && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg">
              {toast.message}
            </div>
        )}
      </div>
  );
}
