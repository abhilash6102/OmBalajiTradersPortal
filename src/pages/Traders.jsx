import { API_BASE_URL } from "../api/config";
import { useState, useEffect } from "react";
import { Plus, Trash2, X, Save, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import { Badge } from "@/components/ui/badge";
const EMPTY_FORM = {
  ref_no: "",
  short_form: "",
  name: "",
};

export default function Traders() {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔍 Separate filters
  const [refFilter, setRefFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  // ✅ NEW COLLAPSE STATE
  const [collapsed, setCollapsed] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/traders`);
      const data = await res.json();
      if (Array.isArray(data)) setEntries(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getNextRefNo = () => {
    if (entries.length === 0) return 1;
    return Math.max(...entries.map(e => e.ref_no || 0)) + 1;
  };

  const setField = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleAddNew = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, ref_no: getNextRefNo() });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        editId
          ? `${API_BASE_URL}/traders/${editId}`
          : `${API_BASE_URL}/traders`,
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            ref_no: Number(form.ref_no),
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Backend Error:", text);
        return;
      }

      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditId(null);
      load();
    } catch (err) {
      alert(err.message);
    }

    setLoading(false);
  };

  const handleEdit = (row) => {
    setForm(row);
    setEditId(row._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this trader?")) return;
    await fetch(`${API_BASE_URL}/traders/${id}`, { method: "DELETE" });
    load();
  };

  // 🔍 FILTER LOGIC
  const filtered = entries.filter(e =>
    String(e.ref_no).includes(refFilter) &&
    (e.short_form || "").toLowerCase().includes(codeFilter.toLowerCase()) &&
    (e.name || "").toLowerCase().includes(nameFilter.toLowerCase())
  );

  const traderCount = filtered.length;

  return (
    <div className="pb-20">

      <PageHeader
        title="Traders"
        subtitle="Manage Trader details and information"
      >
        {!showForm && (
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            New Trader
          </Button>
        )}
      </PageHeader>

      {/* 🔥 FORM */}
      {showForm && (
        <form
          className="bg-card border rounded-xl p-5 mb-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold text-sm">
              {editId ? "Edit Trader" : "New Trader"}
            </h3>

            <X
              className="w-4 h-4 cursor-pointer"
              onClick={() => setShowForm(false)}
            />
          </div>

          <div className="flex flexStart">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 w-full max-w-2xl">

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Ref No <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={form.ref_no}
                  onChange={(e) => setField("ref_no", e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.short_form}
                  onChange={(e) => setField("short_form", e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Trader Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Trader"}
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



      {/* 🔍 SEPARATE FILTERS */}
      {!showForm && (
        <div className="flex gap-2 mb-4 flex-wrap">

          <div className="w-[120px]">
            <Input
              placeholder="Ref No"
              value={refFilter}
              onChange={(e) => setRefFilter(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="w-[150px]">
            <Input
              placeholder="Code"
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="w-[200px]">
            <Input
              placeholder="Trader Name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

        </div>
      )}

      {/* 🔥 COLLAPSIBLE HEADER (NEW ADDITION ONLY) */}
{!showForm && (
  <button
    type="button"
    onClick={() => setCollapsed(prev => !prev)}
    className="flex items-center gap-x-0 mb-3 w-full text-left font-semibold text-primary"
  >
    {collapsed ? (
      <ChevronRight className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )}
    
    {/* ✅ Badge is now cleanly placed right after the chevron icons */}
    <Badge variant="secondary" className="ml-2 text-xs">
      {traderCount} traders
    </Badge>
  </button>
)}

      {/* TABLE (NOW COLLAPSIBLE) */}
      {!showForm && !collapsed && filtered.length > 0 && (
<div className="bg-card rounded-xl border overflow-hidden shadow-sm">
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[600px]">
      
      <thead>
        <tr className="bg-muted/50 border-b">
          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Ref No
          </th>
          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Code
          </th>
          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Trader Name
          </th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        {filtered.map(row => (
          <tr
            key={row._id}
            onClick={() => handleEdit(row)}
            className="hover:bg-muted/40 cursor-pointer border-b border-border"
          >
            <td className="px-4 py-2 font-bold text-primary whitespace-nowrap">
              {row.ref_no}
            </td>

            <td className="px-4 py-2 font-semibold text-muted-foreground whitespace-nowrap">
              {row.short_form?.toUpperCase()}
            </td>

            {/* 🔥 MAIN FIX HERE */}
            <td className="px-4 py-2 whitespace-nowrap">
              <div className="truncate max-w-[250px] sm:max-w-none">
                {row.name.toUpperCase()}
              </div>
            </td>

            <td className="px-4 py-2 text-right whitespace-nowrap">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row._id);
                }}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
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
  );
}