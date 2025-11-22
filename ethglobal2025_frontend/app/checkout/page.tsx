'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { Subscription3Button } from '@/components/wallet';
import { CONTRACT_ADDRESS } from '@/lib/contract';

type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
  isWeb3?: boolean;
};

type Plan = {
  id: string;
  name: string;
  months: number;
  priceUSD: number;
  pricePerMonth: number;
};

const DESTINATION_ADDRESS = '0x247004302ad03c945aa0497ac7557e355ebbd313';

const plans: Plan[] = [
  {
    id: '6months',
    name: '6 Months Plan',
    months: 6,
    priceUSD: 11.99,
    pricePerMonth: 11.99,
  },
  {
    id: '12months',
    name: '12 Months Plan',
    months: 12,
    priceUSD: 9.99,
    pricePerMonth: 9.99,
  },
];

const paymentMethods: PaymentMethod[] = [
  { id: 'tc', name: 'Credit Card', icon: '💳' },
  { id: 'paypal', name: 'PayPal', icon: '🅿️' },
  { id: 'subscription3', name: 'Subscription3', icon: '🔗', isWeb3: true },
];

export default function CheckoutPage() {
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('12months');
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const handleWalletToggle = () => {
    if (isConnected) {
      disconnect();
    } else if (openConnectModal) {
      openConnectModal();
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handlePaymentSelect = (paymentId: string) => {
    setSelectedPayment(paymentId);
    if (paymentId === 'subscription3' && openConnectModal) {
      // Abrir modal de RainbowKit directamente
      openConnectModal();
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPayment) {
      alert('Por favor selecciona un método de pago');
      return;
    }

    if (selectedPayment !== 'subscription3') {
      alert(`Procesando pago con ${paymentMethods.find(p => p.id === selectedPayment)?.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold text-green-500 flex items-center gap-2">
              ♪ MusicStream
            </Link>
            
            {/* Wallet Status */}
            <button
              onClick={handleWalletToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isConnected
                  ? 'bg-green-500/20 text-green-500 border border-green-500 hover:bg-green-500/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-white'
              }`}
            >
              {isConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>{formatAddress(address!)}</span>
                  <span className="text-xs">✕</span>
                </>
              ) : (
                <>
                  <span>🔗</span>
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
          </div>
          
          <button className="text-gray-400 hover:text-white">
            Need help?
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Premium Subscription</h1>
          <p className="text-gray-400 text-lg">
            Choose your payment method
          </p>
        </div>

        {/* Payment Section */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Side - Payment Methods */}
            <div className="bg-gray-900/50 rounded-lg p-8 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">Payment Methods</h2>
              
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id}>
                    <div
                      onClick={() => handlePaymentSelect(method.id)}
                      className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all ${
                        selectedPayment === method.id
                          ? 'bg-green-500/20 border-2 border-green-500'
                          : 'bg-gray-800/50 border-2 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-3xl">{method.icon}</span>
                      <span className="font-semibold flex-1">{method.name}</span>
                      {selectedPayment === method.id && (
                        <span className="text-green-500">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Order Summary */}
            <div className="bg-gray-900/50 rounded-lg p-8 border border-gray-800">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-6">
                {/* Plan Selection */}
                <div className="border-b border-gray-700 pb-6">
                  <h3 className="text-lg font-semibold mb-4">Choose Your Plan</h3>
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          selectedPlan === plan.id
                            ? 'bg-green-500/20 border-2 border-green-500'
                            : 'bg-gray-800/50 border-2 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-lg">{plan.name}</h4>
                            <p className="text-sm text-gray-400">${plan.pricePerMonth}/month</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-500">${plan.priceUSD}</p>
                            <p className="text-xs text-gray-400">Total: ${(plan.pricePerMonth * plan.months).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Features */}
                <div className="border-b border-gray-700 pb-6">
                  <h3 className="text-xl font-semibold mb-4 text-green-500">Features Included</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Ad-free music listening</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Download to listen offline</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>High audio quality</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Unlimited skips</span>
                    </li>
                  </ul>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-400">
                    <span>Selected plan:</span>
                    <span className="text-white font-semibold">
                      {plans.find(p => p.id === selectedPlan)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Duration:</span>
                    <span className="text-white">
                      {plans.find(p => p.id === selectedPlan)?.months} months
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Price per month:</span>
                    <span className="text-white">
                      ${plans.find(p => p.id === selectedPlan)?.pricePerMonth}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Payment method:</span>
                    <span className="text-white">
                      {selectedPayment 
                        ? paymentMethods.find(p => p.id === selectedPayment)?.name
                        : 'Not selected'}
                    </span>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex justify-between text-2xl font-bold">
                      <span>Total</span>
                      <span className="text-green-500">
                        ${((plans.find(p => p.id === selectedPlan)?.pricePerMonth || 0) * 
                           (plans.find(p => p.id === selectedPlan)?.months || 0)).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      for {plans.find(p => p.id === selectedPlan)?.months} months
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  {selectedPayment === 'subscription3' ? (
                    <Subscription3Button 
                      contractAddress={CONTRACT_ADDRESS}
                      destinationAddress={DESTINATION_ADDRESS}
                      totalTimes={plans.find(p => p.id === selectedPlan)?.months || 12}
                      unitPaymentUSD={plans.find(p => p.id === selectedPlan)?.pricePerMonth || 9.99}
                      onSuccess={() => alert('¡Suscripción creada exitosamente!')}
                      onError={(error) => alert(`Error: ${error.message}`)}
                    />
                  ) : (
                    <button
                      onClick={handleSubscribe}
                      disabled={!selectedPayment}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-bold py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                      {!selectedPayment ? 'Select Payment Method' : 'Subscribe Now'}
                    </button>
                  )}
                </div>

                {/* Terms */}
                <p className="text-xs text-gray-500 text-center">
                  By confirming, you agree to the automatic monthly charges. Cancel anytime.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Features Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-16 text-center">
          <div>
            <div className="text-4xl mb-3">🎵</div>
            <h3 className="font-bold mb-2">Unlimited Music</h3>
            <p className="text-gray-400 text-sm">
              Access millions of songs
            </p>
          </div>
          <div>
            <div className="text-4xl mb-3">📱</div>
            <h3 className="font-bold mb-2">Offline Mode</h3>
            <p className="text-gray-400 text-sm">
              Download and listen anywhere
            </p>
          </div>
          <div>
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="font-bold mb-2">Secure Payments</h3>
            <p className="text-gray-400 text-sm">
              Multiple payment options
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2025 MusicStream. Web3 Subscription Service.</p>
        </div>
      </footer>
    </div>
  );
}
