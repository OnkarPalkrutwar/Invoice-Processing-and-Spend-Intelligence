const test = require('node:test');
const assert = require('node:assert');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_BASE = 'http://localhost:5000/api';
let adminToken = '';
let financeToken = '';
let employeeToken = '';
let uploadedInvoiceId = '';

test('1. Authentication: Login with demo credentials', async () => {
  // Admin Login
  const adminRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@invoscan.com',
    password: 'admin123',
  });
  assert.strictEqual(adminRes.status, 200);
  assert.strictEqual(adminRes.data.success, true);
  assert.strictEqual(adminRes.data.data.user.role, 'ADMIN');
  adminToken = adminRes.data.data.token;

  // Finance Manager Login
  const financeRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'finance@invoscan.com',
    password: 'finance123',
  });
  assert.strictEqual(financeRes.status, 200);
  assert.strictEqual(financeRes.data.data.user.role, 'FINANCE_MANAGER');
  financeToken = financeRes.data.data.token;

  // Employee Login
  const employeeRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'employee@invoscan.com',
    password: 'employee123',
  });
  assert.strictEqual(employeeRes.status, 200);
  assert.strictEqual(employeeRes.data.data.user.role, 'EMPLOYEE');
  employeeToken = employeeRes.data.data.token;
});

test('2. Dashboard: Summary KPIs and monthly spending metrics', async () => {
  const summaryRes = await axios.get(`${API_BASE}/dashboard/summary?period=30d`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(summaryRes.status, 200);
  assert.ok(summaryRes.data.data.kpis.totalInvoices.value > 0);
  assert.ok(summaryRes.data.data.kpis.totalSpending.value >= 0);

  const monthlyRes = await axios.get(`${API_BASE}/dashboard/monthly-spending?months=12`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(monthlyRes.status, 200);
  assert.ok(Array.isArray(monthlyRes.data.data));
  assert.ok(monthlyRes.data.data.length > 0);
});

test('3. Invoice OCR Upload: Upload real PDF through Multer to Python OCR service', async () => {
  const filePath = path.resolve(__dirname, '../uploads/sample_aws_invoice.pdf');
  assert.ok(fs.existsSync(filePath), 'Sample PDF must exist');

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const uploadRes = await axios.post(`${API_BASE}/invoices/upload`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.strictEqual(uploadRes.status, 201);
  assert.strictEqual(uploadRes.data.success, true);
  assert.ok(uploadRes.data.data.invoice._id);
  uploadedInvoiceId = uploadRes.data.data.invoice._id;

  // Verify extracted details
  const invoice = uploadRes.data.data.invoice;
  assert.ok(invoice.vendorName.includes('AMAZON') || invoice.vendorName.length > 0);
  assert.strictEqual(invoice.currency, 'INR');
  assert.strictEqual(invoice.approvalStatus, 'UNDER_REVIEW');
});

test('4. Duplicate Detection: Uploading duplicate invoice triggers warning', async () => {
  const filePath = path.resolve(__dirname, '../uploads/sample_aws_invoice.pdf');
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const duplicateRes = await axios.post(`${API_BASE}/invoices/upload`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert.strictEqual(duplicateRes.status, 201);
  // Duplicate warning flag should be true
  assert.strictEqual(duplicateRes.data.data.invoice.isDuplicateWarning, true);
  assert.ok(duplicateRes.data.data.invoice.duplicateReason.length > 0);
});

test('5. Approval Workflow: Employee cannot approve, Finance Manager can approve', async () => {
  // Employee should be rejected with 403 Forbidden
  try {
    await axios.post(
      `${API_BASE}/approvals/${uploadedInvoiceId}/approve`,
      { comments: 'Employee attempting unauthorized approval' },
      { headers: { Authorization: `Bearer ${employeeToken}` } }
    );
    assert.fail('Employee should not be authorized to approve');
  } catch (err) {
    assert.strictEqual(err.response.status, 403);
  }

  // Finance Manager approves
  const approveRes = await axios.post(
    `${API_BASE}/approvals/${uploadedInvoiceId}/approve`,
    { comments: 'Approved by finance manager after document verification' },
    { headers: { Authorization: `Bearer ${financeToken}` } }
  );
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveRes.data.data.invoice.approvalStatus, 'APPROVED');
});

test('6. Payment Tracking: Record partial payment and check balances', async () => {
  const payRes = await axios.post(
    `${API_BASE}/payments`,
    {
      invoiceId: uploadedInvoiceId,
      amount: 15000,
      paymentMethod: 'NEFT',
      transactionReference: 'NEFT9988776655',
      notes: 'Initial milestone payment',
    },
    { headers: { Authorization: `Bearer ${financeToken}` } }
  );

  assert.strictEqual(payRes.status, 201);
  assert.strictEqual(payRes.data.data.invoice.paidAmount, 15000);
  assert.strictEqual(payRes.data.data.invoice.paymentStatus, 'PARTIALLY_PAID');
  assert.ok(payRes.data.data.invoice.remainingAmount > 0);
});

test('7. Spend Intelligence: Verify category analysis and anomaly detection', async () => {
  const overviewRes = await axios.get(`${API_BASE}/analytics/overview?period=3m`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(overviewRes.status, 200);
  assert.ok(overviewRes.data.data.overview.totalExpenditure > 0);
  assert.ok(Array.isArray(overviewRes.data.data.categories));
  assert.ok(Array.isArray(overviewRes.data.data.insights));
  assert.ok(overviewRes.data.data.insights.length > 0);
});

test('8. Report Generation: Export CSV, Excel, and PDF downloads', async () => {
  // CSV Export
  const csvRes = await axios.get(`${API_BASE}/reports/export/csv`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(csvRes.status, 200);
  assert.ok(csvRes.data.includes('Invoice Number'));

  // Excel Export
  const excelRes = await axios.get(`${API_BASE}/reports/export/excel`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    responseType: 'arraybuffer',
  });
  assert.strictEqual(excelRes.status, 200);
  assert.ok(excelRes.data.byteLength > 100);

  // PDF Export
  const pdfRes = await axios.get(`${API_BASE}/reports/export/pdf`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    responseType: 'arraybuffer',
  });
  assert.strictEqual(pdfRes.status, 200);
  assert.ok(pdfRes.data.byteLength > 100);
});
