import { API_BASE_URL } from "../api/config";
import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, Trash2, Search, Wallet, ChevronDown, ChevronRight, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const CROP_OPTIONS = ["Maize", "Paddy", "Ground Nut", "Red Gram", "Black Gram", "Ragi", "Lobia", "Cotton", "Castor Seeds"];
const BANK_LABELS = { sbi: "SBI", icici: "ICICI", union: "Union Bank", canara: "Canara Bank", other: "Other" };
const BANK_COLORS = { sbi: "bg-blue-100 text-blue-700", icici: "bg-orange-100 text-orange-700", union: "bg-purple-100 text-purple-700", canara: "bg-green-100 text-green-700", other: "bg-gray-100 text-gray-700" };

const format2 = (num) => Math.round(Number(num || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function formatDate(d) { if (!d) return "—"; const cleanDate = d.split("T")[0]; const [y, m, day] = cleanDate.split("-"); return `${day}/${m}/${y}`; }
function isOverdue(expectedDate) { if (!expectedDate) return false; return new Date(expectedDate) < new Date(); }

function groupByDate(entries) {
  const groups = {};
  entries.forEach(e => {
    const d = e.crop_date ? e.crop_date.split("T")[0] : "No Date";
    if (!groups[d]) groups[d] = [];
    groups[d].push(e);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([dateKey, rows]) => [dateKey, [...rows].sort((a, b) => (a.book_no || 1) - (b.book_no || 1) || (a.sl_no || 0) - (b.sl_no || 0))]);
}

const EMPTY_FORM = { book_no: "", sl_no: "", trader_name: "", crop_type: "", crop_date: new Date().toISOString().split("T")[0], expected_payment_date: "", amount: "" };

export default function BazaarPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [searchTrader, setSearchTrader] = useState("");
  const [searchAmount, setSearchAmount] = useState(""); 
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ bank: "", credited_date: "" });
  const [collapsedDates, setCollapsedDates] = useState({});

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/bazaarpayments`);
      const data = await res.json();
      if (Array.isArray(data)) setPayments(data);
    } catch (err) { console.error("Failed to load", err); }
  };
  
  useEffect(() => { load(); }, []);

  const setField = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "crop_date" || key === "crop_type") {
        const baseDate = new Date(updated.crop_date);
        if (!isNaN(baseDate.getTime())) {
          const daysToAdd = updated.crop_type === "Castor Seeds" ? 10 : 20;
          baseDate.setDate(baseDate.getDate() + daysToAdd);
          updated.expected_payment_date = baseDate.toISOString().split("T")[0];
        }
      }
      return updated;
    });
  };

  const handleAddNew = () => {
    let nextBook = 1, nextSl = 1;
    if (payments.length > 0) {
      nextBook = Math.max(...payments.map(p => Number(p.book_no || 1)));
      const inMaxBook = payments.filter(p => Number(p.book_no || 1) === nextBook);
      nextSl = Math.max(...inMaxBook.map(p => Number(p.sl_no || 0))) + 1;
      if (nextSl > 100) { nextBook += 1; nextSl = 1; }
    }
    setForm({ ...EMPTY_FORM, book_no: nextBook, sl_no: nextSl });
    setShowForm(true);
  };

  const handleEdit = (payment) => {
    setEditId(payment._id || payment.id);
    const cleanDate = payment.credited_date ? payment.credited_date.split("T")[0] : "";
    setForm({
      book_no: payment.book_no || "", sl_no: payment.sl_no || "", trader_name: payment.trader_name || "", crop_type: payment.crop_type || "",
      crop_date: payment.crop_date ? payment.crop_date.split("T")[0] : "", expected_payment_date: payment.expected_payment_date ? payment.expected_payment_date.split("T")[0] : "",
      amount: payment.amount || "", bank: payment.bank || "", is_credited: payment.is_credited || false, credited_date: cleanDate
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      const url = editId ? `${API_BASE_URL}/bazaarpayments/${editId}` : `${API_BASE_URL}/bazaarpayments`;
      await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setShowForm(false);
      load();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const openConfirm = (payment) => {
    setConfirmModal(payment);
    const cDate = payment.credited_date ? payment.credited_date.split("T")[0] : new Date().toISOString().split("T")[0];
    setConfirmForm({ bank: payment.bank || "", credited_date: cDate });
  };

  // 🔥 WORKFLOW AUTO: BazaarPayments MARK -> KathaBook CREDIT
const handleConfirmSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    // 1. Mark as credited
    const updatedPayment = { ...confirmModal, ...confirmForm, is_credited: true };
    await fetch(`${API_BASE_URL}/bazaarpayments/${confirmModal._id || confirmModal.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedPayment),
    });

    // 2. Sync to Katha Book (Credit)
