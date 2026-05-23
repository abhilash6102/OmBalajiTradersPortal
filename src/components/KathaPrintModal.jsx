import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, BookOpen, Percent } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const clean = dateStr.split("T")[0];
  const [y, m, d] = clean.split("-");
  return `${d}/${m}/${y}`;
}

const TRADER_MAP = {
  "sbom": "SRI BALAJI OIL MILL",
  "rkep": "RADHA KRISHNA ENTERPRISES",
  "gni": "GHAJANAND INDUSTRIES",
  "lvi": "LAXMI VENKATESHWARA INDUSTRIES",
  "lkt": "LAXMI KRISHNA TRADERS",
  "slstc": "SRI LAXMI SRINIVASA TRADING COMPANY",
  "srd": "SREE RAM DECORDIGATOR",
  "rtc": "RADHIKA TRADING COMPANY",
  "ai": "AAMINA INDUSTRIES",
  "noi": "NOOR INDUSTRIES",
  "ki": "KADHRI INDUSTRIES",
  "pi": "PRAVEEN INDUSTRIES",
  "lvtc": "LAXMI VENTAKESHWARA TRADING COMPANY",
  "vltc": "VARALAXMI TRADING COMPANY",
  "ttc": "TIRUMALA TRADING COMPANY",
  "ptc": "PAVAN TRADING COMPANY",
  "gt": "GOKUL TRADERS",
  "ksg": "K SRIKANTH GUPTHA",
  "ht": "HARSHITA TRADERS",
  "vt": "VENKATESHWARA INDUSTRIES",
  "krk": "KALAKONDA RAJESH KUMAR",
  "vptc": "VAYUPUTRA TRADING COMPANY",
  "svri": "SRI VENKATARAMANA INDUSTRIES",
  "sri": "SADGURU RAGHAVENDRA INDUSTRIES",
  "ni": "NARESH INDUSTRIES",
  "srgt": "SRINIVAS RICE GRAIN TRADERS",
  "vst": "VENKATA SAI TRADERS",
  "skom": "SRI KRISHNA OIL MILL"
};

const getFullTraderName = (name) => {
  if (!name) return "";
  const cleanName = name.trim().toLowerCase();
  return TRADER_MAP[cleanName] || name.toUpperCase();
};


