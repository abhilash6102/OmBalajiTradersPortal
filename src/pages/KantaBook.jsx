import { API_BASE_URL } from "@/api/config";
import { useState, useEffect } from "react";
import { Plus, Trash2, X, Save, ChevronDown, ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../components/PageHeader";
import KantaPrintModal from "../components/KantaPrintModal";

const BAG_WEIGHTS = { "30kgs": 30, "35kgs": 35, "49kgs": 49, "59kgs": 59, "60kgs": 60 };
const BAG_TYPE_OPTIONS = Object.keys(BAG_WEIGHTS);
const CROP_OPTIONS = ["Maize", "Paddy", "Ground Nut", "Red Gram", "Black Gram", "Ragi", "Lobia", "Cotton", "Castor Seeds"];

const HAMALI_RATE = (bagType) => (bagType === "59kgs" || bagType === "60kgs") ? 12.38 : 11.52;
const DHARVAY_RATE = 5.15;
const CHATA_RATE = 1.8;
const COMMISSION_RATE = 1.75 / 100;

const roundToInt = (num) => Math.round(Number(num || 0));
const toExactDec = (num) => Number(Number(num || 0).toFixed(2));
const formatExact = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toDec = (num) => Number(Number(num || 0).toFixed(2));

const EMPTY_FORM = {
  book_no: "", sl_no: "", date: "", farmer_name: "", village: "", crop_type: "",
  bags: "", kgs: "", bag_type: "", price_per_unit: "", trader_name: "", bazaar: ""
};

function formatDate(dateStr) {
  if (!dateStr) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function groupByDate(entries) {
  const groups = {};
  entries.forEach(e => {
    const key = e.date || "No Date";
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).map(([dateKey, rows]) => [
    dateKey, 
    [...rows].sort((a, b) => {
      if (a.book_no !== b.book_no) return (a.book_no || 1) - (b.book_no || 1);
      return (a.sl_no ?? 999999) - (b.sl_no ?? 999999);
    })
  ]);
}

export default function KantaBook() {
  const [entries, setEntries] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [farmerFilter, setFarmerFilter] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [cropFilter, setCropFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [showPrint, setShowPrint] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/kanta`);
      const data = await res.json();
      setEntries(data);
    } catch (err) { console.error("Failed to load Kanta Book", err); }
  };
  
  useEffect(() => { load(); }, []);

  const getNextBookAndSlNo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/kanta`);
      const data = await res.json();
      if (!data || data.length === 0) return { book_no: 1, sl_no: 1 };

      let maxBook = 1;
      data.forEach(item => { const b = parseInt(item.book_no, 10); if (!isNaN(b) && b > maxBook) maxBook = b; });
      const itemsInMaxBook = data.filter(item => parseInt(item.book_no, 10) === maxBook || (maxBook === 1 && !item.book_no));
      
      let maxSl = 0;
      itemsInMaxBook.forEach(item => { const sl = parseInt(item.sl_no, 10); if (!isNaN(sl) && sl > maxSl) maxSl = sl; });

      if (maxSl >= 100) return { book_no: maxBook + 1, sl_no: 1 };
      return { book_no: maxBook, sl_no: maxSl + 1 };
    } catch (err) { return { book_no: 1, sl_no: 1 }; }
  };

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleAddNew = async () => {
    const { book_no, sl_no } = await getNextBookAndSlNo();
    setEditId(null);
    setForm({ ...EMPTY_FORM, book_no, sl_no });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bags = Number(form.bags) || 0;
      const kgs = roundToInt(form.kgs); 
      const price = toExactDec(form.price_per_unit); 
      const bagWt = BAG_WEIGHTS[form.bag_type] || 0;
      const crop = form.crop_type || "";

      let finalSlNo = parseInt(form.sl_no, 10) || null;
      let finalBookNo = parseInt(form.book_no, 10) || null;

      if (!finalSlNo && !editId) {
        const next = await getNextBookAndSlNo();
        finalBookNo = next.book_no;
        finalSlNo = next.sl_no;
      } else if (!finalBookNo) {
        finalBookNo = 1;
      }

      const kantaData = { ...form, book_no: finalBookNo, sl_no: finalSlNo, bags, kgs, price_per_unit: price };

      const isBagCrop = crop !== "Cotton";
      const totalKg = isBagCrop ? (bags * bagWt) + kgs : kgs;
      const sumAmount = roundToInt((totalKg / 100) * price);
      
      const labourBags = (isBagCrop && kgs > 20) ? bags + 1 : bags;
      const commission = roundToInt(sumAmount * COMMISSION_RATE);
      const hamali = roundToInt(labourBags * HAMALI_RATE(form.bag_type));
      const dharvay = roundToInt(labourBags * DHARVAY_RATE);
      const chata = roundToInt(labourBags * CHATA_RATE);
      const netPayable = roundToInt(sumAmount - commission - hamali - dharvay - chata);
      
      const quintals = Math.floor(totalKg / 100);
      const leftoverKgs = roundToInt(totalKg % 100);

      if (editId) {
        await fetch(`${API_BASE_URL}/kanta/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kantaData) });
      } else {
        await fetch(`${API_BASE_URL}/kanta`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kantaData) });
      }

      if (finalSlNo != null) {
        const takRes = await fetch(`${API_BASE_URL}/takpatti`);
        const takPattiAll = await takRes.json();
        const matchingTP = takPattiAll.find(tp => Number(tp.sl_no) === Number(finalSlNo) && Number(tp.book_no || 1) === Number(finalBookNo));
        const tpData = {
          book_no: finalBookNo, sl_no: finalSlNo, date: form.date, farmer_name: form.farmer_name, village: form.village,
          crop_type: crop, bag_type: form.bag_type, trader_name: form.trader_name, bags, kgs,
          price_per_unit: price, sum_amount: sumAmount, commission, hamali, dharvay, chata,
          net_payable: netPayable, quintals, leftover_kgs: leftoverKgs,
        };
        if (matchingTP) {
          await fetch(`${API_BASE_URL}/takpatti/${matchingTP._id || matchingTP.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tpData) });
        } else {
          await fetch(`${API_BASE_URL}/takpatti`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tpData) });
        }

        const padamRes1 = await fetch(`${API_BASE_URL}/padam`);
        const padamAll1 = await padamRes1.json();
        const existingCredit = padamAll1.find(p => p.type === "credit" && Number(p.sl_no) === Number(finalSlNo) && Number(p.book_no || 1) === Number(finalBookNo));
        const creditData = { book_no: finalBookNo, sl_no: finalSlNo, date: form.date, type: "credit", party_name: form.farmer_name, village: form.village, amount: sumAmount, commission, hamali, dharvay, chata, net_amount: netPayable };
        if (existingCredit) {
           await fetch(`${API_BASE_URL}/padam/${existingCredit._id || existingCredit.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creditData) });
        } else {
           await fetch(`${API_BASE_URL}/padam`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creditData) });
        }
      }

      try {
        const bazaarBags = Number(form.bazaar) || 0;
        let bazaarTotalKg = 0;

        if (crop === "Cotton") {
           bazaarTotalKg = bags > 0 ? toDec((kgs / bags) * bazaarBags) : kgs;
        } else {
           bazaarTotalKg = toDec(bazaarBags * bagWt);
        }

        const bQuintals = Math.floor(bazaarTotalKg / 100);
        const bLeftoverKgs = roundToInt(bazaarTotalKg % 100);
        const bbNet = roundToInt((bazaarTotalKg / 100) * price);

        const bazaarRes = await fetch(`${API_BASE_URL}/bazaarbills`);
        const bazaarAll = await bazaarRes.json();
        
        let uBook = 1, uBill = 1;
        
        // 🔥 CRITICAL FIX: It now groups ONLY if the Trader, Date, AND CROP match. 
        // This forces a new bill_no for different crops, separating them perfectly in the UI.
        const existingBillForTrader = bazaarAll.find(b => b.date === form.date && b.trader_name === form.trader_name && b.crop_type === crop);
        
        if (existingBillForTrader) {
            uBook = parseInt(existingBillForTrader.book_no, 10) || 1;
            uBill = parseInt(String(existingBillForTrader.bill_no).replace(/.*-/, ''), 10) || 1;
        } else {
            let maxBk = 1;
            bazaarAll.forEach(b => { const val = parseInt(b.book_no, 10); if (!isNaN(val) && val > maxBk) maxBk = val; });
            const inMaxBk = bazaarAll.filter(b => parseInt(b.book_no, 10) === maxBk || (maxBk === 1 && !b.book_no));
            let maxBl = 0;
            inMaxBk.forEach(b => { 
                const bNoStr = String(b.bill_no || "0");
                const val = parseInt(bNoStr.includes("-") ? bNoStr.split("-")[1] : bNoStr, 10);
                if (!isNaN(val) && val > maxBl) maxBl = val; 
            });
            if (maxBl >= 100) { uBook = maxBk + 1; uBill = 1; }
            else { uBook = maxBk; uBill = maxBl + 1; }
        }

        const bbData = {
            book_no: uBook, bill_no: uBill, kanta_sl_no: finalSlNo, 
            date: form.date, trader_name: form.trader_name, farmer_name: form.farmer_name,
            crop_type: crop, bag_type: form.bag_type, bags: bazaarBags, quintals: bQuintals,
            kgs: bLeftoverKgs, price_per_unit: price, sub_total: bbNet, net_amount: bbNet, total_amount: bbNet
        };
        
        const existingBBRecord = bazaarAll.find(b => b.kanta_sl_no === finalSlNo);
        if (existingBBRecord) {
            await fetch(`${API_BASE_URL}/bazaarbills/${existingBBRecord._id || existingBBRecord.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bbData) });
        } else if (bazaarBags > 0 || bLeftoverKgs > 0) {
            await fetch(`${API_BASE_URL}/bazaarbills`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bbData) });
        }

        const freshBazaarRes = await fetch(`${API_BASE_URL}/bazaarbills`);
        const freshBazaar = await freshBazaarRes.json();

        const groupedBP = {};
        freshBazaar.forEach(b => {
             if(!b.trader_name || !b.crop_type || !b.date) return;
             const key = `${b.trader_name}_${b.crop_type}_${b.date}`;
             if (!groupedBP[key]) groupedBP[key] = { trader_name: b.trader_name, crop_type: b.crop_type, date: b.date, amount: 0, book_no: parseInt(b.book_no, 10) || 1, bill_no: parseInt(String(b.bill_no).replace(/.*-/, ''), 10) || 1 };
             groupedBP[key].amount += roundToInt(b.sub_total || b.net_amount || b.total_amount || 0);
        });

        const bpRes = await fetch(`${API_BASE_URL}/bazaarpayments`);
        const bpAll = await bpRes.json();

        for (const [key, data] of Object.entries(groupedBP)) {
            const existingBP = bpAll.find(bp => bp.trader_name === data.trader_name && bp.crop_type === data.crop_type && bp.crop_date === data.date);
            if (existingBP) {
                if (!existingBP.is_credited && existingBP.amount !== data.amount) {
                    await fetch(`${API_BASE_URL}/bazaarpayments/${existingBP._id || existingBP.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...existingBP, amount: data.amount, book_no: data.book_no, sl_no: data.bill_no }) });
                }
            } else {
                const expDate = new Date(data.date); 
                expDate.setDate(expDate.getDate() + (data.crop_type === "Castor Seeds" ? 10 : 20));
                await fetch(`${API_BASE_URL}/bazaarpayments`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ book_no: data.book_no, sl_no: data.bill_no, trader_name: data.trader_name, crop_type: data.crop_type, crop_date: data.date, expected_payment_date: expDate.toISOString().split("T")[0], amount: data.amount, is_credited: false })
                });
            }
        }

        const groupedDebits = {};
        freshBazaar.forEach(b => {
            if(!b.trader_name || !b.crop_type || !b.date) return;
            const key = `${b.trader_name}_${b.crop_type}_${b.date}`;
            if (!groupedDebits[key]) groupedDebits[key] = { amount: 0, date: b.date, book_no: parseInt(b.book_no, 10) || 1, bill_no: parseInt(String(b.bill_no).replace(/.*-/, ''), 10) || 1 };
            groupedDebits[key].amount += roundToInt(b.sub_total || b.net_amount || b.total_amount || 0);
        });

        const padamRes2 = await fetch(`${API_BASE_URL}/padam`);
        const padamAll2 = await padamRes2.json();

        for (const [key, data] of Object.entries(groupedDebits)) {
            const [tName, cType, dDate] = key.split("_");
            const existingDebit = padamAll2.find(p => p.type === "debit" && p.party_name === tName && p.crop_type === cType && p.date === dDate);
            if (existingDebit) {
                if (existingDebit.amount !== data.amount) {
                    await fetch(`${API_BASE_URL}/padam/${existingDebit._id || existingDebit.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...existingDebit, amount: data.amount, net_amount: data.amount, date: data.date, book_no: data.book_no, sl_no: data.bill_no }) });
                }
            } else {
                await fetch(`${API_BASE_URL}/padam`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ book_no: data.book_no, sl_no: data.bill_no, date: data.date, type: "debit", party_name: tName, crop_type: cType, amount: data.amount, net_amount: data.amount }) });
            }
        }
      } catch (err) { console.warn("Master Aggregation Sync failed:", err); }

      setLoading(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      setShowForm(false);
      await load();

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Save failed");
    }
  };

  const handleEdit = (row) => {
    setForm({
      book_no: row.book_no ?? 1, sl_no: row.sl_no ?? "", date: row.date ?? "", farmer_name: row.farmer_name ?? "",
      village: row.village ?? "", crop_type: row.crop_type ?? "", bags: row.bags != null ? row.bags : "",
      kgs: row.kgs != null ? row.kgs : "", bag_type: row.bag_type ?? "", price_per_unit: row.price_per_unit ?? "",
      trader_name: row.trader_name ?? "", bazaar: row.bazaar ?? "",
    });
    setEditId(row._id || row.id); 
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) return;
    await fetch(`${API_BASE_URL}/kanta/${id}`, { method: "DELETE" });
    load();
  };

  const toggleDate = (key) => setCollapsedDates(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = entries.filter(e =>
    (!dateFilter || e.date === dateFilter) &&
    (!farmerFilter || e.farmer_name?.toLowerCase().includes(farmerFilter.toLowerCase())) &&
    (!villageFilter || e.village?.toLowerCase().includes(villageFilter.toLowerCase())) &&
    (!cropFilter || e.crop_type?.toLowerCase().includes(cropFilter.toLowerCase()))
  );

  const grouped = groupByDate(filtered);

  return (
    <div className="pb-20">
      <PageHeader title="Kanta Book" subtitle="Initial crop entry register — record all incoming agricultural produce">
        <div className="flex gap-2">
          <Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> New Entry</Button>
          <Button variant="outline" onClick={() => setShowPrint(true)}><Printer className="w-4 h-4 mr-2" /> Print</Button>
        </div>
      </PageHeader> 

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{editId ? "Edit Entry" : "New Entry"}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            <div className="space-y-1.5"><Label className="text-xs">Book No.</Label><Input type="number" value={form.book_no} onChange={(e) => setField("book_no", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Sl. No.</Label><Input type="number" placeholder="Sl." value={form.sl_no} onChange={(e) => setField("sl_no", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Date <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Farmer Name <span className="text-destructive">*</span></Label><Input placeholder="Farmer name" value={form.farmer_name} onChange={(e) => setField("farmer_name", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Village <span className="text-destructive">*</span></Label><Input placeholder="Village" value={form.village} onChange={(e) => setField("village", e.target.value)} required /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Crop Type <span className="text-destructive">*</span></Label>
              <Select value={form.crop_type} onValueChange={(v) => setField("crop_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                <SelectContent>{CROP_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Bag Type</Label>
              <Select value={form.bag_type} onValueChange={(v) => setField("bag_type", v)}>
                <SelectTrigger><SelectValue placeholder="Weight/bag" /></SelectTrigger>
                <SelectContent>{BAG_TYPE_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Bags</Label><Input type="number" placeholder="No. of bags" value={form.bags} onChange={(e) => setField("bags", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">{(form.crop_type === "Cotton" || form.crop_type === "Castor Seeds") ? "Total Kgs" : "Extra Kgs"}</Label><Input type="number" step="any" placeholder="0" value={form.kgs === "" ? "" : form.kgs} onChange={(e) => setField("kgs", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bazaar Bags <span className="text-accent font-semibold">★</span></Label><Input type="number" placeholder="Bazaar bags" value={form.bazaar} onChange={(e) => setField("bazaar", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Price / Unit (₹) <span className="text-destructive">*</span></Label><Input type="number" step="any" placeholder="0.00" value={form.price_per_unit} onChange={(e) => setField("price_per_unit", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Trader Name <span className="text-destructive">*</span></Label><Input placeholder="Trader name" value={form.trader_name} onChange={(e) => setField("trader_name", e.target.value)} required /></div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Saving..." : "Save Entry"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {!showForm && <div className="mb-4 flex flex-wrap gap-2">
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44" />
        <Input placeholder="Farmer name" value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)} className="w-36" />
        <Input placeholder="Village" value={villageFilter} onChange={(e) => setVillageFilter(e.target.value)} className="w-32" />
        <Input placeholder="Crop" value={cropFilter} onChange={(e) => setCropFilter(e.target.value)} className="w-32" />
      </div>}

      {!showForm && grouped.length === 0 && <div className="bg-card rounded-xl border border-border py-14 text-center text-muted-foreground text-sm">No records found</div>}

      {!showForm && grouped.map(([dateKey, rows]) => (
        <div key={dateKey} className="mb-6">
          <button type="button" onClick={() => toggleDate(dateKey)} className="flex items-center gap-2 mb-2 w-full text-left">
            {collapsedDates[dateKey] ? <ChevronRight className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
            <span className="font-semibold text-primary text-sm">{formatDate(dateKey)}</span>
            <Badge variant="secondary" className="text-xs">{rows.length} entries</Badge>
          </button>
          {!collapsedDates[dateKey] && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div id="print-area">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Book - Sl.</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Crop</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bag Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bags</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kgs</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Farmer</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Village</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price/Unit</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trader</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bazaar Bags</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row._id || row.id} onClick={() => handleEdit(row)} className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors">
                        <td className="px-4 py-3 text-muted-foreground font-semibold"><span className="text-primary">{row.book_no || 1}</span> - {row.sl_no ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(row.date) || "—"}</td>
                        <td className="px-4 py-3 font-medium">{row.crop_type || "—"}</td>
                        <td className="px-4 py-3">{row.bag_type || "—"}</td>
                        <td className="px-4 py-3 font-mono">{row.bags ?? "—"}</td>
                        <td className="px-4 py-3 font-mono">{row.kgs ?? "—"}</td>
                        <td className="px-4 py-3">{row.farmer_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.village}</td>
                        <td className="px-4 py-3 font-mono">₹{formatExact(row.price_per_unit)}</td>
                        <td className="px-4 py-3">{row.trader_name}</td>
                        <td className="px-4 py-3">{row.bazaar != null ? row.bazaar : "—"}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      <KantaPrintModal open={showPrint} onOpenChange={setShowPrint} entries={entries} />
    </div>
  );
}