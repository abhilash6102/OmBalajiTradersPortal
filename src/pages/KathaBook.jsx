import { API_BASE_URL } from "../api/config";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, X, Save, Search, ChevronDown, ChevronRight, BookOpen, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/PageHeader";

const formatMoney = (num) =>
  Math.round(Number(num || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const EMPTY_FORM = {
  record_type: "credit",
  trader_name: "",
  date: new Date().toISOString().split("T")[0],
  amount: "",
  bill_no: "",
  book_no: ""
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const cleanDate = dateStr.split("T")[0];
  const [y, m, d] = cleanDate.split("-");
  return `${d}/${m}/${y}`;
}

function getMonthString(dateStr) {
  if (!dateStr) return "Unknown Month";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Unknown Month";
  return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export default function KathaBook() {
  const [entries, setEntries] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("traders");

  const [collapsedTraders, setCollapsedTraders] = useState({});
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/kathabook`);
      const data = await res.json();
      if (Array.isArray(data)) setEntries(data);
    } catch (err) {
      console.error("Failed to load KathaBook", err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAddNew = () => {
    setEditId(null);
    setForm({
      ...EMPTY_FORM,
      record_type:
        activeTab === "commissions" ? "commission" : "credit",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      amount: Number(form.amount),
      is_auto_generated: false,
    };

    if (form.record_type === "commission") {
      payload.trader_name = "";
      payload.bill_no = "";
      payload.book_no = "";
    }

    try {
      if (editId) {
        await fetch(`${API_BASE_URL}/kathabook/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API_BASE_URL}/kathabook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setLoading(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      setShowForm(false);
      load();
    } catch (err) {
      console.error("Save failed", err);
      setLoading(false);
      alert("Save failed: " + err.message);
    }
  };

  const handleEdit = (row) => {
    setForm({
      record_type: row.record_type ?? "credit",
      trader_name: row.trader_name ?? "",
      date: row.date ? row.date.split("T")[0] : "",
      amount: row.amount ?? "",
      bill_no: row.bill_no ?? "",
      book_no: row.book_no ?? ""
    });

    setEditId(row._id || row.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this ledger record?"
      )
    )
      return;

    try {
      await fetch(`${API_BASE_URL}/kathabook/${id}`, {
        method: "DELETE",
      });
      load();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const commissionRecords = entries.filter(
    (e) => e.record_type === "commission"
  );
  const traderRecords = entries.filter(
    (e) => e.record_type !== "commission"
  );

  const commGroups = {};
  commissionRecords.forEach((e) => {
    const m = getMonthString(e.date);
    if (!commGroups[m]) commGroups[m] = [];
    commGroups[m].push(e);
  });

  const commissionEntries = Object.entries(commGroups).sort(
    ([a], [b]) => b.localeCompare(a)
  );

  const filteredTraders = traderRecords.filter(
    (t) =>
      !searchFilter ||
      t.trader_name
        ?.toLowerCase()
        .includes(searchFilter.toLowerCase())
  );

  const traderGroups = {};
  filteredTraders.forEach((e) => {
    const tName = e.trader_name || "Unknown";
    if (!traderGroups[tName])
      traderGroups[tName] = { credits: [], debits: [] };

    if (e.record_type === "credit")
      traderGroups[tName].credits.push(e);

    if (e.record_type === "debit")
      traderGroups[tName].debits.push(e);
  });

  const traderLedgerEntries = Object.entries(traderGroups).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  const toggleTrader = (key) =>
    setCollapsedTraders((p) => ({ ...p, [key]: !p[key] }));

  const toggleMonth = (key) =>
    setCollapsedMonths((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="pb-20">
      <PageHeader
        title="Katha Book"
        subtitle="Trader account ledgers & daily commissions"
      >
        {!showForm && (
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" /> New Ledger Entry
          </Button>
        )}
      </PageHeader>

      {!showForm && (
        <div className="flex gap-2 mb-6 border-b pb-px">
          <button
            onClick={() => setActiveTab("traders")}
            className={`px-4 py-2 text-sm font-semibold ${
              activeTab === "traders"
                ? "border-b-2 border-primary"
                : ""
            }`}
          >
            Trader Ledgers
          </button>

          <button
            onClick={() => setActiveTab("commissions")}
            className={`px-4 py-2 text-sm font-semibold ${
              activeTab === "commissions"
                ? "border-b-2 border-primary"
                : ""
            }`}
          >
            Day-to-Day Commissions
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border rounded-xl p-5 mb-6"
        >
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold">
              {editId ? "Edit Entry" : "New Ledger Entry"}
            </h3>
            <button onClick={() => setShowForm(false)} type="button">
              <X />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Record Type</Label>
              <Select
                value={form.record_type}
                onValueChange={(v) => setField("record_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="commission">
                    Commission
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setField("date", e.target.value)
                }
              />
            </div>

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setField("amount", e.target.value)
                }
              />
            </div>

            {form.record_type !== "commission" && (
              <>
                <div>
                  <Label>Trader Name</Label>
                  <Input
                    value={form.trader_name}
                    onChange={(e) =>
                      setField("trader_name", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label>Book-Bill No</Label>
                  <Input
                    value={`${form.book_no || ""}-${
                      form.bill_no || ""
                    }`}
                    onChange={(e) => {
                      const [b, bill] =
                        e.target.value.split("-");
                      setField("book_no", b || "");
                      setField("bill_no", bill || "");
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* IMPORTANT FIX HERE */}
      {/* DISPLAY FORMAT: book_no-bill_no */}
      {activeTab === "traders" &&
        traderLedgerEntries.map(([tName, records]) => {
          return (
            <div key={tName} className="mb-6">
              <div className="font-bold">{tName}</div>

              <div>
                {records.credits.map((row) => (
                  <div key={row._id}>
                    {row.book_no}-{row.bill_no} | ₹
                    {row.amount}
                  </div>
                ))}
              </div>

              <div>
                {records.debits.map((row) => (
                  <div key={row._id}>
                    {row.book_no}-{row.bill_no} | ₹
                    {row.amount}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}