

# 💰 PaisaHiPaisa Backend

A **secure, modular digital wallet API** built with **Express.js, TypeScript, MongoDB, and JWT** — inspired by services like **Bkash** and **Nagad**.
Supports **users**, **agents**, **admins**, and **super admins** with automated wallet management, transactions, and system fees.

---

## 🚀 Features

* 🔐 Authentication with JWT & HTTP-only cookies
* 👥 Role-based access control: `USER`, `AGENT`, `ADMIN`, `SUPER_ADMIN`
* 💳 Auto wallet creation (default TK50 balance)
* 💸 Transaction system: Send, Add Money, Withdraw, Cash-In, Refund
* 💰 Fee deduction system (via `fees` module)
* 🧾 Transaction tracking with status (Pending, Completed, Failed, Refunded)
* 🏦 Admin dashboard for full control
* 📧 Email support for important actions
* 🧩 SSLCommerz integration for payment gateway

---

## 📁 Folder Structure

```
paisahipaisa-backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── app/
│   │   ├── config/
│   │   ├── errorHelpers/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── user/
│   │   │   ├── wallet/
│   │   │   ├── transaction/
│   │   │   └── fees/
│   │   ├── routes/
│   │   └── utils/
├── .env.example
├── package.json
├── tsconfig.json
└── vercel.json
```

---

## ⚙️ Environment Variables

Create `.env` file in root:

```bash
MONGODB_URL=
PORT=5000
NODE_ENV=development

# Super Admin
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD=
SUPER_ADMIN_NAME=
SUPER_ADMIN_PHONENO=
SUPER_ADMIN_NIDNO=

# bcrypt
BCRYPT_SALT=

# JWT
JWT_SECRET=
JWT_EXPIRE=

# FRONTEND
FRONTEND_URL=

# SSLCommerz
STORE_ID=
STORE_PASSWORD=
STORE_STATUS=
SUCCESS_URL=
FAIL_URL=
CANCEL_URL=
REDIRECT_URL=

# Gmail
EMAIL=
APP_PASSWORD=
```

---

## 📦 Installation

```bash
git clone https://github.com/sakincse21/paisahipaisa-backend.git
cd paisahipaisa-backend
npm install
```

### Run in Development

```bash
npm run dev
```

### Build and Start

```bash
npm run build
npm start
```

---

## 🧩 API Overview

### Base URL

```
https://paisa-hi-paisa-backend.vercel.app/api/v1
```

---

## 🔐 Auth Routes

| Method | Endpoint       | Description                 | Auth |
| ------ | -------------- | --------------------------- | ---- |
| POST   | `/auth/login`  | Login with email & password | ❌    |
| POST   | `/auth/logout` | Logout (clear cookies)      | ✅    |

---

## 👤 User Routes

| Method | Endpoint                | Description                             | Access              |
| ------ | ----------------------- | --------------------------------------- | ------------------- |
| POST   | `/user/create`          | Register new user (auto wallet created) | Public              |
| GET    | `/user/me`              | Get logged-in user profile              | Authenticated users |
| PATCH  | `/user/update-password` | Update own password                     | Authenticated users |
| PATCH  | `/user/:id`             | Update own basic info                   | Authenticated users |
| PATCH  | `/user/admin/:id`       | Update role / status / verification / wallet info         | Admin / Super Admin |
| GET    | `/user/all-users`       | Get all users                           | Admin / Super Admin |
| GET    | `/user/:id`             | Get single user                         | Admin / Super Admin |
| GET    | `/user/search/:phoneNo` | Search user by phone number             | Authenticated       |
| DELETE | `/user/:id`             | Delete user                             | Admin / Super Admin |

---

## 👛 Wallet Routes

| Method | Endpoint                   | Description                | Access               |
| ------ | -------------------------- | -------------------------- | -------------------- |
| GET    | `/wallet/:id`              | Get own wallet             | User / Agent / Admin |
| GET    | `/wallet/wallet-id/:phone` | Get wallet by phone number | Authenticated        |
| GET    | `/wallet/`                 | Get all wallets            | Admin / Super Admin  |
| PATCH  | `/wallet/:id`              | Update wallet (balance)    | Admin / Super Admin  |

---

## 🔁 Transaction Routes

| Method | Endpoint                             | Description                       | Access               |
| ------ | ------------------------------------ | --------------------------------- | -------------------- |
| GET    | `/transaction/`                      | Get all transactions              | User / Agent / Admin |
| GET    | `/transaction/:id`                   | Get transaction by ID             | User / Agent / Admin |
| GET    | `/transaction/summary`               | Get agent summary            | User / Agent         |
| GET    | `/transaction/admin/summary`         | Get system summary                | Admin / Super Admin  |
| POST   | `/transaction/send-money`            | Send money between same roles     | User / Agent         |
| POST   | `/transaction/cash-in`               | Agent cash-in to user             | Agent                |
| POST   | `/transaction/withdraw`              | Withdraw from wallet              | User                 |
| POST   | `/transaction/add-money`             | Initiate add money via SSLCommerz | User / Agent         |
| POST   | `/transaction/add-money-confirm/:id` | Confirm add money                 | Agent                |
| POST   | `/transaction/refund/:id`            | Refund transaction                | Admin / Super Admin  |
| POST   | `/transaction/add-money/success`     | Payment success callback          | Public               |
| POST   | `/transaction/add-money/fail`        | Payment fail callback             | Public               |

---

## 💰 Fees Module

### 📘 Description

Handles transaction-based fee deductions and records each charge applied to specific transactions.

### 💡 Key Points

* Fee rate defined globally: `feesRate = 0.015` (1.5%)
* Each transaction automatically triggers a fee record
* Fees stored separately for system analytics

### 📂 Files

```
src/app/modules/fees/
├── fees.constant.ts
├── fees.interface.ts
└── fees.model.ts
```

### 🧩 Model

```typescript
interface IFees {
  transactionId: ObjectId;
  amount: number; // calculated as amount * 0.015
}
```

---

## 🧱 Models Summary

### **User**

```typescript
{
  name: string;
  email: string;
  phoneNo: string;
  address: string;
  password: string;
  nidNo: string;
  role: 'USER' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';
  isVerified: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'DELETE';
  walletId: ObjectId;
}
```

### **Wallet**

```typescript
{
  balance: number;
  walletId: string;
  userId: ObjectId;
  transactionId: ObjectId[];
}
```

### **Transaction**

```typescript
{
  from: string;
  to: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  type: 'SEND_MONEY' | 'ADD_MONEY' | 'WITHDRAW' | 'CASH_IN' | 'REFUND';
}
```

### **Fees**

```typescript
{
  transactionId: ObjectId;
  amount: number; // system fee per transaction
}
```

---

## 🧰 Tech Stack

* **Framework:** Express.js + TypeScript
* **Database:** MongoDB (Mongoose)
* **Auth:** JWT with cookies
* **Validation:** Zod
* **Email:** Nodemailer (Gmail App Password)
* **Payment Gateway:** SSLCommerz
* **Deployment:** Vercel

---

## 🧑‍💻 Super Admin Seeding

Automatically creates a **super admin** account from `.env` credentials on startup.

---

## 🧪 Linting

```bash
npm run lint
```

---

## 📫 Author

**👨‍💻 Saleheen Uddin Sakin**
🔗 [GitHub](https://github.com/sakincse21) | [LinkedIn](https://www.linkedin.com/in/saleheen-sakin/)

---