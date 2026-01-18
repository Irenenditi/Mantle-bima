

---

# 🏡 BIMA - Decentralized Land Marketplace

> **Mantle Track: Transforming Land Ownership in Africa through Blockchain**

[![Built on Mantle](https://img.shields.io/badge/Built_on-Mantle-0EA5E9?style=for-the-badge)](https://www.mantle.xyz)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](https://github.com/your-username/bima)
[![Tests](https://img.shields.io/badge/Tests-Passing-green?style=for-the-badge)](https://github.com/your-username/bima/actions)

---

## 📋 Project Documentation

* **📊 Pitch Deck**: [View Our Presentation](https://docs.google.com/presentation/d/1cGslZ-suI-Kgur_XwWNqFPYfhM8tAo6ANXRfOSw60us/edit?usp=sharing)
* 📊 **Live Project**: [https://drive.google.com/file/d/17_noJiC_8n-TCQZ94j4F2uLRVRN9EBHa/view?usp=sharing)
* 📊 **Project Whitepaper**: [https://app.gitbook.com/invite/Re8U2LJlijqo242e16Eq/FQNutGDFOT8FpslNIAHr](https://app.gitbook.com/invite/Re8U2LJlijqo242e16Eq/FQNutGDFOT8FpslNIAHr)

---

# 🚀 Quick Start Guide

## Run the App Locally

### 1. Clone and Install
```bash
git clone https://github.com/Irenenditi/Mantle-bima.git
cd bima
cd frontend
npm install
npm run dev
```

### 2. backend Set Up Environment
```bash
cd backend
npm install
npm start
# Edit .env.local with your keys (see below)
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Required Environment Variables
Add these to your `.env.local`:
```env
# Mantle Network
NEXT_PUBLIC_MANTLE_RPC_URL=https://rpc.testnet.mantle.xyz
NEXT_PUBLIC_MANTLE_CHAIN_ID=5001
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address_here
```

## 📦 Production Build
```bash
npm run build
npm start
```

## 🌐 Live Demo
Check out our live deployment: [https://bima-mantle.vercel.app](https://bima-mantle.vercel.app)

## 🐛 Need Help?
```bash
# Check for common issues
npm run debug

# Reset and clean install
npm run clean:install
```

That's it! Your BIMA marketplace is now running locally. 🎉
## 🌍 Overview

**BIMA** is a decentralized land marketplace that leverages blockchain technology, decentralized identifiers (DIDs), and tokenized land titles to build a transparent, trusted, and community-driven land ecosystem.

Deployed on the **Mantle Network**, BIMA enables individuals, institutions, and local authorities to buy, sell, and verify land ownership securely through **on-chain records, smart escrow contracts, and multi-signature verification** by trusted community inspectors.

> The name **“BIMA”**, derived from the Swahili word for land or property, reflects our mission: empowering individuals to own and trade land with confidence, speed, and transparency.

---

## 🚨 The Problem: Land Ownership Challenges

Land remains one of the most valuable yet problematic assets in emerging economies:

| Challenge                         | Impact                                             |
| --------------------------------- | -------------------------------------------------- |
| **Fraudulent & Duplicate Titles** | Paper-based or corrupted registries enable fraud   |
| **Bureaucratic Processes**        | Lengthy verification and transfer procedures       |
| **Low Trust Ecosystems**          | Distrust between landowners, buyers, and officials |
| **Lack of Accountability**        | Unreliable surveyors and land officers             |
| **Opacity in Records**            | Limited public access to verified ownership data   |

**Result:** frequent land disputes, loss of property rights, and reduced investment confidence.

---

## 🎯 Our Solution

BIMA creates a secure, user-friendly digital marketplace where land transactions are governed by **smart contracts on Mantle**, rather than opaque bureaucratic intermediaries.

### 🔄 How BIMA Works

```mermaid
graph TD
    A[Seller Lists Land] --> B[Upload Documents to IPFS];
    B --> C[Inspector Verification];
    C --> D{Multi-Signature Approval};
    D -->|Approved| E[Mint Land Title NFT];
    D -->|Rejected| F[Returned to Seller];
    E --> G[Marketplace Listing];
    G --> H[Buyer Purchases];
    H --> I[Escrow Smart Contract];
    I --> J[Title NFT Transfer];
    J --> K[Release Payment];
```

---

## 🛠️ Tech Stack

### 🧠 Languages & Frameworks

![Solidity](https://img.shields.io/badge/Solidity-0.8.x-363636?style=for-the-badge\&logo=solidity)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge\&logo=javascript\&logoColor=black)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge\&logo=react\&logoColor=61DAFB)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge\&logo=next.js\&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge\&logo=node.js\&logoColor=white)

### 🌐 Mantle & Web3

![Mantle](https://img.shields.io/badge/Mantle-L2-0EA5E9?style=for-the-badge)
![EVM](https://img.shields.io/badge/EVM-Compatible-purple?style=for-the-badge)
![Ethers.js](https://img.shields.io/badge/Ethers.js-7A98FB?style=for-the-badge)
![IPFS](https://img.shields.io/badge/IPFS-65C2CB?style=for-the-badge\&logo=ipfs\&logoColor=white)

### 🧰 Development Tools

![Foundry](https://img.shields.io/badge/Foundry-black?style=for-the-badge)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-4E5EE4?style=for-the-badge\&logo=OpenZeppelin\&logoColor=white)
![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge\&logo=npm\&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge\&logo=git\&logoColor=white)

---


## 🔗 Mantle Integration Deep Dive

### ERC-721 Land Title NFTs

BIMA tokenizes verified land parcels as **ERC-721 NFTs deployed on Mantle**. Each NFT represents a unique land title with immutable ownership history and IPFS-hosted documentation.

### On-Chain Verification & Transparency

All inspector approvals, escrow actions, listings, and title transfers are logged as **public Mantle transactions**, enabling full auditability via Mantle explorers.

### Smart Contracts (Solidity)

* Land Title NFT Contract
* Inspector Registry (multi-signature approvals)
* Escrow Contract for buyer–seller protection

---

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │ Mantle Network  │
│ React / Next.js │◄──►│ Node.js / Express│◄──►│ Solidity Smart  │
│ Ethers.js       │    │ IPFS Gateway     │    │ Contracts       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 🖥️ Platform Features & UI Showcase

### 🏠 Landing Page & User Onboarding

<img width="1490" height="942" alt="Screenshot from 2026-01-15 12-56-00" src="https://github.com/user-attachments/assets/99740177-2d60-403d-931d-8ea023234b48" />

 <img width="1750" height="963" alt="Screenshot from 2025-11-15 18-08-18" src="https://github.com/user-attachments/assets/0500e167-a5c1-4222-aee3-3ae1db42f5e7" />
 <img width="1490" height="942" alt="Screenshot from 2026-01-15 12-56-00" src="https://github.com/user-attachments/assets/f92cbec2-f9fd-463d-9372-6d9dd461eb2c" />


 

### 🎟️ Land Title Minting Interface

<img width="1832" height="954" alt="Land Title Minting" src="https://github.com/user-attachments/assets/land-title-minting-screenshot" />

### 🏡 Land Listing & Marketplace

<img width="1258" height="936" alt="Screenshot from 2026-01-15 12-54-57" src="https://github.com/user-attachments/assets/6031dc62-d584-45b5-855c-256167727632" />


### 📝 Land Listing Creation

<img width="1832" height="954" alt="Create Listing" src="https://github.com/user-attachments/assets/4d09e8dc-835d-4f90-ace7-77dbbf5d1b8b" />

### 🔍 Inspector Verification Portal

<img width="1258" height="936" alt="Screenshot from 2026-01-15 12-55-17" src="https://github.com/user-attachments/assets/91bbbc9d-c2f9-4099-8dd6-35ec3e9ecf23" />


---

## ✨ Key Features

* Tokenized land titles (ERC-721)
* Inspector-based multi-signature verification
* Escrow-protected purchases
* DID-based identities
* Public, immutable on-chain audit trail
* Low transaction fees via Mantle

---

## 📊 Project Status

* ✅ Smart contracts deployed on Mantle Sepolia
* ✅ Frontend MVP completed
* ✅ Inspector verification flow implemented
* 🔄 User testing ongoing

---


## 👨‍💻 Team

| Name          | Role                     | Contact                                                           |
| ------------- | ------------------------ | ----------------------------------------------------------------- |
| John Mokaya   | Frontend Developer       | [mokayaj857@gmail.com](mailto:mokayaj857@gmail.com)               |
| Mary Njoroge  | Project Manager          | [mariannapeters203@gmail.com](mailto:mariannapeters203@gmail.com) |
| Irene Njoroge | Smart Contract Developer | [irenenditi1@gmail.com](mailto:irenenditi1@gmail.com)             |
| Joseph Okumu  | Backend Developer        | [jokumu25@gmail.com](mailto:jokumu25@gmail.com)                   |

---

<div align="center">

**Built with ❤️ on Mantle Network**
*Transforming African Land Ownership — One Verified Title at a Time*

</div>

---

