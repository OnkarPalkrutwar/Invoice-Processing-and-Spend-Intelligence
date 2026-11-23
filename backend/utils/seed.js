const mongoose = require('mongoose');
const env = require('../config/env');
const Company = require('../models/Company');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const Approval = require('../models/Approval');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const InvoiceActivityLog = require('../models/InvoiceActivityLog');
const { roundToTwo } = require('./currencyUtils');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB at:', env.mongoUri);
    await mongoose.connect(env.mongoUri);

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      Company.deleteMany({}),
      User.deleteMany({}),
      Vendor.deleteMany({}),
      Invoice.deleteMany({}),
      InvoiceLineItem.deleteMany({}),
      Approval.deleteMany({}),
      Payment.deleteMany({}),
      Notification.deleteMany({}),
      InvoiceActivityLog.deleteMany({}),
    ]);

    // 1. Create Company
    const company = await Company.create({
      name: 'Apex Innovations Technologies Pvt Ltd',
      address: 'Prestige Tech Park, Outer Ring Road, Bengaluru, Karnataka 560103',
      gstin: '29AAACA1234A1Z5',
      phone: '+91 80 4123 4567',
      email: 'finance@apex-innovations.in',
      defaultCurrency: 'INR',
      financialYearStart: '04-01',
    });

    console.log(`[Seed] Company created: ${company.name} (${company._id})`);

    // 2. Create Users (Admin, Finance Manager, Employee)
    const adminUser = await User.create({
      name: 'Arjun Verma',
      email: 'admin@invoscan.com',
      password: 'admin123',
      role: 'ADMIN',
      companyId: company._id,
      profilePicture: '',
    });

    const financeUser = await User.create({
      name: 'Pooja Sharma',
      email: 'finance@invoscan.com',
      password: 'finance123',
      role: 'FINANCE_MANAGER',
      companyId: company._id,
      profilePicture: '',
    });

    const employeeUser = await User.create({
      name: 'Rohan Deshmukh',
      email: 'employee@invoscan.com',
      password: 'employee123',
      role: 'EMPLOYEE',
      companyId: company._id,
      profilePicture: '',
    });

    console.log('[Seed] Demo users created: admin@invoscan.com, finance@invoscan.com, employee@invoscan.com');

    // 3. Create 10 Vendors
    const vendorTemplates = [
      {
        name: 'Amazon Web Services India',
        email: 'billing@aws.amazon.in',
        phone: '+91 80 4000 1100',
        address: 'BKC, Bandra East, Mumbai, Maharashtra 400051',
        gstin: '27AABCA4567B1Z2',
        category: 'Software',
      },
      {
        name: 'Infosys BPM Limited',
        email: 'accounts@infosys.com',
        phone: '+91 80 2852 0261',
        address: 'Electronics City, Hosur Road, Bengaluru, Karnataka 560100',
        gstin: '29AABCI1234A1Z1',
        category: 'Services',
      },
      {
        name: 'Tata Consultancy Services',
        email: 'vendor-desk@tcs.com',
        phone: '+91 22 6778 9999',
        address: 'TCS House, Raveline Street, Fort, Mumbai 400001',
        gstin: '27AAACT1234D1Z4',
        category: 'Services',
      },
      {
        name: 'Reliance Jio Infocomm Ltd',
        email: 'enterprise@jio.com',
        phone: '+91 22 4477 0000',
        address: 'Reliance Corporate Park, Thane-Belapur Road, Navi Mumbai 400701',
        gstin: '27AAACR1234C1Z3',
        category: 'Utilities',
      },
      {
        name: 'Flipkart India Pvt Ltd',
        email: 'b2b-billing@flipkart.com',
        phone: '+91 80 4940 0000',
        address: 'Buildings Alyssa, Embassy Tech Village, Bengaluru 560103',
        gstin: '29AAACF5678E1Z5',
        category: 'Office Supplies',
      },
      {
        name: 'Wipro Enterprises Ltd',
        email: 'hardware-sales@wipro.com',
        phone: '+91 80 2844 0011',
        address: 'Sarjapur Road, Doddakannelli, Bengaluru 560035',
        gstin: '29AAACW9012F1Z6',
        category: 'Hardware',
      },
      {
        name: 'MakeMyTrip India Pvt Ltd',
        email: 'corporate-travel@makemytrip.com',
        phone: '+91 124 462 8747',
        address: 'DLF Cyber City, Building 5, Gurugram, Haryana 122002',
        gstin: '07AAACM3456G1Z7',
        category: 'Travel',
      },
      {
        name: 'Ogilvy & Mather India',
        email: 'finance@ogilvy.co.in',
        phone: '+91 22 4434 4000',
        address: 'Commerz II, International Business Park, Goregaon East, Mumbai 400063',
        gstin: '27AAAC07890H1Z8',
        category: 'Marketing',
      },
      {
        name: 'Godrej & Boyce Mfg Co Ltd',
        email: 'interio-b2b@godrej.com',
        phone: '+91 22 6796 5656',
        address: 'Pirojshanagar, Vikhroli, Mumbai, Maharashtra 400079',
        gstin: '27AAACG1122I1Z9',
        category: 'Office Supplies',
      },
      {
        name: 'Blue Dart Express Limited',
        email: 'customersupport@bluedart.com',
        phone: '+91 22 2839 6444',
        address: 'Sahar Airport Road, Andheri East, Mumbai 400099',
        gstin: '27AAACB3344J1Z0',
        category: 'Other',
      },
    ];

    const vendors = [];
    for (const vData of vendorTemplates) {
      const v = await Vendor.create({
        companyId: company._id,
        ...vData,
        status: 'ACTIVE',
      });
      vendors.push(v);
    }
    console.log(`[Seed] ${vendors.length} Vendors created.`);

    // 4. Generate 34 Realistic Invoices across 8 months
    const categories = ['Software', 'Office Supplies', 'Hardware', 'Travel', 'Utilities', 'Marketing', 'Services', 'Other'];
    const now = new Date();

    const sampleInvoicesData = [
      // Month -7 to -1 (Historic Paid / Approved)
      { vIdx: 0, cat: 'Software', base: 45000, desc: 'AWS EC2 & S3 Cloud Hosting Infrastructure', daysAgo: 210, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 1, cat: 'Services', base: 120000, desc: 'Enterprise Business Process Consulting & Staff Augmentation', daysAgo: 200, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 2, cat: 'Services', base: 95000, desc: 'Quarterly Security Audit & Penetration Testing', daysAgo: 185, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 3, cat: 'Utilities', base: 18500, desc: 'High-speed Leased Line Fiber Connectivity (Primary Node)', daysAgo: 175, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 4, cat: 'Office Supplies', base: 28400, desc: 'Ergonomic Keyboards, Monitors Accessories & Stationery', daysAgo: 160, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 5, cat: 'Hardware', base: 245000, desc: 'Dell PowerEdge R750 Server & Cisco Catalyst Switch', daysAgo: 150, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 6, cat: 'Travel', base: 42000, desc: 'Executive Flights & Accommodation for Tech Summit Bengaluru-Delhi', daysAgo: 140, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 7, cat: 'Marketing', base: 85000, desc: 'Q2 Performance Marketing Campaign & Digital Media Buy', daysAgo: 130, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 0, cat: 'Software', base: 48000, desc: 'AWS Aurora RDS Multi-AZ Database Hosting & EKS cluster', daysAgo: 120, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 8, cat: 'Office Supplies', base: 64000, desc: 'Executive Conference Room Chairs & Acoustic Partitions', daysAgo: 110, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 9, cat: 'Other', base: 12500, desc: 'Express Courier & Hardware Dispatch Services across India', daysAgo: 100, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 1, cat: 'Services', base: 135000, desc: 'Full-stack Engineering Contractors Milestone 2', daysAgo: 95, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 2, cat: 'Services', base: 78000, desc: 'Cloud Migration Architectural Review & Devops Pipeline', daysAgo: 90, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 3, cat: 'Utilities', base: 18500, desc: 'Leased Line Monthly Recurring Fiber Bill', daysAgo: 85, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 0, cat: 'Software', base: 52000, desc: 'AWS Cloud Front CDN & Data Transfer Out Enterprise', daysAgo: 75, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 7, cat: 'Marketing', base: 110000, desc: 'Product Launch PR Campaign & Video Production', daysAgo: 70, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 6, cat: 'Travel', base: 56000, desc: 'Client Onsite Roadshow Travel (Mumbai, Pune, Hyderabad)', daysAgo: 60, approval: 'APPROVED', payment: 'PAID' },
      { vIdx: 5, cat: 'Hardware', base: 180000, desc: 'MacBook Pro M3 Max Laptops (2 Units) for Dev Leads', daysAgo: 50, approval: 'APPROVED', payment: 'PAID' },

      // Recent 30 Days (Mix of Paid, Partially Paid, Overdue, Pending Approval, Under Review, Rejected)
      { vIdx: 0, cat: 'Software', base: 56000, desc: 'AWS Monthly Cloud Services Infrastructure (Current Month)', daysAgo: 28, approval: 'APPROVED', payment: 'PARTIALLY_PAID', partialPaid: 30000 },
      { vIdx: 1, cat: 'Services', base: 140000, desc: 'Agile Team Augmentation Q4 Milestone 1', daysAgo: 25, approval: 'APPROVED', payment: 'OVERDUE', dueOffset: -5 },
      { vIdx: 2, cat: 'Services', base: 88000, desc: 'API Security & Vulnerability Assessment', daysAgo: 22, approval: 'APPROVED', payment: 'OVERDUE', dueOffset: -2 },
      { vIdx: 3, cat: 'Utilities', base: 18500, desc: 'Internet Leased Line High Availability Dual Ring', daysAgo: 20, approval: 'APPROVED', payment: 'UNPAID', dueOffset: 10 },
      { vIdx: 4, cat: 'Office Supplies', base: 31500, desc: 'Office Ergonomic Equipment, Standing Desks Supplies', daysAgo: 16, approval: 'APPROVED', payment: 'PARTIALLY_PAID', partialPaid: 15000, dueOffset: 14 },
      { vIdx: 7, cat: 'Marketing', base: 125000, desc: 'Google Search Ads & LinkedIn Sponsored Content Campaign', daysAgo: 14, approval: 'PENDING_APPROVAL', payment: 'UNPAID', dueOffset: 16 },
      { vIdx: 5, cat: 'Hardware', base: 310000, desc: 'High Performance AI Inference Workstations with Nvidia RTX', daysAgo: 12, approval: 'PENDING_APPROVAL', payment: 'UNPAID', dueOffset: 18 },
      { vIdx: 6, cat: 'Travel', base: 38000, desc: 'Domestic Flights & Hotel Bookings for Sales Team', daysAgo: 9, approval: 'UNDER_REVIEW', payment: 'UNPAID', dueOffset: 21 },
      { vIdx: 0, cat: 'Software', base: 165000, desc: 'Annual GitHub Enterprise & JetBrains Team Subscriptions', daysAgo: 8, approval: 'PENDING_APPROVAL', payment: 'UNPAID', dueOffset: 22 },
      { vIdx: 8, cat: 'Office Supplies', base: 45000, desc: 'Cafeteria & Workstation Furniture Refresh', daysAgo: 6, approval: 'UNDER_REVIEW', payment: 'UNPAID', dueOffset: 24 },
      { vIdx: 9, cat: 'Other', base: 14800, desc: 'Heavy Freight Courier Transport of Network Equipment', daysAgo: 5, approval: 'APPROVED', payment: 'UNPAID', dueOffset: 25 },
      { vIdx: 1, cat: 'Services', base: 92000, desc: 'UI/UX Design Sprint Deliverables for Mobile Platform', daysAgo: 4, approval: 'REJECTED', payment: 'UNPAID', dueOffset: 26, rejectionReason: 'Timesheets do not match agreed Statement of Work hours. Please resubmit revised invoice.' },
      { vIdx: 2, cat: 'Services', base: 115000, desc: 'Data Pipeline Engineering & MongoDB Performance Tuning', daysAgo: 3, approval: 'PENDING_APPROVAL', payment: 'UNPAID', dueOffset: 27 },
      { vIdx: 4, cat: 'Office Supplies', base: 19500, desc: 'Printing Supplies, High Yield Toner Cartridges & Stationery', daysAgo: 2, approval: 'UNDER_REVIEW', payment: 'UNPAID', dueOffset: 28 },
      { vIdx: 3, cat: 'Utilities', base: 18500, desc: 'Office High Speed Internet Leased Line Provisioning', daysAgo: 1, approval: 'UPLOADED', payment: 'UNPAID', dueOffset: 29 },
      { vIdx: 0, cat: 'Software', base: 45000, desc: 'AWS Support Business Plan Tier Subscription', daysAgo: 0, approval: 'UPLOADED', payment: 'UNPAID', dueOffset: 30 },
    ];

    console.log(`[Seed] Generating ${sampleInvoicesData.length} itemized invoices...`);

    let invCounter = 1001;
    for (const item of sampleInvoicesData) {
      const vendor = vendors[item.vIdx];
      const invDate = new Date(now);
      invDate.setDate(invDate.getDate() - item.daysAgo);

      const dueDate = new Date(invDate);
      if (item.dueOffset !== undefined) {
        dueDate.setDate(now.getDate() + item.dueOffset);
      } else {
        dueDate.setDate(dueDate.getDate() + 30);
      }

      const subtotal = roundToTwo(item.base);
      const taxRate = 18;
      const taxAmount = roundToTwo((subtotal * taxRate) / 100);
      const totalAmount = roundToTwo(subtotal + taxAmount);
      const isInterState = vendor.gstin.substring(0, 2) !== company.gstin.substring(0, 2);

      const cgst = isInterState ? 0 : roundToTwo(taxAmount / 2);
      const sgst = isInterState ? 0 : roundToTwo(taxAmount / 2);
      const igst = isInterState ? taxAmount : 0;

      let paidAmount = 0;
      if (item.payment === 'PAID') {
        paidAmount = totalAmount;
      } else if (item.payment === 'PARTIALLY_PAID') {
        paidAmount = roundToTwo(item.partialPaid || totalAmount / 2);
      }
      const remainingAmount = roundToTwo(totalAmount - paidAmount);

      const invoiceNumber = `INV-2026-${invCounter++}`;

      const invoice = await Invoice.create({
        companyId: company._id,
        vendorId: vendor._id,
        vendorName: vendor.name,
        invoiceNumber,
        invoiceDate: invDate,
        dueDate: dueDate,
        category: item.cat,
        poNumber: `PO-APX-${invCounter - 1000}`,
        subtotal,
        discount: 0,
        taxPercentage: taxRate,
        taxAmount,
        cgst,
        sgst,
        igst,
        totalAmount,
        paidAmount,
        remainingAmount,
        currency: 'INR',
        approvalStatus: item.approval,
        paymentStatus: item.payment,
        submittedBy: employeeUser._id,
        approvedBy: item.approval === 'APPROVED' ? financeUser._id : null,
        approvedAt: item.approval === 'APPROVED' ? invDate : null,
        rejectionReason: item.rejectionReason || '',
        ocrConfidence: 0.94,
        notes: `Enterprise procurement for ${item.cat}`,
        originalDocumentUrl: '/uploads/sample_aws_invoice.pdf',
        originalDocumentName: 'sample_aws_invoice.pdf',
      });

      // Line item
      await InvoiceLineItem.create({
        invoiceId: invoice._id,
        description: item.desc,
        quantity: 1,
        unitPrice: subtotal,
        total: subtotal,
        hsnCode: '998313',
        taxRate: 18,
      });

      // Activity logs
      await InvoiceActivityLog.create({
        invoiceId: invoice._id,
        companyId: company._id,
        userId: employeeUser._id,
        userName: employeeUser.name,
        action: 'UPLOADED',
        details: { filename: `${invoiceNumber}.pdf` },
      });

      if (item.approval === 'APPROVED') {
        await Approval.create({
          invoiceId: invoice._id,
          companyId: company._id,
          reviewerId: financeUser._id,
          reviewerName: financeUser.name,
          reviewerRole: financeUser.role,
          action: 'APPROVED',
          comments: 'Verified against PO and budget.',
        });
        await InvoiceActivityLog.create({
          invoiceId: invoice._id,
          companyId: company._id,
          userId: financeUser._id,
          userName: financeUser.name,
          action: 'APPROVED',
          details: { comments: 'Verified against PO and budget.' },
        });
      } else if (item.approval === 'REJECTED') {
        await Approval.create({
          invoiceId: invoice._id,
          companyId: company._id,
          reviewerId: adminUser._id,
          reviewerName: adminUser.name,
          reviewerRole: adminUser.role,
          action: 'REJECTED',
          comments: item.rejectionReason,
        });
      }

      // Payments
      if (paidAmount > 0) {
        await Payment.create({
          invoiceId: invoice._id,
          companyId: company._id,
          recordedBy: financeUser._id,
          amount: paidAmount,
          paymentMethod: 'NEFT',
          transactionReference: `NEFT${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          paymentDate: new Date(invDate.getTime() + 10 * 24 * 60 * 60 * 1000),
          notes: item.payment === 'PAID' ? 'Full settlement via corporate banking.' : 'Part payment against milestone 1.',
        });
      }
    }

    // 5. Recalculate all Vendor totals
    console.log('[Seed] Updating vendor balances...');
    for (const v of vendors) {
      const stats = await Invoice.aggregate([
        { $match: { vendorId: v._id, companyId: company._id } },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalSpent: { $sum: '$paidAmount' },
            totalOutstanding: { $sum: '$remainingAmount' },
          },
        },
      ]);
      const res = stats[0] || { totalInvoices: 0, totalSpent: 0, totalOutstanding: 0 };
      await Vendor.findByIdAndUpdate(v._id, {
        totalInvoices: res.totalInvoices,
        totalSpent: roundToTwo(res.totalSpent),
        totalOutstanding: roundToTwo(res.totalOutstanding),
      });
    }

    // 6. Create realistic notifications
    console.log('[Seed] Generating notification alerts...');
    const notificationList = [
      {
        type: 'INVOICE_UPLOADED',
        title: 'New Invoice Uploaded',
        message: 'AWS Cloud Services invoice #INV-2026-1034 uploaded and processed by OCR.',
        link: '/invoices',
      },
      {
        type: 'REQUIRES_REVIEW',
        title: 'High Value Approval Needed',
        message: 'Hardware invoice for AI Workstations (₹3,65,800) is awaiting financial approval.',
        link: '/approvals',
      },
      {
        type: 'PAYMENT_OVERDUE',
        title: 'Overdue Payment Alert',
        message: 'Invoice #INV-2026-1020 from Infosys BPM Ltd is overdue by 5 days.',
        link: '/invoices',
      },
      {
        type: 'DUPLICATE_DETECTED',
        title: 'Fuzzy Duplicate Flagged',
        message: 'Similar recurring amount detected for Reliance Jio Infocomm Ltd.',
        link: '/invoices',
      },
      {
        type: 'ANOMALY_DETECTED',
        title: 'Spending Spike Flagged',
        message: 'Hardware workstation spend exceeds vendor quarterly average by 2.1x.',
        link: '/spend-intelligence',
      },
    ];

    for (const n of notificationList) {
      await Notification.create({
        companyId: company._id,
        ...n,
        read: false,
      });
    }

    console.log('\n===============================================================');
    console.log('  SEEDING COMPLETED SUCCESSFULLY!                              ');
    console.log('===============================================================');
    console.log('  Demo Company: Apex Innovations Technologies Pvt Ltd          ');
    console.log('  Admin Login:   admin@invoscan.com    / admin123              ');
    console.log('  Finance Login: finance@invoscan.com  / finance123            ');
    console.log('  Employee Login:employee@invoscan.com / employee123           ');
    console.log(`  Vendors:       ${vendors.length} vendors                      `);
    console.log(`  Invoices:      ${sampleInvoicesData.length} realistic invoices`);
    console.log('===============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
