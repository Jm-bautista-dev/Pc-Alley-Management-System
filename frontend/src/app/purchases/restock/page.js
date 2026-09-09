"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  Search, 
  AlertTriangle,
  ArrowRight,
  Download,
  Building,
  CheckCircle2,
  X,
  CheckSquare,
  Square,
  CheckCheck,
  RotateCcw,
  Clock,
  Send,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  FileText,
  User,
  Users,
  ShieldCheck,
  History,
  Layers,
  Sparkles,
  Inbox,
  Filter,
  ArrowUpRight,
  MapPin,
  Check
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import RestockRequestModal from "@/components/restock/RestockRequestModal";
import { showSuccess, showError, showInfo, showWarning, showConfirm } from "@/context/ModalContext";
import Pagination from "@/components/Pagination";

export default function ProcurementPage() {
  const [inventory, setInventory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [limit, setLimit] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [restockItem, setRestockItem] = useState(null);

  // Requests State
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Super Admin: Selected Branch for Modal
  const [activeBranchModal, setActiveBranchModal] = useState(null);
  const [branchModalSearch, setBranchModalSearch] = useState("");
  const [branchModalReqStatus, setBranchModalReqStatus] = useState("Pending"); // Pending | Approved | Fulfilled | Rejected | All
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());

  // Branch Admin: Selected Staff for Modal
  const [activeStaffModal, setActiveStaffModal] = useState(null);
  const [staffModalSearch, setStaffModalSearch] = useState("");
  const [staffModalReqStatus, setStaffModalReqStatus] = useState("Pending"); // Pending | Endorsed | Fulfilled | Rejected | All
  const [selectedStaffRequestIds, setSelectedStaffRequestIds] = useState(new Set());

  // Action / Modal States
  const [activeReq, setActiveReq] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);
  const [showEndorseModal, setShowEndorseModal] = useState(false);
  const [showStaffRejectModal, setShowStaffRejectModal] = useState(false);
  const [showStaffBatchRejectModal, setShowStaffBatchRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvedQty, setApprovedQty] = useState(1);
  const [endorseNotes, setEndorseNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionCustom, setRejectionCustom] = useState("");
  const [batchRejectReason, setBatchRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  const REJECTION_PRESETS = [
    "Insufficient warehouse inventory at source",
    "Request quantity exceeds branch quota",
    "Duplicate request submitted",
    "Product unavailable or discontinued",
    "Please resubmit with revised quantity requirement",
    "Other reason"
  ];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'employee' || user.role === 'staff') {
        window.location.href = "/products";
        return;
      }
      setCurrentUser(user);
    }
    fetchData();
    fetchRequests();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const [invRes, branchRes, usersRes] = await Promise.all([
        fetch(apiUrl("/api/inventory?limit=10000"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/auth/users?limit=1000"), { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (invRes.ok) {
        const raw = await invRes.json();
        setInventory(raw.data ?? []);
      }
      if (branchRes.ok) {
        const bData = await branchRes.json();
        setBranches(Array.isArray(bData) ? bData : []);
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(Array.isArray(uData) ? uData : (uData.data || []));
      }
    } catch (err) {
      console.error("Failed to fetch inventory/branches:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    const token = localStorage.getItem("token");
    try {
      setRequestsLoading(true);
      const res = await fetch(apiUrl("/api/product-requests"), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setRequestsLoading(false);
    }
  };

  // Reset Super Admin modal state when active branch changes
  useEffect(() => {
    setSelectedRequestIds(new Set());
    setBranchModalSearch("");
    setBranchModalReqStatus("Pending");
  }, [activeBranchModal]);

  // Reset Branch Admin modal state when active staff changes
  useEffect(() => {
    setSelectedStaffRequestIds(new Set());
    setStaffModalSearch("");
    setStaffModalReqStatus("Pending");
  }, [activeStaffModal]);

  const isSuperAdmin = currentUser?.role === "super_admin";
  const currentBranchId = currentUser?.branch_id;
  const currentBranch = branches.find(b => b.id === currentBranchId) || currentUser?.Branch;
  const branchName = currentBranch?.name || currentUser?.branch_name || "Branch";

  // Helper status checkers
  const isSuperAdminPending = (st) => ["PENDING_SUPERADMIN", "PENDING", "PENDING_ADMIN"].includes((st || "").toUpperCase());
  const isStaffPending = (st) => ["PENDING_ADMIN", "PENDING"].includes((st || "").toUpperCase());

  // ── Super Admin: Branch Analytics Aggregation ──
  const branchPillData = useMemo(() => {
    if (!isSuperAdmin) return [];
    return branches.map(branch => {
      const bInv = inventory.filter(i => i.branch_id === branch.id && i.Product && !i.Product.is_bundle);
      const bReqs = requests.filter(r => r.branch_id === branch.id);
      const pendingRequestsCount = bReqs.filter(r => isSuperAdminPending(r.status)).length;

      return {
        ...branch,
        totalItems: bInv.length,
        pendingRequestsCount,
        requests: bReqs,
        inventory: bInv
      };
    });
  }, [branches, inventory, requests, isSuperAdmin]);

  const totalPendingRequests = requests.filter(r => isSuperAdminPending(r.status)).length;

  // ── Branch Admin: Staff Analytics Aggregation ──
  const staffPillData = useMemo(() => {
    if (isSuperAdmin) return [];
    // Strictly filter staff members (role: employee or staff, exclude branch admins / managers)
    const branchStaff = users.filter(u => 
      (u.branch_id === currentBranchId || !currentBranchId) && 
      (u.role === 'employee' || u.role === 'staff') &&
      u.role !== 'branch_admin' &&
      u.role !== 'super_admin' &&
      u.id !== currentUser?.id
    );

    // Also include any staff users who created requests for this branch if not already in list
    const requesterIdsInBranch = new Set(requests.filter(r => r.branch_id === currentBranchId).map(r => r.requested_by));
    users.forEach(u => {
      if (
        requesterIdsInBranch.has(u.id) && 
        (u.role === 'employee' || u.role === 'staff') && 
        u.role !== 'branch_admin' && 
        u.role !== 'super_admin' && 
        u.id !== currentUser?.id &&
        !branchStaff.some(s => s.id === u.id)
      ) {
        branchStaff.push(u);
      }
    });

    return branchStaff.map(staff => {
      const staffReqs = requests.filter(r => r.requested_by === staff.id);
      const pendingRequestsCount = staffReqs.filter(r => isStaffPending(r.status)).length;
      const totalRequests = staffReqs.length;

      return {
        ...staff,
        pendingRequestsCount,
        totalRequests,
        requests: staffReqs
      };
    });
  }, [users, requests, currentBranchId, isSuperAdmin, currentUser]);

  const totalBranchPendingStaffRequests = useMemo(() => {
    return requests.filter(r => 
      (r.branch_id === currentBranchId || !currentBranchId) && 
      isStaffPending(r.status)
    ).length;
  }, [requests, currentBranchId]);

  // Auto-open modal from URL query params (e.g. ?branch_id=X for Super Admin, ?staff_id=Y for Branch Admin, ?request_id=Z, or from notifications)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const branchIdParam = params.get("branch_id") || params.get("branch") || params.get("branchId");
    const staffIdParam = params.get("staff_id") || params.get("requester_id");
    const reqIdParam = params.get("request_id") || params.get("id");
    const tabParam = params.get("tab");

    // 1. SUPER ADMIN FLOW: Auto-open Branch Modal
    if (isSuperAdmin && branches.length > 0) {
      if (branchIdParam) {
        const targetBranch = branches.find(b => String(b.id) === String(branchIdParam));
        if (targetBranch) {
          setActiveBranchModal(targetBranch);
          return;
        }
      }

      if (reqIdParam && requests.length > 0) {
        const targetReq = requests.find(r => String(r.id) === String(reqIdParam));
        if (targetReq) {
          const targetBranch = branches.find(b => b.id === targetReq.branch_id);
          if (targetBranch) {
            setActiveBranchModal(targetBranch);
            return;
          }
        }
      }
    }

    // 2. BRANCH ADMIN FLOW: Auto-open Staff Modal
    if (!isSuperAdmin && users.length > 0) {
      if (staffIdParam) {
        const targetStaff = users.find(u => String(u.id) === String(staffIdParam));
        if (targetStaff) {
          setActiveStaffModal(targetStaff);
          return;
        }
      }

      if (reqIdParam && requests.length > 0) {
        const targetReq = requests.find(r => String(r.id) === String(reqIdParam));
        if (targetReq) {
          const staff = users.find(u => u.id === targetReq.requested_by);
          if (staff) {
            setActiveStaffModal(staff);
            return;
          }
        }
      }

      if (tabParam === "requests" && staffPillData.length > 0) {
        const staffWithPending = staffPillData.find(s => s.pendingRequestsCount > 0) || staffPillData[0];
        if (staffWithPending) {
          setActiveStaffModal(staffWithPending);
        }
      }
    }
  }, [isSuperAdmin, branches, users, requests, staffPillData]);

  // ── Branch Admin: Flat Inventory Filter ──
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (!item.Product) return false;
      if (item.Product.is_bundle) return false;
      const matchesSearch = item.Product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.Product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [inventory, searchQuery]);

  const lowStockItems = filteredInventory.filter(item => item.quantity <= item.low_stock_threshold);
  const normalStockItems = filteredInventory.filter(item => item.quantity > item.low_stock_threshold);
  const sortedInventory = [...lowStockItems, ...normalStockItems];
  const totalPages = Math.ceil(sortedInventory.length / limit);
  const paginatedInventory = sortedInventory.slice((currentPage - 1) * limit, currentPage * limit);

  // ── Super Admin: Filtered Requests Inside Active Branch Modal ──
  const activeBranchRequests = useMemo(() => {
    if (!activeBranchModal) return [];
    const bReqs = requests.filter(r => r.branch_id === activeBranchModal.id);

    return bReqs.filter(r => {
      const q = branchModalSearch.trim().toLowerCase();
      const reqNum = (r.request_number || "").toLowerCase();
      const prodName = (r.Product?.name || "").toLowerCase();
      const prodSku = (r.Product?.sku || "").toLowerCase();
      const requester = (r.User?.first_name ? `${r.User.first_name} ${r.User.last_name || ''}` : (r.User?.username || "")).toLowerCase();

      const matchesSearch = !q || reqNum.includes(q) || prodName.includes(q) || prodSku.includes(q) || requester.includes(q);

      const st = (r.status || "").toUpperCase();
      let matchesTab = true;
      if (branchModalReqStatus === "Pending") {
        matchesTab = st === "PENDING_SUPERADMIN" || st === "PENDING" || st === "PENDING_ADMIN";
      } else if (branchModalReqStatus === "Approved") {
        matchesTab = st === "APPROVED" || st === "PARTIALLY_APPROVED";
      } else if (branchModalReqStatus === "Fulfilled") {
        matchesTab = st === "FULFILLED" || st === "COMPLETED";
      } else if (branchModalReqStatus === "Rejected") {
        matchesTab = st === "REJECTED";
      }

      return matchesSearch && matchesTab;
    });
  }, [activeBranchModal, requests, branchModalSearch, branchModalReqStatus]);

  const branchStatusCounts = useMemo(() => {
    if (!activeBranchModal) return { Pending: 0, Approved: 0, Fulfilled: 0, Rejected: 0, All: 0 };
    const bReqs = requests.filter(r => r.branch_id === activeBranchModal.id);
    const Pending = bReqs.filter(r => isSuperAdminPending(r.status)).length;
    const Approved = bReqs.filter(r => ["APPROVED", "PARTIALLY_APPROVED"].includes((r.status || "").toUpperCase())).length;
    const Fulfilled = bReqs.filter(r => ["FULFILLED", "COMPLETED"].includes((r.status || "").toUpperCase())).length;
    const Rejected = bReqs.filter(r => (r.status || "").toUpperCase() === "REJECTED").length;
    return { Pending, Approved, Fulfilled, Rejected, All: bReqs.length };
  }, [activeBranchModal, requests]);

  // ── Branch Admin: Filtered Requests Inside Active Staff Modal ──
  const activeStaffRequests = useMemo(() => {
    if (!activeStaffModal) return [];
    const sReqs = requests.filter(r => r.requested_by === activeStaffModal.id);

    return sReqs.filter(r => {
      const q = staffModalSearch.trim().toLowerCase();
      const reqNum = (r.request_number || "").toLowerCase();
      const prodName = (r.Product?.name || "").toLowerCase();
      const prodSku = (r.Product?.sku || "").toLowerCase();

      const matchesSearch = !q || reqNum.includes(q) || prodName.includes(q) || prodSku.includes(q);

      const st = (r.status || "").toUpperCase();
      let matchesTab = true;
      if (staffModalReqStatus === "Pending") {
        matchesTab = st === "PENDING_ADMIN" || st === "PENDING";
      } else if (staffModalReqStatus === "Endorsed") {
        matchesTab = st === "PENDING_SUPERADMIN" || st === "FORWARDED_TO_HQ" || st === "APPROVED" || st === "PARTIALLY_APPROVED";
      } else if (staffModalReqStatus === "Fulfilled") {
        matchesTab = st === "FULFILLED" || st === "COMPLETED";
      } else if (staffModalReqStatus === "Rejected") {
        matchesTab = st === "REJECTED";
      }

      return matchesSearch && matchesTab;
    });
  }, [activeStaffModal, requests, staffModalSearch, staffModalReqStatus]);

  const staffStatusCounts = useMemo(() => {
    if (!activeStaffModal) return { Pending: 0, Endorsed: 0, Fulfilled: 0, Rejected: 0, All: 0 };
    const sReqs = requests.filter(r => r.requested_by === activeStaffModal.id);
    const Pending = sReqs.filter(r => isStaffPending(r.status)).length;
    const Endorsed = sReqs.filter(r => ["PENDING_SUPERADMIN", "FORWARDED_TO_HQ", "APPROVED", "PARTIALLY_APPROVED"].includes((r.status || "").toUpperCase())).length;
    const Fulfilled = sReqs.filter(r => ["FULFILLED", "COMPLETED"].includes((r.status || "").toUpperCase())).length;
    const Rejected = sReqs.filter(r => (r.status || "").toUpperCase() === "REJECTED").length;
    return { Pending, Endorsed, Fulfilled, Rejected, All: sReqs.length };
  }, [activeStaffModal, requests]);

  // ── Super Admin Modal Checkboxes ──
  const selectableSuperAdminRequests = activeBranchRequests.filter(r => isSuperAdminPending(r.status));
  const isAllSuperAdminChecked = selectableSuperAdminRequests.length > 0 && selectableSuperAdminRequests.every(r => selectedRequestIds.has(r.id));

  const handleToggleSelectAllSuperAdmin = () => {
    if (isAllSuperAdminChecked) {
      setSelectedRequestIds(new Set());
    } else {
      const next = new Set(selectedRequestIds);
      selectableSuperAdminRequests.forEach(r => next.add(r.id));
      setSelectedRequestIds(next);
    }
  };

  const handleToggleRowSuperAdmin = (id) => {
    const next = new Set(selectedRequestIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRequestIds(next);
  };

  // ── Branch Admin Modal Checkboxes ──
  const selectableStaffRequests = activeStaffRequests.filter(r => isStaffPending(r.status));
  const isAllStaffChecked = selectableStaffRequests.length > 0 && selectableStaffRequests.every(r => selectedStaffRequestIds.has(r.id));

  const handleToggleSelectAllStaff = () => {
    if (isAllStaffChecked) {
      setSelectedStaffRequestIds(new Set());
    } else {
      const next = new Set(selectedStaffRequestIds);
      selectableStaffRequests.forEach(r => next.add(r.id));
      setSelectedStaffRequestIds(next);
    }
  };

  const handleToggleRowStaff = (id) => {
    const next = new Set(selectedStaffRequestIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStaffRequestIds(next);
  };

  // ── Super Admin Actions: Single Approve ──
  const handleOpenApproveModal = (req) => {
    setActiveReq(req);
    setApprovedQty(req.quantity_requested);
    setApprovalNotes("");
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async () => {
    if (!activeReq) return;
    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeReq.id}/approve`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          quantity_approved: approvedQty,
          approval_notes: approvalNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Stock Request ${activeReq.request_number} approved!`);
        setShowApproveModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Approval failed.");
      }
    } catch (err) {
      showError("Network error during approval.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Super Admin Actions: Single Reject ──
  const handleOpenRejectModal = (req) => {
    setActiveReq(req);
    setRejectionReason(REJECTION_PRESETS[0]);
    setRejectionCustom("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!activeReq) return;
    let finalReason = rejectionReason;
    if (rejectionCustom.trim()) {
      finalReason = rejectionReason === "Other reason"
        ? rejectionCustom.trim()
        : `${rejectionReason}: ${rejectionCustom.trim()}`;
    }

    if (!finalReason || finalReason.trim() === "") {
      showError("Rejection reason is required.");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeReq.id}/reject`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: finalReason })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Stock Request ${activeReq.request_number} rejected.`);
        setShowRejectModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Rejection failed.");
      }
    } catch (err) {
      showError("Network error during rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Super Admin Actions: Batch Approve ──
  const handleBatchApprove = async () => {
    if (selectedRequestIds.size === 0) return;
    const count = selectedRequestIds.size;
    const confirmed = await showConfirm(
      "Batch Approve Stock Requests",
      `Are you sure you want to approve ${count} stock request(s)? Warehouse inventory will be allocated.`,
      { confirmLabel: `Approve ${count} Requests` }
    );
    if (!confirmed) return;

    setBatchActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/product-requests/batch-approve"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: Array.from(selectedRequestIds),
          approval_notes: "Authorized via Super Admin Batch Approval"
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "Batch approval successful!");
        setSelectedRequestIds(new Set());
        fetchRequests();
      } else {
        showError(data.message || "Batch approval encountered errors.");
      }
    } catch (err) {
      showError("Network error during batch approval.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  // ── Super Admin Actions: Batch Reject ──
  const handleBatchRejectSubmit = async (e) => {
    e.preventDefault();
    if (selectedRequestIds.size === 0) return;
    if (!batchRejectReason || !batchRejectReason.trim()) {
      showError("Rejection reason is required.");
      return;
    }

    setBatchActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/product-requests/batch-reject"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: Array.from(selectedRequestIds),
          reason: batchRejectReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "Batch rejection completed.");
        setShowBatchRejectModal(false);
        setBatchRejectReason("");
        setSelectedRequestIds(new Set());
        fetchRequests();
      } else {
        showError(data.message || "Batch rejection failed.");
      }
    } catch (err) {
      showError("Network error during batch rejection.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  // ── Branch Admin Actions: Endorse Staff Request (Single) ──
  const handleOpenEndorseModal = (req) => {
    setActiveReq(req);
    setEndorseNotes("");
    setShowEndorseModal(true);
  };

  const handleConfirmEndorse = async () => {
    if (!activeReq) return;
    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeReq.id}/branch-approve`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          approval_notes: endorseNotes || "Endorsed by Branch Admin"
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Requisition ${activeReq.request_number} endorsed and forwarded to HQ!`);
        setShowEndorseModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Endorsement failed.");
      }
    } catch (err) {
      showError("Network error during endorsement.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Branch Admin Actions: Endorse Staff Requests (Batch) ──
  const handleBatchEndorse = async () => {
    if (selectedStaffRequestIds.size === 0) return;
    const count = selectedStaffRequestIds.size;
    const confirmed = await showConfirm(
      "Endorse Staff Requisitions to HQ",
      `Are you sure you want to endorse ${count} requisition(s) to HQ Super Admin?`,
      { confirmLabel: `Endorse ${count} Requests` }
    );
    if (!confirmed) return;

    setBatchActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/product-requests/batch-branch-approve"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: Array.from(selectedStaffRequestIds),
          approval_notes: "Batch endorsed by Branch Admin for HQ Procurement"
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || `Successfully endorsed ${selectedStaffRequestIds.size} requisitions to HQ!`);
        setSelectedStaffRequestIds(new Set());
        fetchRequests();
      } else {
        showError(data.message || "Batch endorsement failed.");
      }
    } catch (err) {
      showError("Network error during batch endorsement.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  // ── Branch Admin Actions: Single Reject ──
  const handleOpenStaffRejectModal = (req) => {
    setActiveReq(req);
    setRejectionReason(REJECTION_PRESETS[0]);
    setRejectionCustom("");
    setShowStaffRejectModal(true);
  };

  const handleConfirmStaffReject = async () => {
    if (!activeReq) return;
    let finalReason = rejectionReason;
    if (rejectionCustom.trim()) {
      finalReason = rejectionReason === "Other reason"
        ? rejectionCustom.trim()
        : `${rejectionReason}: ${rejectionCustom.trim()}`;
    }

    if (!finalReason || finalReason.trim() === "") {
      showError("Rejection reason is required.");
      return;
    }

    setActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/api/product-requests/${activeReq.id}/branch-reject`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: finalReason })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Requisition ${activeReq.request_number} declined.`);
        setShowStaffRejectModal(false);
        fetchRequests();
      } else {
        showError(data.message || "Rejection failed.");
      }
    } catch (err) {
      showError("Network error during rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Branch Admin Actions: Batch Reject ──
  const handleBatchStaffRejectSubmit = async (e) => {
    e.preventDefault();
    if (selectedStaffRequestIds.size === 0) return;
    if (!batchRejectReason || !batchRejectReason.trim()) {
      showError("Rejection reason is required.");
      return;
    }

    setBatchActionLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl("/api/product-requests/batch-branch-reject"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids: Array.from(selectedStaffRequestIds),
          reason: batchRejectReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message || "Batch rejection completed.");
        setShowStaffBatchRejectModal(false);
        setBatchRejectReason("");
        setSelectedStaffRequestIds(new Set());
        fetchRequests();
      } else {
        showError(data.message || "Batch rejection failed.");
      }
    } catch (err) {
      showError("Network error during batch rejection.");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "PENDING_ADMIN":
        return { label: "Pending Branch Endorsement", cls: "text-amber-400 border-amber-400/20 bg-amber-400/10", dot: "bg-amber-400" };
      case "PENDING_SUPERADMIN":
      case "PENDING":
        return { label: "Forwarded to HQ Review", cls: "text-cyan-400 border-cyan-400/20 bg-cyan-400/10", dot: "bg-cyan-400" };
      case "APPROVED":
        return { label: "Approved / Reserved", cls: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10", dot: "bg-emerald-400" };
      case "PARTIALLY_APPROVED":
        return { label: "Partially Approved", cls: "text-lime-400 border-lime-400/20 bg-lime-400/10", dot: "bg-lime-400" };
      case "PROCESSING":
      case "SCHEDULED":
        return { label: "In Transit", cls: "text-blue-400 border-blue-400/20 bg-blue-400/10", dot: "bg-blue-400" };
      case "FULFILLED":
      case "COMPLETED":
        return { label: "Fulfilled", cls: "text-teal-400 border-teal-400/20 bg-teal-400/10", dot: "bg-teal-400" };
      case "REJECTED":
        return { label: "Rejected", cls: "text-rose-400 border-rose-400/20 bg-rose-400/10", dot: "bg-rose-400" };
      default:
        return { label: status, cls: "text-muted border-border bg-brand-surface", dot: "bg-muted" };
    }
  };

  return (
    <div className="flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title={isSuperAdmin ? "SUPERADMIN RESTOCK DESK" : "BRANCH PROCUREMENT DESK"} />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 bg-brand-bgbase text-main">
          
          {/* ========================================================================= */}
          {/* SUPER ADMIN VIEW: BRANCH PILLS GRID -> CLICK OPENS REQUEST LIST MODAL */}
          {/* ========================================================================= */}
          {isSuperAdmin ? (
            <div>
              {/* Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-border pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-black tracking-[3px] uppercase text-brand-neonblue bg-brand-neonblue/10 px-2.5 py-0.5 rounded border border-brand-neonblue/20">
                      Central Authority • Super Admin
                    </span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-rajdhani font-black uppercase tracking-wide flex items-center gap-2 text-main">
                    <span>BRANCH RESTOCK</span>
                    <span className="text-brand-neonblue">HUBS</span>
                  </h1>
                </div>

                {/* Quick Metrics */}
                <div className="flex items-center gap-3">
                  <div className="bg-brand-surface border border-border px-5 py-2.5 rounded-xl text-center shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted block">Restock Requests</span>
                    <span className="text-lg font-rajdhani font-black text-brand-neonblue font-mono">{totalPendingRequests} Products</span>
                  </div>
                  <button
                    onClick={() => { fetchData(); fetchRequests(); }}
                    title="Refresh Hub"
                    className="p-3 bg-brand-surface border border-border rounded-xl text-muted hover:text-brand-neonblue transition-colors shrink-0 shadow-sm"
                  >
                    <RotateCcw size={16} className={loading || requestsLoading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* Branch Pills Grid */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1.5 h-4 bg-brand-neonblue rounded-full" />
                  <h3 className="text-xs font-rajdhani font-black uppercase text-main tracking-widest">
                    BRANCHES
                  </h3>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-2 border-border border-t-brand-neonblue rounded-full animate-spin mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-muted">Loading Branch Hubs...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {branchPillData.map((branch) => {
                      return (
                        <motion.button
                          key={branch.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveBranchModal(branch)}
                          className="w-full text-left bg-brand-surface border border-border hover:border-brand-neonblue/40 rounded-2xl p-5 shadow-sm transition-all group relative overflow-hidden flex flex-col justify-between"
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-neonblue/0 group-hover:via-brand-neonblue/80 to-transparent transition-all duration-300" />

                          <div>
                            {/* Branch Title & Icon */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-brand-neonblue/10 border border-brand-neonblue/20 text-brand-neonblue flex items-center justify-center shrink-0 group-hover:bg-brand-neonblue group-hover:text-slate-950 transition-colors">
                                  <Building size={16} />
                                </div>
                                <div>
                                  <h4 className="text-base font-rajdhani font-black uppercase text-main tracking-wide group-hover:text-brand-neonblue transition-colors">
                                    {branch.name}
                                  </h4>
                                  <span className="text-[10px] text-muted flex items-center gap-1">
                                    <MapPin size={10} />
                                    {branch.location || 'Branch Sector'}
                                  </span>
                                </div>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-brand-muted/10 flex items-center justify-center text-muted group-hover:text-brand-neonblue transition-colors shrink-0">
                                <ArrowUpRight size={14} />
                              </div>
                            </div>

                            {/* Status Badge: Restock Requests {number of products} */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <span className="text-[11px] font-black uppercase px-3 py-1.5 rounded-full bg-brand-neonblue/15 text-brand-neonblue border border-brand-neonblue/30 flex items-center gap-1.5 font-mono">
                                <Inbox size={13} />
                                Restock Requests: {branch.pendingRequestsCount} {branch.pendingRequestsCount === 1 ? 'Product' : 'Products'}
                              </span>
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                            <span className="text-muted text-[10px] uppercase font-bold tracking-wider">Active Inventory</span>
                            <span className="font-rajdhani font-black text-main">{branch.totalItems} Items</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* BRANCH ADMIN VIEW: STAFF PILLS GRID + BRANCH DIRECT INVENTORY RESTOCK */
            /* ========================================================================= */
            <div>
              {/* Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-border pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-black tracking-[3px] uppercase text-orange-400 bg-orange-400/10 px-2.5 py-0.5 rounded border border-orange-400/20">
                      Branch Authority • {branchName}
                    </span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-rajdhani font-black uppercase tracking-wide flex items-center gap-2 text-main">
                    <span>{branchName.toUpperCase()} RESTOCK</span>
                    <span className="text-orange-400">HUB</span>
                  </h1>
                </div>

                {/* Quick Metrics */}
                <div className="flex items-center gap-3">
                  <div className="bg-brand-surface border border-border px-5 py-2.5 rounded-xl text-center shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted block">Staff Restock Requests</span>
                    <span className="text-lg font-rajdhani font-black text-orange-400 font-mono">{totalBranchPendingStaffRequests} Products</span>
                  </div>
                  <div className="bg-brand-surface border border-border px-5 py-2.5 rounded-xl text-center shadow-sm hidden sm:block">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted block">Branch Inventory</span>
                    <span className="text-lg font-rajdhani font-black text-main font-mono">{inventory.length} Items</span>
                  </div>
                  <button
                    onClick={() => { fetchData(); fetchRequests(); }}
                    title="Refresh Hub"
                    className="p-3 bg-brand-surface border border-border rounded-xl text-muted hover:text-orange-400 transition-colors shrink-0 shadow-sm"
                  >
                    <RotateCcw size={16} className={loading || requestsLoading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* 1. Branch Staff Requisition Hubs Grid (Staff Pills) */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1.5 h-4 bg-orange-400 rounded-full" />
                  <h3 className="text-xs font-rajdhani font-black uppercase text-main tracking-widest">
                    BRANCH STAFF REQUISITIONS
                  </h3>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-2 border-border border-t-orange-400 rounded-full animate-spin mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-muted">Loading Staff Hubs...</p>
                  </div>
                ) : staffPillData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-brand-surface border border-border border-dashed rounded-2xl">
                    <Users size={36} className="text-muted/30 mb-3" />
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">No Staff Members Registered For This Branch</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {staffPillData.map((staff) => {
                      const staffName = staff.first_name ? `${staff.first_name} ${staff.last_name || ''}` : staff.username;
                      const hasPending = staff.pendingRequestsCount > 0;

                      return (
                        <motion.button
                          key={staff.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveStaffModal(staff)}
                          className="w-full text-left bg-brand-surface border border-border hover:border-orange-400/40 rounded-2xl p-5 shadow-sm transition-all group relative overflow-hidden flex flex-col justify-between"
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400/0 group-hover:via-orange-400/80 to-transparent transition-all duration-300" />

                          <div>
                            {/* Staff Avatar & Name */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/20 text-orange-400 flex items-center justify-center shrink-0 group-hover:bg-orange-400 group-hover:text-slate-950 transition-colors">
                                  <User size={16} />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-base font-rajdhani font-black uppercase text-main tracking-wide group-hover:text-orange-400 transition-colors truncate">
                                    {staffName}
                                  </h4>
                                  <span className="text-[10px] text-muted flex items-center gap-1 font-mono">
                                    @{staff.username} • {staff.role === 'branch_admin' ? 'Manager' : 'Staff'}
                                  </span>
                                </div>
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-brand-muted/10 flex items-center justify-center text-muted group-hover:text-orange-400 transition-colors shrink-0">
                                <ArrowUpRight size={14} />
                              </div>
                            </div>

                            {/* Status Badge: Restock Requests {number of products} */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <span className={`text-[11px] font-black uppercase px-3 py-1.5 rounded-full border flex items-center gap-1.5 font-mono ${
                                hasPending 
                                  ? 'bg-orange-400/15 text-orange-400 border-orange-400/30' 
                                  : 'bg-brand-muted/10 text-muted border-border'
                              }`}>
                                <Inbox size={13} />
                                Restock Requests: {staff.pendingRequestsCount} {staff.pendingRequestsCount === 1 ? 'Product' : 'Products'}
                              </span>
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                            <span className="text-muted text-[10px] uppercase font-bold tracking-wider">Total Submissions</span>
                            <span className="font-rajdhani font-black text-main">{staff.totalRequests} Requisitions</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Branch Direct Inventory Restock Section */}
              <div className="mt-12 pt-8 border-t border-border">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-4 bg-orange-400 rounded-full" />
                    <div>
                      <h3 className="text-xs font-rajdhani font-black uppercase text-main tracking-widest">INVENTORY DIRECT RESTOCK</h3>
                      <p className="text-[10px] text-muted font-medium">Request stock replenishment directly from Central HQ Warehouse</p>
                    </div>
                  </div>
                  
                  <div className="relative group w-full md:w-80">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-main/30 group-focus-within:text-orange-400 transition-colors">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search component or SKU..."
                      className="w-full bg-brand-surface border border-border rounded-xl py-3 pl-11 pr-4 text-xs text-main focus:outline-none focus:border-orange-400/30 transition-all font-bold tracking-tight shadow-sm"
                    />
                  </div>
                </div>

                {/* Categorized List */}
                {!loading && paginatedInventory.length > 0 && (
                  <div className="bg-brand-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                    {paginatedInventory.map((item, idx) => {
                      const isLowStock = item.quantity <= item.low_stock_threshold;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`flex flex-col md:flex-row md:items-center gap-4 px-6 py-4 transition-colors group ${
                            idx !== paginatedInventory.length - 1 ? 'border-b border-border' : ''
                          } hover:bg-brand-muted/5`}
                        >
                          {/* Status Indicator */}
                          <div className="flex items-center gap-4 md:w-44 shrink-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                              isLowStock 
                                ? 'bg-brand-crimson/10 border-brand-crimson/20 text-brand-crimson' 
                                : 'bg-green-400/10 border-green-400/20 text-green-400'
                            }`}>
                              {isLowStock ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                            </div>
                            <div>
                              <p className={`text-[10px] font-black uppercase tracking-widest ${isLowStock ? 'text-brand-crimson' : 'text-green-400'}`}>
                                {isLowStock ? 'CRITICAL STOCK' : 'OPTIMAL'}
                              </p>
                              <p className="text-[9px] text-muted font-mono uppercase mt-0.5">Threshold: {item.low_stock_threshold}</p>
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-rajdhani font-bold text-main truncate capitalize">
                              {item.Product?.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-muted/40 uppercase tracking-widest font-mono">{item.Product?.sku}</span>
                              <div className="w-1 h-1 rounded-full bg-border" />
                              <span className="text-[10px] text-orange-400/80 uppercase tracking-widest font-bold flex items-center gap-1">
                                <Building size={10} />
                                {item.Branch?.name || branchName}
                              </span>
                            </div>
                          </div>

                          {/* Current Stock */}
                          <div className="md:text-right shrink-0">
                            <p className="text-[9px] text-main/30 font-black uppercase tracking-[2px] mb-0.5">Active Stock</p>
                            <p className={`text-xl font-rajdhani font-black ${isLowStock ? 'text-brand-crimson' : 'text-main'}`}>
                              {item.quantity} <span className="text-[10px] text-muted/50 tracking-widest">UNITS</span>
                            </p>
                          </div>

                          {/* Action */}
                          <div className="shrink-0 mt-4 md:mt-0 flex justify-end">
                            <button 
                              onClick={() => setRestockItem(item)}
                              className={`h-9 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                                isLowStock 
                                  ? 'bg-brand-crimson/10 text-brand-crimson hover:bg-brand-crimson hover:text-white border border-brand-crimson/20 shadow-[0_0_15px_rgba(215,38,56,0.15)]'
                                  : 'bg-brand-surface border border-border text-main hover:text-orange-400 hover:border-orange-400/30'
                              }`}
                            >
                              <Download size={13} />
                              Restock
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination Footer */}
                {sortedInventory.length > limit && (
                  <div className="flex items-center justify-between mt-4 px-2">
                    <div className="text-sm text-muted">
                      Showing {((currentPage - 1) * limit) + 1}–{Math.min(currentPage * limit, sortedInventory.length)} of {sortedInventory.length} items
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      limit={limit}
                      onLimitChange={setLimit}
                      limits={[10,25,50,100]}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* SUPER ADMIN: BRANCH REQUEST LIST MODAL WITH CHECKBOXES */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeBranchModal && isSuperAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="bg-brand-bgbase/95 border border-brand-neonblue/25 rounded-3xl w-full max-w-6xl max-h-[86vh] flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_35px_rgba(0,210,255,0.08)] overflow-hidden relative backdrop-blur-2xl"
            >
              {/* Top Cyber Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-neonblue to-transparent" />

              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-border bg-brand-surface/70 flex justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-brand-neonblue/15 border border-brand-neonblue/30 text-brand-neonblue flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,210,255,0.2)]">
                    <Building size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl sm:text-2xl font-rajdhani font-black uppercase tracking-wide text-main">
                        {activeBranchModal.name}
                      </h2>
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-neonblue bg-brand-neonblue/10 px-2.5 py-0.5 rounded-full border border-brand-neonblue/25 font-mono flex items-center gap-1">
                        <MapPin size={10} />
                        {activeBranchModal.location || 'Branch Sector'}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-medium mt-0.5">
                      Review stock requests, verify requested quantities, and batch authorize replenishment.
                    </p>
                  </div>
                </div>

                {/* Header Metrics & Close Button */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Clock size={12} />
                      <span>{branchStatusCounts.Pending} Pending</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-brand-surface border border-border text-main font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Inbox size={12} className="text-brand-neonblue" />
                      <span>{branchStatusCounts.All} Total</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveBranchModal(null)}
                    title="Close"
                    className="p-2.5 rounded-xl bg-brand-surface border border-border text-muted hover:text-main hover:bg-brand-muted/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Toolbar: Search + Filter Tabs */}
              <div className="px-6 py-4 border-b border-border bg-brand-surface/40 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={branchModalSearch}
                    onChange={(e) => setBranchModalSearch(e.target.value)}
                    placeholder="Search request #, product name, requester..."
                    className="w-full bg-brand-bgbase/90 border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-main placeholder:text-muted/60 focus:outline-none focus:border-brand-neonblue/40 font-medium"
                  />
                  {branchModalSearch && (
                    <button
                      onClick={() => setBranchModalSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Status Tabs with Live Counter Badges */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                  {[
                    { id: "Pending", label: "Pending", count: branchStatusCounts.Pending },
                    { id: "Approved", label: "Approved", count: branchStatusCounts.Approved },
                    { id: "Fulfilled", label: "Fulfilled", count: branchStatusCounts.Fulfilled },
                    { id: "Rejected", label: "Rejected", count: branchStatusCounts.Rejected },
                    { id: "All", label: "All", count: branchStatusCounts.All },
                  ].map((tab) => {
                    const isActive = branchModalReqStatus === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setBranchModalReqStatus(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                          isActive
                            ? "bg-brand-neonblue text-slate-950 shadow-md shadow-brand-neonblue/20"
                            : "bg-brand-surface border border-border text-muted hover:text-main hover:border-border/80"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                          isActive
                            ? "bg-slate-950 text-brand-neonblue"
                            : "bg-brand-muted/20 text-muted"
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Batch Action Bar */}
              {selectedRequestIds.size > 0 && (
                <div className="px-6 py-2.5 bg-brand-neonblue/10 border-b border-brand-neonblue/20 flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-brand-neonblue font-bold">
                    <CheckSquare size={14} />
                    <span>{selectedRequestIds.size} requisition(s) selected</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchApprove}
                      disabled={batchActionLoading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-rajdhani font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <ThumbsUp size={12} />
                      Batch Approve ({selectedRequestIds.size})
                    </button>
                    <button
                      onClick={() => {
                        setBatchRejectReason("");
                        setShowBatchRejectModal(true);
                      }}
                      disabled={batchActionLoading}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 font-rajdhani font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <ThumbsDown size={12} />
                      Batch Reject ({selectedRequestIds.size})
                    </button>
                  </div>
                </div>
              )}

              {/* Request Table Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {requestsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-2 border-border border-t-brand-neonblue rounded-full animate-spin mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-muted">Loading Requisitions...</p>
                  </div>
                ) : activeBranchRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-brand-surface/40 border border-border border-dashed rounded-2xl">
                    <Inbox size={40} className="text-muted/30 mb-3" />
                    <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-wider mb-1">
                      No Requisitions Found
                    </h3>
                    <p className="text-xs text-muted">
                      No stock requests match the selected status filter or search query.
                    </p>
                  </div>
                ) : (
                  <div className="border border-border rounded-2xl overflow-hidden bg-brand-surface/50 shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border bg-brand-surface/80 text-[10px] font-black uppercase text-muted tracking-wider">
                          <th className="py-3 px-4 w-10">
                            {selectableSuperAdminRequests.length > 0 && (
                              <button
                                onClick={handleToggleSelectAllSuperAdmin}
                                className="text-muted hover:text-main"
                              >
                                {isAllSuperAdminChecked ? <CheckSquare size={16} className="text-brand-neonblue" /> : <Square size={16} />}
                              </button>
                            )}
                          </th>
                          <th className="py-3 px-4">Request #</th>
                          <th className="py-3 px-4">Product Component</th>
                          <th className="py-3 px-4">Requester</th>
                          <th className="py-3 px-4 text-right">Requested</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {activeBranchRequests.map((req) => {
                          const badge = getStatusBadge(req.status);
                          const isPending = isSuperAdminPending(req.status);
                          const isChecked = selectedRequestIds.has(req.id);
                          const requesterName = req.User?.first_name ? `${req.User.first_name} ${req.User.last_name || ''}` : (req.User?.username || 'Staff');

                          return (
                            <tr
                              key={req.id}
                              className={`hover:bg-brand-muted/5 transition-colors ${isChecked ? 'bg-brand-neonblue/5' : ''}`}
                            >
                              <td className="py-3.5 px-4">
                                {isPending ? (
                                  <button
                                    onClick={() => handleToggleRowSuperAdmin(req.id)}
                                    className="text-muted hover:text-main"
                                  >
                                    {isChecked ? <CheckSquare size={16} className="text-brand-neonblue" /> : <Square size={16} />}
                                  </button>
                                ) : (
                                  <span className="w-4 h-4 block" />
                                )}
                              </td>

                              <td className="py-3.5 px-4 font-mono font-bold text-main">
                                <span className="text-brand-neonblue">{req.request_number || `SR-${req.id}`}</span>
                                <span className="block text-[10px] text-muted font-normal font-sans">
                                  {new Date(req.createdAt).toLocaleDateString()}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-rajdhani font-bold text-main text-sm">
                                  {req.Product?.name || 'Product'}
                                </div>
                                <span className="text-[10px] text-muted font-mono uppercase">
                                  SKU: {req.Product?.sku || 'N/A'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-medium text-main block">{requesterName}</span>
                                <span className="text-[10px] text-muted font-mono capitalize">{req.User?.role?.replace('_', ' ') || 'Staff'}</span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <span className="font-mono font-bold text-sm text-orange-400">
                                  {req.quantity_requested}
                                </span>
                                <span className="text-[9px] text-muted uppercase block">Units</span>
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${badge.cls}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                  {badge.label}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isPending && (
                                    <>
                                      <button
                                        onClick={() => handleOpenApproveModal(req)}
                                        title="Approve Request"
                                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 transition-all"
                                      >
                                        <ThumbsUp size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleOpenRejectModal(req)}
                                        title="Reject Request"
                                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-all"
                                      >
                                        <ThumbsDown size={13} />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => {
                                      setActiveReq(req);
                                      setShowDetailsModal(true);
                                    }}
                                    title="View Requisition Details"
                                    className="p-2 rounded-xl bg-brand-surface hover:bg-brand-muted/10 text-muted hover:text-main border border-border transition-all"
                                  >
                                    <FileText size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BRANCH ADMIN: STAFF REQUEST LIST MODAL WITH CHECKBOXES */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeStaffModal && !isSuperAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="bg-brand-bgbase/95 border border-orange-400/25 rounded-3xl w-full max-w-6xl max-h-[86vh] flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_35px_rgba(249,115,22,0.08)] overflow-hidden relative backdrop-blur-2xl"
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent" />

              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-border bg-brand-surface/70 flex justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-orange-400/15 border border-orange-400/30 text-orange-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                    <User size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl sm:text-2xl font-rajdhani font-black uppercase tracking-wide text-main">
                        {activeStaffModal.first_name ? `${activeStaffModal.first_name} ${activeStaffModal.last_name || ''}` : activeStaffModal.username}
                      </h2>
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-400/10 px-2.5 py-0.5 rounded-full border border-orange-400/25 font-mono flex items-center gap-1">
                        @{activeStaffModal.username} • {branchName}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-medium mt-0.5">
                      Review stock requisitions submitted by this staff member and endorse for HQ procurement.
                    </p>
                  </div>
                </div>

                {/* Header Metrics & Close Button */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Clock size={12} />
                      <span>{staffStatusCounts.Pending} Pending</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-brand-surface border border-border text-main font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Inbox size={12} className="text-orange-400" />
                      <span>{staffStatusCounts.All} Total</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveStaffModal(null)}
                    title="Close"
                    className="p-2.5 rounded-xl bg-brand-surface border border-border text-muted hover:text-main hover:bg-brand-muted/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Toolbar: Search + Filter Tabs */}
              <div className="px-6 py-4 border-b border-border bg-brand-surface/40 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shrink-0">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={staffModalSearch}
                    onChange={(e) => setStaffModalSearch(e.target.value)}
                    placeholder="Search request #, product name, sku..."
                    className="w-full bg-brand-bgbase/90 border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-main placeholder:text-muted/60 focus:outline-none focus:border-orange-400/40 font-medium"
                  />
                  {staffModalSearch && (
                    <button
                      onClick={() => setStaffModalSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Status Tabs with Live Counter Badges */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                  {[
                    { id: "Pending", label: "Pending", count: staffStatusCounts.Pending },
                    { id: "Endorsed", label: "Endorsed to HQ", count: staffStatusCounts.Endorsed },
                    { id: "Fulfilled", label: "Fulfilled", count: staffStatusCounts.Fulfilled },
                    { id: "Rejected", label: "Rejected", count: staffStatusCounts.Rejected },
                    { id: "All", label: "All", count: staffStatusCounts.All },
                  ].map((tab) => {
                    const isActive = staffModalReqStatus === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setStaffModalReqStatus(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                          isActive
                            ? "bg-orange-400 text-slate-950 shadow-md shadow-orange-400/20"
                            : "bg-brand-surface border border-border text-muted hover:text-main hover:border-border/80"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                          isActive
                            ? "bg-slate-950 text-orange-400"
                            : "bg-brand-muted/20 text-muted"
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Batch Action Bar */}
              {selectedStaffRequestIds.size > 0 && (
                <div className="px-6 py-2.5 bg-orange-400/10 border-b border-orange-400/20 flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-orange-400 font-bold">
                    <CheckSquare size={14} />
                    <span>{selectedStaffRequestIds.size} requisition(s) selected</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchEndorse}
                      disabled={batchActionLoading}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-rajdhani font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <ThumbsUp size={12} />
                      Batch Endorse to HQ ({selectedStaffRequestIds.size})
                    </button>
                    <button
                      onClick={() => {
                        setBatchRejectReason("");
                        setShowStaffBatchRejectModal(true);
                      }}
                      disabled={batchActionLoading}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 font-rajdhani font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <ThumbsDown size={12} />
                      Batch Decline ({selectedStaffRequestIds.size})
                    </button>
                  </div>
                </div>
              )}

              {/* Request Table Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {requestsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-2 border-border border-t-orange-400 rounded-full animate-spin mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-[3px] text-muted">Loading Requisitions...</p>
                  </div>
                ) : activeStaffRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-brand-surface/40 border border-border border-dashed rounded-2xl">
                    <Inbox size={40} className="text-muted/30 mb-3" />
                    <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-wider mb-1">
                      No Requisitions Found
                    </h3>
                    <p className="text-xs text-muted">
                      No stock requests match the selected status filter or search query for this staff member.
                    </p>
                  </div>
                ) : (
                  <div className="border border-border rounded-2xl overflow-hidden bg-brand-surface/50 shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border bg-brand-surface/80 text-[10px] font-black uppercase text-muted tracking-wider">
                          <th className="py-3 px-4 w-10">
                            {selectableStaffRequests.length > 0 && (
                              <button
                                onClick={handleToggleSelectAllStaff}
                                className="text-muted hover:text-main"
                              >
                                {isAllStaffChecked ? <CheckSquare size={16} className="text-orange-400" /> : <Square size={16} />}
                              </button>
                            )}
                          </th>
                          <th className="py-3 px-4">Request #</th>
                          <th className="py-3 px-4">Product Component</th>
                          <th className="py-3 px-4 text-right">Requested</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4">Notes</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {activeStaffRequests.map((req) => {
                          const badge = getStatusBadge(req.status);
                          const isPending = isStaffPending(req.status);
                          const isChecked = selectedStaffRequestIds.has(req.id);

                          return (
                            <tr
                              key={req.id}
                              className={`hover:bg-brand-muted/5 transition-colors ${isChecked ? 'bg-orange-400/5' : ''}`}
                            >
                              <td className="py-3.5 px-4">
                                {isPending ? (
                                  <button
                                    onClick={() => handleToggleRowStaff(req.id)}
                                    className="text-muted hover:text-main"
                                  >
                                    {isChecked ? <CheckSquare size={16} className="text-orange-400" /> : <Square size={16} />}
                                  </button>
                                ) : (
                                  <span className="w-4 h-4 block" />
                                )}
                              </td>

                              <td className="py-3.5 px-4 font-mono font-bold text-main">
                                <span className="text-orange-400">{req.request_number || `SR-${req.id}`}</span>
                                <span className="block text-[10px] text-muted font-normal font-sans">
                                  {new Date(req.createdAt).toLocaleDateString()}
                                </span>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-rajdhani font-bold text-main text-sm">
                                  {req.Product?.name || 'Product'}
                                </div>
                                <span className="text-[10px] text-muted font-mono uppercase">
                                  SKU: {req.Product?.sku || 'N/A'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <span className="font-mono font-bold text-sm text-orange-400">
                                  {req.quantity_requested}
                                </span>
                                <span className="text-[9px] text-muted uppercase block">Units</span>
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${badge.cls}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                  {badge.label}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 max-w-[180px]">
                                <span className="text-xs text-muted truncate block" title={req.notes || "No notes"}>
                                  {req.notes || "—"}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isPending && (
                                    <>
                                      <button
                                        onClick={() => handleOpenEndorseModal(req)}
                                        title="Endorse to HQ"
                                        className="p-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 transition-all flex items-center gap-1 text-[11px] font-bold"
                                      >
                                        <ThumbsUp size={13} />
                                        <span className="hidden sm:inline">Endorse</span>
                                      </button>
                                      <button
                                        onClick={() => handleOpenStaffRejectModal(req)}
                                        title="Decline Request"
                                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-all"
                                      >
                                        <ThumbsDown size={13} />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => {
                                      setActiveReq(req);
                                      setShowDetailsModal(true);
                                    }}
                                    title="View Requisition Details"
                                    className="p-2 rounded-xl bg-brand-surface hover:bg-brand-muted/10 text-muted hover:text-main border border-border transition-all"
                                  >
                                    <FileText size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SUPER ADMIN APPROVE MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showApproveModal && activeReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowApproveModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <ThumbsUp size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Authorize Stock Requisition
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    {activeReq.request_number}
                  </p>
                </div>
              </div>

              <div className="bg-brand-bgbase border border-border rounded-xl p-3.5 text-xs mb-4 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">Product:</span>
                  <span className="font-bold text-main">{activeReq.Product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Requested Quantity:</span>
                  <span className="font-mono font-bold text-orange-400">{activeReq.quantity_requested} units</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Authorized Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={activeReq.quantity_requested}
                    value={approvedQty}
                    onChange={(e) => setApprovedQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-main focus:outline-none focus:border-emerald-400/40"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Approval Notes (Optional)
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="e.g. Approved for immediate dispatch via central warehouse."
                    rows={2}
                    className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-emerald-400/40 resize-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-main"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-all flex items-center gap-2"
                >
                  {actionLoading ? "Authorizing..." : "Confirm Approval"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BRANCH ADMIN ENDORSE MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showEndorseModal && activeReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowEndorseModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                  <ThumbsUp size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Endorse Requisition to HQ
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    {activeReq.request_number}
                  </p>
                </div>
              </div>

              <div className="bg-brand-bgbase border border-border rounded-xl p-3.5 text-xs mb-4 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">Product:</span>
                  <span className="font-bold text-main">{activeReq.Product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Requested Quantity:</span>
                  <span className="font-mono font-bold text-orange-400">{activeReq.quantity_requested} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Requester:</span>
                  <span className="font-bold text-main">{activeReq.User?.first_name ? `${activeReq.User.first_name} ${activeReq.User.last_name || ''}` : activeReq.User?.username}</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Branch Endorsement Notes (Optional)
                  </label>
                  <textarea
                    value={endorseNotes}
                    onChange={(e) => setEndorseNotes(e.target.value)}
                    placeholder="e.g. Verified by branch manager for weekend tournament stock."
                    rows={2}
                    className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-orange-400/40 resize-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEndorseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-main"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEndorse}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white shadow-lg transition-all flex items-center gap-2"
                >
                  {actionLoading ? "Endorsing..." : "Forward to HQ"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SUPER ADMIN REJECT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showRejectModal && activeReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowRejectModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <ThumbsDown size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Decline Stock Requisition
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    {activeReq.request_number}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Select Rejection Reason
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-3.5 py-2.5 text-xs text-main focus:outline-none focus:border-rose-400/30 font-medium"
                  >
                    {REJECTION_PRESETS.map((r, i) => (
                      <option key={i} value={r} className="bg-brand-surface text-main">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Additional Explanation
                  </label>
                  <textarea
                    value={rejectionCustom}
                    onChange={(e) => setRejectionCustom(e.target.value)}
                    placeholder="Specific explanation..."
                    rows={3}
                    className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-rose-400/30 resize-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-main"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all flex items-center gap-2"
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BRANCH ADMIN STAFF REJECT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showStaffRejectModal && activeReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowStaffRejectModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <ThumbsDown size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Decline Staff Requisition
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    {activeReq.request_number}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Select Rejection Reason
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-brand-bgbase border border-border rounded-xl px-3.5 py-2.5 text-xs text-main focus:outline-none focus:border-rose-400/30 font-medium"
                  >
                    {REJECTION_PRESETS.map((r, i) => (
                      <option key={i} value={r} className="bg-brand-surface text-main">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Additional Explanation
                  </label>
                  <textarea
                    value={rejectionCustom}
                    onChange={(e) => setRejectionCustom(e.target.value)}
                    placeholder="Specific explanation..."
                    rows={3}
                    className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-rose-400/30 resize-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStaffRejectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-main"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStaffReject}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all flex items-center gap-2"
                >
                  {actionLoading ? "Declining..." : "Decline Requisition"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SUPER ADMIN BATCH REJECT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBatchRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowBatchRejectModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <ThumbsDown size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Batch Reject {selectedRequestIds.size} Requests
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    All selected requisitions will be declined
                  </p>
                </div>
              </div>

              <form onSubmit={handleBatchRejectSubmit}>
                <div className="mb-6">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Reason for Batch Rejection
                  </label>
                  <textarea
                    value={batchRejectReason}
                    onChange={(e) => setBatchRejectReason(e.target.value)}
                    placeholder="Provide reason for declining all selected requisitions..."
                    rows={3}
                    required
                    className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-rose-400/30 resize-none font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBatchRejectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-main"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={batchActionLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all flex items-center gap-2"
                  >
                    {batchActionLoading ? "Rejecting..." : `Reject ${selectedRequestIds.size} Requests`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BRANCH ADMIN BATCH REJECT MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showStaffBatchRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowStaffBatchRejectModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <ThumbsDown size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Batch Decline {selectedStaffRequestIds.size} Staff Requests
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    All selected staff requisitions will be declined
                  </p>
                </div>
              </div>

              <form onSubmit={handleBatchStaffRejectSubmit}>
                <div className="mb-6">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted mb-1.5">
                    Reason for Batch Rejection
                  </label>
                  <textarea
                    value={batchRejectReason}
                    onChange={(e) => setBatchRejectReason(e.target.value)}
                    placeholder="Provide reason for declining all selected requisitions..."
                    rows={3}
                    required
                    className="w-full bg-brand-bgbase border border-border rounded-xl p-3 text-xs text-main focus:outline-none focus:border-rose-400/30 resize-none font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowStaffBatchRejectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted hover:text-main"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={batchActionLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-rajdhani font-black uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all flex items-center gap-2"
                  >
                    {batchActionLoading ? "Declining..." : `Decline ${selectedStaffRequestIds.size} Requests`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* DETAILS MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showDetailsModal && activeReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-surface border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-4 right-4 text-muted hover:text-main"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-neonblue/15 border border-brand-neonblue/30 text-brand-neonblue flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-rajdhani font-black uppercase text-main">
                    Requisition Details
                  </h3>
                  <p className="text-[10px] text-muted uppercase font-mono tracking-wider">
                    {activeReq.request_number}
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-brand-bgbase border border-border rounded-xl p-4 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-muted">Product:</span>
                  <span className="font-bold text-main">{activeReq.Product?.name} ({activeReq.Product?.sku})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Quantity Requested:</span>
                  <span className="font-mono font-bold text-orange-400">{activeReq.quantity_requested} units</span>
                </div>
                {activeReq.quantity_approved && (
                  <div className="flex justify-between">
                    <span className="text-muted">Quantity Approved:</span>
                    <span className="font-mono font-bold text-emerald-400">{activeReq.quantity_approved} units</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Requester:</span>
                  <span className="font-bold text-main">
                    {activeReq.User?.first_name ? `${activeReq.User.first_name} ${activeReq.User.last_name || ''}` : activeReq.User?.username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Current Status:</span>
                  <span className="font-bold uppercase text-brand-neonblue">{activeReq.status}</span>
                </div>
                {activeReq.branch_approval_notes && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted block text-[10px] uppercase font-bold mb-0.5">Branch Endorsement Notes:</span>
                    <p className="text-main italic">{activeReq.branch_approval_notes}</p>
                  </div>
                )}
                {activeReq.approval_notes && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted block text-[10px] uppercase font-bold mb-0.5">HQ Approval Notes:</span>
                    <p className="text-main italic">{activeReq.approval_notes}</p>
                  </div>
                )}
                {activeReq.rejection_reason && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-rose-400 block text-[10px] uppercase font-bold mb-0.5">Rejection Reason:</span>
                    <p className="text-rose-400 italic">{activeReq.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-brand-surface border border-border text-main hover:bg-brand-muted/10"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* BRANCH RESTOCK REQUEST MODAL (FOR DIRECT INVENTORY RESTOCK) */}
      {/* ========================================================================= */}
      {restockItem && (
        <RestockRequestModal
          inventoryItem={restockItem}
          onClose={() => setRestockItem(null)}
          onSuccess={() => {
            fetchData();
            fetchRequests();
          }}
        />
      )}
    </div>
  );
}
