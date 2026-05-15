import { API_BASE_URL } from "../api/config";
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
      if (Array.isArray(data)) {
        setEntries(data);
      }
    } catch (err) { 
      console.error("Failed to load Kanta Book", err); 
    }
  };

  useEffect(() => { load(); }, []);

  const getNextBookAndSlNo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/kanta`);
      const data = await res.json();
      if (!data || data.length === 0) return { book_no: 1, sl_no: 1 };

      let maxBook = 1;
      data.forEach(item => { 
        const b = parseInt(item.book_no, 10); 
        if (!isNaN(b) && b > maxBook) maxBook = b; 
      });

      const itemsInMaxBook = data.filter(item => parseInt(item.book_no, 10) === maxBook || (maxBook === 1 && !item.book_no));

      let maxSl = 0;
      itemsInMaxBook.forEach(item => { 
        const sl = parseInt(item.sl_no, 10); 
        if (!isNaN(sl) && sl > maxSl) maxSl = sl; 
      });

      if (maxSl >= 100) return { book_no: maxBook + 1, sl_no: 1 };
      return { book_no: maxBook, sl_no: maxSl + 1 };
    } catch (err) { 
      return { book_no: 1, sl_no: 1 }; 
    }
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

    const kantaData = { 
      ...form, book_no: finalBookNo, sl_no: finalSlNo, bags, kgs, price_per_unit: price 
    };

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

    // 1. Save Kanta Entry
    if (editId) {
      await fetch(`${API_BASE_URL}/kanta/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kantaData)
      });
    } else {
      await fetch(`${API_BASE_URL}/kanta`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kantaData)
      });
    }

    // 2. Save TakPatti
    const takRes = await fetch(`${API_BASE_URL}/takpatti`);
    const takPattiAll = await takRes.json();
    const matchingTP = takPattiAll.find(tp => Number(tp.sl_no) === Number(finalSlNo) && Number(tp.book_no || 1) === Number(finalBookNo));
    
    const tpData = {
      book_no: finalBookNo, sl_no: finalSlNo, date: form.date, farmer_name: form.farmer_name, 
      village: form.village, crop_type: crop, bag_type: form.bag_type, trader_name: form.trader_name,
      bags, kgs, price_per_unit: price, sum_amount: sumAmount, commission, hamali, dharvay, chata,
      net_payable: netPayable, quintals, leftover_kgs: leftoverKgs,
    };

    if (matchingTP) {
      await fetch(`${API_BASE_URL}/takpatti/${matchingTP._id || matchingTP.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tpData)
      });
    } else {
      await fetch(`${API_BASE_URL}/takpatti`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tpData)
      });
    }

    // 3. Save Padam Credit (Farmer)
    const padamRes1 = await fetch(`${API_BASE_URL}/padam`);
    const padamAll1 = await padamRes1.json();
    const existingCredit = padamAll1.find(p => p.type === "credit" && Number(p.sl_no) === Number(finalSlNo) && Number(p.book_no || 1) === Number(finalBookNo));
    
    const creditData = {
      book_no: finalBookNo, sl_no: finalSlNo, date: form.date, type: "credit", 
      party_name: form.farmer_name, village: form.village, amount: sumAmount, commission, 
      hamali, dharvay, chata, net_amount: netPayable
    };

    if (existingCredit) {
      await fetch(`${API_BASE_URL}/padam/${existingCredit._id || existingCredit.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creditData)
      });
    } else {
      await fetch(`${API_BASE_URL}/padam`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creditData)
      });
    }

    // 4. Calculate Bazaar Bill values
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

    // 5. Get existing Bazaar Bills and determine book/bill number
    const bazaarRes = await fetch(`${API_BASE_URL}/bazaarbills`);
    const bazaarAll = await bazaarRes.json();

    let uBook = 1, uBill = 1;

    // Check for existing bill with SAME trader + SAME date + SAME crop
