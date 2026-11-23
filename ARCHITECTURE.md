# InvoScan Project Architecture & Directory Structure

InvoScan follows a standard, modular, enterprise-grade architecture. Each component is separated into dedicated folders for **Routes**, **Controllers**, **Services**, **Models**, and **Middleware**, making the codebase intuitive to navigate and maintain.

---

## 1. High-Level Workspace Structure

```text
Invoice Processing and Spend Intelligence/
├── backend/                  # Node.js + Express REST API Server
├── frontend/                 # React 18 + Vite Web Application
├── ocr-service/              # Python FastAPI + PyMuPDF Extraction Engine
├── package.json              # Root workspace orchestrator scripts
├── ARCHITECTURE.md           # Architecture & folder organization guide
└── README.md                 # Project overview & execution instructions
```

---

## 2. Backend Architecture (`/backend`)

The backend follows the classic **3-Tier Controller-Service-Repository/Model** pattern:

```text
backend/
├── routes/                   # Endpoint definitions & URL routing
│   ├── authRoutes.js         # /api/auth (login, register, me)
│   ├── invoiceRoutes.js      # /api/invoices (CRUD, upload, stream)
│   ├── approvalRoutes.js     # /api/approvals (queue, approve, reject)
│   ├── paymentRoutes.js      # /api/payments (settlements, ledger)
│   ├── vendorRoutes.js       # /api/vendors (vendor profiles, list)
│   ├── dashboardRoutes.js    # /api/dashboard (KPIs, monthly charts)
│   ├── analyticsRoutes.js    # /api/analytics (spend intelligence, anomalies)
│   ├── reportRoutes.js       # /api/reports (PDF, Excel, CSV exports)
│   ├── notificationRoutes.js # /api/notifications (alerts, mark read)
│   └── settingsRoutes.js     # /api/settings (company profile, tax)
│
├── controllers/              # HTTP Request handlers & response formatting
│   ├── authController.js
│   ├── invoiceController.js
│   ├── approvalController.js
│   ├── paymentController.js
│   ├── vendorController.js
│   ├── dashboardController.js
│   ├── analyticsController.js
│   ├── reportController.js
│   └── notificationController.js
│
├── services/                 # Pure business logic & microservice integrations
│   ├── invoiceService.js     # Invoice calculations, detail joins, activity audit logs
│   ├── ocrService.js         # Multi-part bridge to Python FastAPI OCR microservice
│   ├── validationService.js  # GST validation, math reconciliation, date rules
│   ├── duplicateDetectionService.js # Duplicate invoice and amount matching engine
│   ├── paymentService.js     # Payment allocation, balance updates, status transitions
│   ├── analyticsService.js   # MongoDB aggregation pipelines for spend KPIs
│   ├── reportService.js      # PDFKit, ExcelJS (.xlsx), and CSV stream generators
│   ├── notificationService.js# In-app notifications dispatcher
│   ├── vendorService.js      # Supplier ledger and spending analytics
│   ├── authService.js        # JWT generation and credential verification
│   └── approvalService.js    # Multi-tier approval workflow management
│
├── models/                   # Mongoose data schemas & database persistence
│   ├── Company.js            # Tenant organization & GST profile
│   ├── User.js               # User accounts (Admin, Finance Manager, Employee)
│   ├── Vendor.js             # Supplier entities & GSTIN profiles
│   ├── Invoice.js            # Core invoice record & financial metadata
│   ├── InvoiceLineItem.js    # Individual itemized product/service lines
│   ├── InvoiceDocument.js    # File storage references & MIME metadata
│   ├── Approval.js           # Multi-tier approval actions
│   ├── Payment.js            # Payment transaction receipts & methods
│   ├── Notification.js       # User notification queue
│   ├── InvoiceActivityLog.js # Immutable audit trail
│   └── AuditLog.js           # General security log
│
├── middleware/               # Express request interceptors
│   ├── authMiddleware.js     # JWT token verification
│   ├── roleMiddleware.js     # Role-based access control (RBAC)
│   ├── uploadMiddleware.js   # Multer file upload handler
│   ├── validationMiddleware.js # Express-validator result parser
│   └── errorMiddleware.js    # Global 404 & error handlers
│
├── validators/               # Input validation schema definitions
│   ├── authValidator.js
│   ├── invoiceValidator.js
│   └── vendorValidator.js
│
├── config/                   # Configuration & environment variables
│   ├── env.js                # Environment variables loader
│   ├── database.js           # MongoDB connection bootstrap
│   └── cors.js               # CORS origins policy
│
├── tests/                    # Automated test suites
│   └── integration.test.js   # End-to-end integration tests (node --test)
│
├── utils/                    # Utility scripts & helpers
│   ├── seed.js               # Realistic Indian GST database seeder
│   ├── currencyUtils.js      # Monospace 2-decimal financial math
│   ├── dateUtils.js          # Date formatting & period comparisons
│   └── response.js           # Standardized JSON response envelope
│
├── uploads/                  # Secure document disk storage for PDFs/images
├── app.js                    # Express application bootstrap & middleware chain
├── server.js                 # HTTP listener & process startup
├── package.json              # Node dependencies & npm scripts
└── .env                      # Local environment secrets
```

