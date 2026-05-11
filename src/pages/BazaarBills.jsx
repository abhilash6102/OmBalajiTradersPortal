import { API_BASE_URL } from "../api/config";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, X, Save, ChevronDown, ChevronRight, Receipt, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const CROP_OPTIONS = ["Maize", "Paddy", "Ground Nut", "Red Gram", "Black Gram", "Ragi", "Lobia", "Cotton", "Castor Seeds"];
const BAG_WEIGHTS = { "30kgs": 30, "35kgs": 35, "49kgs": 49, "59kgs": 59, "60kgs": 60 };
const BAG_TYPE_OPTIONS = Object.keys(BAG_WEIGHTS);

// 🔥 STRICT 2-DECIMAL HELPERS
const roundToInt = (num) => Math.round(Number(num || 0));
const toExactDec = (num) => Number(Number(num || 0).toFixed(2));
const formatMoney = (num) => Math.round(Number(num || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatExact = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toDec = (num) => Number(Number(num || 0).toFixed(2));

const EMPTY_FORM = {
  book_no: "", bill_no: "", date: "", trader_name: "", farmer_name: "", crop_type: "", bag_type: "",
  bags: "", quintals: "", kgs: "", price_per_unit: "", sub_total: ""
};

function formatDate(dateStr) {
  if (!dateStr) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function groupBills(entries) {
  const byDate = {};

  entries.forEach(e => {
    const d = e.date || "No Date";
    if (!byDate[d]) byDate[d] = {};
    
    let rawBill = String(e.bill_no || "0");
    if (rawBill.includes("-")) rawBill = rawBill.split("-")[1];
    
    const billKey = `${e.book_no || 1}-${rawBill}_${e.trader_name}`;
    
    if (!byDate[d][billKey]) byDate[d][billKey] = {
      book_no: e.book_no || 1,
      bill_no: rawBill,
      trader_name: e.trader_name,
      crops: {}
    };
    
    const c = e.crop_type || "Unknown";
    if (!byDate[d][billKey].crops[c]) byDate[d][billKey].crops[c] = [];
    byDate[d][billKey].crops[c].push(e);
  });

  return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, billsObj]) => {
    const bills = Object.values(billsObj).sort((a, b) => parseInt(a.bill_no, 10) - parseInt(b.bill_no, 10));
    return { date, bills };
  });
}

