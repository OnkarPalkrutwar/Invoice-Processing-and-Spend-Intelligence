import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  ArrowRight,
  Trash2,
  Edit,
  Mail,
  Phone,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';
import { vendorService } from '../services/vendorService';
import { formatINR } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Pagination } from '../components/common/Pagination';
import { useAuth } from '../context/AuthContext';

export const Vendors = () => {
  const { hasRole } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    category: 'Services',
    status: 'ACTIVE',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
    },
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = {
        search: search.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
        page,
        limit: 10,
      };
      const res = await vendorService.getVendors(params);
      if (res.success) {
        setVendors(res.data || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search, status, page]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      gstin: '',
      category: 'Services',
      status: 'ACTIVE',
      bankDetails: { bankName: '', accountNumber: '', ifscCode: '', upiId: '' },
      notes: '',
    });
    setActionError('');
    setShowModal(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVendor(v);
    setFormData({
      name: v.name || '',
      email: v.email || '',
      phone: v.phone || '',
      address: v.address || '',
      gstin: v.gstin || '',
      category: v.category || 'Services',
      status: v.status || 'ACTIVE',
      bankDetails: {
        bankName: v.bankDetails?.bankName || '',
        accountNumber: v.bankDetails?.accountNumber || '',
        ifscCode: v.bankDetails?.ifscCode || '',
        upiId: v.bankDetails?.upiId || '',
      },
      notes: v.notes || '',
    });
    setActionError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionError('');

    try {
      if (editingVendor) {
        await vendorService.updateVendor(editingVendor._id, formData);
      } else {
        await vendorService.createVendor(formData);
      }
      setShowModal(false);
      fetchVendors();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save vendor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete vendor '${name}'?`)) return;
    try {
      await vendorService.deleteVendor(id);
      fetchVendors();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete vendor.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vendor Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage corporate supplier master records, tax identifiers, and lifetime expenditures
          </p>
        </div>

        {hasRole('ADMIN', 'FINANCE_MANAGER') && (
          <button onClick={handleOpenAdd} className="btn-primary text-xs py-1.5 px-3.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="card p-3.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search suppliers by name, email, or GSTIN..."
              className="input-field pl-8 pr-8 py-1.5 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-48">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="input-field py-1.5 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Suppliers</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading supplier master ledger..." />
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No Suppliers Found"
            description="No suppliers registered matching your query."
            actionLabel="Add First Vendor"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Supplier Entity</th>
                  <th className="py-2.5 px-4">GSTIN</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4 text-center">Invoices</th>
                  <th className="py-2.5 px-4 text-right">Lifetime Spend</th>
                  <th className="py-2.5 px-4 text-right">Outstanding</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-xs text-slate-900 whitespace-nowrap">
                      <Link
                        to={`/vendors/${v._id}`}
                        className="hover:text-zinc-950 transition-colors flex items-center gap-2"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{v.name}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {v.gstin || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-xs">
                      <div className="flex flex-col">
                        <span>{v.email || '—'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{v.phone}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-xs text-slate-700">
                      {v.totalInvoices || 0}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-xs text-slate-900 text-right whitespace-nowrap tabular-nums">
                      {formatINR(v.totalSpent)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-xs text-slate-900 text-right whitespace-nowrap tabular-nums">
                      {formatINR(v.totalOutstanding)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {v.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/vendors/${v._id}`}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                          title="View Profile"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        {hasRole('ADMIN', 'FINANCE_MANAGER') && (
                          <button
                            onClick={() => handleOpenEdit(v)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {hasRole('ADMIN') && (
                          <button
                            onClick={() => handleDelete(v._id, v.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={10}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Add / Edit Vendor Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingVendor ? 'Edit Supplier Profile' : 'Register New Vendor'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Vendor Legal Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Amazon Web Services India Pvt Ltd"
              className="input-field text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                GSTIN
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="27AABCA4567B1Z2"
                className="input-field text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field text-xs"
              >
                <option value="Software">Software</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Hardware">Hardware</option>
                <option value="Travel">Travel</option>
                <option value="Utilities">Utilities</option>
                <option value="Marketing">Marketing</option>
                <option value="Services">Services</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Billing Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="accounts@vendor.com"
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 80 4000 1100"
                className="input-field text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Registered Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Building, Street, City, State, PIN"
              className="input-field text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs"
            >
              {saving ? 'Saving...' : editingVendor ? 'Update Supplier Profile' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
