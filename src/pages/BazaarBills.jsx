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

const CROP_OPTIONS = ["Maize", "Paddy", "Ground Nut", "Red Gram", "Black Gram", "Ragi", "Lobia","Jowar","Neem Seeds", "Cotton", "Castor Seeds","SunFlower Seeds"];
const BAG_WEIGHTS = { "30kgs": 30, "35kgs": 35, "49kgs": 49, "59kgs": 59, "60kgs": 60 };
const BAG_TYPE_OPTIONS = Object.keys(BAG_WEIGHTS);

const roundToInt = (num) => Math.round(Number(num || 0));
const toExactDec = (num) => Number(Number(num || 0).toFixed(2));
const formatMoney = (num) => Math.round(Number(num || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatExact = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toDec = (num) => Number(Number(num || 0).toFixed(2));

const EMPTY_FORM = {
  book_no: "", bill_no: "", date: "", trader_name: "", farmer_name: "", crop_type: "", bag_type: "",
  bags: "", quintals: "", kgs: "", price_per_unit: "", sub_total: ""
};

const TRADER_MAP = {
  "sbom": "SRI BALAJI OIL MILL",
  "rkep": "RADHA KRISHNA ENTERPRISES",
  "gni": "GHAJANAND INDUSTRIES",
  "lvi": "LAXMI VENKATESHWARA INDUSTRIES",
  "lkt": "LAXMI KRISHNA TRADERS",
  "slstc": "SRI LAXMI SRINIVASA TRADING COMPANY",
  "srd": "SRI RAMA DECORDIGATOR",
  "rtc": "RADHIKA TRADING COMPANY",
  "ai": "AAMINA INDUSTRIES",
  "noi": "NOOR INDUSTRIES",
  "ki": "KADHRI INDUSTRIES",
  "pi": "PRAVEEN INDUSTRIES",
  "lvtc": "LAXMI VENTAKESHWARA TRADING CORPORATION",
  "vltc": "VARALAXMI TRADING COMPANY",
  "ttc": "TIRUMALA TRADING COMPANY",
  "ptc": "PAVAN TRADING COMPANY",
  "gt": "GOKUL TRADERS",
  "ksg": "K SRIKANTH GUPTHA",
  "ht": "HARSHITA TRADERS",
  "vt": "VENKATESHWARA TRADERS",
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
  return TRADER_MAP[cleanName] || name.toUpperCase(); // Expands code, or just capitalizes if not found
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

    const bNo = parseInt(e.book_no || 1, 10);
    // Extract numeric bill_no even if it's a string like "1-2"
    let bNoRaw = String(e.bill_no || "0");
    const bNoVal = parseInt(bNoRaw.includes("-") ? bNoRaw.split("-")[1] : bNoRaw, 10);

    const normalizedTrader = (e.trader_name || "").toLowerCase();
    // This key is now strictly unique to the Book-Bill AND the Trader
    const billKey = `${bNo}-${bNoVal}_${normalizedTrader}`;

    if (!byDate[d][billKey]) {
      byDate[d][billKey] = {
        book_no: bNo,
        bill_no: bNoVal,
        trader_name: e.trader_name,
        entries: []
      };
    }
    byDate[d][billKey].entries.push(e);
  });

  return Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a)) 
    .map(([date, billsObj]) => {
const bills = Object.values(billsObj).map(bill => {
  // 🔥 SORT ENTRIES INSIDE BILL (IMPORTANT FIX)
  bill.entries.sort((a, b) => {
    // If you have createdAt → use it (BEST)
    if (a.createdAt && b.createdAt) {
      return new Date(a.createdAt) - new Date(b.createdAt); // OLD → NEW
    }

    // Fallback: use id
    return (a._id || a.id) > (b._id || b.id) ? 1 : -1;
  });

  return bill;
}).sort((a, b) => {
  if (a.book_no !== b.book_no) return a.book_no - b.book_no;
  if (a.bill_no !== b.bill_no) return a.bill_no - b.bill_no;
  return a.trader_name.localeCompare(b.trader_name);
});
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

const getNextBookAndBillNo = () => {
  if (!entries || entries.length === 0) return { book_no: 1, bill_no: 1 };

  // 1. Find the maximum book number currently in use
  let maxBook = 1;
  entries.forEach(item => {
    const b = parseInt(item.book_no, 10);
    if (!isNaN(b) && b > maxBook) maxBook = b;
  });

  // 2. Filter ALL items in that max book, regardless of trader or crop
  const itemsInMaxBook = entries.filter(item => 
    parseInt(item.book_no, 10) === maxBook
  );

  // 3. Find the absolute highest bill number inside that book
  let maxBill = 0;
  itemsInMaxBook.forEach(item => {
    const bNoStr = String(item.bill_no || "0");
    // Handle if it was stored as a compound string "1-2" vs raw number "2"
    const bNo = bNoStr.includes("-") ? bNoStr.split("-")[1] : bNoStr;
    const val = parseInt(bNo, 10);
    if (!isNaN(val) && val > maxBill) maxBill = val;
  });

  // 4. If the book hits 100, jump to the next book and reset bill to 1
  if (maxBill >= 100) return { book_no: maxBook + 1, bill_no: 1 };

  // 5. Otherwise, strictly increment the absolute highest bill number by 1
  return { book_no: maxBook, bill_no: maxBill + 1 };
};

  const handleAddNew = () => {
    const { book_no, bill_no } = getNextBookAndBillNo();
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
        const next = getNextBookAndBillNo();
        finalBookNo = next.book_no;
        rawBillNo = String(next.bill_no);
      }

      const finalBillNo = rawBillNo.includes("-")
        ? parseInt(rawBillNo.split("-")[1], 10)
        : parseInt(rawBillNo, 10);

      const subTotal = roundToInt(form.sub_total);
      const billData = {
        ...form, book_no: finalBookNo, bill_no: finalBillNo,
        bags: Number(form.bags) || 0,
        quintals: Number(form.quintals) || 0,
        kgs: roundToInt(form.kgs),
        price_per_unit: toExactDec(form.price_per_unit),
        sub_total: subTotal,
        net_amount: subTotal,
        total_amount: subTotal,
      };

      if (editId) {
        await fetch(`${API_BASE_URL}/bazaarbills/${editId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(billData)
        });
      } else {
        await fetch(`${API_BASE_URL}/bazaarbills`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(billData)
        });
      }

      const freshBazaarRes = await fetch(`${API_BASE_URL}/bazaarbills`);
      const freshBazaar = await freshBazaarRes.json();
const traderDayBills = freshBazaar.filter(
  b => b.book_no === finalBookNo &&
       b.bill_no === finalBillNo &&
       b.trader_name === form.trader_name
);
      const dayTotal = traderDayBills.reduce((s, b) => s + (Number(b.sub_total) || Number(b.net_amount) || 0), 0);

      const bpRes = await fetch(`${API_BASE_URL}/bazaarpayments`);
      const bpAll = await bpRes.json();
      const existingBP = bpAll.find(
        bp => bp.book_no === finalBookNo &&
bp.sl_no === finalBillNo &&
bp.trader_name === form.trader_name
      );

      const expDate = new Date(form.date);
      expDate.setDate(expDate.getDate() + (form.crop_type === "Castor Seeds" ? 10 : 20));
      const expectedPaymentDate = expDate.toISOString().split("T")[0];

      if (existingBP) {
        if (!existingBP.is_credited) {
          await fetch(`${API_BASE_URL}/bazaarpayments/${existingBP._id || existingBP.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...existingBP, amount: dayTotal })
          });
        }
      } else if (dayTotal > 0) {
        await fetch(`${API_BASE_URL}/bazaarpayments`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            book_no: finalBookNo, sl_no: finalBillNo,
            trader_name: form.trader_name, crop_type: form.crop_type,
            crop_date: form.date,
            expected_payment_date: expectedPaymentDate,
            amount: dayTotal,
            is_credited: false
          })
        });
      }

      const padamRes = await fetch(`${API_BASE_URL}/padam`);
      const padamAll = await padamRes.json();
      const existingDebit = padamAll.find(
        p => p.type === "debit" &&
p.book_no === finalBookNo &&
p.sl_no === finalBillNo
      );

      if (existingDebit) {
        await fetch(`${API_BASE_URL}/padam/${existingDebit._id || existingDebit.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...existingDebit, amount: dayTotal, net_amount: dayTotal })
        });
      } else if (dayTotal > 0) {
        await fetch(`${API_BASE_URL}/padam`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            book_no: finalBookNo, sl_no: finalBillNo,
            date: form.date, type: "debit",
            party_name: form.trader_name,
            crop_type: form.crop_type,
            amount: dayTotal,
            net_amount: dayTotal
          })
        });
      }

      setLoading(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Save failed: " + err.message);
    }
  };

  const handleEdit = (row) => {
    let bNo = String(row.bill_no || "");
    if (bNo.includes("-")) bNo = bNo.split("-")[1];

    setForm({
      book_no: row.book_no ?? 1, bill_no: bNo, date: row.date ?? "",
      trader_name: row.trader_name ?? "", farmer_name: row.farmer_name ?? "",
      crop_type: row.crop_type ?? "", bag_type: row.bag_type ?? "",
      bags: row.bags ?? "", quintals: row.quintals ?? "",
      kgs: row.kgs ?? "", price_per_unit: row.price_per_unit ?? "",
      sub_total: row.sub_total ?? row.net_amount ?? "",
    });
    setEditId(row._id || row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete record?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/bazaarbills`);
      const all = await res.json();

      const bill = all.find(b => (b._id === id || b.id === id));
      if (!bill) return;

      const { trader_name, crop_type, date } = bill;

      await fetch(`${API_BASE_URL}/bazaarbills/${id}`, {
        method: "DELETE"
      });

      const remainingBills = all.filter(b => b._id !== id && b.id !== id);
      
      const dayTotal = remainingBills
        .filter(b =>
b.book_no === bill.book_no &&
b.bill_no === bill.bill_no
        )
        .reduce((s, b) => s + (Number(b.sub_total || b.net_amount || b.total_amount || 0)), 0);

      const padamRes = await fetch(`${API_BASE_URL}/padam`);
      const padamAll = await padamRes.json();

const debit = padamAll.find(p =>
  p.type === "debit" &&
  p.book_no === bill.book_no &&
  p.sl_no === bill.bill_no
);

      if (debit) {
        if (dayTotal > 0) {
          await fetch(`${API_BASE_URL}/padam/${debit._id || debit.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...debit,
              amount: dayTotal,
              net_amount: dayTotal
            })
          });
        } else {
          await fetch(`${API_BASE_URL}/padam/${debit._id || debit.id}`, {
            method: "DELETE"
          });
        }
      }

      const bpRes = await fetch(`${API_BASE_URL}/bazaarpayments`);
      const bpAll = await bpRes.json();

const payment = bpAll.find(p =>
  p.book_no === bill.book_no &&
  p.sl_no === bill.bill_no &&
  p.trader_name === bill.trader_name
);

      if (payment) {
        if (dayTotal > 0) {
          if (!payment.is_credited) {
            await fetch(`${API_BASE_URL}/bazaarpayments/${payment._id || payment.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...payment,
                amount: dayTotal
              })
            });
          }
        } else {
          await fetch(`${API_BASE_URL}/bazaarpayments/${payment._id || payment.id}`, {
            method: "DELETE"
          });
        }
      }

      load();
    } catch (err) {
      console.error("Delete sync failed", err);
    }
  };

  const toggleDate = (key) => setCollapsedDates(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = entries.filter(e =>
    (!dateFilter || e.date === dateFilter) &&
    (!traderFilter || e.trader_name?.toLowerCase().includes(traderFilter.toLowerCase()))
  );

  const grouped = groupBills(filtered);
  const totalAmount = filtered.reduce((s, e) => s + (e.sub_total || e.net_amount || e.total_amount || 0), 0);
  const totalBillsCount = new Set(filtered.map(e => `${e.book_no}-${e.bill_no}`)).size;

  return (
    <div className="pb-20">
      <PageHeader title="Bazaar Bills" subtitle="Trader billing register — manage unified billing records & subtotals">
        {!showForm && <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> New Bill Record</Button>}
      </PageHeader>
      <div className="mt- -m-6" />
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
              <button type="button" onClick={() => toggleDate(date)} className="flex items-center gap-2 mb-2 w-full text-left font-semibold text-primary text-sm">
                {collapsedDates[date] ? <ChevronRight className="w-4" /> : <ChevronDown className="w-4" />}
                {formatDate(date)}
              </button>
              {!collapsedDates[date] && (
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border uppercase text-xs font-semibold text-muted-foreground">
                          <th className="px-4 py-2.5 text-left whitespace-nowrap">Book - Bill.No</th>
                          <th className="px-4 py-2.5 text-right whitespace-nowrap">Amount (₹)</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Quintals</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Kgs</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Bags</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Bag Type</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Crop</th>
                          <th className="px-4 py-2.5 text-center whitespace-nowrap">Price/Unit</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {bills.map((bill, bIdx) => {
                          // Group entries by crop
                          const cropsMap = new Map();
                          bill.entries.forEach(entry => {
                            const cropName = entry.crop_type || "Unknown";
                            if (!cropsMap.has(cropName)) {
                              cropsMap.set(cropName, []);
                            }
                            cropsMap.get(cropName).push(entry);
                          });
                          
                          // Calculate totals before rendering
                          let billGrandTotal = 0;
                          const cropGroupsArray = [];
                          
                          for (const [cropName, cropEntries] of cropsMap.entries()) {
                            let cropTotal = 0;
                            let cropBags = 0;
                            for (const entry of cropEntries) {
                              cropTotal += Number(entry.sub_total) || Number(entry.net_amount) || 0;
                              cropBags += Number(entry.bags) || 0;
                            }
                            billGrandTotal += cropTotal;
                            cropGroupsArray.push({ cropName, cropEntries, cropTotal, cropBags });
                          }
                          
                          return (
                            <React.Fragment key={bIdx}>
                              <tr className="bg-primary/5 border-y border-border">
                                <td colSpan={9} className="px-4 py-2 text-sm font-medium whitespace-nowrap">
                                  <span className="text-primary font-bold">{bill.book_no} - {bill.bill_no}</span> &nbsp;|&nbsp; {getFullTraderName(bill.trader_name)}
                                </td>
                              </tr>
                              {cropGroupsArray.map(({ cropName, cropEntries, cropTotal, cropBags }) => (
                                <React.Fragment key={cropName}>
                                  {cropEntries.map((row, idx) => (
                                    <tr key={row._id || row.id || idx} onClick={() => handleEdit(row)} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer">
                                      <td className="px-4 py-2.5 whitespace-nowrap"></td>
                                      <td className="px-4 py-2.5 text-right font-mono font-bold text-primary whitespace-nowrap">₹{formatMoney(row.sub_total || row.net_amount || 0)}</td>
                                      <td className="px-4 py-2.5 text-center font-mono whitespace-nowrap">{row.quintals ?? "—"}</td>
                                      <td className="px-4 py-2.5 text-center font-mono whitespace-nowrap">{row.kgs ?? "—"}</td>
                                      <td className="px-4 py-2.5 text-center font-mono whitespace-nowrap">{row.bags ?? "—"}</td>
                                      <td className="px-4 py-2.5 text-center whitespace-nowrap">{row.bag_type || "—"}</td>
                                      <td className="px-4 py-2.5 text-center font-medium whitespace-nowrap">{row.crop_type}</td>
                                      <td className="px-4 py-2.5 text-center font-mono whitespace-nowrap">₹{formatExact(row.price_per_unit)}</td>
                                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                        <button onClick={e => { e.stopPropagation(); handleDelete(row._id || row.id); }} className="text-destructive">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-blue-50/40 text-[10px] font-bold text-blue-700 uppercase">
                                    <td className="px-4 py-1.5 whitespace-nowrap"></td>
                                    <td className="px-4 py-1.5 text-right font-mono text-sm whitespace-nowrap">₹{formatMoney(cropTotal)}</td>
                                    <td colSpan={2} className="px-4 py-2.5 text-center font-mono text-sm tracking-wide whitespace-nowrap">TOTAL AMOUNT</td>
                                    <td className="px-4 py-1.5 text-center font-mono text-sm whitespace-nowrap">{cropBags}</td>
                                    <td colSpan={4} className="px-4 py-1.5 font-mono text-sm text-left pl-4 whitespace-nowrap">TOTAL BAGS</td>
                                  </tr>
                                </React.Fragment>
                              ))}
                              {cropGroupsArray.length > 1 && (
                                <tr className="bg-muted/30 border-b-2 border-primary/20 font-bold">
                                  <td className="px-4 py-2 whitespace-nowrap"></td>
                                  <td className="px-4 py-2 text-right font-mono text-primary text-base whitespace-nowrap">₹{formatMoney(billGrandTotal)}</td>
                                  <td colSpan={7} className="px-4 py-2 text-left pl-6 text-primary tracking-tighter text-xs whitespace-nowrap">GRAND BILL TOTAL</td>
                                </tr>
                              )}
                              {bIdx < bills.length - 1 && <tr><td colSpan={9} className="h-2"></td></tr>}
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