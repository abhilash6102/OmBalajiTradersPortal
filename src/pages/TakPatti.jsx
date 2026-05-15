import { API_BASE_URL } from "../api/config";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, X, Save, ChevronDown, ChevronRight, FileText, IndianRupee, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const BAG_WEIGHTS = { "30kgs": 30, "35kgs": 35, "49kgs": 49, "59kgs": 59, "60kgs": 60 };
const BAG_TYPE_OPTIONS = Object.keys(BAG_WEIGHTS);
const CROP_OPTIONS = ["Maize", "Paddy", "Ground Nut", "Red Gram", "Black Gram", "Ragi", "Lobia", "Cotton", "Castor Seeds"];

const HAMALI_RATE = (bagType) => (bagType === "59kgs" || bagType === "60kgs") ? 12.38 : 11.52;
const DHARVAY_RATE = 5.15;
const CHATA_RATE = 1.8;
const COMMISSION_RATE = 1.75 / 100;

// 🔥 STRICT 2-DECIMAL HELPERS
const roundToInt = (num) => Math.round(Number(num || 0));
const toExactDec = (num) => Number(Number(num || 0).toFixed(2));
const formatMoney = (num) => Math.round(Number(num || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatExact = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toDec = (num) => Number(Number(num || 0).toFixed(2));

function calcSumAmount(crop, bags, kgs, bagType, price) {
  if (!price) return 0;
  const isBagCrop = crop !== "Cotton";
  const totalKg = toDec(isBagCrop ? (Number(bags) || 0) * (BAG_WEIGHTS[bagType] || 0) + (Number(kgs) || 0) : (Number(kgs) || 0));
  return toDec((totalKg / 100) * Number(price));
}

function calcQuintalsKgs(crop, bags, kgs, bagType) {
  const isBagCrop = crop !== "Cotton";
  const totalKg = toDec(isBagCrop ? (Number(bags) || 0) * (BAG_WEIGHTS[bagType] || 0) + (Number(kgs) || 0) : (Number(kgs) || 0));
  return { quintals: Math.floor(totalKg / 100), leftoverKgs: roundToInt(totalKg % 100) };
}

function autoCalc(form) {
  const bags = Number(form.bags) || 0;
  const kgs = roundToInt(form.kgs);
  const price = toExactDec(form.price_per_unit);
  const sumAmount = calcSumAmount(form.crop_type, form.bags, form.kgs, form.bag_type, price);
  
  const isBagCrop = form.crop_type !== "Cotton";
  const labourBags = (isBagCrop && kgs > 20) ? bags + 1 : bags;

  const commission = toDec(sumAmount * COMMISSION_RATE);
  const hamali = toDec(labourBags * HAMALI_RATE(form.bag_type || ""));
  const dharvay = toDec(labourBags * DHARVAY_RATE);
  const chata = toDec(labourBags * CHATA_RATE);
  
  const { quintals, leftoverKgs } = calcQuintalsKgs(form.crop_type, form.bags, form.kgs, form.bag_type);
  return { sumAmount, commission, hamali, dharvay, chata, quintals, leftoverKgs };
}

const EMPTY_FORM = {
  book_no: "", sl_no: "", date: "", farmer_name: "", village: "", crop_type: "",
  bag_type: "", trader_name: "", bags: "", kgs: "", price_per_unit: "",
  sum_amount: "", commission: "", hamali: "", dharvay: "", chata: "",
  quintals: "", leftover_kgs: ""
};

// 🔥 FIXED: Now gracefully chops off the ISO time string if the backend sends it
function formatDate(dateStr) {
  if (!dateStr) return dateStr;
  const cleanDate = dateStr.split("T")[0]; 
  const [y, m, d] = cleanDate.split("-");
  return `${d}/${m}/${y}`;
}

function groupByDate(entries) {
  const groups = {};
  entries.forEach(e => {
    // Also clean it here just in case the group key is acting weird
    const key = e.date ? e.date.split("T")[0] : "No Date";
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

export default function TakPatti() {
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

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/takpatti`);
      const data = await res.json();
      if (Array.isArray(data)) setEntries(data);
    } catch (err) { console.error("Failed to load Tak Patti entries", err); }
  };
  
  useEffect(() => { load(); }, []);

  const getNextBookAndSlNo = () => {
    if (!entries.length) return { book_no: 1, sl_no: 1 };

    let maxBook = 1;

    entries.forEach(item => {
      const b = Number(item.book_no);
      if (b > maxBook) maxBook = b;
    });

    const currentBookItems = entries.filter(
      item => Number(item.book_no) === maxBook
    );

    let maxSl = 0;

    currentBookItems.forEach(item => {
      const sl = Number(item.sl_no);
      if (sl > maxSl) maxSl = sl;
    });

    if (maxSl >= 100) {
      return { book_no: maxBook + 1, sl_no: 1 };
    }

    return { book_no: maxBook, sl_no: maxSl + 1 };
  };

  const handleAddNew = async () => {
    const { book_no, sl_no } = getNextBookAndSlNo();
    setEditId(null);
    setForm({ ...EMPTY_FORM, book_no, sl_no });
    setShowForm(true);
  };

  const setField = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (["crop_type", "bag_type", "bags", "kgs", "price_per_unit"].includes(key)) {
        const calc = autoCalc(updated);
        return {
          ...updated, sum_amount: calc.sumAmount, commission: calc.commission,
          hamali: calc.hamali, dharvay: calc.dharvay, chata: calc.chata,
          quintals: calc.quintals, leftover_kgs: calc.leftoverKgs,
        };
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const commVal = roundToInt(form.commission);
      const hamaliVal = roundToInt(form.hamali);
      const dharvayVal = roundToInt(form.dharvay);
      const chataVal = roundToInt(form.chata);
      const sumVal = roundToInt(form.sum_amount);
      const price = toExactDec(form.price_per_unit);
      
      let finalSlNo = parseInt(form.sl_no, 10) || null;
      let finalBookNo = parseInt(form.book_no, 10) || null;

      if (!finalSlNo && !editId) {
        const next = getNextBookAndSlNo();
        finalBookNo = next.book_no;
        finalSlNo = next.sl_no;
      } else if (!finalBookNo) {
        finalBookNo = 1;
      }
      
      const takpattiData = {
        ...form, book_no: finalBookNo, sl_no: finalSlNo, bags: Number(form.bags) || 0,
        kgs: roundToInt(form.kgs), price_per_unit: price, sum_amount: sumVal,
        commission: commVal, hamali: hamaliVal, dharvay: dharvayVal, chata: chataVal,
        net_payable: roundToInt(sumVal - commVal - hamaliVal - dharvayVal - chataVal),
        quintals: Number(form.quintals) || 0, leftover_kgs: roundToInt(form.leftover_kgs),
      };

      if (editId) {
        await fetch(`${API_BASE_URL}/takpatti/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(takpattiData) });
      } else {
        await fetch(`${API_BASE_URL}/takpatti`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(takpattiData) });
      }

      if (finalSlNo != null) {
        const kantaRes = await fetch(`${API_BASE_URL}/kanta`);
        const kantaAll = await kantaRes.json();
        const matchingKanta = kantaAll.find(k => Number(k.sl_no) === Number(finalSlNo) && Number(k.book_no || 1) === Number(finalBookNo));
        if (matchingKanta) {
          await fetch(`${API_BASE_URL}/kanta/${matchingKanta._id || matchingKanta.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...matchingKanta, book_no: finalBookNo, date: takpattiData.date, farmer_name: takpattiData.farmer_name,
              village: takpattiData.village, crop_type: takpattiData.crop_type, bag_type: takpattiData.bag_type,
              trader_name: takpattiData.trader_name, bags: takpattiData.bags, kgs: takpattiData.kgs, price_per_unit: price,
            })
          });
        }

        const padamRes1 = await fetch(`${API_BASE_URL}/padam`);
        const padamAll1 = await padamRes1.json();
        const existingCredit = padamAll1.find(p => p.type === "credit" && Number(p.sl_no) === Number(finalSlNo) && Number(p.book_no || 1) === Number(finalBookNo));
        const creditData = { book_no: finalBookNo, sl_no: finalSlNo, date: takpattiData.date, type: "credit", party_name: takpattiData.farmer_name, village: takpattiData.village, amount: sumVal, commission: commVal, hamali: hamaliVal, dharvay: dharvayVal, chata: chataVal, net_amount: takpattiData.net_payable };
        
        if (existingCredit) {
           await fetch(`${API_BASE_URL}/padam/${existingCredit._id || existingCredit.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creditData) });
        } else {
           await fetch(`${API_BASE_URL}/padam`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creditData) });
        }

        try {
            const matchingKGrp = kantaAll.filter(k => k.date === form.date && k.trader_name === form.trader_name && k.crop_type === form.crop_type);
            let sumBBags = 0, sumBAmount = 0, sumBTotalKg = 0;
            
            matchingKGrp.forEach(k => {
                const bBags = Number(k.bazaar) || 0;
                sumBBags += bBags;
                
                // 🔥 PROPORTIONAL MATH ENGINE FOR COTTON
                if (form.crop_type === "Cotton") {
                    const origBags = Number(k.bags) || 1;
                    const origKgs = Number(k.kgs) || 0;
                    const propKg = origBags > 0 ? (origKgs / origBags) * bBags : origKgs;
                    sumBTotalKg += propKg;
                    sumBAmount += (propKg / 100) * Number(k.price_per_unit || price);
                } else {
                    const wt = BAG_WEIGHTS[k.bag_type] || 0;
                    const bKgs = bBags * wt;
                    sumBTotalKg += bKgs;
                    sumBAmount += (bKgs / 100) * Number(k.price_per_unit || price);
                }
            });
            sumBAmount = roundToInt(sumBAmount);
            
            const bazaarRes = await fetch(`${API_BASE_URL}/bazaarbills`);
            const bazaarAll = await bazaarRes.json();
            
            let uBook = 1, uBill = 1;
            
            // 🔥 STRICT CROP CHECK FOR UNIQUE BILL NUMBER
            const existingBillForTrader = bazaarAll.find(b => b.date === form.date && b.trader_name === form.trader_name && b.crop_type === form.crop_type);
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
                crop_type: form.crop_type, bag_type: form.bag_type, bags: sumBBags, quintals: Math.floor(sumBTotalKg/100), kgs: roundToInt(sumBTotalKg%100),
                price_per_unit: price, sub_total: sumBAmount, net_amount: sumBAmount, total_amount: sumBAmount
            };
            
            const existingBB = bazaarAll.find(b => b.kanta_sl_no === finalSlNo);
            if (existingBB) {
                await fetch(`${API_BASE_URL}/bazaarbills/${existingBB._id || existingBB.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bbData) });
            } else if (sumBBags > 0 || sumBTotalKg > 0) {
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
      }

      setLoading(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Save failed");
    }
  };

  const handleEdit = (row) => {
    const { quintals, leftoverKgs } = calcQuintalsKgs(row.crop_type, row.bags, row.kgs, row.bag_type);
    
    // 🔥 Ensure the edit form gets the clean date string too!
    const cleanDate = row.date ? row.date.split("T")[0] : "";

    setForm({
      book_no: row.book_no ?? 1, sl_no: row.sl_no ?? "", date: cleanDate, farmer_name: row.farmer_name ?? "",
      village: row.village ?? "", crop_type: row.crop_type ?? "", bags: row.bags != null ? row.bags : "",
      kgs: row.kgs != null ? row.kgs : "", bag_type: row.bag_type ?? "", price_per_unit: row.price_per_unit ?? "",
      sum_amount: row.sum_amount ?? "", commission: row.commission ?? "", hamali: row.hamali ?? "",
      dharvay: row.dharvay ?? "", chata: row.chata ?? "", quintals: row.quintals ?? quintals, leftover_kgs: row.leftover_kgs ?? leftoverKgs,
    });
    setEditId(row._id || row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) return;
    try { await fetch(`${API_BASE_URL}/takpatti/${id}`, { method: "DELETE" }); load(); } catch (err) { console.error("Delete failed", err); }
  };

  const toggleDate = (key) => setCollapsedDates(prev => ({ ...prev, [key]: !prev[key] }));

  const filtered = entries.filter(e =>
    (!dateFilter || (e.date && e.date.split("T")[0] === dateFilter)) && 
    (!farmerFilter || e.farmer_name?.toLowerCase().includes(farmerFilter.toLowerCase())) &&
    (!villageFilter || e.village?.toLowerCase().includes(villageFilter.toLowerCase())) && 
    (!cropFilter || e.crop_type?.toLowerCase().includes(cropFilter.toLowerCase()))
  );

  const grouped = groupByDate(filtered).map(([dateKey, rows]) => [ dateKey, [...rows].sort((a, b) => (a.sl_no ?? 999) - (b.sl_no ?? 999)) ]);
  
  const totalGross = filtered.reduce((s, e) => s + (e.sum_amount || 0), 0);
  const totalDeductions = filtered.reduce((s, e) => s + (e.commission || 0) + (e.hamali || 0) + (e.dharvay || 0) + (e.chata || 0), 0);
  const totalNet = filtered.reduce((s, e) => s + (e.net_payable || 0), 0);

  const deductionsInForm = roundToInt(Number(form.commission || 0) + Number(form.hamali || 0) + Number(form.dharvay || 0) + Number(form.chata || 0));
  const netInForm = roundToInt(Number(form.sum_amount || 0) - deductionsInForm);

  return (
    <div className="pb-20">
      <PageHeader title="Tak Patti" subtitle="Detailed farmer transaction sheet with deductions and net payable"><Button onClick={handleAddNew}><Plus className="w-4 h-4 mr-2" /> New Entry</Button></PageHeader>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{editId ? "Edit Entry" : "New Entry"}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
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
            <div className="space-y-1.5"><Label className="text-xs">Trader Name <span className="text-destructive">*</span></Label><Input placeholder="Trader name" value={form.trader_name} onChange={(e) => setField("trader_name", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bags</Label><Input type="number" placeholder="No. of bags" value={form.bags} onChange={(e) => setField("bags", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Kgs {(form.crop_type === "Cotton" || form.crop_type === "Castor Seeds") ? "(Total Kgs)" : "(Extra Kgs)"}</Label><Input type="number" step="any" placeholder="Kgs" value={form.kgs} onChange={(e) => setField("kgs", e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Quintals (Auto)</Label><Input readOnly value={form.quintals !== "" ? form.quintals : ""} placeholder="Auto" className="bg-muted font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Leftover Kgs (Auto)</Label><Input readOnly value={form.leftover_kgs !== "" ? form.leftover_kgs : ""} placeholder="Auto" className="bg-muted font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
            <div className="space-y-1.5"><Label className="text-xs">Price/Unit (₹) <span className="text-destructive">*</span></Label><Input type="number" step="any" placeholder="0.00" value={form.price_per_unit} onChange={(e) => setField("price_per_unit", e.target.value)} required className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Sum Amount (₹)</Label><Input readOnly value={form.sum_amount !== "" ? form.sum_amount : ""} placeholder="Auto" className="bg-muted font-mono font-semibold text-primary" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Commission (1.75%)</Label><Input type="number" step="any" value={form.commission !== "" ? form.commission : ""} onChange={(e) => setField("commission", e.target.value)} placeholder="0" className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Hamali (₹/bag)</Label><Input type="number" step="any" value={form.hamali !== "" ? form.hamali : ""} onChange={(e) => setField("hamali", e.target.value)} placeholder="0" className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Dharvay (₹5.15/bag)</Label><Input type="number" step="any" value={form.dharvay !== "" ? form.dharvay : ""} onChange={(e) => setField("dharvay", e.target.value)} placeholder="0" className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Chata (₹1.80/bag)</Label><Input type="number" step="any" value={form.chata !== "" ? form.chata : ""} onChange={(e) => setField("chata", e.target.value)} placeholder="0" className="font-mono" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Deductions (₹)</Label><Input readOnly value={deductionsInForm.toFixed(2)} className="bg-muted font-mono text-destructive" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Net Amount (₹)</Label><Input readOnly value={netInForm.toFixed(2)} className="bg-muted font-mono font-bold text-primary" /></div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}><Save className="w-4 h-4 mr-2" />{loading ? "Saving..." : "Save Entry"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {!showForm && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard title="Gross Amount" value={`₹${formatMoney(totalGross)}`} icon={IndianRupee} />
            <StatCard title="Total Deductions" value={`₹${formatMoney(totalDeductions)}`} icon={TrendingDown} />
            <StatCard title="Net Payable" value={`₹${formatMoney(totalNet)}`} icon={FileText} />
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44" />
            <Input placeholder="Farmer name" value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)} className="w-36" />
            <Input placeholder="Village" value={villageFilter} onChange={(e) => setVillageFilter(e.target.value)} className="w-32" />
            <Input placeholder="Crop" value={cropFilter} onChange={(e) => setCropFilter(e.target.value)} className="w-32" />
          </div>
          {grouped.length === 0 && <div className="bg-card rounded-xl border border-border py-14 text-center text-muted-foreground text-sm">No records found</div>}
          {grouped.map(([dateKey, rows]) => {
            const totals = rows.reduce((acc, row) => ({
              commission: acc.commission + (row.commission || 0), hamali: acc.hamali + (row.hamali || 0),
              dharvay: acc.dharvay + (row.dharvay || 0), chata: acc.chata + (row.chata || 0), net_payable: acc.net_payable + (row.net_payable || 0),
            }), { commission: 0, hamali: 0, dharvay: 0, chata: 0, net_payable: 0 });
            
            return (
              <div key={dateKey} className="mb-6">
                <button type="button" onClick={() => toggleDate(dateKey)} className="flex items-center gap-2 mb-2 w-full text-left">
                  {collapsedDates[dateKey] ? <ChevronRight className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />}
                  <span className="font-semibold text-primary text-sm">{formatDate(dateKey)}</span>
                  <Badge variant="secondary" className="text-xs">{rows.length} entries</Badge>
                </button>
                {!collapsedDates[dateKey] && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                              Book - Sl.No
                            </th>
                            {["Date","Trader","Farmer",  "Village", "Crop", "Bag Type", "Bags", "Kgs", "Quintals", "Left Kgs", "Price/Unit", "Sum (₹)", "Commission", "Hamali", "Dharvay", "Chata", "Deductions", "Net Pay (₹)", ""].map(h => {
                              const isCentered = h === "Crop" || h === "Sum (₹)";
                              const isMoney = ["Commission", "Hamali", "Dharvay", "Chata", "Deductions", "Net Pay (₹)"].includes(h);

                              return (
                                <th 
                                  key={h} 
                                  className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${
                                    isCentered ? "text-center" : isMoney ? "text-right" : "text-left"
                                  }`}
                                >
                                  {h}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => {
                            const deductions = roundToInt((row.commission || 0) + (row.hamali || 0) + (row.dharvay || 0) + (row.chata || 0));
                            return (
                              <tr key={row._id || row.id} onClick={() => handleEdit(row)} className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors">
                                <td className="px-3 py-3 text-muted-foreground font-semibold whitespace-nowrap"><span className="text-primary">{row.book_no || 1}</span> - {row.sl_no ?? "—"}</td>
                                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.date) || "—"}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap font-medium text-muted-foreground">{(row.trader_name || "").toUpperCase()}</td>
                                <td className="px-3 py-3 font-medium whitespace-nowrap">{row.farmer_name}</td>
                                <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{row.village}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">{row.crop_type || "—"}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">{row.bag_type || "—"}</td>
                                <td className="px-3 py-3 text-center font-mono whitespace-nowrap">{row.bags ?? "—"}</td>
                                <td className="px-3 py-3 text-center font-mono whitespace-nowrap">{row.kgs ?? "—"}</td>
                                <td className="px-3 py-3 text-center font-mono whitespace-nowrap">{row.quintals ?? "—"}</td>
                                <td className="px-3 py-3 text-center font-mono whitespace-nowrap">{row.leftover_kgs ?? "—"}</td>
                                <td className="px-3 py-3 text-center font-mono whitespace-nowrap">₹{formatExact(row.price_per_unit)}</td>
                                <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap">₹{formatMoney(row.sum_amount)}</td>
                                <td className="px-3 py-3 font-mono text-right whitespace-nowrap">₹{formatMoney(row.commission)}</td>
                                <td className="px-3 py-3 font-mono text-right whitespace-nowrap">₹{formatMoney(row.hamali)}</td>
                                <td className="px-3 py-3 font-mono text-right whitespace-nowrap">₹{formatMoney(row.dharvay)}</td>
                                <td className="px-3 py-3 font-mono text-right whitespace-nowrap">₹{formatMoney(row.chata)}</td>
                                <td className="px-3 py-3 font-mono text-destructive text-right whitespace-nowrap">₹{formatMoney(deductions)}</td>
                                <td className="px-3 py-3 font-mono font-semibold text-primary text-right whitespace-nowrap">₹{formatMoney(row.net_payable)}</td>
                                <td className="px-3 py-3 whitespace-nowrap"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }}><Trash2 className="w-4 h-4" /></Button></td>
                              </tr>
                            );
                          })}
                          <tr className="bg-primary/10 border-t-2 border-primary/30 font-bold">
                            <td colSpan={13} className="px-3 py-2.5 text-xs font-bold text-primary uppercase tracking-wide whitespace-nowrap">✦ Totals</td>
                            <td className="px-3 py-2.5 font-mono text-primary text-right whitespace-nowrap">₹{formatMoney(totals.commission)}</td>
                            <td className="px-3 py-2.5 font-mono text-primary text-right whitespace-nowrap">₹{formatMoney(totals.hamali)}</td>
                            <td className="px-3 py-2.5 font-mono text-primary text-right whitespace-nowrap">₹{formatMoney(totals.dharvay)}</td>
                            <td className="px-3 py-2.5 font-mono text-primary text-right whitespace-nowrap">₹{formatMoney(totals.chata)}</td>
                            <td className="px-3 py-2.5 font-mono text-destructive text-right whitespace-nowrap">₹{formatMoney(totals.commission + totals.hamali + totals.dharvay + totals.chata)}</td>
                            <td className="px-3 py-2.5 font-mono text-primary text-right whitespace-nowrap">₹{formatMoney(totals.net_payable)}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}