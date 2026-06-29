"use client";

import { useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// PC Alley – Formal Cash Receipt (matches the Sta. Rosa Schola Musica style)
// Two copies printed per page (Original + Duplicate)
// ─────────────────────────────────────────────────────────────────────────────

export function CashReceiptContent({ receipt, copy = "ORIGINAL" }) {
  const items    = receipt?.SaleItems || receipt?.OrderItems || [];
  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice || item.price_at_sale || 0);
    return sum + price * (item.quantity || 1);
  }, 0);
  const vatAmt    = subtotal * 0.12;
  const grandTotal = subtotal + vatAmt;
  const discount   = parseFloat(receipt?.discountAmount || receipt?.discount_amount || 0);
  const amountPaid = parseFloat(receipt?.amountPaid || receipt?.amount_paid || grandTotal);
  const change     = parseFloat(receipt?.changeAmount || receipt?.change_amount || 0);

  const paymentMethod = (receipt?.paymentMethod || receipt?.payment_method || "cash").toLowerCase();
  const isCash  = paymentMethod === "cash";
  const isGcash = paymentMethod === "gcash";
  const isCard  = paymentMethod === "card" || paymentMethod === "credit_card" || paymentMethod === "debit_card";

  const cashierName = receipt?.staffName
    || (receipt?.User
      ? (receipt.User.first_name
          ? `${receipt.User.first_name} ${receipt.User.last_name}`
          : receipt.User.username)
      : "Cashier");

  const txDate = receipt?.createdAt ? new Date(receipt.createdAt) : new Date();
  const formattedDate = txDate.toLocaleDateString("en-PH", {
    month: "long", day: "numeric", year: "numeric"
  });

  const invoiceNo = receipt?.invoiceNumber
    || `INV-${String(receipt?.id || 0).padStart(4, "0")}`;

  // Summary of items for "For Payment of" field
  const itemSummary = items.length > 0
    ? items.map(i => {
        const name = i.productName || i.Product?.name || "Item";
        return `${i.quantity}× ${name}`;
      }).join(", ")
    : "—";

  const branchName    = receipt?.Branch?.name    || "PC Alley Main Branch";
  const branchAddress = receipt?.Branch?.location || receipt?.Branch?.address || "Philippines";
  const branchPhone   = receipt?.Branch?.phone   || "";

  const customerName = receipt?.customerName || receipt?.customer_name || "Walk-in Customer";

  return (
    <div
      style={{
        width: "100%",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "11px",
        color: "#000",
        backgroundColor: "#fff",
        boxSizing: "border-box",
        padding: "0",
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "16px", fontWeight: "900", letterSpacing: "1px" }}>
          PC ALLEY
        </div>
        <div style={{ fontSize: "10px", color: "#555" }}>
          Computer Parts &amp; Accessories
        </div>
        <div style={{ fontSize: "10px", fontWeight: "700" }}>{branchName}</div>
        <div style={{ fontSize: "9px", color: "#666" }}>{branchAddress}</div>
        {branchPhone && <div style={{ fontSize: "9px", color: "#666" }}>{branchPhone}</div>}
      </div>

      {/* ── RECEIPT BANNER ── */}
      <div
        style={{
          backgroundColor: "#1e3a8a",
          color: "#fff",
          fontSize: "18px",
          fontWeight: "900",
          letterSpacing: "6px",
          textAlign: "left",
          padding: "6px 12px",
          marginBottom: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>RECEIPT</span>
        <span style={{ fontSize: "9px", fontWeight: "400", letterSpacing: "2px", opacity: 0.8 }}>
          {copy}
        </span>
      </div>

      {/* ── DATE + NO ── */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px" }}>
        <div>
          <span style={{ fontWeight: "700" }}>Date:</span>&nbsp;
          <span style={{
            borderBottom: "1px solid #000",
            minWidth: "130px",
            display: "inline-block",
            paddingBottom: "1px",
          }}>{formattedDate}</span>
        </div>
        <div>
          <span style={{ fontWeight: "700" }}>No.</span>&nbsp;
          <span style={{
            border: "1px solid #1e3a8a",
            padding: "1px 8px",
            fontWeight: "900",
            color: "#1e3a8a",
            letterSpacing: "1px",
          }}>{invoiceNo}</span>
        </div>
      </div>

      {/* ── RECEIVED FROM ── */}
      <div style={{ marginBottom: "6px" }}>
        <span style={{ fontWeight: "700" }}>Received From</span>
        <span style={{
          borderBottom: "1px solid #000",
          display: "inline-block",
          width: "calc(100% - 110px)",
          marginLeft: "8px",
          paddingBottom: "1px",
        }}>{customerName}</span>
      </div>

      {/* ── AMOUNT ── */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontWeight: "700", marginRight: "8px", whiteSpace: "nowrap" }}>Amount</span>
        <div style={{
          flex: 1,
          border: "2px solid #1e3a8a",
          padding: "4px 10px",
          backgroundColor: "#eff6ff",
          fontWeight: "900",
          fontSize: "14px",
          color: "#1e3a8a",
          letterSpacing: "1px",
        }}>
          ₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <span style={{ marginLeft: "8px", fontWeight: "700", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
          PESOS
        </span>
      </div>

      {/* ── FOR PAYMENT OF ── */}
      <div style={{ marginBottom: "4px" }}>
        <span style={{ fontWeight: "700" }}>For Payment of</span>
        <span style={{
          borderBottom: "1px solid #000",
          display: "inline-block",
          width: "calc(100% - 120px)",
          marginLeft: "8px",
          paddingBottom: "1px",
          fontSize: "10px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>{itemSummary}</span>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <span style={{ fontWeight: "700" }}>From</span>
        <span style={{
          borderBottom: "1px solid #aaa",
          display: "inline-block",
          width: "80px",
          margin: "0 6px",
        }}></span>
        <span style={{ fontWeight: "700" }}>to</span>
        <span style={{
          borderBottom: "1px solid #aaa",
          display: "inline-block",
          width: "80px",
          margin: "0 6px",
        }}></span>
      </div>

      {/* ── BOTTOM SECTION: Received By + Paid By + Account Summary ── */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>

        {/* Left: Received By */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "700", marginBottom: "4px" }}>Received By</div>
          <div style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "8px 10px",
            fontSize: "10px",
            lineHeight: "1.6",
            backgroundColor: "#f9fafb",
          }}>
            <div style={{ fontWeight: "900", textTransform: "uppercase", fontSize: "11px" }}>
              {cashierName}
            </div>
            <div style={{ color: "#555" }}>{branchName}</div>
            <div style={{ color: "#555" }}>{branchAddress}</div>
            {branchPhone && <div style={{ color: "#555" }}>{branchPhone}</div>}
          </div>
        </div>

        {/* Right: Paid By + Account Summary */}
        <div style={{ width: "180px", flexShrink: 0 }}>

          {/* Paid By checkboxes */}
          <div style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "6px 10px",
            marginBottom: "8px",
            fontSize: "10px",
            lineHeight: "1.9",
          }}>
            <div style={{ fontWeight: "700", marginBottom: "2px" }}>Paid by</div>
            {[
              { label: "Cash",   checked: isCash  },
              { label: "GCash",  checked: isGcash },
              { label: "Card",   checked: isCard  },
            ].map(({ label, checked }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: "12px", height: "12px",
                  border: "1.5px solid #1e3a8a",
                  backgroundColor: checked ? "#1e3a8a" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  color: "#fff",
                  fontSize: "8px",
                  fontWeight: "900",
                }}>
                  {checked ? "✓" : ""}
                </div>
                <span style={{ fontWeight: checked ? "900" : "400" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Account Summary */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <tbody>
              {[
                { label: "Account Amt",  value: grandTotal },
                { label: "This Payment", value: amountPaid },
                { label: isCash ? "Change" : "Balance Due", value: isCash ? change : Math.max(0, grandTotal - amountPaid) },
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td style={{
                    border: "1px solid #ccc",
                    padding: "3px 6px",
                    fontWeight: "700",
                    backgroundColor: "#f3f4f6",
                    whiteSpace: "nowrap",
                  }}>
                    {label}
                  </td>
                  <td style={{
                    border: "1px solid #ccc",
                    padding: "3px 6px",
                    textAlign: "right",
                    fontWeight: "900",
                    color: "#1e3a8a",
                  }}>
                    ₱{value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Item breakdown (compact) ── */}
      {items.length > 0 && (
        <div style={{ marginTop: "10px", borderTop: "1px dashed #ccc", paddingTop: "6px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e3a8a", color: "#fff" }}>
                <th style={{ padding: "3px 5px", textAlign: "left", fontWeight: "700" }}>Item</th>
                <th style={{ padding: "3px 5px", textAlign: "center", fontWeight: "700" }}>Qty</th>
                <th style={{ padding: "3px 5px", textAlign: "right", fontWeight: "700" }}>Unit</th>
                <th style={{ padding: "3px 5px", textAlign: "right", fontWeight: "700" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const name  = item.productName || item.Product?.name || "Item";
                const price = parseFloat(item.unitPrice || item.price_at_sale || 0);
                return (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#f9fafb" : "#fff" }}>
                    <td style={{ padding: "2px 5px", borderBottom: "1px solid #e5e7eb" }}>
                      {name.length > 30 ? name.slice(0, 29) + "…" : name}
                    </td>
                    <td style={{ padding: "2px 5px", textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>{item.quantity}</td>
                    <td style={{ padding: "2px 5px", textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>
                      ₱{price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "2px 5px", textAlign: "right", fontWeight: "700", borderBottom: "1px solid #e5e7eb" }}>
                      ₱{(item.quantity * price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ backgroundColor: "#eff6ff" }}>
                <td colSpan={3} style={{ padding: "3px 5px", fontWeight: "700", fontSize: "10px" }}>VAT (12%)</td>
                <td style={{ padding: "3px 5px", textAlign: "right", fontWeight: "700" }}>
                  ₱{vatAmt.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr style={{ backgroundColor: "#1e3a8a", color: "#fff" }}>
                <td colSpan={3} style={{ padding: "3px 5px", fontWeight: "900", fontSize: "11px" }}>GRAND TOTAL</td>
                <td style={{ padding: "3px 5px", textAlign: "right", fontWeight: "900", fontSize: "12px" }}>
                  ₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        marginTop: "10px",
        paddingTop: "6px",
        borderTop: "1px solid #e5e7eb",
        textAlign: "center",
        fontSize: "8px",
        color: "#9ca3af",
      }}>
        This is your official receipt. Thank you for your purchase! &mdash; PC Alley POS System
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full page print layout with TWO copies (Original + Duplicate)
// ─────────────────────────────────────────────────────────────────────────────
export function CashReceiptPrintPage({ receipt }) {
  return (
    <div style={{ width: "100%", fontFamily: "Arial, Helvetica, sans-serif" }}>
      {/* Copy 1 – Original */}
      <div style={{
        padding: "20px 24px",
        borderBottom: "2px dashed #9ca3af",
        marginBottom: "0",
        pageBreakInside: "avoid",
      }}>
        <CashReceiptContent receipt={receipt} copy="ORIGINAL" />
      </div>

      {/* Scissors cut line */}
      <div style={{
        textAlign: "center",
        fontSize: "9px",
        color: "#9ca3af",
        padding: "4px 0",
        letterSpacing: "2px",
      }}>
        ✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ CUT HERE ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ✂
      </div>

      {/* Copy 2 – Duplicate */}
      <div style={{
        padding: "20px 24px",
        pageBreakInside: "avoid",
      }}>
        <CashReceiptContent receipt={receipt} copy="DUPLICATE" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal wrapper – Preview + Print + PDF actions
// ─────────────────────────────────────────────────────────────────────────────
export function ThermalReceiptModal({ receipt, isOpen, onClose }) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    const content = document.getElementById("cash-receipt-print-area");
    if (!content) return;

    const printWin = window.open("", "_blank", "width=800,height=900");
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PC Alley Receipt – ${receipt?.invoiceNumber || receipt?.id || ""}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { background: white; color: black; }
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              color: #000;
            }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: "93vh", width: "700px", maxWidth: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-rajdhani font-black uppercase text-main tracking-widest">
              Cash Receipt Preview
            </h3>
            <p className="text-[9px] text-muted font-bold uppercase tracking-wider mt-0.5">
              Two-copy A4 format — Original &amp; Duplicate
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-main/5 flex items-center justify-center hover:bg-brand-crimson hover:text-white transition-all text-muted text-sm font-black"
          >
            ✕
          </button>
        </div>

        {/* Receipt preview area */}
        <div
          className="overflow-y-auto custom-scrollbar flex-1"
          style={{ background: "#e5e7eb", padding: "20px" }}
        >
          <div
            className="mx-auto bg-white shadow-xl border border-gray-300"
            style={{ width: "100%", maxWidth: "640px" }}
            id="cash-receipt-print-area"
          >
            <CashReceiptPrintPage receipt={receipt} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 p-5 border-t border-border bg-brand-muted/5 shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-[#1e3a8a] text-white font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2 hover:opacity-80 transition-all shadow"
          >
            🖨 Print Receipt
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-brand-surface border border-border text-muted font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2 hover:text-main hover:bg-brand-hover transition-all"
          >
            📥 Save as PDF
          </button>
          <button
            onClick={onClose}
            className="py-3 px-5 bg-brand-crimson text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Keep named export for backward compat
export { ThermalReceiptModal as CashReceiptModal };
