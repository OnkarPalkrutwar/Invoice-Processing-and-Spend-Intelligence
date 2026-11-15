const path = require('path');
const fs = require('fs');
const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const InvoiceDocument = require('../models/InvoiceDocument');
const Vendor = require('../models/Vendor');
const Approval = require('../models/Approval');
const Payment = require('../models/Payment');
const InvoiceActivityLog = require('../models/InvoiceActivityLog');
const ocrService = require('../services/ocrService');
const validationService = require('../services/validationService');
const duplicateDetectionService = require('../services/duplicateDetectionService');
const notificationService = require('../services/notificationService');
const paymentService = require('../services/paymentService');
const { roundToTwo } = require('../utils/currencyUtils');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

class InvoiceController {
  /**
   * Get all invoices with search, filters, pagination, sorting
   */
  async getInvoices(req, res, next) {
    try {
      const {
        search,
        approvalStatus,
        paymentStatus,
        category,
        vendorId,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page = 1,
        limit = 10,
        sortBy = 'invoiceDate',
        sortOrder = 'desc',
      } = req.query;

      const filter = { companyId: req.companyId };

      // Search across invoiceNumber and vendorName
      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [{ invoiceNumber: searchRegex }, { vendorName: searchRegex }];
      }

      if (approvalStatus && approvalStatus !== 'ALL') {
        filter.approvalStatus = approvalStatus;
      }

      if (paymentStatus && paymentStatus !== 'ALL') {
        filter.paymentStatus = paymentStatus;
      }

      if (category && category !== 'ALL') {
        filter.category = category;
      }

      if (vendorId) {
        filter.vendorId = vendorId;
      }

      if (startDate || endDate) {
        filter.invoiceDate = {};
        if (startDate) filter.invoiceDate.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.invoiceDate.$lte = end;
        }
      }