export default function BazaarBills() {
  const [entries, setEntries] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [traderFilter, setTraderFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/bazaarbills`);
      const data = await res.json();
      if (Array.isArray(data)) setEntries(data);
    } catch (err) { console.error("Failed to load Bazaar Bills", err); }
  };
  
  useEffect(() => { load(); }, []);

  const getNextBookAndBillNo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/bazaarbills`);
      const data = await res.json();
      if (!data || data.length === 0) return { book_no: 1, bill_no: 1 };

      let maxBook = 1;
      data.forEach(item => { const b = parseInt(item.book_no, 10); if (!isNaN(b) && b > maxBook) maxBook = b; });
      const itemsInMaxBook = data.filter(item => parseInt(item.book_no, 10) === maxBook || (maxBook === 1 && !item.book_no));
      
      let maxBill = 0;
      itemsInMaxBook.forEach(item => {
        const bNoStr = String(item.bill_no || "0");
        const bNo = bNoStr.includes("-") ? bNoStr.split("-")[1] : bNoStr; 
        const val = parseInt(bNo, 10);
        if (!isNaN(val) && val > maxBill) maxBill = val;
      });

      if (maxBill >= 100) return { book_no: maxBook + 1, bill_no: 1 };
      return { book_no: maxBook, bill_no: maxBill + 1 };
    } catch (err) { return { book_no: 1, bill_no: 1 }; }
  };

  const handleAddNew = async () => {
    const { book_no, bill_no } = await getNextBookAndBillNo();
    setEditId(null);
    setForm({ ...EMPTY_FORM, book_no, bill_no });
    setShowForm(true);
  };

  const setField = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (["crop_type", "bags", "bag_type", "kgs", "price_per_unit"].includes(key)) {
        const bags = Number(updated.bags) || 0;
        const kgs = roundToInt(updated.kgs);
        const price = toExactDec(updated.price_per_unit);
        
        const isBagCrop = updated.crop_type !== "Cotton";
        const bagWt = BAG_WEIGHTS[updated.bag_type] || 0;
        const totalKg = toDec(isBagCrop ? (bags * bagWt) + kgs : kgs);
        
        const quintals = Math.floor(totalKg / 100);
        const leftoverKgs = roundToInt(totalKg % 100);
        const sub_total = roundToInt((totalKg / 100) * price);
        
        return { ...updated, quintals, kgs: leftoverKgs, sub_total };
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalBookNo = parseInt(form.book_no, 10) || 1;
      let rawBillNo = String(form.bill_no).trim();

      if (!rawBillNo && !editId) {
        const next = await getNextBookAndBillNo();
        finalBookNo = next.book_no;
        rawBillNo = String(next.bill_no);
      }
      
      const finalBillNo = rawBillNo.includes("-") ? parseInt(rawBillNo.split("-")[1], 10) : parseInt(rawBillNo, 10);

      const billData = {
        ...form, book_no: finalBookNo, bill_no: finalBillNo, bags: Number(form.bags) || 0, 
        quintals: Number(form.quintals) || 0, kgs: roundToInt(form.kgs), price_per_unit: toExactDec(form.price_per_unit),
        sub_total: roundToInt(form.sub_total), net_amount: roundToInt(form.sub_total) 
      };

      if (editId) {
        await fetch(`${API_BASE_URL}/bazaarbills/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(billData) });
      } else {
        await fetch(`${API_BASE_URL}/bazaarbills`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(billData) });

        const expectedDate = new Date(form.date);
        expectedDate.setDate(expectedDate.getDate() + (form.crop_type === "Castor Seeds" ? 10 : 20));
        
        await fetch(`${API_BASE_URL}/bazaarpayments`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ book_no: finalBookNo, sl_no: finalBillNo, trader_name: form.trader_name, crop_type: form.crop_type, crop_date: form.date, expected_payment_date: expectedDate.toISOString().split("T")[0], amount: roundToInt(form.sub_total), is_credited: false }),
        });
      }

      setLoading(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      setShowForm(false);
      load();
    } catch (err) { console.error(err); setLoading(false); alert("Save failed"); }
  };

  const handleEdit = (row) => {
    let bNo = String(row.bill_no || "");
    if (bNo.includes("-")) bNo = bNo.split("-")[1];

    setForm({
      book_no: row.book_no ?? 1, bill_no: bNo, date: row.date ?? "", trader_name: row.trader_name ?? "", farmer_name: row.farmer_name ?? "",
      crop_type: row.crop_type ?? "", bag_type: row.bag_type ?? "", bags: row.bags ?? "",
      quintals: row.quintals ?? "", kgs: row.kgs ?? "", price_per_unit: row.price_per_unit ?? "", sub_total: row.sub_total ?? row.net_amount ?? "",
    });
    setEditId(row._id || row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete record?")) return;
    try { 
      await fetch(`${API_BASE_URL}/bazaarbills/${id}`, { method: "DELETE" }); 
      load(); 
    } catch (err) { console.error("Delete failed", err); }
  };

  const toggleDate = (key) => setCollapsedDates(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = entries.filter(e =>
    (!dateFilter || e.date === dateFilter) && (!traderFilter || e.trader_name?.toLowerCase().includes(traderFilter.toLowerCase()))
  );

  const grouped = groupBills(filtered);
  const totalAmount = filtered.reduce((s, e) => s + (e.sub_total || e.net_amount || e.total_amount || 0), 0);
  const totalBillsCount = new Set(filtered.map(e => `${e.book_no}-${e.bill_no}`)).size;

  return (
    <div className="pb-20">
      <PageHeader title="Bazaar Bills" subtitle="Trader billing register — manage unified billing records & subtotals">
        {!showForm && <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> New Bill Record</Button>}
      </PageHeader>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{editId ? "Edit Bill Record" : "New Bill Record"}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div className="space-y-1.5"><Label className="text-xs">Book No.</Label><Input type="number" value={form.book_no} onChange={(e) => setField("book_no", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bill No. <span className="text-destructive">*</span></Label><Input placeholder="Bill no." value={form.bill_no} onChange={(e) => setField("bill_no", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Date <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Trader Name <span className="text-destructive">*</span></Label><Input placeholder="Trader name" value={form.trader_name} onChange={(e) => setField("trader_name", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Farmer Name (Optional)</Label><Input placeholder="Farmer name" value={form.farmer_name} onChange={(e) => setField("farmer_name", e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Crop Type <span className="text-destructive">*</span></Label>
              <Select value={form.crop_type} onValueChange={(v) => setField("crop_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                <SelectContent>{CROP_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bag Type</Label>
              <Select value={form.bag_type} onValueChange={(v) => setField("bag_type", v)}>
                <SelectTrigger><SelectValue placeholder="Weight/bag" /></SelectTrigger>
                <SelectContent>{BAG_TYPE_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Bags</Label><Input type="number" placeholder="No. of bags" value={form.bags} onChange={(e) => setField("bags", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Kgs</Label><Input type="number" step="any" placeholder="Kgs" value={form.kgs} onChange={(e) => setField("kgs", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Quintals (Auto)</Label><Input readOnly value={form.quintals !== "" ? form.quintals : ""} placeholder="Auto" className="bg-muted font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Price / Unit (₹) <span className="text-destructive">*</span></Label><Input type="number" step="any" placeholder="0.00" value={form.price_per_unit} onChange={(e) => setField("price_per_unit", e.target.value)} required /></div>
            <div className="space-y-1.5 col-span-2"><Label className="text-xs">Crop Subtotal (₹)</Label><Input readOnly value={form.sub_total !== "" ? form.sub_total : ""} placeholder="Auto" className="bg-muted font-mono font-semibold text-primary" /></div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Saving..." : "Save Record"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {!showForm && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard title="Total Amount" value={`₹${formatMoney(totalAmount)}`} icon={Receipt} />
            <StatCard title="Bills Count" value={totalBillsCount} icon={IndianRupee} />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44" />
            <Input placeholder="Trader Name" value={traderFilter} onChange={(e) => setTraderFilter(e.target.value)} className="w-40" />
          </div>

          {grouped.map(({ date, bills }) => (
            <div key={date} className="mb-6">
              <button type="button" onClick={() => toggleDate(date)} className="flex items-center gap-2 mb-2 w-full text-left font-semibold text-primary">
                {collapsedDates[date] ? <ChevronRight className="w-4" /> : <ChevronDown className="w-4" />}
                {formatDate(date)}
              </button>
              {!collapsedDates[date] && (
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border uppercase text-xs font-semibold text-muted-foreground">
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left">Book - Bill.No</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount (₹)</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Quintals</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Kgs</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Bags</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Bag Type</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Crop</th>
                          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Price/Unit</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bills.map((bill, bIdx) => {
                          const cropEntries = Object.entries(bill.crops);
                          let billTotal = 0;
                          return (
                            <React.Fragment key={bIdx}>
                              <tr className="bg-primary/5 border-y border-border">
                                <td colSpan={9} className="px-4 py-2 text-sm font-medium">
                                  <span className="text-primary font-bold">{bill.book_no} - {bill.bill_no}</span> &nbsp;|&nbsp; {bill.trader_name}
                                </td>
                              </tr>
                              {cropEntries.map(([cropName, rows]) => {
                                const cropSubtotal = rows.reduce((s, r) => s + (Number(r.sub_total) || Number(r.net_amount) || 0), 0);
                                const totalBags = rows.reduce((s, r) => s + (Number(r.bags) || 0), 0);
                                billTotal += cropSubtotal;
                                return (
                                  <React.Fragment key={cropName}>
                                    {rows.map((row) => (
                                      <tr key={row._id || row.id} onClick={() => handleEdit(row)} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer">
                                        <td className="px-4 py-2.5"></td>
                                        <td className="px-4 py-2.5 text-right font-mono font-bold text-primary">₹{formatMoney(row.sub_total || row.net_amount || 0)}</td>
                                        <td className="px-4 py-2.5 text-center font-mono">{row.quintals ?? "—"}</td>
                                        <td className="px-4 py-2.5 text-center font-mono">{row.kgs ?? "—"}</td>
                                        <td className="px-4 py-2.5 text-center font-mono">{row.bags ?? "—"}</td>
                                        <td className="px-4 py-2.5 text-center">{row.bag_type || "—"}</td>
                                        <td className="px-4 py-2.5 text-center font-medium">{row.crop_type}</td>
                                        <td className="px-4 py-2.5 text-center font-mono">₹{formatExact(row.price_per_unit)}</td>
                                        <td className="px-4 py-2.5 text-center">
                                          <button onClick={e => { e.stopPropagation(); handleDelete(row._id || row.id); }} className="text-destructive"><Trash2 className="w-4 h-4"/></button>
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-blue-50/40 text-[10px] font-bold text-blue-700 uppercase">
                                      <td className="px-4 py-1.5"></td>
                                      <td className="px-4 py-1.5 text-right font-mono text-sm whitespace-nowrap">₹{formatMoney(cropSubtotal)}</td>
                                      <td colSpan={2} className="px-4 py-2.5 text-left pl-6  font-mono text-sm tracking-wide">CROP TOTAL ({cropName})</td>
                                      <td className="px-4 py-1.5 text-center font-mono text-sm">{totalBags}</td>
                                      <td colSpan={4} className="px-4 py-1.5 font-mono text-sm text-left pl-4">TOTAL BAGS</td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}
                              {cropEntries.length > 1 && (
                                <tr className="bg-muted/30 border-b-2 border-primary/20 font-bold">
                                  <td className="px-4 py-2"></td>
                                  <td className="px-4 py-2 text-right font-mono text-primary text-base">₹{formatMoney(billTotal)}</td>
                                  <td colSpan={7} className="px-4 py-2 text-left pl-6 text-primary tracking-tighter text-xs">GRAND BILL TOTAL</td>
                                </tr>
                              )}
                            </React.Fragment>
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
    </div>
  );
}