import { API_BASE_URL } from "../api/config";
import { useState, useEffect } from "react";
import { Plus, Trash2, X, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";

const EMPTY_FORM = {
  ref_no: "",
  short_form: "",
  name: "",
};

export default function Traders() {
  const [entries, setEntries] = useState([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/traders`);
      const data = await res.json();
      if (Array.isArray(data)) setEntries(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  const getNextRefNo = () => {
    if (entries.length === 0) return 50;
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

      const data = await res.json();

if (!res.ok) {
  const text = await res.text();
  console.error("API Error:", text);
  throw new Error("API failed");
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this trader?")) return;
    await fetch(`${API_BASE_URL}/traders/${id}`, { method: "DELETE" });
    load();
  };

  const filtered = entries.filter(e =>
    !searchFilter ||
    [e.name, e.short_form, String(e.ref_no)]
      .some(v => v?.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="pb-20">
      <PageHeader title="Traders" subtitle="Manage trader codes and reference numbers">
        {!showForm && (
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            New Trader
          </Button>
        )}
      </PageHeader>

      {/* 🔥 FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
          
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold text-sm">
              {editId ? "Edit Trader" : "New Trader"}
            </h3>
            <X className="w-4 h-4 cursor-pointer" onClick={() => setShowForm(false)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">

            <div className="space-y-1.5">
              <Label className="text-xs">Ref No *</Label>
              <Input
                type="number"
                value={form.ref_no}
                onChange={(e) => setField("ref_no", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Code *</Label>
              <Input
                value={form.short_form}
                onChange={(e) => setField("short_form", e.target.value)}
                placeholder="SBOM"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Trader Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Sri Balaji Oil Mill"
                required
              />
            </div>

          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Trader"}
            </Button>

            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* 🔍 SEARCH */}
      {!showForm && (
        <div className="mb-4 flex gap-2">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search traders..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* EMPTY */}
      {!showForm && filtered.length === 0 && (
        <div className="bg-card border rounded-xl py-14 text-center text-muted-foreground">
          No traders found
        </div>
      )}

      {/* 🔥 TABLE */}
      {!showForm && filtered.length > 0 && (
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 text-left text-xs">Ref No</th>
                  <th className="px-4 py-3 text-left text-xs">Code</th>
                  <th className="px-4 py-3 text-left text-xs">Trader Name</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(row => (
                  <tr
                    key={row._id}
                    onClick={() => handleEdit(row)}
                    className="hover:bg-muted/40 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-bold text-primary">
                      {row.ref_no}
                    </td>

                    <td className="px-4 py-3 font-semibold text-muted-foreground">
                      {row.short_form.toUpperCase()}
                    </td>

                    <td className="px-4 py-3">
                      {row.name}
                    </td>

                    <td className="px-4 py-3 text-right">
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