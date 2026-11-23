# Deployment Guide: Vercel (Frontend) + Render (Backend & OCR) + MongoDB Atlas

This guide provides step-by-step instructions for deploying the **Invoice Processing and Spend Intelligence** application completely on free-tier cloud platforms.

```
┌─────────────────────────────────┐
│     User Web Browser            │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│        Vercel (Free)            │  React Single-Page Application
│   https://<app>.vercel.app      │  (Global CDN, Instant SSL)
└───────────────┬─────────────────┘
                │ API Requests (REST / CORS)
                ▼
┌─────────────────────────────────┐
│         Render (Free)           │  Node.js Express REST API
│   https://<backend>.onrender.com│  (Authentication, Invoicing, Analytics)
└────────┬──────────────┬─────────┘
         │              │
         │ Internal     │ Persistent Storage
         ▼              ▼
┌─────────────────┐  ┌───────────────────────┐
│  Render (Free)  │  │  MongoDB Atlas (Free) │
│ Python OCR      │  │  Cloud Database       │
│ (Tesseract OCR) │  │  (M0 Cluster)         │
└─────────────────┘  └───────────────────────┘
```

---

## Step 1: Set Up MongoDB Atlas (Free Cloud Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and register for a free account.
2. Click **Create a Deployment** and choose the **M0 Free** shared cluster (AWS, any region near you).
3. Under **Security Quickstart**:
   - Create a database user (e.g., username: `invoscan_admin`, generate/enter a secure password). Save this password.
   - Under **Where would you like to connect from?**, choose **Network Access** -> **Allow Access from Anywhere** (`0.0.0.0/0`).
4. Click **Database** in the sidebar -> click **Connect** on your cluster -> select **Drivers** (Node.js).
5. Copy your connection string. It will look like:
   ```env
   mongodb+srv://invoscan_admin:<password>@cluster0.abcde.mongodb.net/invoice_spend_intelligence?retryWrites=true&w=majority
   ```
   *(Replace `<password>` with your actual database user password).*

---

## Step 2: Deploy Backend & OCR Service on Render

### Method A: 1-Click Render Blueprint (Recommended)

1. Go to [render.com](https://render.com) and log in with your GitHub account.
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Select your repository `Invoice-Processing-and-Spend-Intelligence`.
4. Render will detect the `render.yaml` file in the repo and prompt for the required environment variables:
   - `MONGODB_URI`: Paste your MongoDB Atlas connection string from Step 1.
   - `FRONTEND_URL`: Leave blank for now, or enter your Vercel URL once created.
5. Click **Apply**.
   - Render will build and launch **`invoscan-ocr`** (via Docker with Tesseract).
   - Render will build and launch **`invoscan-backend`** (Node.js API).
6. Once deployed, copy the **`invoscan-backend`** URL (e.g., `https://invoscan-backend.onrender.com`).

---

### Method B: Manual Setup on Render Dashboard

If you prefer setting up services individually:

#### 1. Deploy the OCR Service
1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Settings:
   - **Name**: `invoscan-ocr`
   - **Root Directory**: `ocr-service`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
4. Click **Create Web Service**. Wait for the build to finish, then copy its URL (e.g. `https://invoscan-ocr.onrender.com`).

#### 2. Deploy the Backend API
1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Settings:
   - **Name**: `invoscan-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `MONGODB_URI` = `<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET` = `<Any secure 32+ character random string>`
   - `OCR_SERVICE_URL` = `https://invoscan-ocr.onrender.com` (your OCR service URL)
   - `FRONTEND_URL` = `https://<your-vercel-app>.vercel.app` (or leave blank initially)
5. Click **Create Web Service**. Copy your backend URL (e.g. `https://invoscan-backend.onrender.com`).

---

## Step 3: Deploy the Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **Add New...** -> **Project**.
3. Select your repository `Invoice-Processing-and-Spend-Intelligence` and click **Import**.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://invoscan-backend.onrender.com` *(Replace with your Render backend URL)*
6. Click **Deploy**.
7. Vercel will build and deploy your app in ~30 seconds, giving you a live URL like `https://invoice-processing-spend-intelligence.vercel.app`.

---

## Step 4: Seed the Database with Demo Data

To populate your cloud MongoDB Atlas database with demo companies, invoices, and users (Admin, Finance Manager, Employee):

Open your local terminal in the `backend` folder and run:
```bash
# Set your MongoDB Atlas connection string and run the seeder:
MONGODB_URI="mongodb+srv://invoscan_admin:<password>@cluster0.abcde.mongodb.net/invoice_spend_intelligence?retryWrites=true&w=majority" npm run seed
```

### Pre-configured Demo Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@invoscan.com` | `admin123` |
| **Finance Manager** | `finance@invoscan.com` | `finance123` |
| **Employee** | `employee@invoscan.com` | `employee123` |

---

## Step 5: (Optional) Update FRONTEND_URL on Render

Once your Vercel deployment URL is ready (e.g., `https://invoice-processing-spend-intelligence.vercel.app`):
1. Go to your **`invoscan-backend`** service on Render.
2. Navigate to **Environment**.
3. Update `FRONTEND_URL` to your Vercel URL.
4. Render will automatically redeploy with the updated CORS configuration.