// 🔥 Check for existing bill with SAME trader (case-insensitive) + SAME date + SAME crop
const existingBillForSameCrop = bazaarAll.find(b => 
  b.date === form.date && 
  b.trader_name?.toLowerCase() === form.trader_name?.toLowerCase() && 
  b.crop_type === crop
);

    if (existingBillForSameCrop) {
      // REUSE existing bill number for same crop
      uBook = parseInt(existingBillForSameCrop.book_no, 10) || 1;
      const bNoStr = String(existingBillForSameCrop.bill_no || "1");
      uBill = parseInt(bNoStr.includes("-") ? bNoStr.split("-")[1] : bNoStr, 10) || 1;
    } else {
      // Check for existing bill with SAME trader + SAME date but DIFFERENT crop
      const existingBillForDifferentCrop = bazaarAll.find(b => 
        b.date === form.date && 
        b.trader_name?.toLowerCase() === form.trader_name?.toLowerCase() && 
        b.crop_type !== crop
      );
      
      if (existingBillForDifferentCrop) {
        // Create NEW bill number (increment from highest existing)
        let maxBill = 0;
        const sameDateBills = bazaarAll.filter(b => b.date === form.date && b.trader_name?.toLowerCase() === form.trader_name?.toLowerCase());
        sameDateBills.forEach(b => {
          const bNoStr = String(b.bill_no || "0");
          const val = parseInt(bNoStr.includes("-") ? bNoStr.split("-")[1] : bNoStr, 10);
          if (!isNaN(val) && val > maxBill) maxBill = val;
        });
        uBill = maxBill + 1;
        uBook = existingBillForDifferentCrop.book_no || 1;
      } else {
        // No bills for this trader on this date - create first bill
        let maxBk = 1;
        bazaarAll.forEach(b => { 
          const val = parseInt(b.book_no, 10); 
          if (!isNaN(val) && val > maxBk) maxBk = val; 
        });
        
        const inMaxBk = bazaarAll.filter(b => parseInt(b.book_no, 10) === maxBk || (maxBk === 1 && !b.book_no));
        let maxBl = 0;
        
        inMaxBk.forEach(b => {
          const bNoStr = String(b.bill_no || "0");
          const val = parseInt(bNoStr.includes("-") ? bNoStr.split("-")[1] : bNoStr, 10);
          if (!isNaN(val) && val > maxBl) maxBl = val;
        });
        
        if (maxBl >= 100) { 
          uBook = maxBk + 1; 
          uBill = 1; 
        } else { 
          uBook = maxBk; 
          uBill = maxBl + 1; 
        }
      }
    }

    // 6. Save Bazaar Bill
    const bbData = {
      book_no: uBook, bill_no: uBill, kanta_sl_no: finalSlNo, date: form.date, 
      trader_name: form.trader_name, farmer_name: form.farmer_name, crop_type: crop, bag_type: form.bag_type, 
      bags: bazaarBags, quintals: bQuintals, kgs: bLeftoverKgs, price_per_unit: price, 
      sub_total: bbNet, net_amount: bbNet, total_amount: bbNet
    };

    const existingBBRecord = bazaarAll.find(b => 
      Number(b.kanta_sl_no) === Number(finalSlNo) && b.date === form.date && b.trader_name?.toLowerCase() === form.trader_name?.toLowerCase()
    );

    if (existingBBRecord) {
      await fetch(`${API_BASE_URL}/bazaarbills/${existingBBRecord._id || existingBBRecord.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bbData)
      });
    } else if (bazaarBags > 0 || bLeftoverKgs > 0) {
      await fetch(`${API_BASE_URL}/bazaarbills`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bbData)
      });
    }

    // 7. Calculate Day Total and Sync Bazaar Payments
    const freshBazaarRes = await fetch(`${API_BASE_URL}/bazaarbills`);
    const freshBazaar = await freshBazaarRes.json();
    const traderDayBills = freshBazaar.filter(
      b => b.trader_name?.toLowerCase() === form.trader_name?.toLowerCase() && b.crop_type === crop && b.date === form.date
    );
    const dayTotal = traderDayBills.reduce((s, b) => s + (Number(b.sub_total) || Number(b.net_amount) || 0), 0);

    // 8. Sync Bazaar Payments
    const bpRes = await fetch(`${API_BASE_URL}/bazaarpayments`);
    const bpAll = await bpRes.json();
    
    const existingBP = bpAll.find(bp => bp.trader_name?.toLowerCase() === form.trader_name?.toLowerCase() && bp.crop_type === crop && bp.crop_date === form.date);

    const expDate = new Date(form.date);
    expDate.setDate(expDate.getDate() + (crop === "Castor Seeds" ? 10 : 20));
    const expectedPaymentDate = expDate.toISOString().split("T")[0];

    if (existingBP) {
      if (!existingBP.is_credited) {
        await fetch(`${API_BASE_URL}/bazaarpayments/${existingBP._id || existingBP.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...existingBP, amount: dayTotal })
        });
      }
    } else if (dayTotal > 0) {
      await fetch(`${API_BASE_URL}/bazaarpayments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_no: uBook, sl_no: uBill, trader_name: form.trader_name, crop_type: crop,
          crop_date: form.date, expected_payment_date: expectedPaymentDate, amount: dayTotal, is_credited: false
        })
      });
    }

    // 9. Sync Padam Debit (Trader)
    const padamRes2 = await fetch(`${API_BASE_URL}/padam`);
    const padamAll2 = await padamRes2.json();
    
    const existingDebit = padamAll2.find(p => p.type === "debit" && p.party_name?.toLowerCase() === form.trader_name?.toLowerCase() && p.crop_type === crop && p.date === form.date);

    if (existingDebit) {
      await fetch(`${API_BASE_URL}/padam/${existingDebit._id || existingDebit.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...existingDebit, amount: dayTotal, net_amount: dayTotal })
      });
    } else if (dayTotal > 0) {
      await fetch(`${API_BASE_URL}/padam`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_no: uBook, sl_no: uBill, date: form.date, type: "debit",
          party_name: form.trader_name, crop_type: crop, amount: dayTotal, net_amount: dayTotal
        })
      });
    }

    setLoading(false);
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
    await load();

  } catch (err) {
    console.error(err);
    setLoading(false);
    alert("Save failed: " + err.message);
  }
};

  const handleEdit = (row) => {
    setForm({
      book_no: row.book_no ?? 1, sl_no: row.sl_no ?? "", date: row.date ?? "",
      farmer_name: row.farmer_name ?? "", village: row.village ?? "", crop_type: row.crop_type ?? "",
      bags: row.bags != null ? row.bags : "", kgs: row.kgs != null ? row.kgs : "", bag_type: row.bag_type ?? "",
      price_per_unit: row.price_per_unit ?? "", trader_name: row.trader_name?.toLowerCase() ?? "", bazaar: row.bazaar ?? "",
    });
    setEditId(row._id || row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 🔥 COMPLETELY FIXED DELETION SYNC
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry? This action will sync all modules.")) return;
    
    try {
      // 1. Get Kanta details
      const kantaRes = await fetch(`${API_BASE_URL}/kanta`);
      const kantaAll = await kantaRes.json();
      const item = kantaAll.find(k => k._id === id || k.id === id);
      if (!item) return;

      const bNo = Number(item.book_no || 1);
      const sNo = Number(item.sl_no);
      const trader = item.trader_name;
      const crop = item.crop_type;
      const date = item.date;
      const bazaarBags = Number(item.bazaar) || 0;
      const price = Number(item.price_per_unit) || 0;

      // 2. Delete Takpatti
      const tpRes = await fetch(`${API_BASE_URL}/takpatti`);
      const tpAll = await tpRes.json();
      const tp = tpAll.find(t => Number(t.sl_no) === sNo && Number(t.book_no || 1) === bNo);
      if (tp) await fetch(`${API_BASE_URL}/takpatti/${tp._id || tp.id}`, { method: "DELETE" });

      // 3. Delete Padam Credit
      const padRes = await fetch(`${API_BASE_URL}/padam`);
      const padAll = await padRes.json();
      const pCred = padAll.find(p => p.type === "credit" && Number(p.sl_no) === sNo && Number(p.book_no || 1) === bNo);
      if (pCred) await fetch(`${API_BASE_URL}/padam/${pCred._id || pCred.id}`, { method: "DELETE" });

      // 4. Delete Bazaar Bills (Matching by precise attributes to guarantee we hit the right one)
      const bbRes = await fetch(`${API_BASE_URL}/bazaarbills`);
      let bbAll = await bbRes.json();
      
      const bbToDelete = bbAll.find(b => 
        b.date === date && b.trader_name === trader && b.crop_type === crop &&
        Number(b.bags || 0) === bazaarBags && Number(b.price_per_unit || 0) === price
      );
      
      if (bbToDelete) {
        await fetch(`${API_BASE_URL}/bazaarbills/${bbToDelete._id || bbToDelete.id}`, { method: "DELETE" });
        // Remove locally to accurately recalculate dayTotal
        bbAll = bbAll.filter(b => (b._id || b.id) !== (bbToDelete._id || bbToDelete.id));
      }

      // 5. Delete Kanta Entry
      await fetch(`${API_BASE_URL}/kanta/${id}`, { method: "DELETE" });

      // 6. Recalculate Day Total
      const dayTotal = bbAll
        .filter(b => b.trader_name === trader && b.crop_type === crop && b.date === date)
        .reduce((s, b) => s + (Number(b.sub_total || b.net_amount || b.total_amount || 0)), 0);

      // 7. Update/Delete Padam Debit
      const pDeb = padAll.find(p => p.type === "debit" && p.party_name === trader && p.crop_type === crop && p.date === date);
      if (pDeb) {
        if (dayTotal > 0) {
          await fetch(`${API_BASE_URL}/padam/${pDeb._id || pDeb.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...pDeb, amount: dayTotal, net_amount: dayTotal })
          });
        } else {
          await fetch(`${API_BASE_URL}/padam/${pDeb._id || pDeb.id}`, { method: "DELETE" });
        }
      }

      // 8. Update/Delete Bazaar Payments
      const bpRes = await fetch(`${API_BASE_URL}/bazaarpayments`);
      const bpAll = await bpRes.json();
      const bp = bpAll.find(p => p.trader_name === trader && p.crop_type === crop && p.crop_date === date);
      if (bp) {
        if (dayTotal > 0) {
          if (!bp.is_credited) {
            await fetch(`${API_BASE_URL}/bazaarpayments/${bp._id || bp.id}`, {
              method: "PUT", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...bp, amount: dayTotal })
            });
          }
        } else {
          await fetch(`${API_BASE_URL}/bazaarpayments/${bp._id || bp.id}`, { method: "DELETE" });
        }
      }

      load();
    } catch (err) {
      console.error("Delete sync failed:", err);
    }
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
      <PageHeader title="Kanta Book" subtitle="Initial crop entry register">
        <div className="flex gap-2">
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" /> 
            New Entry
          </Button>
          <Button variant="outline" onClick={() => setShowPrint(true)}>
            <Printer className="w-4 h-4 mr-2" /> 
            Print
          </Button>
        </div>
      </PageHeader>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{editId ? "Edit Entry" : "New Entry"}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Book No.</Label>
              <Input type="number" value={form.book_no} onChange={(e) => setField("book_no", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sl. No.</Label>
              <Input type="number" placeholder="Sl." value={form.sl_no} onChange={(e) => setField("sl_no", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Farmer Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Farmer name" value={form.farmer_name} onChange={(e) => setField("farmer_name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Village <span className="text-destructive">*</span></Label>
              <Input placeholder="Village" value={form.village} onChange={(e) => setField("village", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Crop Type <span className="text-destructive">*</span></Label>
              <Select value={form.crop_type} onValueChange={(v) => setField("crop_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select crop" />
                </SelectTrigger>
                <SelectContent>
                  {CROP_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Bag Type</Label>
              <Select value={form.bag_type} onValueChange={(v) => setField("bag_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Weight/bag" />
                </SelectTrigger>
                <SelectContent>
                  {BAG_TYPE_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bags</Label>
              <Input type="number" placeholder="No. of bags" value={form.bags} onChange={(e) => setField("bags", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{(form.crop_type === "Cotton" || form.crop_type === "Castor Seeds") ? "Total Kgs" : "Extra Kgs"}</Label>
              <Input type="number" step="any" placeholder="0" value={form.kgs === "" ? "" : form.kgs} onChange={(e) => setField("kgs", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bazaar Bags <span className="text-accent font-semibold">★</span></Label>
              <Input type="number" placeholder="Bazaar bags" value={form.bazaar} onChange={(e) => setField("bazaar", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price / Unit (₹) <span className="text-destructive">*</span></Label>
              <Input type="number" step="any" placeholder="0.00" value={form.price_per_unit} onChange={(e) => setField("price_per_unit", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Trader Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Trader name" value={form.trader_name} onChange={(e) => setField("trader_name", e.target.value)} required />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Entry"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!showForm && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-44" />
          <Input placeholder="Farmer name" value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)} className="w-36" />
          <Input placeholder="Village" value={villageFilter} onChange={(e) => setVillageFilter(e.target.value)} className="w-32" />
          <Input placeholder="Crop" value={cropFilter} onChange={(e) => setCropFilter(e.target.value)} className="w-32" />
        </div>
      )}

      {!showForm && grouped.map(([dateKey, rows]) => (
        <div key={dateKey} className="mb-6">
          <button type="button" onClick={() => toggleDate(dateKey)} className="flex items-center gap-2 mb-2 w-full text-left font-semibold text-primary">
            {collapsedDates[dateKey] ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="text-sm">{formatDate(dateKey)}</span>
            <Badge variant="secondary" className="ml-2 text-xs">{rows.length} entries</Badge>
          </button>

          {!collapsedDates[dateKey] && (
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Book - Sl.No</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Date</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Crop</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Bag Type</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Bags</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Kgs</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Farmer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Village</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Price/Unit</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Trader</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Bazaar Bags</th>
                      <th className="px-4 py-3 whitespace-nowrap"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row._id || row.id} onClick={() => handleEdit(row)} className="hover:bg-muted/40 cursor-pointer transition-colors">
                        <td className="px-4 py-3 text-muted-foreground font-semibold whitespace-nowrap">
                          <span className="text-primary">{row.book_no || 1}</span> - {row.sl_no ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.date) || "—"}</td>
                        <td className="px-4 py-3 text-center font-medium whitespace-nowrap">{row.crop_type || "—"}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">{row.bag_type || "—"}</td>
                        <td className="px-4 py-3 text-center font-mono whitespace-nowrap">{row.bags ?? "—"}</td>
                        <td className="px-4 py-3 text-center font-mono whitespace-nowrap">{row.kgs ?? "—"}</td>
                        <td className="px-4 py-3 text-left whitespace-nowrap">{row.farmer_name}</td>
                        <td className="px-4 py-3 text-left text-muted-foreground whitespace-nowrap">{row.village}</td>
                        <td className="px-4 py-3 text-center font-mono whitespace-nowrap text-green-700 font-medium">₹{formatExact(row.price_per_unit)}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">{row.trader_name.toUpperCase()}</td>
                        <td className="px-4 py-3 text-center font-medium whitespace-nowrap text-accent-foreground">{row.bazaar != null ? row.bazaar : "—"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}

      <KantaPrintModal open={showPrint} onOpenChange={setShowPrint} entries={entries} />
    </div>
  );
}