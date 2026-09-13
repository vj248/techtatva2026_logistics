'use client';

import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Search, 
    TrendingDown, 
    TrendingUp, 
    Package, 
    ArrowUpDown, 
    ChevronDown, 
    Filter, 
    X, 
    RefreshCw, 
    ChevronLeft, 
    ChevronRight, 
    ChevronsLeft, 
    ChevronsRight,
    Download
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from 'xlsx';

// --- Helper Components from Inventory Table ---
const formatId = (id) => {
    if (!id) return '';
    return `I${String(id).padStart(3, '0')}`;
};

const formatDemandId = (id) => {
  if (!id) return '';
  return `D${String(id).padStart(3, '0')}`;
};

const GlobalFilterInput = ({ value, onChange, className }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(localValue);
    }, 300);
    return () => clearTimeout(timeout);
  }, [localValue, onChange]);

  return (
    <div className="relative w-full sm:w-80">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Filter all columns..."
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        className={className}
      />
    </div>
  );
};

const FilterInput = ({ column }) => {
  const columnFilterValue = column.getFilterValue();
  const [value, setValue] = useState(columnFilterValue);

  useEffect(() => {
    setValue(columnFilterValue);
  }, [columnFilterValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      column.setFilterValue(value);
    }, 500);
    return () => clearTimeout(timeout);
  }, [value, column]);
  
  if (column.id === 'total_inventory' || column.id === 'total_demand' || column.id === 'total_delivered' || column.id === 'surplus_deficit') {
    return (
      <div className="flex gap-1 items-center">
        <Input 
          placeholder="Min" 
          type="number"
          value={(value?.[0] ?? '')}
          onChange={e => setValue((old) => [e.target.value, old?.[1]])}
          className="h-8 text-xs px-1"
        />
        <Input 
          placeholder="Max" 
          type="number"
          value={(value?.[1] ?? '')}
          onChange={e => setValue((old) => [old?.[0], e.target.value])}
          className="h-8 text-xs px-1"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
        <Input
        placeholder={`Filter...`}
        value={(value ?? '')}
        onChange={(event) => setValue(event.target.value)}
        className="h-8 text-xs"
        />
    </div>
  )
};