const formatMoney = (num) => Math.round(Number(num || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function KathaPrintModal({ open, onOpenChange, entries   , getFullTraderName }) {
  const [printType, setPrintType] = useState("ledger");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTrader, setSearchTrader] = useState("");

  // Filter entries by date (and trader for ledger)
  const filtered = entries.filter(e => {
    if (!e.date) return false;
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    if (printType === "ledger" && searchTrader && e.trader_name?.toLowerCase().indexOf(searchTrader.toLowerCase()) === -1) return false;
    return true;
  });

  // Build ledger HTML
  const buildLedgerHTML = () => {
    const traderMap = new Map();
    filtered.forEach(e => {
      if (e.record_type === "credit" || e.record_type === "debit") {
        const trader = e.trader_name || "Unknown";
        if (!traderMap.has(trader)) traderMap.set(trader, { credits: [], debits: [] });
        const group = traderMap.get(trader);
        if (e.record_type === "credit") group.credits.push(e);
        else group.debits.push(e);
      }
    });

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Katha Book</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; padding: 15px; background: white; }
      h2 { text-align: center; font-size: 18px; margin-bottom: 5px; }
      .subtitle { text-align: center; font-size: 11px; color: #555; margin-bottom: 20px; }
      .trader-block { margin-bottom: 30px; page-break-inside: avoid; }
      .trader-title { font-size: 14px; font-weight: bold; background: #e8f5e9; padding: 6px 10px; margin-bottom: 5px; border-left: 4px solid #2e7d32; }
      .two-columns { display: flex; gap: 15px; flex-wrap: wrap; }
      .column { flex: 1; min-width: 250px; }
      .credit-header { background: #c8e6c9; font-weight: bold; padding: 6px; text-align: center; border: 1px solid #aaa; }
      .debit-header { background: #ffcdd2; font-weight: bold; padding: 6px; text-align: center; border: 1px solid #aaa; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: left; font-size: 10px; }
      th { background: #f5f5f5; }
      .text-right { text-align: right; }
      .total-row { background: #f0f0f0; font-weight: bold; }
      .grand-total { background: #e0e0e0; font-weight: bold; }
      .balance-row { background: #fff9c4; }
      @media print { body { padding: 5px; font-size: 9px; } @page { size: landscape; margin: 1cm; } .trader-block { break-inside: avoid; } }
    </style></head><body>
    <h2>OM BALAJI TRADERS — KATHA BOOK (LEDGER)</h2>
    <p class="subtitle">${fromDate || toDate ? `Period: ${fromDate ? formatDate(fromDate) : "start"} to ${toDate ? formatDate(toDate) : "end"}` : "All records"} ${searchTrader ? ` | Trader: ${searchTrader}` : ""} &nbsp;|&nbsp; Traders: ${traderMap.size}</p>`;

    for (const [trader, data] of traderMap.entries()) {

  const credits = [...data.credits].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const debits = [...data.debits].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
      const totalCredit = credits.reduce((s, c) => s + (c.amount || 0), 0);
      const totalDebit = debits.reduce((s, d) => s + (d.amount || 0), 0);
      const overallGrandTotal = Math.max(totalCredit, totalDebit);
      const balanceDiff = Math.abs(totalCredit - totalDebit);
      const maxRows = Math.max(credits.length, debits.length);

      html += `<div class="trader-block"><div class="trader-title">${getFullTraderName(trader)}</div><div class="two-columns">`;

      // Credit column
      html += `<div class="column"><div class="credit-header">CREDIT — Payments Received</div><table><thead><tr><th>Bill No</th><th>Date</th><th class="text-right">Amount (₹)</th></tr></thead><tbody>`;
      for (let i = 0; i < maxRows; i++) {
        const row = credits[i];
        if (!row) html += `<tr><td colspan="3">&nbsp;</td></tr>`;
        else {
          const billNo = row.book_no ? `${row.book_no} - ${row.sl_no || "—"}` : "—";
          html += `<tr><td>${billNo}</td><td>${formatDate(row.date)}</td><td class="text-right">₹${formatMoney(row.amount)}</td></tr>`;
        }
      }
      html += `<tr class="total-row"><td colspan="2" class="text-right">Total Credit:</td><td class="text-right">₹${formatMoney(totalCredit)}</td></tr>`;
      if (totalDebit > totalCredit) html += `<tr class="balance-row"><td colspan="2" class="text-right">To Balance c/d:</td><td class="text-right">₹${formatMoney(balanceDiff)}</td></tr>`;
      else html += `<tr><td colspan="3" style="height:28px"></td></tr>`;
      html += `<tr class="grand-total"><td colspan="2" class="text-right">Grand Total:</td><td class="text-right">₹${formatMoney(overallGrandTotal)}</td></tr></tbody></table></div>`;

      // Debit column
      html += `<div class="column"><div class="debit-header">DEBIT — Purchases Billed</div><table><thead><tr><th>Bill No</th><th>Date</th><th class="text-right">Amount (₹)</th></tr></thead><tbody>`;
      for (let i = 0; i < maxRows; i++) {
        const row = debits[i];
        if (!row) html += `<tr><td colspan="3">&nbsp;</td></tr>`;
        else {
          const billNo = row.book_no ? `${row.book_no} - ${row.sl_no || "—"}` : "—";
          html += `<tr><td>${billNo}</td><td>${formatDate(row.date)}</td><td class="text-right">₹${formatMoney(row.amount)}</td></tr>`;
        }
      }
      html += `<tr class="total-row"><td colspan="2" class="text-right">Total Debit:</td><td class="text-right">₹${formatMoney(totalDebit)}</td></tr>`;
      if (totalCredit > totalDebit) html += `<tr class="balance-row"><td colspan="2" class="text-right">To Balance c/d:</td><td class="text-right">₹${formatMoney(balanceDiff)}</td></tr>`;
      else html += `<tr><td colspan="3" style="height:28px"></td></tr>`;
      html += `<tr class="grand-total"><td colspan="2" class="text-right">Grand Total:</td><td class="text-right">₹${formatMoney(overallGrandTotal)}</td></tr></tbody></table></div>`;

      html += `</div></div>`;
    }

    html += `<script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }<\/script></body></html>`;
    return html;
  };

  // Build commissions HTML
// Build commissions HTML – same beautiful style as ledger
const buildCommissionHTML = () => {
  // Group commissions by month (same logic as in your component)
  const monthGroups = new Map(); // key: YYYY-MM, value: { label, entries: [] }
  filtered.forEach(e => {
    if (e.record_type === "commission") {
      const rawDate = e.date ? e.date.split("T")[0] : "";
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const sortKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const monthLabel = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      if (!monthGroups.has(sortKey)) monthGroups.set(sortKey, { label: monthLabel, entries: [] });
      monthGroups.get(sortKey).entries.push({ date: rawDate, amount: e.amount });
    }
  });

  // Sort months newest first
  const sortedMonths = Array.from(monthGroups.keys()).sort();

  let overallTotal = 0;
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Katha Book</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; padding: 15px; background: white; }
    h2 { text-align: center; font-size: 18px; margin-bottom: 5px; }
    .subtitle { text-align: center; font-size: 11px; color: #555; margin-bottom: 20px; }
    .month-block { margin-bottom: 30px; page-break-inside: avoid; }
    .month-title { 
      font-size: 14px; font-weight: bold; background: #e3f2fd; 
      padding: 6px 10px; margin-bottom: 5px; border-left: 4px solid #1976d2; 
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: left; font-size: 10px; }
    th { background: #f5f5f5; font-weight: bold; }
    .text-right { text-align: right; }
    .total-row { background: #f0f0f0; font-weight: bold; }
    .grand-total { 
      background: #c8e6c9; font-weight: bold; font-size: 12px; 
      padding: 8px 10px; text-align: right; margin-top: 20px; 
    }
    @media print {
      body { padding: 5px; font-size: 9px; }
      @page { size: portrait; margin: 1cm; }
      .month-block { break-inside: avoid; }
    }
  </style></head><body>
  <h2>OM BALAJI TRADERS — COMMISSIONS</h2>
  <p class="subtitle">${fromDate || toDate ? `Period: ${fromDate ? formatDate(fromDate) : "start"} to ${toDate ? formatDate(toDate) : "end"}` : "All records"}</p>`;

  for (const sortKey of sortedMonths) {
    const { label, entries } = monthGroups.get(sortKey);
    // Sort entries by date ascending (oldest first within month)
    const sortedEntries = [...entries].sort((a,b) => a.date.localeCompare(b.date));
    const monthTotal = sortedEntries.reduce((s, e) => s + (e.amount || 0), 0);
    overallTotal += monthTotal;
    
    html += `<div class="month-block"><div class="month-title">${label}</div>`;
    html += `<table><thead><tr><th>Date</th><th class="text-right">Commission Amount (₹)</th></tr></thead><tbody>`;
    for (const entry of sortedEntries) {
      html += `<tr><td class="text-left">${formatDate(entry.date)}</td>
                <td class="text-right">₹${formatMoney(entry.amount)}</td>
              </tr>`;
    }
    html += `<tr class="total-row"><td class="text-left">Monthly Total</td>
              <td class="text-right">₹${formatMoney(monthTotal)}</td>
            <tr>`;
    html += `</tbody></table></div>`;
  }

  html += `<div class="grand-total">Overall Grand Total: ₹${formatMoney(overallTotal)}</div>`;
  html += `<script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }<\/script></body></html>`;
  return html;
};

const handlePrint = () => {
  if (filtered.length === 0) {
    alert("No records to print for the selected criteria.");
    return;
  }

  const html = printType === "ledger"
    ? buildLedgerHTML()
    : buildCommissionHTML();

  // Create hidden iframe
  let iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
};

  const ledgerCount = entries.filter(e => e.record_type !== "commission").length;
  const commissionCount = entries.filter(e => e.record_type === "commission").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="
  w-[95vw] sm:max-w-2xl 
  max-h-[90vh] overflow-y-auto 
  rounded-2xl p-4 sm:p-6
">
   <DialogHeader className="mb-4">
  <DialogTitle className="text-lg sm:text-xl font-semibold">
    Print Katha Book
  </DialogTitle>
</DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
          <Button variant={printType === "ledger" ? "default" : "outline"} onClick={() => setPrintType("ledger")} className="flex-1">
            <BookOpen className="w-4 h-4 mr-2" /> Trader Ledgers
          </Button>
          <Button variant={printType === "commission" ? "default" : "outline"} onClick={() => setPrintType("commission")} className="flex-1">
            <Percent className="w-4 h-4 mr-2" /> Commissions
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36" />
          </div>
          {printType === "ledger" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Trader Name</Label>
              <Input placeholder="Trader name..." value={searchTrader} onChange={e => setSearchTrader(e.target.value)} className="w-44" />
            </div>
          )}
          <Button onClick={handlePrint} disabled={filtered.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>


      </DialogContent>
    </Dialog>
  );
}