'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import { RECURRING_PAYMENTS_ABI, CONTRACT_ADDRESS } from '@/lib/contract';

export function WalletConnect() {
  return (
    <div className="flex flex-col gap-4">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === 'authenticated');

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all"
                    >
                      Wrong network
                    </button>
                  );
                }

                return (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-between"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 20,
                            height: 20,
                            borderRadius: 999,
                            overflow: 'hidden',
                            marginRight: 8,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 20, height: 20 }}
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </button>

                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                    >
                      {account.displayName}
                      {account.displayBalance
                        ? ` (${account.displayBalance})`
                        : ''}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}

interface SubscribeButtonProps {
  planPrice: string;
  planDuration: string;
  destinationAddress: string;
}

export function SubscribeButton({ planPrice, planDuration, destinationAddress }: SubscribeButtonProps) {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubscribe = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Convertir el precio mensual a wei
      const priceInEth = planPrice.replace('$', '').replace(',', '');
      const monthlyPrice = parseEther((parseFloat(priceInEth) * 0.0003).toString()); // Ejemplo: $10.99 ≈ 0.003 ETH
      
      // Crear una suscripción de 12 meses
      const totalTimes = 12;
      const totalAmount = monthlyPrice * BigInt(totalTimes);

      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: RECURRING_PAYMENTS_ABI,
        functionName: 'createRecord',
        args: [destinationAddress as `0x${string}`, BigInt(totalTimes), monthlyPrice],
        value: totalAmount,
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to create subscription. Please try again.');
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={!isConnected || isPending || isConfirming}
      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-bold py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
    >
      {!isConnected
        ? 'Connect Wallet to Subscribe'
        : isPending
        ? 'Confirming...'
        : isConfirming
        ? 'Processing...'
        : isSuccess
        ? 'Subscription Created! ✓'
        : 'Start Subscription'}
    </button>
  );
}

interface Subscription3ButtonProps {
  contractAddress: string;
  destinationAddress: string;
  totalTimes: number;
  unitPaymentUSD: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function Subscription3Button({
  contractAddress,
  destinationAddress,
  totalTimes,
  unitPaymentUSD,
  onSuccess,
  onError,
}: Subscription3ButtonProps) {
  const { isConnected, chain } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubscribe = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    // Verificar que esté en Sepolia
    if (chain?.id !== 11155111) {
      alert('Please switch to Sepolia network');
      return;
    }

    try {
      // Convertir USD a ETH (aproximación: $1 = 0.0003 ETH)
      // En producción, usar un oracle de precios real
      const ethPrice = 0.0003;
      const unitPaymentETH = parseEther((unitPaymentUSD * ethPrice).toString());
      const totalAmount = unitPaymentETH * BigInt(totalTimes);

      console.log('Creating subscription:', {
        contract: contractAddress,
        destination: destinationAddress,
        totalTimes,
        unitPaymentETH: unitPaymentETH.toString(),
        totalAmount: totalAmount.toString(),
      });

      await writeContract({
        address: contractAddress as `0x${string}`,
        abi: RECURRING_PAYMENTS_ABI,
        functionName: 'createRecord',
        args: [
          destinationAddress as `0x${string}`,
          BigInt(totalTimes),
          unitPaymentETH,
        ],
        value: totalAmount,
        chainId: 11155111, // Sepolia
      });
    } catch (err) {
      console.error('Error creating subscription:', err);
      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  };

  if (isSuccess && onSuccess) {
    onSuccess();
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={!isConnected || isPending || isConfirming || chain?.id !== 11155111}
      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-bold py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
    >
      {!isConnected
        ? 'Connect Wallet First'
        : chain?.id !== 11155111
        ? 'Switch to Sepolia Network'
        : isPending
        ? 'Waiting for signature...'
        : isConfirming
        ? 'Processing transaction...'
        : isSuccess
        ? '✓ Subscription Created!'
        : `Pay $${(unitPaymentUSD * totalTimes).toFixed(2)}`}
    </button>
  );
}
