const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const Invoice = require('../models/Invoice');
const paymentService = require('../services/paymentService');
const { roundToTwo } = require('../utils/currencyUtils');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

class VendorController {
  async getVendors(req, res, next) {
    try {
      const {
        search,
        status,
        category,
        page = 1,
        limit = 10,
        sortBy = 'totalSpent',
        sortOrder = 'desc',
      } = req.query;

      const filter = { companyId: req.companyId };

      if (search) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [{ name: regex }, { email: regex }, { gstin: regex }];
      }

      if (status && status !== 'ALL') {
        filter.status = status;
      }

      if (category && category !== 'ALL') {
        filter.category = category;
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [vendors, total] = await Promise.all([
        Vendor.find(filter).sort(sort).skip(skip).limit(limitNum),
        Vendor.countDocuments(filter),
      ]);

      return paginatedResponse(res, vendors, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    } catch (error) {
      next(error);
    }
  }

  async getVendorById(req, res, next) {
    try {
      const vendor = await Vendor.findOne({ _id: req.params.id, companyId: req.companyId });
      if (!vendor) {
        return errorResponse(res, 'Vendor not found.', 404);
      }

      // Fetch recent invoices
      const recentInvoices = await Invoice.find({
        companyId: req.companyId,
        vendorId: vendor._id,
      })
        .sort({ invoiceDate: -1 })
        .limit(10);

      // Monthly spending chart for vendor
      const monthlySpend = await Invoice.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(req.companyId),
            vendorId: vendor._id,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$invoiceDate' },
              month: { $month: '$invoiceDate' },
            },
            total: { $sum: '$totalAmount' },
            paid: { $sum: '$paidAmount' },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const chartData = monthlySpend.map((m) => ({
        month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
        total: roundToTwo(m.total),
        paid: roundToTwo(m.paid),
      }));

      return successResponse(res, {
        vendor,
        recentInvoices,
        chartData,
      });
    } catch (error) {
      next(error);
    }
  }

  async createVendor(req, res, next) {
    try {
      const { name, email, phone, address, gstin, category, status, bankDetails, notes } = req.body;

      const existing = await Vendor.findOne({
        companyId: req.companyId,
        name: new RegExp(`^${name.trim()}$`, 'i'),
      });

      if (existing) {
        return errorResponse(res, `A vendor named '${name}' already exists.`, 409);
      }

      const vendor = await Vendor.create({
        companyId: req.companyId,
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : '',
        phone: phone || '',
        address: address || '',
        gstin: gstin ? gstin.trim().toUpperCase() : '',
        category: category || 'Services',
        status: status || 'ACTIVE',
        bankDetails: bankDetails || {},
        notes: notes || '',
      });

      return successResponse(res, vendor, 'Vendor created successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateVendor(req, res, next) {
    try {
      const vendor = await Vendor.findOne({ _id: req.params.id, companyId: req.companyId });
      if (!vendor) {
        return errorResponse(res, 'Vendor not found.', 404);
      }

      const { name, email, phone, address, gstin, category, status, bankDetails, notes } = req.body;

      if (name) vendor.name = name.trim();
      if (email !== undefined) vendor.email = email.trim().toLowerCase();
      if (phone !== undefined) vendor.phone = phone.trim();
      if (address !== undefined) vendor.address = address.trim();
      if (gstin !== undefined) vendor.gstin = gstin.trim().toUpperCase();
      if (category) vendor.category = category;
      if (status) vendor.status = status;
      if (bankDetails) vendor.bankDetails = bankDetails;
      if (notes !== undefined) vendor.notes = notes;

      await vendor.save();

      // Recalculate balances
      await paymentService.updateVendorBalances(vendor._id, req.companyId);

      return successResponse(res, vendor, 'Vendor updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  async deleteVendor(req, res, next) {
    try {
      const vendor = await Vendor.findOne({ _id: req.params.id, companyId: req.companyId });
      if (!vendor) {
        return errorResponse(res, 'Vendor not found.', 404);
      }

      // Check if invoices are linked
      const invoiceCount = await Invoice.countDocuments({
        companyId: req.companyId,
        vendorId: vendor._id,
      });

      if (invoiceCount > 0) {
        return errorResponse(
          res,
          `Cannot delete vendor '${vendor.name}' because ${invoiceCount} historical invoice(s) are associated with it. You can change its status to ARCHIVED instead.`,
          400
        );
      }

      await Vendor.deleteOne({ _id: vendor._id });
      return successResponse(res, null, 'Vendor deleted successfully.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VendorController();
