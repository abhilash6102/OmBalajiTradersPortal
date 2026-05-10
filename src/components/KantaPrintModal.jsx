import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function KantaPrintModal({ open, onOpenChange, entries }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = entries
    .filter(e => {
      if (!e.date) return false;
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.sl_no ?? 999999) - (b.sl_no ?? 999999);
    });

  const handlePrint = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>OM BALAJI TRADERS PORTAL</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 10px; padding: 10px; background: #fff; color: #111; }
          h2 { text-align: center; font-size: 15px; margin-bottom: 3px; }
          .subtitle { text-align: center; font-size: 10px; color: #555; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th {
            background: #e8f5e9;
            border: 1px solid #bbb;
            padding: 4px 5px;
            text-align: left;
            font-size: 8px;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          td {
            border: 1px solid #ddd;
            padding: 4px 5px;
            font-size: 9px;
            word-break: break-word;
          }
          tr:nth-child(even) td { background: #f9f9f9; }
          .total-row td { background: #e8f5e9 !important; font-weight: bold; }
          @media print {
            body { padding: 5px; font-size: 9px; }
            th { font-size: 7px; }
            td { font-size: 8px; }
            @page { margin: 8mm; size: landscape; }
          }
          @media screen and (max-width: 600px) {
            body { font-size: 9px; padding: 6px; }
            th { font-size: 7px; }
            td { font-size: 8px; padding: 3px 4px; }
          }
        </style>
      </head>
      <body>
        <h2>OM BALAJI TRADERS — KANTA BOOK</h2>
        <p class="subtitle">${fromDate || toDate
          ? `Period: ${fromDate ? formatDate(fromDate) : "start"} to ${toDate ? formatDate(toDate) : "end"}`
          : "All Records"} &nbsp;|&nbsp; Total: ${filtered.length} entries</p>
        <table>
          <thead>
            <tr>
              <th style="width:4%">Sl.</th>
              <th style="width:8%">Date</th>
              <th style="width:12%">Farmer</th>
              <th style="width:9%">Village</th>
              <th style="width:9%">Crop</th>
              <th style="width:7%">Bag Type</th>
              <th style="width:5%">Bags</th>
              <th style="width:5%">Kgs</th>
              <th style="width:8%">Price/Unit</th>
              <th style="width:12%">Trader</th>
              <th style="width:7%">Bazaar</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((row, i) => `
              <tr>
                <td>${row.sl_no ?? "—"}</td>
                <td>${formatDate(row.date)}</td>
                <td>${row.farmer_name || "—"}</td>
                <td>${row.village || "—"}</td>
                <td>${row.crop_type || "—"}</td>
                <td>${row.bag_type || "—"}</td>
                <td>${row.bags ?? "—"}</td>
                <td>${row.kgs ?? 0}</td>
                <td>&#8377;${(row.price_per_unit || 0).toFixed(2)}</td>
                <td>${row.trader_name || "—"}</td>
                <td>${row.bazaar ?? "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }<\/script>
      </body>
      </html>
    `;
    const printWin = window.open("", "_blank", "width=900,height=650");
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Print Kanta Book Records</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
          </div>
          <Button onClick={handlePrint} disabled={filtered.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Print ({filtered.length} records)
          </Button>
        </div>

        {/* Preview */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="bg-muted/60">
                {["Sl.", "Date", "Farmer", "Village", "Crop", "Bag Type", "Bags", "Kgs", "Price/Unit", "Trader", "Bazaar"].map(h => (
                  <th key={h} className="text-left px-2 py-2 font-semibold text-muted-foreground uppercase tracking-wide border border-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No records in selected date range</td></tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                    <td className="px-2 py-1.5 border border-border">{row.sl_no ?? "—"}</td>
                    <td className="px-2 py-1.5 border border-border whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-2 py-1.5 border border-border font-medium">{row.farmer_name}</td>
                    <td className="px-2 py-1.5 border border-border">{row.village}</td>
                    <td className="px-2 py-1.5 border border-border">{row.crop_type || "—"}</td>
                    <td className="px-2 py-1.5 border border-border">{row.bag_type || "—"}</td>
                    <td className="px-2 py-1.5 border border-border font-mono">{row.bags ?? "—"}</td>
                    <td className="px-2 py-1.5 border border-border font-mono">{row.kgs ?? 0}</td>
                    <td className="px-2 py-1.5 border border-border font-mono">₹{(row.price_per_unit || 0).toFixed(2)}</td>
                    <td className="px-2 py-1.5 border border-border">{row.trader_name}</td>
                    <td className="px-2 py-1.5 border border-border font-mono">{row.bazaar ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}