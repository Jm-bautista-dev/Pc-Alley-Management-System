"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../lib/api';
import { showSuccess, showError, showConfirm } from "@/context/ModalContext";
import { format } from 'date-fns';
import { RefreshCw, Filter, CheckSquare, Square, CheckCheck, XCircle, ChevronDown, Package, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RestockManagement({ onRequestProcessed }) {
  const [requests, setRequests]           = useState([]);
  const [branches, setBranches]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [rejectionModal, setRejectionModal] = useState(null); // single rejection modal
  const [batchRejectModal, setBatchRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentUser, setCurrentUser]     = useState(null);

  // Batch selection
  const [selectedIds, setSelectedIds]     = useState(new Set());

  // Filters
  const [filterStatus, setFilterStatus]   = useState('Pending');
  const [filterBranch, setFilterBranch]   = useState('');

  const userData = useCallback(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  }, []);

  useEffect(() => {
    const u = userData();
    setCurrentUser(u);
    fetchBranches();
    fetchRequests('Pending', '');
  }, []);

  const fetchBranches = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl('/api/branches'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setBranches(await res.json());
    } catch (_) {}
  };

  const fetchRequests = async (status = filterStatus, branch = filterBranch) => {
    setLoading(true);
    setSelectedIds(new Set()); // clear selection on refresh
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (branch) params.set('branch_id', branch);
      const url = `/api/restock-requests${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(apiUrl(url), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRequests(await res.json());
      else showError('Failed to load restock requests');
    } catch (_) {
      showError('Failed to load restock requests');
    } finally {
      setLoading(false);
    }
  };

  // ── Single Approve ──────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    const confirmed = await showConfirm(
      "Approve Restock Request",
      "Approve this restock request? Branch inventory will be updated immediately.",
      { confirmLabel: "Approve" }
    );
    if (!confirmed) return;
    setProcessingIds(s => new Set(s).add(id));
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/api/restock-requests/${id}/approve`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess('Request approved — inventory updated');
        if (onRequestProcessed) onRequestProcessed();
        fetchRequests();
      } else {
        const err = await res.json();
        showError(err.message || 'Approval failed');
      }
    } catch (_) {
      showError('An error occurred');
    } finally {
      setProcessingIds(s => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  // ── Single Reject ───────────────────────────────────────────────────────────
  const handleReject = async (e) => {
    e.preventDefault();
    const id = rejectionModal.id;
    setProcessingIds(s => new Set(s).add(id));
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(apiUrl(`/api/restock-requests/${id}/reject`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectionReason })
      });
      if (res.ok) {
        showSuccess('Request rejected');
        setRejectionModal(null);
        setRejectionReason('');
        if (onRequestProcessed) onRequestProcessed();
        fetchRequests();
      } else {
        const err = await res.json();
        showError(err.message || 'Rejection failed');
      }
    } catch (_) {
      showError('An error occurred');
    } finally {
      setProcessingIds(s => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  // ── Batch Approve ───────────────────────────────────────────────────────────
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await showConfirm(
      "Batch Approve",
      `Approve ${selectedIds.size} restock request${selectedIds.size > 1 ? 's' : ''}? Inventory will be updated for all selected requests.`,
      { confirmLabel: `Approve ${selectedIds.size} Requests` }
    );
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    const ids = Array.from(selectedIds);
    let passed = 0, failed = 0;

    for (const id of ids) {
      setProcessingIds(s => new Set(s).add(id));
      try {
        const res = await fetch(apiUrl(`/api/restock-requests/${id}/approve`), {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) passed++;
        else failed++;
      } catch (_) {
        failed++;
      } finally {
        setProcessingIds(s => { const n = new Set(s); n.delete(id); return n; });
      }
    }

    if (passed > 0) showSuccess(`${passed} request${passed > 1 ? 's' : ''} approved — inventory updated`);
    if (failed > 0) showError(`${failed} request${failed > 1 ? 's' : ''} failed`);
    if (onRequestProcessed) {
      for (let i = 0; i < passed; i++) onRequestProcessed();
    }
    fetchRequests();
  };

  // ── Batch Reject ────────────────────────────────────────────────────────────
  const handleBatchReject = async (e) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    const token = localStorage.getItem('token');
    const ids = Array.from(selectedIds);
    let passed = 0, failed = 0;

    for (const id of ids) {
      setProcessingIds(s => new Set(s).add(id));
      try {
        const res = await fetch(apiUrl(`/api/restock-requests/${id}/reject`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reason: rejectionReason })
        });
        if (res.ok) passed++;
        else failed++;
      } catch (_) {
        failed++;
      } finally {
        setProcessingIds(s => { const n = new Set(s); n.delete(id); return n; });
      }
    }

    if (passed > 0) showSuccess(`${passed} request${passed > 1 ? 's' : ''} rejected`);
    if (failed > 0) showError(`${failed} failed`);
    if (onRequestProcessed) {
      for (let i = 0; i < passed; i++) onRequestProcessed();
    }
    setBatchRejectModal(false);
    setRejectionReason('');
    fetchRequests();
  };

  // ── Checkbox helpers ────────────────────────────────────────────────────────
  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const allPendingSelected = pendingRequests.length > 0 && pendingRequests.every(r => selectedIds.has(r.id));
  const somePendingSelected = pendingRequests.some(r => selectedIds.has(r.id));

  const toggleAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRequests.map(r => r.id)));
    }
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const statusBadge = (status) => {
    const map = {
      Pending:  'text-amber-600  bg-amber-50  border-amber-200  dark:text-amber-400  dark:bg-amber-400/10  dark:border-amber-400/20',
      Approved: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-400/10 dark:border-emerald-400/20',
      Rejected: 'text-rose-600   bg-rose-50   border-rose-200   dark:text-rose-400   dark:bg-rose-400/10   dark:border-rose-400/20',
    };
    return map[status] || 'text-muted bg-brand-bgbase border-border';
  };

  const isSuperAdmin  = currentUser?.role === 'super_admin';
  const isBranchAdmin = currentUser?.role === 'branch_admin';
  const canApprove    = isSuperAdmin || isBranchAdmin;

  const pending  = requests.filter(r => r.status === 'Pending').length;
  const approved = requests.filter(r => r.status === 'Approved').length;
  const rejected = requests.filter(r => r.status === 'Rejected').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-main">Restock Requests</h2>
          <p className="text-sm text-muted mt-0.5">
            {isSuperAdmin
              ? 'Review and manage all branch inventory replenishment requests'
              : isBranchAdmin
              ? 'Review and approve staff restock requests for your branch'
              : 'Track your submitted restock requests'}
          </p>
        </div>
        <button
          onClick={() => fetchRequests()}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand-bgbase border border-border text-sm font-medium text-muted hover:text-main hover:bg-brand-hover self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending',  count: pending,  color: 'text-amber-500',   bg: 'bg-amber-50  dark:bg-amber-400/10',   border: 'border-amber-200  dark:border-amber-400/20' },
          { label: 'Approved', count: approved, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-400/10', border: 'border-emerald-200 dark:border-emerald-400/20' },
          { label: 'Rejected', count: rejected, color: 'text-rose-500',    bg: 'bg-rose-50   dark:bg-rose-400/10',    border: 'border-rose-200   dark:border-rose-400/20' },
        ].map(({ label, count, color, bg, border }) => (
          <button
            key={label}
            onClick={() => { setFilterStatus(label); fetchRequests(label, filterBranch); }}
            className={`p-4 rounded-xl border ${bg} ${border} text-left hover:opacity-80 transition-opacity ${filterStatus === label ? 'ring-2 ring-offset-1 ring-brand-neonblue/40' : ''}`}
          >
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className={`text-xs font-semibold mt-0.5 ${color} opacity-70`}>{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-brand-bgbase border border-border rounded-xl">
        <Filter size={14} className="text-muted shrink-0" />
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">Filter:</span>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-8 px-3 rounded-lg bg-brand-surface border border-border text-sm text-main focus:outline-none focus:border-brand-neonblue/40"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        {isSuperAdmin && (
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="h-8 px-3 rounded-lg bg-brand-surface border border-border text-sm text-main focus:outline-none focus:border-brand-neonblue/40"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => fetchRequests(filterStatus, filterBranch)}
          className="h-8 px-4 rounded-lg bg-brand-neonblue text-white text-xs font-semibold hover:bg-brand-neonblue/90"
        >
          Apply
        </button>
        {(filterStatus || filterBranch) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterBranch(''); fetchRequests('', ''); }}
            className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted hover:text-main hover:bg-brand-hover"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Batch Action Bar ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && canApprove && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between gap-4 px-5 py-3 bg-brand-neonblue/10 border border-brand-neonblue/30 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <CheckSquare size={16} className="text-brand-neonblue" />
              <span className="text-sm font-bold text-main">
                {selectedIds.size} request{selectedIds.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchApprove}
                disabled={processingIds.size > 0}
                className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCheck size={13} /> Approve Selected
              </button>
              <button
                onClick={() => setBatchRejectModal(true)}
                disabled={processingIds.size > 0}
                className="h-8 px-4 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 disabled:opacity-50 flex items-center gap-1.5"
              >
                <XCircle size={13} /> Reject Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="h-8 px-3 rounded-lg border border-border text-xs font-medium text-muted hover:text-main"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-brand-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-brand-bgbase">
                {/* Checkbox column — only for canApprove, only when viewing Pending */}
                {canApprove && (filterStatus === 'Pending' || filterStatus === '') && (
                  <th className="px-4 py-3 w-10">
                    <button
                      onClick={toggleAll}
                      className="text-muted hover:text-main transition-colors"
                      title={allPendingSelected ? "Deselect all" : "Select all pending"}
                    >
                      {allPendingSelected
                        ? <CheckSquare size={16} className="text-brand-neonblue" />
                        : somePendingSelected
                        ? <CheckSquare size={16} className="text-brand-neonblue/50" />
                        : <Square size={16} />
                      }
                    </button>
                  </th>
                )}
                {['Date', 'Branch', 'Requested By', 'Product', 'Qty', 'Est. Cost', 'Status', canApprove ? 'Actions' : 'Status Info'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-16 text-center text-sm text-muted animate-pulse">
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-16 text-center">
                    <Package size={32} className="mx-auto text-muted/30 mb-3" />
                    <p className="text-sm text-muted font-semibold">No restock requests found</p>
                    <p className="text-xs text-muted/60 mt-1">
                      {filterStatus ? `No ${filterStatus.toLowerCase()} requests` : 'Submit a stock request from the Inventory page'}
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isPending  = req.status === 'Pending';
                  const isSelected = selectedIds.has(req.id);
                  const isProcessing = processingIds.has(req.id);
                  const showCheckbox = canApprove && isPending && (filterStatus === 'Pending' || filterStatus === '');

                  return (
                    <tr
                      key={req.id}
                      className={`transition-colors ${isSelected ? 'bg-brand-neonblue/5' : 'hover:bg-brand-bgbase'} ${isProcessing ? 'opacity-60' : ''}`}
                    >
                      {/* Checkbox */}
                      {canApprove && (filterStatus === 'Pending' || filterStatus === '') && (
                        <td className="px-4 py-3">
                          {isPending && (
                            <button onClick={() => toggleOne(req.id)} className="text-muted hover:text-brand-neonblue transition-colors">
                              {isSelected
                                ? <CheckSquare size={16} className="text-brand-neonblue" />
                                : <Square size={16} />
                              }
                            </button>
                          )}
                        </td>
                      )}

                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
                        {format(new Date(req.createdAt), 'MMM dd, yyyy')}
                        <div className="text-xs text-muted/60">{format(new Date(req.createdAt), 'HH:mm')}</div>
                      </td>

                      {/* Branch */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-main">{req.Branch?.name}</span>
                      </td>

                      {/* Requested by */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted">@{req.Manager?.username}</span>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-main">{req.Product?.name}</p>
                        <p className="text-xs text-muted">{req.Product?.sku}</p>
                        {req.notes && (
                          <p className="text-xs text-muted/60 italic mt-0.5 max-w-[180px] truncate" title={req.notes}>
                            "{req.notes}"
                          </p>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="px-4 py-3 text-sm font-bold text-main text-center">
                        {req.quantity}
                      </td>

                      {/* Est. Cost */}
                      <td className="px-4 py-3 text-sm text-main whitespace-nowrap">
                        {req.cost_price
                          ? `₱${(parseFloat(req.cost_price) * req.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : '—'
                        }
                        {req.cost_price && (
                          <div className="text-xs text-muted">₱{parseFloat(req.cost_price).toLocaleString()} / unit</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${statusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {canApprove && isPending ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={isProcessing}
                              className="h-8 px-3 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 whitespace-nowrap"
                            >
                              {isProcessing ? '…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => setRejectionModal(req)}
                              disabled={isProcessing}
                              className="h-8 px-3 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-50 whitespace-nowrap"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-muted">
                            {req.status === 'Approved' && (
                              <>
                                <span className="text-emerald-500 font-semibold">✓ Approved</span>
                                {req.Admin && <div>by @{req.Admin.username}</div>}
                                {req.processed_at && <div>{format(new Date(req.processed_at), 'MMM dd, HH:mm')}</div>}
                              </>
                            )}
                            {req.status === 'Rejected' && (
                              <>
                                <span className="text-rose-500 font-semibold">✗ Rejected</span>
                                {req.Admin && <div>by @{req.Admin.username}</div>}
                                {req.rejection_reason && (
                                  <div className="text-muted/60 italic max-w-[140px] truncate" title={req.rejection_reason}>
                                    "{req.rejection_reason}"
                                  </div>
                                )}
                              </>
                            )}
                            {req.status === 'Pending' && !canApprove && (
                              <span className="text-amber-500 font-semibold flex items-center gap-1">
                                <Clock size={11} /> Awaiting admin
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Single Rejection Modal ── */}
      <AnimatePresence>
        {rejectionModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-base font-semibold text-main">Reject Request</h3>
                <p className="text-sm text-muted mt-0.5">
                  {rejectionModal.Product?.name} — {rejectionModal.quantity} units for {rejectionModal.Branch?.name}
                </p>
              </div>
              <form onSubmit={handleReject} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">Reason for rejection *</label>
                  <textarea
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-4 py-3 text-sm text-main focus:outline-none focus:border-brand-neonblue/40 resize-none"
                    placeholder="Enter reason..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setRejectionModal(null); setRejectionReason(''); }}
                    className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted hover:text-main hover:bg-brand-bgbase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingIds.size > 0}
                    className="flex-1 h-10 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50"
                  >
                    {processingIds.size > 0 ? 'Processing...' : 'Confirm Reject'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Batch Rejection Modal ── */}
      <AnimatePresence>
        {batchRejectModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-base font-semibold text-main">Batch Reject</h3>
                <p className="text-sm text-muted mt-0.5">
                  This reason will apply to all {selectedIds.size} selected request{selectedIds.size > 1 ? 's' : ''}.
                </p>
              </div>
              <form onSubmit={handleBatchReject} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">Reason for rejection *</label>
                  <textarea
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-4 py-3 text-sm text-main focus:outline-none focus:border-brand-neonblue/40 resize-none"
                    placeholder="Enter reason..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setBatchRejectModal(false); setRejectionReason(''); }}
                    className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-muted hover:text-main hover:bg-brand-bgbase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingIds.size > 0}
                    className="flex-1 h-10 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50"
                  >
                    {processingIds.size > 0 ? 'Processing...' : `Reject ${selectedIds.size} Requests`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
