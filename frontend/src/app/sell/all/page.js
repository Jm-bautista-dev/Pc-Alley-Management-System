"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Tag,
  CreditCard,
  Banknote,
  Printer,
  ChevronLeft,
  Calendar,
  FileDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import { exportToExcel } from "@/lib/excelExport";
import { useTheme } from "@/context/ThemeContext";
import { apiUrl } from "@/lib/api";

const OrderDetailsModal = ({ isOpen, onClose, order }) => {
  const printRef = useRef(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      
      document.body.innerHTML = `
        <div class="print-container" style="font-family: monospace; max-width: 300px; margin: 0 auto; color: black; background: white; padding: 20px;">
           ${printContents}
        </div>
      `;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Quick restore of React root
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-brand-surface border border-brand-neonblue/20 rounded-2xl max-w-3xl w-full shadow-2xl relative flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Left Side: Order Ledger / Information View */}
        <div className="flex-1 p-6 md:p-8 bg-brand-surface border-r border-border/50 overflow-y-auto custom-scrollbar">
          <button onClick={onClose} className="flex items-center gap-2 text-muted hover:text-main text-xs uppercase font-black tracking-widest mb-6 transition-colors">
            <ChevronLeft size={16} /> Back to Ledger
          </button>
          
          <div className="flex justify-between items-start mb-6 border-b border-border/50 pb-6">
            <div>
              <h2 className="text-2xl font-rajdhani font-black tracking-tight text-main uppercase">Order #{order.id.toString().padStart(6, '0')}</h2>
              <p className="text-muted text-xs font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                <Calendar size={12} /> {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-[10px] uppercase font-black tracking-widest text-muted">Customer</span>
              <span className="font-bold text-main">{order.customer_name || 'Walk-in Customer'}</span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[3px] text-brand-neonblue mb-3">Itemized Receipt</h3>
            <div className="space-y-3">
              {order.OrderItems?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-brand-bgbase/50 border border-border/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-brand-surface flex items-center justify-center text-muted border border-border/50">
                      <Tag size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-main text-sm">{item.Product?.name || 'Unknown Item'}</p>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted">Qty: {item.quantity} × ₱{parseFloat(item.price_at_sale).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="font-black text-main">
                    ₱{(item.quantity * parseFloat(item.price_at_sale)).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-bgbase/30 rounded-xl p-4 border border-border/10 flex flex-col items-end">
            <p className="flex justify-between w-48 text-muted text-xs font-bold mb-1 uppercase tracking-widest"><span>Subtotal</span><span>₱{parseFloat(order.total_amount).toLocaleString()}</span></p>
            <p className="flex justify-between w-48 text-muted text-xs font-bold mb-3 uppercase tracking-widest"><span>Tax/Fees</span><span>₱0.00</span></p>
            <p className="flex justify-between w-48 text-main font-black text-xl border-t border-border/50 pt-2 uppercase"><span>Total</span><span className="text-brand-neonblue">₱{parseFloat(order.total_amount).toLocaleString()}</span></p>
          </div>
        </div>

        {/* Right Side: Thermal Receipt Preview */}
        <div className="w-full md:w-80 bg-[#f9fafb] text-black p-6 flex flex-col justify-between hidden md:flex shrink-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-black tracking-[2px] text-gray-500">Thermal Print Preview</span>
              <button onClick={handlePrint} className="px-3 py-1.5 rounded bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-sm hover:bg-blue-700 transition">
                <Printer size={12} /> Print
              </button>
            </div>
            
            {/* The actual printable area */}
            <div ref={printRef} className="bg-white p-4 shadow-sm border border-gray-200" style={{ fontFamily: 'monospace' }}>
               <div className="text-center mb-4">
                 <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>PC ALLEY</h2>
                 <p style={{ fontSize: '10px', margin: '2px 0 0 0' }}>Tech & Components</p>
                 <p style={{ fontSize: '10px', margin: '0 0 8px 0' }}>Order #{order.id.toString().padStart(6, '0')}</p>
                 <div style={{ borderBottom: '1px dashed #ccc', margin: '8px 0' }}></div>
               </div>
               
               <p style={{ fontSize: '11px', marginBottom: '8px' }}>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
               <p style={{ fontSize: '11px', marginBottom: '8px' }}>Customer: {order.customer_name || 'Walk-in'}</p>
               
               <div style={{ borderBottom: '1px dashed #ccc', margin: '8px 0' }}></div>
               
               <table style={{ width: '100%', fontSize: '11px', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th>QTY</th>
                      <th>ITEM</th>
                      <th style={{ textAlign: 'right' }}>AMT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.OrderItems?.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ verticalAlign: 'top', paddingTop: '4px' }}>x{item.quantity}</td>
                        <td style={{ verticalAlign: 'top', paddingTop: '4px', maxWidth: '120px', overflow: 'hidden' }}>{item.Product?.name}</td>
                        <td style={{ verticalAlign: 'top', paddingTop: '4px', textAlign: 'right' }}>{(item.quantity * parseFloat(item.price_at_sale)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
               
               <div style={{ borderBottom: '1px dashed #ccc', margin: '10px 0' }}></div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                 <span>TOTAL</span>
                 <span>₱{parseFloat(order.total_amount).toLocaleString()}</span>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
                 <span>PAID VIA</span>
                 <span style={{ textTransform: 'uppercase' }}>{order.payment_method || 'CASH'}</span>
               </div>
               
               <div style={{ borderBottom: '1px dashed #ccc', margin: '14px 0 10px 0' }}></div>
               <p style={{ textAlign: 'center', fontSize: '10px' }}>Thank you for shopping<br/>with PC Alley!</p>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
};


export default function SalesLedgerPage() {
  const { theme } = useTheme();
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await fetch(apiUrl("/api/sales/history"), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setSales(await res.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredSales = sales.filter(s => 
    s.id.toString().includes(search) || 
    (s.customer_name || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    const exportData = filteredSales.map(s => ({
      'Order ID': `#${s.id.toString().padStart(6, '0')}`,
      'Date': new Date(s.createdAt).toLocaleDateString(),
      'Time': new Date(s.createdAt).toLocaleTimeString(),
      'Customer': s.customer_name || 'Walk-in',
      'Items': s.OrderItems?.length || 0,
      'Payment Method': s.payment_method?.toUpperCase() || 'CASH',
      'Total Amount': parseFloat(s.total_amount),
      'Branch': s.Branch?.name || 'Unknown'
    }));

    const totalRevenue = filteredSales.reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0);
    const exportOptions = {
      title: 'PC ALLEY - SALES AUDIT LEDGER',
      subtitle: `Protocol: Full Transaction History | Filter: ${search || 'All Records'}`,
      summary: {
        'Total Transactions': filteredSales.length,
        'Gross Revenue': `₱${totalRevenue.toLocaleString()}`,
        'Average Order Value': `₱${(totalRevenue / (filteredSales.length || 1)).toLocaleString()}`,
        'System Integrity': 'Verified'
      }
    };

    try {
      exportToExcel(exportData, 'PCA_Sales_Ledger', 'Transactions', exportOptions);
      toast.success("Excel Sales Matrix Generated");
    } catch (e) {
      toast.error("Export Error");
    }
  };

  return (
    <div className={`flex bg-brand-bgbase min-h-screen text-main font-dmsans transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0eb]'}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <TopBar title="SALES LEDGER" />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 custom-scrollbar relative z-10 w-full max-w-[1400px] mx-auto">
          
          <div className="mb-8">
             <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-[10px] font-black tracking-[4px] uppercase text-main/40 mb-2">Sales History</motion.h2>
             <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-rajdhani font-black tracking-tight text-main uppercase">
               All <span className="text-brand-neonblue">Sales</span>
             </motion.h1>
          </div>

          {/* Filter Bar */}
          <div className="bg-brand-surface border border-border/50 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="relative w-full sm:max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
               <input 
                 type="text" 
                 placeholder="Search by Order ID or Customer..." 
                 value={search} 
                 onChange={e => setSearch(e.target.value)} 
                 className="w-full bg-brand-bgbase border border-border/50 text-main text-xs font-bold rounded-lg pl-9 pr-4 py-3 outline-none focus:border-brand-neonblue transition-colors flex-1" 
               />
             </div>
             <button className="bg-brand-bgbase border border-border/50 px-4 py-2.5 rounded-lg flex items-center justify-center text-muted hover:text-main hover:border-brand-neonblue/50 transition-colors w-full sm:w-auto text-[11px] uppercase tracking-widest font-black gap-2">
               <Filter size={14} /> Filter Date
             </button>
             <button 
               onClick={handleExport}
               className="bg-brand-bgbase border border-border/50 px-5 py-2.5 rounded-lg flex items-center justify-center text-muted hover:text-main hover:border-brand-neonblue/50 transition-colors w-full sm:w-auto text-[11px] uppercase tracking-widest font-black gap-2"
             >
               <FileDown size={14} className="text-brand-neonblue" /> Export Excel
             </button>
          </div>

          {/* Ledger Table */}
          <div className="bg-brand-surface border border-border/50 rounded-xl shadow-sm overflow-hidden flex flex-col">
             <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[60vh]">
               <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
                  <thead>
                    <tr className="bg-brand-bgbase/50 text-[10px] uppercase font-black tracking-widest text-muted border-b border-border/50">
                      <th className="py-4 px-6">Order ID</th>
                      <th className="py-4 px-6">Date & Time</th>
                      <th className="py-4 px-6">Customer</th>
                      <th className="py-4 px-6">Total Items</th>
                      <th className="py-4 px-6">Payment</th>
                      <th className="py-4 px-6 text-right">Revenue</th>
                      <th className="py-4 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSales.map((order, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.03 }} 
                        key={idx} 
                        className="border-b border-border/20 text-sm hover:bg-brand-bgbase/30 transition-colors group"
                      >
                        <td className="py-4 px-6 font-black text-brand-neonblue">
                          #{order.id.toString().padStart(6, '0')}
                        </td>
                        <td className="py-4 px-6 font-bold text-muted/80 text-xs">
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 font-bold text-main">
                          {order.customer_name || <span className="text-muted italic">Walk-in</span>}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 bg-brand-bgbase border border-border/50 rounded text-[9px] font-black text-muted">
                            {order.OrderItems?.length || 0} Products
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {order.payment_method === 'cash' ? <Banknote size={14} className="text-green-500"/> : <CreditCard size={14} className="text-brand-neonblue"/>}
                            <span className="text-[10px] uppercase font-black tracking-wider text-main/80">{order.payment_method || 'CASH'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-black text-main text-lg tracking-tight">
                          ₱{parseFloat(order.total_amount).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center">
                           <button onClick={() => setActiveOrder(order)} className="px-4 py-1.5 rounded-lg bg-brand-bgbase border border-border/50 text-muted hover:text-main hover:bg-border/20 transition-colors inline-flex items-center gap-2 text-[10px] uppercase font-black tracking-widest opacity-50 group-hover:opacity-100">
                             <Eye size={12} /> View Details
                           </button>
                        </td>
                      </motion.tr>
                    ))}
                    {filteredSales.length === 0 && (
                      <tr><td colSpan="7" className="py-20 text-center text-muted font-bold tracking-widest uppercase text-xs">No sales found.</td></tr>
                    )}
                  </tbody>
               </table>
             </div>

             {/* Pagination Controls */}
             {totalPages > 0 && (
               <div className="border-t border-border/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-brand-bgbase/30">
                 <span className="text-xs font-bold text-muted uppercase tracking-widest">
                   Showing {filteredSales.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSales.length)} of {filteredSales.length} Entries
                 </span>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                     disabled={currentPage === 1}
                     className="px-4 py-2 rounded-lg bg-brand-surface border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted hover:text-main hover:border-brand-neonblue/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   >
                     Prev
                   </button>
                   <div className="flex gap-1 items-center px-2">
                     <span className="text-[11px] font-black text-main">{currentPage} / {totalPages || 1}</span>
                   </div>
                   <button 
                     onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                     disabled={currentPage === totalPages || totalPages === 0}
                     className="px-4 py-2 rounded-lg bg-brand-surface border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted hover:text-main hover:border-brand-neonblue/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   >
                     Next
                   </button>
                 </div>
               </div>
             )}
          </div>

        </div>
        <Toaster position="bottom-right" />
      </main>

      <AnimatePresence>
        {activeOrder && <OrderDetailsModal isOpen={true} onClose={() => setActiveOrder(null)} order={activeOrder} />}
      </AnimatePresence>
    </div>
  );
}