      if (minAmount || maxAmount) {
        filter.totalAmount = {};
        if (minAmount) filter.totalAmount.$gte = Number(minAmount);
        if (maxAmount) filter.totalAmount.$lte = Number(maxAmount);
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [invoices, total] = await Promise.all([
        Invoice.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .populate('vendorId', 'name gstin email')
          .populate('submittedBy', 'name email'),
        Invoice.countDocuments(filter),
      ]);

      return paginatedResponse(res, invoices, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single invoice by ID with line items, vendor details, and history
   */
  async getInvoiceById(req, res, next) {
    try {
      const invoice = await Invoice.findOne({
        _id: req.params.id,
        companyId: req.companyId,
      })
        .populate('vendorId')
        .populate('documentId')
        .populate('submittedBy', 'name email role')
        .populate('approvedBy', 'name email role');

      if (!invoice) {
        return errorResponse(res, 'Invoice not found.', 404);
      }

      const [lineItems, activityLogs, approvals, payments] = await Promise.all([
        InvoiceLineItem.find({ invoiceId: invoice._id }),
        InvoiceActivityLog.find({ invoiceId: invoice._id }).sort({ createdAt: -1 }),
        Approval.find({ invoiceId: invoice._id }).sort({ createdAt: -1 }),
        Payment.find({ invoiceId: invoice._id }).sort({ paymentDate: -1 }),
      ]);

      return successResponse(res, {
        invoice,
        lineItems,
        activityLogs,
        approvals,
        payments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create invoice manually or finalized after review
   */
  async createInvoice(req, res, next) {
    try {
      const {
        invoiceNumber,
        vendorName,
        vendorId,
        invoiceDate,
        dueDate,
        category = 'Services',
        poNumber,
        subtotal = 0,
        discount = 0,
        taxPercentage = 18,
        taxAmount = 0,
        cgst = 0,
        sgst = 0,
        igst = 0,
        totalAmount,
        currency = 'INR',
        notes = '',
        lineItems = [],
        documentId,
      } = req.body;

      // 1. Validation check
      const validation = validationService.validateInvoice({
        invoiceNumber,
        vendorName,
        invoiceDate,
        dueDate,
        totalAmount,
        subtotal,
        taxAmount,
        discount,
        lineItems,
      });

      // 2. Duplicate detection check
      const duplicateCheck = await duplicateDetectionService.checkDuplicate({
        companyId: req.companyId,
        vendorName,
        vendorId,
        invoiceNumber,
        totalAmount,
        invoiceDate,
      });

      // 3. Resolve or link vendor
      let resolvedVendorId = vendorId;
      if (!resolvedVendorId && vendorName) {
        let existingVendor = await Vendor.findOne({
          companyId: req.companyId,
          name: new RegExp(`^${vendorName.trim()}$`, 'i'),
        });
        if (!existingVendor) {
          existingVendor = await Vendor.create({
            companyId: req.companyId,
            name: vendorName.trim(),
            category,
          });
        }
        resolvedVendorId = existingVendor._id;
      }

      const invoice = await Invoice.create({
        companyId: req.companyId,
        vendorId: resolvedVendorId,
        vendorName: vendorName.trim(),
        invoiceNumber: invoiceNumber.trim().toUpperCase(),
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        category,
        poNumber: poNumber || '',
        subtotal: roundToTwo(Number(subtotal)),
        discount: roundToTwo(Number(discount)),
        taxPercentage: roundToTwo(Number(taxPercentage)),
        taxAmount: roundToTwo(Number(taxAmount)),
        cgst: roundToTwo(Number(cgst)),
        sgst: roundToTwo(Number(sgst)),
        igst: roundToTwo(Number(igst)),
        totalAmount: roundToTwo(Number(totalAmount)),
        remainingAmount: roundToTwo(Number(totalAmount)),
        currency,
        approvalStatus: 'PENDING_APPROVAL',
        paymentStatus: 'UNPAID',
        documentId: documentId || null,
        isDuplicateWarning: duplicateCheck.isDuplicate,
        duplicateReason: duplicateCheck.reason || '',
        validationErrors: validation.errors,
        submittedBy: req.user._id,
        notes,
      });

      // Save line items
      if (lineItems && lineItems.length > 0) {
        const itemsToInsert = lineItems.map((item) => ({
          invoiceId: invoice._id,
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unitPrice: roundToTwo(Number(item.unitPrice) || 0),
          total: roundToTwo(Number(item.total) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)),
          hsnCode: item.hsnCode || '',
          taxRate: Number(item.taxRate) || 18,
        }));
        await InvoiceLineItem.insertMany(itemsToInsert);
      }

      // Log activity
      await InvoiceActivityLog.create({
        invoiceId: invoice._id,
        companyId: req.companyId,
        userId: req.user._id,
        userName: req.user.name,
        action: 'REVIEWED',
        details: { message: 'Invoice details saved and submitted for approval.' },
      });

      // Notify finance team
      await notificationService.createNotification({
        companyId: req.companyId,
        type: 'REQUIRES_REVIEW',
        title: `Invoice Submitted: #${invoice.invoiceNumber}`,
        message: `${invoice.vendorName} invoice for ₹${invoice.totalAmount} submitted by ${req.user.name} requires review/approval.`,
        link: `/invoices/${invoice._id}`,
      });

      if (duplicateCheck.isDuplicate) {
        await notificationService.createNotification({
          companyId: req.companyId,
          type: 'DUPLICATE_DETECTED',
          title: `Duplicate Alert: #${invoice.invoiceNumber}`,
          message: duplicateCheck.reason,
          link: `/invoices/${invoice._id}`,
        });
      }

      return successResponse(res, invoice, 'Invoice created and submitted successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update / correct invoice fields
   */
  async updateInvoice(req, res, next) {
    try {
      const invoiceId = req.params.id;
      const invoice = await Invoice.findOne({ _id: invoiceId, companyId: req.companyId });
      if (!invoice) {
        return errorResponse(res, 'Invoice not found.', 404);
      }

      const {
        invoiceNumber,
        vendorName,
        invoiceDate,
        dueDate,
        category,
        poNumber,
        subtotal,
        discount,
        taxPercentage,
        taxAmount,
        cgst,
        sgst,
        igst,
        totalAmount,
        approvalStatus,
        paymentStatus,
        notes,
        lineItems,
      } = req.body;

      if (invoiceNumber) invoice.invoiceNumber = invoiceNumber.trim().toUpperCase();
      if (vendorName) invoice.vendorName = vendorName.trim();
      if (invoiceDate) invoice.invoiceDate = new Date(invoiceDate);
      if (dueDate) invoice.dueDate = new Date(dueDate);
      if (category) invoice.category = category;
      if (poNumber !== undefined) invoice.poNumber = poNumber;
      if (subtotal !== undefined) invoice.subtotal = roundToTwo(Number(subtotal));
      if (discount !== undefined) invoice.discount = roundToTwo(Number(discount));
      if (taxPercentage !== undefined) invoice.taxPercentage = roundToTwo(Number(taxPercentage));
      if (taxAmount !== undefined) invoice.taxAmount = roundToTwo(Number(taxAmount));
      if (cgst !== undefined) invoice.cgst = roundToTwo(Number(cgst));
      if (sgst !== undefined) invoice.sgst = roundToTwo(Number(sgst));
      if (igst !== undefined) invoice.igst = roundToTwo(Number(igst));
      if (totalAmount !== undefined) {
        invoice.totalAmount = roundToTwo(Number(totalAmount));
        invoice.remainingAmount = roundToTwo(Math.max(0, invoice.totalAmount - (invoice.paidAmount || 0)));
      }
      if (approvalStatus) invoice.approvalStatus = approvalStatus;
      if (paymentStatus) invoice.paymentStatus = paymentStatus;
      if (notes !== undefined) invoice.notes = notes;

      // Re-validate
      const validation = validationService.validateInvoice(invoice);
      invoice.validationErrors = validation.errors;

      // Re-check duplicates
      const duplicateCheck = await duplicateDetectionService.checkDuplicate({
        companyId: req.companyId,
        vendorName: invoice.vendorName,
        vendorId: invoice.vendorId,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        invoiceDate: invoice.invoiceDate,
        currentInvoiceId: invoice._id,
      });
      invoice.isDuplicateWarning = duplicateCheck.isDuplicate;
      if (duplicateCheck.isDuplicate) {
        invoice.duplicateReason = duplicateCheck.reason;
      }

      await invoice.save();

      // Replace line items if provided
      if (lineItems && Array.isArray(lineItems)) {
        await InvoiceLineItem.deleteMany({ invoiceId: invoice._id });
        if (lineItems.length > 0) {
          const itemsToInsert = lineItems.map((item) => ({
            invoiceId: invoice._id,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unitPrice: roundToTwo(Number(item.unitPrice) || 0),
            total: roundToTwo(Number(item.total) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)),
            hsnCode: item.hsnCode || '',
            taxRate: Number(item.taxRate) || 18,
          }));
          await InvoiceLineItem.insertMany(itemsToInsert);
        }
      }

      // Log edit activity
      await InvoiceActivityLog.create({
        invoiceId: invoice._id,
        companyId: req.companyId,
        userId: req.user._id,
        userName: req.user.name,
        action: 'EDITED',
        details: { message: 'Invoice updated and re-validated.' },
      });

      return successResponse(res, invoice, 'Invoice updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(req, res, next) {
    try {
      const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.companyId });
      if (!invoice) {
        return errorResponse(res, 'Invoice not found.', 404);
      }

      if (invoice.paymentStatus === 'PAID') {
        return errorResponse(res, 'Cannot delete an invoice that has already been fully paid.', 400);
      }

      const vendorId = invoice.vendorId;

      await Promise.all([
        Invoice.deleteOne({ _id: invoice._id }),
        InvoiceLineItem.deleteMany({ invoiceId: invoice._id }),
        InvoiceActivityLog.deleteMany({ invoiceId: invoice._id }),
        Approval.deleteMany({ invoiceId: invoice._id }),
        Payment.deleteMany({ invoiceId: invoice._id }),
      ]);

      if (vendorId) {
        await paymentService.updateVendorBalances(vendorId, req.companyId);
      }

      return successResponse(res, null, 'Invoice deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload invoice document & trigger Python OCR extraction
   */
  async uploadInvoice(req, res, next) {
    try {
      if (!req.file) {
        return errorResponse(res, 'No invoice file uploaded. Please upload a PDF, JPG, or PNG.', 400);
      }

      const file = req.file;
      const originalDocUrl = `/uploads/${file.filename}`;

      // 1. Save document metadata in MongoDB
      const docRecord = await InvoiceDocument.create({
        companyId: req.companyId,
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: originalDocUrl,
        uploadedBy: req.user._id,
      });

      // 2. Pass document to Python FastAPI OCR service
      console.log(`[Upload] Processing document #${docRecord._id} with Python OCR service`);
      const ocrResult = await ocrService.extractInvoiceData(file.path, file.originalname, file.mimetype);

      const ocrData = ocrResult.data || {};
      const vendorName = ocrData.vendorName || path.parse(file.originalname).name || 'Unknown Vendor';
      const invoiceNumber = ocrData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
      const invoiceDate = ocrData.invoiceDate ? new Date(ocrData.invoiceDate) : new Date();
      const dueDate = ocrData.dueDate
        ? new Date(ocrData.dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days default

      const subtotal = roundToTwo(Number(ocrData.subtotal) || 0);
      const taxAmount = roundToTwo(Number(ocrData.taxAmount) || 0);
      const totalAmount = roundToTwo(Number(ocrData.totalAmount) || (subtotal + taxAmount) || 0);
      const cgst = roundToTwo(Number(ocrData.cgst) || (taxAmount > 0 ? taxAmount / 2 : 0));
      const sgst = roundToTwo(Number(ocrData.sgst) || (taxAmount > 0 ? taxAmount / 2 : 0));
      const igst = roundToTwo(Number(ocrData.igst) || 0);

      // Check if vendor exists or create placeholder
      let vendor = await Vendor.findOne({
        companyId: req.companyId,
        name: new RegExp(`^${vendorName.trim()}$`, 'i'),
      });

      if (!vendor) {
        vendor = await Vendor.create({
          companyId: req.companyId,
          name: vendorName.trim(),
          email: ocrData.vendorEmail || '',
          phone: ocrData.vendorPhone || '',
          address: ocrData.vendorAddress || '',
          gstin: ocrData.gstin || '',
          category: 'Services',
        });
      }

      // Check duplicate
      const duplicateCheck = await duplicateDetectionService.checkDuplicate({
        companyId: req.companyId,
        vendorName,
        vendorId: vendor._id,
        invoiceNumber,
        totalAmount,
        invoiceDate,
      });

      // Validate
      const validation = validationService.validateInvoice({
        invoiceNumber,
        vendorName,
        invoiceDate,
        dueDate,
        totalAmount,
        subtotal,
        taxAmount,
        gstin: ocrData.gstin,
        lineItems: ocrData.lineItems,
      });

      // Create draft invoice in MongoDB
      const invoice = await Invoice.create({
        companyId: req.companyId,
        vendorId: vendor._id,
        vendorName,
        invoiceNumber,
        invoiceDate,
        dueDate,
        category: 'Services',
        poNumber: ocrData.poNumber || '',
        subtotal,
        discount: roundToTwo(Number(ocrData.discount) || 0),
        taxPercentage: roundToTwo(Number(ocrData.taxPercentage) || 18),
        taxAmount,
        cgst,
        sgst,
        igst,
        totalAmount,
        remainingAmount: totalAmount,
        currency: ocrData.currency || 'INR',
        approvalStatus: 'UNDER_REVIEW',
        paymentStatus: 'UNPAID',
        documentId: docRecord._id,
        originalDocumentUrl: originalDocUrl,
        originalDocumentName: file.originalname,
        ocrRawData: ocrResult.rawOcr || null,
        ocrConfidence: ocrResult.confidence || 0.85,
        isDuplicateWarning: duplicateCheck.isDuplicate,
        duplicateReason: duplicateCheck.reason || '',
        validationErrors: validation.errors,
        submittedBy: req.user._id,
      });

      // Save line items extracted by OCR if any
      if (ocrData.lineItems && Array.isArray(ocrData.lineItems) && ocrData.lineItems.length > 0) {
        const lineItems = ocrData.lineItems.map((item) => ({
          invoiceId: invoice._id,
          description: item.description || 'General Service / Goods',
          quantity: Number(item.quantity) || 1,
          unitPrice: roundToTwo(Number(item.unitPrice) || Number(item.total) || 0),
          total: roundToTwo(Number(item.total) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)),
          hsnCode: item.hsnCode || '',
          taxRate: Number(item.taxRate) || 18,
        }));
        await InvoiceLineItem.insertMany(lineItems);
      }

      // Log activity
      await InvoiceActivityLog.create({
        invoiceId: invoice._id,
        companyId: req.companyId,
        userId: req.user._id,
        userName: req.user.name,
        action: 'UPLOADED',
        details: { filename: file.originalname, ocrExtracted: ocrResult.success },
      });

      if (ocrResult.success) {
        await InvoiceActivityLog.create({
          invoiceId: invoice._id,
          companyId: req.companyId,
          userId: req.user._id,
          userName: 'Python OCR Engine',
          action: 'OCR_PROCESSED',
          details: { confidence: ocrResult.confidence },
        });
      }

      // Notification
      await notificationService.createNotification({
        companyId: req.companyId,
        type: ocrResult.success ? 'OCR_COMPLETED' : 'OCR_FAILED',
        title: ocrResult.success ? `OCR Extracted: #${invoice.invoiceNumber}` : `OCR Notice: #${invoice.invoiceNumber}`,
        message: ocrResult.success
          ? `Document ${file.originalname} processed successfully. Extracted vendor: ${invoice.vendorName}, total: ₹${invoice.totalAmount}. Ready for your review.`
          : `Document uploaded. Automated field recognition had low confidence; please review and confirm details manually.`,
        link: `/invoices/${invoice._id}`,
      });

      return successResponse(
        res,
        {
          invoice,
          ocrSuccess: ocrResult.success,
          ocrMessage: ocrResult.error || 'Fields extracted successfully.',
          extractedData: ocrData,
        },
        'Invoice uploaded and processed successfully.',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Secure document file stream
   */
  async getInvoiceDocument(req, res, next) {
    try {
      const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.companyId }).populate('documentId');
      if (!invoice || !invoice.documentId) {
        return errorResponse(res, 'Document not found for this invoice.', 404);
      }

      const filePath = invoice.documentId.path;
      if (!fs.existsSync(filePath)) {
        return errorResponse(res, 'Document file missing from disk storage.', 404);
      }

      res.setHeader('Content-Type', invoice.documentId.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${invoice.documentId.originalName}"`);
      return fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InvoiceController();