const BreakdownDialog = ({ itemId, open, onOpenChange }) => {
  const [data, setData] = useState([]);
  const [itemDetails, setItemDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState([{ id: 'mapped_quantity', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState({
    original_demand_quantity: false,
    demand_reason: false,
  });
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });

  useEffect(() => {
    if (itemId && open) {
      setPagination({ pageIndex: 0, pageSize: 5 }); // Reset pagination
      setGlobalFilter(''); // Reset search
      setSorting([{ id: 'mapped_quantity', desc: true }]); // Reset sorting
      
      setLoading(true);
      fetch(`/api/analysis/${itemId}`)
        .then(res => res.json())
        .then(json => {
            if (json.item) {
                setItemDetails(json.item);
                setData(json.demands || []);
            } else {
                // Fallback for safety if api structure differs
               setData(Array.isArray(json) ? json : []);
            }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [itemId, open]);

  const columns = useMemo(() => [
     {
        accessorKey: "demand_id",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start pl-0">
            Demand ID <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{formatDemandId(row.getValue("demand_id"))}</div>,
      },
      {
        accessorKey: "category_name",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start pl-0">
            Category <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue("category_name")}</div>,
      },
      {
        accessorKey: "mapped_quantity",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start pl-0">
            Mapped Qty <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-bold">{row.getValue("mapped_quantity")}</div>,
      },
      {
        accessorKey: "delivered_quantity",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start pl-0">
            Delivered Qty <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-bold text-green-600">{row.getValue("delivered_quantity") || 0}</div>,
      },
      {
        accessorKey: "original_demand_quantity",
        header: "Original Demand",
        cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("original_demand_quantity")}</div>,
      },
      {
        accessorKey: "demand_reason",
        header: "Reason",
        cell: ({ row }) => <div className="max-w-[200px] truncate" title={row.getValue("demand_reason")}>{row.getValue("demand_reason")}</div>,
      }
  ], []);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
        sorting,
        globalFilter,
        columnVisibility,
        pagination
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
            <DialogTitle>Demand Breakdown</DialogTitle>
        </DialogHeader>

        {loading && !itemDetails ? (
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 mb-2 border rounded-lg">
             <div className="flex flex-col gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-24" /></div>
             <div className="flex flex-col gap-2 sm:col-span-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-full" /></div>
             <div className="flex flex-col gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-20" /></div>
             <div className="flex flex-col gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-16" /></div>
             <div className="flex flex-col gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-24" /></div>
             <div className="flex flex-col gap-2 sm:col-span-3"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-full" /></div>
           </div>
        ) : (
            <>
                {/* Inventory Item Details Grid */}
                {itemDetails && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/40 rounded-lg border text-sm mb-2">
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase font-semibold">Inventory ID</span>
                            <span className="font-mono font-medium">{formatId(itemDetails.id)}</span>
                        </div>
                         <div className="flex flex-col sm:col-span-2">
                            <span className="text-muted-foreground text-xs uppercase font-semibold">Item Name</span>
                            <span className="font-medium">{itemDetails.item_name}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase font-semibold">Current Qty</span>
                            <span className="font-medium">{itemDetails.quantity}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase font-semibold">Unit</span>
                            <span className="font-medium">{itemDetails.unit}</span>
                        </div>
                         <div className="flex flex-col">
                            <span className="text-muted-foreground text-xs uppercase font-semibold">Location</span>
                            <span className="font-medium">{itemDetails.location || '-'}</span>
                        </div>
                        <div className="flex flex-col sm:col-span-3">
                            <span className="text-muted-foreground text-xs uppercase font-semibold">Description</span>
                            <span className="truncate" title={itemDetails.description}>{itemDetails.description || '-'}</span>
                        </div>
                    </div>
                )}

                <div className="flex items-center py-2 gap-2">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Search demands..."
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-8"
                />
            </div>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id.replace(/_/g, " ")}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <div className="rounded-md border flex-1 overflow-auto bg-white overflow-x-auto">
            <Table className="min-w-full">
                <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {loading ? (
                       Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          {columns.map((_, colIndex) => (
                            <TableCell key={`skeleton-cell-${colIndex}`}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map(row => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No mapped demands found.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>

        <div className="flex items-center justify-between py-4">
             <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value))
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            
            <div className="flex items-center space-x-2">
                <div className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default function AnalysisClient() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Table State
  const [sorting, setSorting] = useState([{ id: 'surplus_deficit', desc: false }]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({ type: false });
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItemForBreakdown, setSelectedItemForBreakdown] = useState(null);

  // Deferred values for table state optimization
  const deferredGlobalFilter = useDeferredValue(globalFilter);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analysis');
      if (res.ok) {
        const json = await res.json();
        // Convert numbers for correct sorting/filtering
        const formatted = json.map(item => ({
            ...item,
            total_inventory: Number(item.total_inventory),
            total_demand: Number(item.total_demand),
            total_delivered: Number(item.total_delivered),
            surplus_deficit: Number(item.surplus_deficit)
        }));
        setData(formatted);
      }
    } catch (error) {
      console.error("Failed to fetch analysis data", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalItems = data.length;
    // New formula: Positive means Extra (Surplus), Negative means Need (Deficit)
    const surplusItems = data.filter(i => i.surplus_deficit > 0).length;
    const deficitItems = data.filter(i => i.surplus_deficit < 0).length;
    return { totalItems, surplusItems, deficitItems };
  }, [data]);

    // Columns Definition
  const columns = useMemo(() => {
    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "id",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            ID <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{formatId(row.getValue("id"))}</div>,
      },
      {
        accessorKey: "item_name",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Item Name <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium whitespace-normal break-words">{row.getValue("item_name")}</div>,
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Type <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("type")}</div>,
      },
      {
        accessorKey: "unit",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Unit <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue("unit")}</div>,
      },
      {
        accessorKey: "total_inventory",
        filterFn: 'inNumberRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Total Inventory <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-right font-medium pr-8">{row.getValue("total_inventory")}</div>,
      },
      {
        accessorKey: "total_demand",
        filterFn: 'inNumberRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Total Demand <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-right font-medium pr-8">{row.getValue("total_demand")}</div>,
      },
      {
        accessorKey: "total_delivered",
        filterFn: 'inNumberRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Delivered <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-right font-medium pr-8 text-green-600">{row.getValue("total_delivered")}</div>,
      },
      {
        accessorKey: "surplus_deficit",
        filterFn: 'inNumberRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Status (S/D) <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
            const val = row.getValue("surplus_deficit");
            return (
                <div className="text-right pr-4 font-semibold">
                     {val < 0 ? (
                        <span className="text-red-600">
                           {val}
                        </span>
                      ) : val > 0 ? (
                        <span className="text-green-600">
                           +{val}
                        </span>
                      ) : (
                        <span className="text-gray-500">
                           0
                        </span>
                      )}
                </div>
            )
        },
      },
      {
        id: "actions",
        enableHiding: false,
        header: "Actions",
        cell: ({ row }) => {
            return (
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setSelectedItemForBreakdown(row.original.id)}
                    title="View Breakdown"
                >
                    <TrendingUp className="h-4 w-4" />
                </Button>
            )
        }
      },
    ];
  }, []);

  const table = useReactTable({
    data,
    autoResetPageIndex: false,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    filterFns: {
      insensitive: (row, columnId, filterValue) => {
        const value = row.getValue(columnId);
        if (value == null) return false;
        
        const cellValue = String(value).toLowerCase();
        const filterParts = String(filterValue).toLowerCase().split(',').map(p => p.trim()).filter(p => p);
        if (filterParts.length === 0) return true;
        return filterParts.some(part => cellValue.includes(part));
      },
      inNumberRange: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const [min, max] = filterValue;
        const val = row.getValue(columnId);
        if (typeof val !== 'number') return false;
        if (min !== '' && min !== undefined && val < Number(min)) return false;
        if (max !== '' && max !== undefined && val > Number(max)) return false;
        return true;
      },
    },
    defaultColumn: {
      filterFn: 'insensitive',
    },
    globalFilterFn: 'insensitive',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: deferredGlobalFilter,
    },
  });

  const columnLabels = {
    id: 'ID',
    item_name: 'Item Name',
    type: 'Type',
    unit: 'Unit',
    total_inventory: 'Total Inventory',
    total_demand: 'Total Demand',
    total_delivered: 'Total Delivered',
    surplus_deficit: 'Status',
  };

  const handleExport = (subset) => {
      let exportDataRaw = [];
      if (subset === 'selected') {
        const rows = table.getFilteredSelectedRowModel().rows;
        exportDataRaw = rows.map(row => row.original);
      } else {
        // Export all currently filtered items (not just current page)
        const rows = table.getFilteredRowModel().rows;
        exportDataRaw = rows.map(row => row.original);
      }

      const exportData = exportDataRaw.map(item => ({
          "ID": formatId(item.id),
          "Item Name": item.item_name,
          "Unit": item.unit,
          "Total Inventory": item.total_inventory,
          "Total Demand": item.total_demand,
          "Surplus/Deficit": item.surplus_deficit,
          "Status Description": item.surplus_deficit < 0 ? 'Deficit' : item.surplus_deficit > 0 ? 'Surplus' : 'Balanced'
      }));
  
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Procurement Analysis");
      XLSX.writeFile(wb, subset === 'selected' ? "analysis_selected.xlsx" : "analysis_full.xlsx");
  };

  useEffect(() => {
    if (!table) return;
    
    // Clear existing filter on surplus_deficit before applying new one
    // But we need to keep other filters if they exist? 
    // Actually, we are filtering mainly on this column. 
    
    // For inNumberRange filter: [min, max]
    // Deficit: < 0 (Inventory < Demand)
    // Surplus: > 0 (Inventory > Demand)
    
    const column = table.getColumn('surplus_deficit');
    if (!column) return;

    if (statusFilter === 'deficit') {
        column.setFilterValue([undefined, -0.0001]); 
    } else if (statusFilter === 'surplus') {
        column.setFilterValue([0.0001, undefined]);
    } else {
        column.setFilterValue(undefined);
    }
  }, [statusFilter, table]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Procurement Analysis</h1>
        <p className="text-muted-foreground">
          Analyze inventory surplus and deficits based on current demands.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">Unique items tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deficit Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{loading ? <Skeleton className="h-8 w-16" /> : stats.deficitItems}</div>
            <p className="text-xs text-muted-foreground">Items needing procurement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surplus Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loading ? <Skeleton className="h-8 w-16" /> : stats.surplusItems}</div>
            <p className="text-xs text-muted-foreground">Items with excess stock</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Analysis Data</CardTitle>
            <CardDescription>Detailed breakdown of inventory vs demand.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row py-4 gap-4">
                <GlobalFilterInput
                    value={globalFilter}
                    onChange={setGlobalFilter}
                    className="pl-8 w-full md:w-auto"
                />
                <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Items</SelectItem>
                            <SelectItem value="deficit">Deficit Only</SelectItem>
                            <SelectItem value="surplus">Surplus Only</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        className="mr-2"
                        onClick={fetchData}
                        disabled={loading}
                        title="Refresh Data"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            Columns <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                            return (
                                <DropdownMenuCheckboxItem
                                key={column.id}
                                className="capitalize"
                                checked={column.getIsVisible()}
                                onCheckedChange={(value) =>
                                    column.toggleVisibility(!!value)
                                }
                                >
                                {columnLabels[column.id] || column.id}
                                </DropdownMenuCheckboxItem>
                            )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="outline"
                        className="ml-2"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-2">
                                <Download className="mr-2 h-4 w-4" /> Export <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleExport('all')}>
                                Export All Rows
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('selected')} disabled={Object.keys(rowSelection).length === 0}>
                                Export Selected ({Object.keys(rowSelection).length})
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {(globalFilter || columnFilters.length > 0) && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setGlobalFilter('');
                                setColumnFilters([]);
                            }}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Clear Filters
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-full">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                            return (
                                <TableHead key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                </TableHead>
                            )
                            })}
                        </TableRow>
                        ))}
                        {/* Filter Row */}
                        {showFilters && table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id + '-filter'}>
                            {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                                {header.column.getCanFilter() ? (
                                <FilterInput column={header.column} />
                                ) : null}
                            </TableHead>
                            ))}
                        </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={`skeleton-${index}`}>
                            {columns.map((column, colIndex) => (
                                <TableCell key={`skeleton-cell-${colIndex}`}>
                                <Skeleton className="h-6 w-full" />
                                </TableCell>
                            ))}
                            </TableRow>
                        ))
                        ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            >
                            {row.getVisibleCells().map((cell) => {
                                const isStatusCol = cell.column.id === 'surplus_deficit';
                                let cellClass = "h-[52px]";
                                
                                if (isStatusCol) {
                                    const val = cell.getValue();
                                    if (val < 0) cellClass += " bg-red-100 text-red-900"; // Deficit (Negative)
                                    else if (val > 0) cellClass += " bg-green-100 text-green-900"; // Surplus (Positive)
                                }

                                return (
                                <TableCell key={cell.id} className={cellClass}>
                                {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                )}
                                </TableCell>
                                );
                            })}
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center"
                            >
                            No results.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
                <div className="text-sm text-muted-foreground text-center md:text-left">
                    {table.getFilteredRowModel().rows.length} row(s) found.
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
                        >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
      <BreakdownDialog 
        itemId={selectedItemForBreakdown}
        open={!!selectedItemForBreakdown}
        onOpenChange={(open) => !open && setSelectedItemForBreakdown(null)}
      />
    </div>
  );
}
