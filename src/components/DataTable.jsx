import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function DataTable({ columns, data, onRowClick, emptyMessage = "No records found" }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => (
                <TableHead key={col.key} className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", col.className)}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow 
                  key={row.id || i} 
                  onClick={() => onRowClick?.(row)} 
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted/30")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn("text-sm", col.cellClassName)}>
                      {col.render ? col.render(row) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}