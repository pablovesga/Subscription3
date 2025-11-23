# ETH Global Hackathon 2025 - Subscription3

## 🔒 Secure Enterprise Recurring Payments on Blockchain

**The Problem:** While blockchain provides anonymity, all transactions are public. This creates a critical vulnerability for enterprises - malicious actors can identify company wallets and launch targeted attacks, putting business operations and funds at risk.

**Our Solution:** Subscription3 is a **decentralized recurring payment system** that combines privacy and automation:

- 🔐 **Privacy Layer**: Leverages **Aztec Layer 2** with Zero-Knowledge (ZK) proofs to hide wallet addresses. Implemented with **Noir** programming language, ensuring true wallet anonymity while maintaining transaction integrity.

- ⚡ **Automated Recurring Payments**: Powered by **Chainlink Functions** with the CRE SDK, our smart contracts automatically execute scheduled payments (monthly, quarterly, yearly). No manual intervention needed - the system reads contract states and triggers payments at predefined intervals.

- 💳 **Smart Subscription Management**: Users subscribe once, and payments are automatically processed according to their plan (6-month or 12-month cycles). Perfect for SaaS, membership services, and enterprise software subscriptions.

A complete Web3 subscription payment platform combining privacy, automation, and enterprise-grade security for recurring transactions.

## 📁 Project Structure

This repository contains four main projects:

### 1. ethglobal2025_SmartContract
Smart contracts for **automated recurring payments** with USDC.
- **Technology**: Solidity
- **Key Files**: 
  - `RecurringPaymentUSDC.sol` - Main contract for subscription management and recurring payments
  - `GUIA-REMIX.md` - Remix deployment guide
- **Deployed on**: Sepolia Testnet
- **Contract Address**: `0x145BEdA70dFE4d4bA6e25A9fdc7eed988caA7810`
- **Purpose**: Manages subscription records and enables scheduled recurring payments (monthly, quarterly, yearly)

### 2. ethglobal2025_stripeweb3
Web3 integration with **Aztec Layer 2** for private transactions.
- **Technology**: TypeScript, **Aztec Protocol**, **Noir**, Hardhat
- **Key Components**:
  - **Aztec NFT contracts (Noir)** - Zero-Knowledge smart contracts
  - Private transaction layer for wallet anonymity
  - Hardhat examples and configuration
  - Node.js integration
- **Purpose**: Provides privacy layer to hide wallet addresses from public view

### 3. EthGlobalChain
Blockchain workflow automation powered by **Chainlink Functions**.
- **Technology**: TypeScript, **Chainlink CRE SDK**
- **Key Components**:
  - **Automated triggers** for periodic payment execution (daily/monthly/yearly checks)
  - Contract reading and recurring payment logic
  - Subscription expiration monitoring
  - Configuration for staging and production environments
  - Contract ABIs and integrations
- **Purpose**: Automates recurring payment processing - checks subscriptions and executes payments at scheduled intervals without manual intervention

### 4. ethglobal2025_frontend ⭐ NEW
Modern Web3 payment frontend with Spotify-inspired design.
- **Technology**: Next.js 15, TypeScript, Tailwind CSS, RainbowKit, Wagmi v3
- **Features**:
  - 🎨 Spotify-style checkout page
  - 🔗 RainbowKit wallet connection (MetaMask, WalletConnect, Coinbase, etc.)
  - 💳 Multiple payment options (Credit Card, PayPal, Subscription3)
  - ⚡ Direct smart contract integration on Sepolia
  - 🎯 Two subscription plans: 6 months ($11.99/mo) and 12 months ($9.99/mo)
  - 🔐 Wallet status indicator with connect/disconnect functionality
  - 📱 Fully responsive design

#### Frontend Quick Start
```bash
cd ethglobal2025_frontend
npm install
npm run dev
```
Access at: `http://localhost:3000/checkout`

**Environment**: Sepolia Testnet (Chain ID: 11155111)
**Smart Contract**: `0x145BEdA70dFE4d4bA6e25A9fdc7eed988caA7810`

## 🚀 Getting Started

Each project has its own setup instructions. Navigate to the specific project directory for detailed documentation.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git
- MetaMask or any Web3 wallet
- Sepolia testnet ETH (for testing)
- Hardhat (for smart contract development)
- Aztec tools (for Noir contracts)

### Quick Start - Frontend Demo
1. Clone the repository
```bash
git clone https://github.com/pablovesga/Subscription3.git
cd Subscription3/ethglobal2025_frontend
```

2. Install dependencies
```bash
npm install --legacy-peer-deps
```

3. Run development server
```bash
npm run dev
```

4. Open your browser at `http://localhost:3000/checkout`

5. Connect your wallet (make sure you're on Sepolia testnet)

6. Select a subscription plan and pay with Subscription3! 🚀

## 📝 License

See individual project directories for license information.

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- RainbowKit (Wallet Connection)
- Wagmi v3 (Ethereum Interactions)
- Viem (Type-safe Ethereum Client)

**Smart Contracts:**
- Solidity
- Sepolia Testnet
- Recurring Payment System

**Privacy Layer:**
- **Aztec Protocol** (Layer 2)
- **Noir** (ZK Smart Contract Language)
- Zero-Knowledge Proofs for wallet anonymity

**Automation:**
- **Chainlink Functions**
- **CRE SDK** for automated triggers
- TypeScript for workflow orchestration

## 🎯 Key Features

✅ **Enterprise Privacy**: Hide wallet addresses using Aztec Layer 2 ZK proofs  
✅ **Recurring Payment Automation**: Chainlink Functions automatically execute scheduled payments (monthly/quarterly/yearly)  
✅ **Subscription Management**: Users subscribe once - payments process automatically according to plan duration  
✅ **Modern UX**: Spotify-inspired checkout with RainbowKit integration  
✅ **Multi-Payment Options**: Traditional (Credit Card, PayPal) + Web3 (Subscription3)  
✅ **Flexible Plans**: 6-month ($11.99/mo) and 12-month ($9.99/mo) subscription cycles  
✅ **Security First**: Zero-Knowledge technology protects against targeted attacks  
✅ **Set and Forget**: No manual payment reminders - fully automated recurring billing

## 💡 How It Works

1. **User Subscribes**: Choose a plan and connect wallet through our frontend
2. **Create Record**: Smart contract creates a subscription record with payment schedule
3. **Automated Execution**: Chainlink Functions monitor contracts and trigger payments at intervals
4. **Private Transactions**: Aztec Layer 2 ensures wallet addresses remain hidden via ZK proofs
5. **Continuous Service**: Payments process automatically until subscription ends

## 🔗 Links

- ETH Global: https://ethglobal.com/
- Project Repository: https://github.com/pablovesga/Subscription3
- Live Demo: (add deployment URL when available)

---

Built for ETH Global Hackathon 2025 🚀