const kData = {
  record_type: "credit",
  trader_name: confirmModal.trader_name,
  date: confirmForm.credited_date,
  amount: confirmModal.amount,
  book_no: confirmModal.book_no, // Ensure these are passed
  sl_no: confirmModal.sl_no,
  bill_no: `${confirmModal.book_no}-${confirmModal.sl_no}`,
  is_auto_generated: true
};

await fetch(`${API_BASE_URL}/kathabook`, { 
  method: "POST", 
  headers: { "Content-Type": "application/json" }, 
  body: JSON.stringify(kData) 
});

    setConfirmModal(null);
    load();
  } catch (err) { console.error(err); }
  setLoading(false);
};

  const handleUnmark = async (payment) => {
    if (!window.confirm("Unmark this payment as credited? This will remove the credit from the Katha Book.")) return;
    try {
      const updatedPayment = { ...payment, is_credited: false, credited_date: null, bank: null };
      await fetch(`${API_BASE_URL}/bazaarpayments/${payment._id || payment.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedPayment),
      });

      const kathaRes = await fetch(`${API_BASE_URL}/kathabook`);
      const kathaAll = await kathaRes.json();
      const targetCredit = kathaAll.find(k => 
        k.record_type === "credit" && k.book_no === payment.book_no && k.sl_no === payment.sl_no && k.trader_name?.toLowerCase() === payment.trader_name?.toLowerCase()
      );
      if (targetCredit) await fetch(`${API_BASE_URL}/kathabook/${targetCredit._id || targetCredit.id}`, { method: "DELETE" });

      load();
    } catch (err) { console.error("Unmark error:", err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    await fetch(`${API_BASE_URL}/bazaarpayments/${id}`, { method: "DELETE" });
    load();
  };

  const filtered = payments.filter((p) => {
    const matchTrader = !searchTrader || p.trader_name?.toLowerCase().includes(searchTrader.toLowerCase());
    const matchAmount = !searchAmount || String(Math.round(p.amount || 0)).includes(searchAmount); 
    const matchDate = !dateFilter || (p.crop_date && p.crop_date.split("T")[0] === dateFilter);
    const matchStatus = statusFilter === "all" || (statusFilter === "credited" ? p.is_credited : !p.is_credited);
    return matchTrader && matchAmount && matchDate && matchStatus;
  });

  const grouped = groupByDate(filtered);

  return (
    <div className="pb-20">
      <PageHeader title="Bazaar Payments" subtitle="Track trader payments — confirm when amounts are credited to your bank account">
        {!showForm && <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> New Entry</Button>}
      </PageHeader>
      <div className="mt- -m-6" />
      {!showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <StatCard title="Total Pending" value={`₹${format2(filtered.filter(p=>!p.is_credited).reduce((s,p)=>s+p.amount,0))}`} icon={Clock} className="border-amber-200 bg-amber-50/30" />
          <StatCard title="Total Credited" value={`₹${format2(filtered.filter(p=>p.is_credited).reduce((s,p)=>s+p.amount,0))}`} icon={Wallet} className="border-green-200 bg-green-50/30" />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{editId ? "Edit Entry" : "New Entry"}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
            <div className="space-y-1.5"><Label className="text-xs">Book No.</Label><Input type="number" value={form.book_no} onChange={e => setField("book_no", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bill No.</Label><Input type="number" value={form.sl_no} onChange={e => setField("sl_no", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Crop Date <span className="text-destructive">*</span></Label><Input type="date" value={form.crop_date} onChange={e => setField("crop_date", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Trader Name <span className="text-destructive">*</span></Label><Input placeholder="Trader name" value={form.trader_name} onChange={e => setField("trader_name", e.target.value)} required /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Crop Type <span className="text-destructive">*</span></Label>
              <Select value={form.crop_type} onValueChange={(v) => setField("crop_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                <SelectContent>{CROP_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Amount (₹) <span className="text-destructive">*</span></Label><Input type="number" placeholder="0" value={form.amount} onChange={e => setField("amount", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Expected Pay Date</Label><Input type="date" value={form.expected_payment_date} onChange={e => setField("expected_payment_date", e.target.value)} className="bg-muted/50 font-mono" /></div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Saving..." : "Save Record"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {!showForm && (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            <Input placeholder="Trader name..." value={searchTrader} onChange={(e) => setSearchTrader(e.target.value)} className="w-44" />
            <Input placeholder="Amount..." type="number" value={searchAmount} onChange={(e) => setSearchAmount(e.target.value)} className="w-32" />
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="credited">Credited</SelectItem></SelectContent>
            </Select>
          </div>

          {grouped.length === 0 && <div className="bg-card rounded-xl border border-border py-14 text-center text-muted-foreground text-sm">No records found</div>}

          {grouped.map(([dateKey, rows]) => (
            <div key={dateKey} className="mb-6">
              <button type="button" onClick={() => setCollapsedDates(p => ({...p, [dateKey]: !p[dateKey]}))} className="flex items-center gap-2 mb-2 w-full text-left">
                {collapsedDates[dateKey] ? <ChevronRight className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
                <span className="font-semibold text-primary text-sm">{formatDate(dateKey)}</span>
                <Badge variant="secondary" className="text-xs">{rows.length} payments</Badge>
              </button>

              {!collapsedDates[dateKey] && (
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border text-left uppercase text-xs font-bold text-muted-foreground">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Book - Bill.NO</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Trader</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Crop</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Expected By</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Amount (₹)</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Bank</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Status</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Credited On</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((payment) => {
                           const overdue = !payment.is_credited && isOverdue(payment.expected_payment_date);
                           return (
                            <tr key={payment._id || payment.id} onClick={() => handleEdit(payment)} className={`border-b border-border hover:bg-muted/20 cursor-pointer transition-colors ${overdue ? "bg-red-50/40" : ""}`}>
                              <td className="px-4 py-4 text-muted-foreground font-medium whitespace-nowrap"><span className="text-primary">{payment.book_no || 1}</span> - {payment.sl_no ?? "—"}</td>
                              <td className="px-4 py-4 font-medium whitespace-nowrap">{payment.trader_name.toUpperCase()}</td>
                              <td className="px-4 py-4 whitespace-nowrap">{payment.crop_type}</td>
                              <td className={`px-4 py-4 font-mono whitespace-nowrap ${overdue ? "text-destructive font-bold" : "text-muted-foreground"}`}>{formatDate(payment.expected_payment_date)}</td>
                              <td className="px-4 py-4 font-mono font-bold text-primary text-right whitespace-nowrap">₹{format2(payment.amount)}</td>
                              <td className="px-4 py-4 whitespace-nowrap">{payment.bank ? <Badge className={BANK_COLORS[payment.bank]}>{BANK_LABELS[payment.bank]}</Badge> : "—"}</td>
                              <td className="px-4 py-4 whitespace-nowrap">{payment.is_credited ? <Badge className="bg-green-100 text-green-700">Credited</Badge> : <Badge className="bg-amber-100 text-amber-700">Pending</Badge>}</td>
                              <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{formatDate(payment.credited_date)}</td>
                              <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  {payment.is_credited ?
                                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); handleUnmark(payment); }}>Unmark</Button> :
                                    <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={(e) => { e.stopPropagation(); openConfirm(payment); }}><CheckCircle2 className="w-3 h-3 mr-1" /> Mark</Button>
                                  }
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(payment._id || payment.id); }}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                              </td>
                            </tr>
                           );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Confirm Credited</DialogTitle></DialogHeader>
          <form onSubmit={handleConfirmSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs">Bank</Label><Select value={confirmForm.bank} onValueChange={(v) => setConfirmForm(p => ({ ...p, bank: v }))} required><SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger><SelectContent>{Object.entries(BANK_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Credited Date</Label><Input type="date" value={confirmForm.credited_date} onChange={e => setConfirmForm(p => ({ ...p, credited_date: e.target.value }))} required /></div>
            <div className="flex gap-2 pt-2"><Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmModal(null)}>Cancel</Button><Button type="submit" className="flex-1 bg-green-600 text-white" disabled={loading}>Confirm</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}