### Data Flow Pattern

```text
HTTP Request
     │
     ▼
[routes/] ──► [middleware/] (Auth & Role Check)
     │
     ▼
[controllers/] (Extracts inputs & sends HTTP responses)
     │
     ▼
[services/] (Executes business logic, validation, OCR, & computations)
     │
     ▼
[models/] (Mongoose Schemas interact with MongoDB)
```

---

## 3. Frontend Architecture (`/frontend`)

The frontend is built with React 18 and Vite, organized by functional responsibility:

```text
frontend/src/
├── routes/                   # Dedicated routing configuration
│   ├── AppRoutes.jsx         # All URL route mappings (<Routes> & <Route>)
│   ├── ProtectedRoute.jsx    # Role-based authentication guard
│   ├── PublicRoute.jsx       # Public-only route redirector
│   └── index.js              # Routing exports
│
├── components/               # Modular UI components
│   ├── common/               # Reusable UI primitives (Badges, Modals, Spinners, SearchBar, Pagination)
│   ├── dashboard/            # Executive AP charts, StatCards, and Recent Invoices table
│   └── layout/               # Shell layout, Sidebar, and Navbar
│
├── pages/                    # Route-level view components
│   ├── Login.jsx             # Sign-in with 1-click test personas
│   ├── Register.jsx          # Organization registration
│   ├── Dashboard.jsx         # Accounts payable executive overview
│   ├── InvoiceList.jsx       # Multi-tab invoice directory & filter bar
│   ├── InvoiceUpload.jsx     # Document ingestion & OCR line-item review
│   ├── InvoiceDetails.jsx    # Split-view document viewer & audit timeline
│   ├── InvoiceEdit.jsx       # Invoice editor & line item modifier
│   ├── Approvals.jsx         # Manager approval queue & decision modals
│   ├── Vendors.jsx           # Supplier directory & GST status
│   ├── VendorDetails.jsx     # Vendor ledger & spend run-rates
│   ├── SpendAnalytics.jsx    # Spend intelligence, category spend & ITC reconciliation
│   ├── Reports.jsx           # PDF, Excel, and CSV export workbench
│   ├── Notifications.jsx     # Notification center
│   ├── Settings.jsx          # Company & organization configuration
│   └── NotFound.jsx          # 404 fallback page
│
├── services/                 # Frontend API client modules (Axios)
│   ├── api.js                # Base axios instance with JWT interceptors
│   ├── authService.js        # Authentication API calls
│   ├── invoiceService.js     # Invoices & document upload API calls
│   ├── approvalService.js    # Approvals API calls
│   ├── paymentService.js     # Payment transactions API calls
│   ├── vendorService.js      # Vendor directory API calls
│   ├── analyticsService.js   # Spend intelligence API calls
│   ├── reportService.js      # Report download endpoints (PDF/Excel/CSV)
│   └── notificationService.js# Notifications API calls
│
├── context/                  # Application state providers
│   └── AuthContext.jsx       # Global user session & permissions context
│
├── utils/                    # Frontend helpers & formatting
│   └── formatters.js         # Indian Rupee currency formatters, date formatters, & badges
│
├── App.jsx                   # Application root rendering <AppRoutes />
├── main.jsx                  # React DOM mount point & AuthProvider wrapper
└── index.css                 # Tailwind CSS tokens & enterprise styling
```

---

## 4. OCR Microservice Architecture (`/ocr-service`)

The OCR service is a modular Python microservice powered by FastAPI, PyMuPDF, and Tesseract:

```text
ocr-service/
├── routes/                   # FastAPI endpoint routes
│   └── ocr_routes.py         # POST /extract, GET /health
│
├── services/                 # Document parsing & table extraction services
│   └── extractor_service.py  # PyMuPDF table finder, regular expressions, and heuristics
│
├── main.py                   # FastAPI server entry point
├── extractor.py              # Backward-compatible service wrapper
└── requirements.txt          # Python dependencies (fastapi, uvicorn, pymupdf, pytesseract)
```
