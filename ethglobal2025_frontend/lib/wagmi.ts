import { http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

export const config = getDefaultConfig({
  appName: 'MusicStream Subscription3',
  projectId: 'ffc14557f28641818897746a9ad4ee27',
  chains: [sepolia],
  ssr: true,
});
