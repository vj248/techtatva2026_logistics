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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Loader2, 
    FileText, 
    Search,
    ChevronDown,
    ArrowUpDown,
    Eye,
    Download,
    Plus,
    X,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Filter
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from 'date-fns';

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
  
  // Date range filter for created_at
  if (column.id === 'created_at') {
      return (
        <div className="flex flex-col gap-1">
            <Input 
                type="date"
                value={(value?.[0] ?? '')}
                onChange={e => setValue((old) => [e.target.value, old?.[1]])}
                className="h-8 text-xs px-1"
                placeholder="Start Date"
            />
            <Input 
                type="date"
                value={(value?.[1] ?? '')}
                onChange={e => setValue((old) => [old?.[0], e.target.value])}
                className="h-8 text-xs px-1"
                placeholder="End Date"
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
        className="h-8 text-xs font-normal"
        />
    </div>
  )
};

export default function InvoicesClient({ user }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // View Details State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
    const [invoiceDetails, setInvoiceDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    
    // Delete State
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    
    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [editSearch, setEditSearch] = useState('');

    // Add Item State
    const [inventory, setInventory] = useState([]);
    const [mappings, setMappings] = useState([]); // Mappings for the current category
    const [isAddItemOpen, setIsAddItemOpen] = useState(false);

    // Table State
    const [sorting, setSorting] = useState([{ id: 'created_at', desc: true }]);
    const [columnFilters, setColumnFilters] = useState([]);
    const [columnVisibility, setColumnVisibility] = useState({});
    const [rowSelection, setRowSelection] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const deferredGlobalFilter = useDeferredValue(globalFilter);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    useEffect(() => {
        fetchInvoices();
    }, []);

    useEffect(() => {
        if (selectedInvoiceId) {
            fetchInvoiceDetails(selectedInvoiceId);
            setEditSearch('');
        } else {
            setInvoiceDetails(null);
            setIsEditing(false);
            setEditForm(null);
            setEditSearch('');
        }
    }, [selectedInvoiceId]);

    // Fetch inventory and mappings when editing starts
    const fetchEditData = async (categoryId) => {
        try {
            const [invRes, mapRes] = await Promise.all([
                fetch('/api/inventory'),
                fetch(`/api/mappings?category_id=${categoryId}`)
            ]);

            if (invRes.ok) {
                const data = await invRes.json();
                setInventory(Array.isArray(data) ? data : []);
            }
            if (mapRes.ok) {
                const data = await mapRes.json();
                setMappings(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error fetching edit data:", error);
        }
    };

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/invoices');
            if (res.ok) {
                const data = await res.json();
                setInvoices(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error fetching invoices:", error);
            toast.error("Failed to load invoices.");
        } finally {
            setLoading(false);
        }
    };

    const fetchInvoiceDetails = async (id) => {
        setLoadingDetails(true);
        setInvoiceDetails(null);
        setIsEditing(false);
        setEditForm(null); // Reset edit form
        try {
            const res = await fetch(`/api/invoices/${id}`);
            if (res.ok) {
                const data = await res.json();
                setInvoiceDetails(data);
            } else {
                toast.error("Failed to load details");
            }
        } catch (error) {
            console.error("Error fetching invoice details:", error);
            toast.error("Failed to load details.");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleEditToggle = () => {
        if (!isEditing) {
            // Enter edit mode: clone deep
            setEditForm(JSON.parse(JSON.stringify(invoiceDetails)));
            setIsEditing(true);
            if (inventory.length === 0) fetchEditData(invoiceDetails.category_id);
        } else {
            // Cancel edit mode
            setIsEditing(false);
            setEditForm(null);
        }
    };

    const handleDeliveryChange = (index, field, value) => {
        if (!editForm) return;
        const newDeliveries = [...editForm.deliveries];
        newDeliveries[index] = { ...newDeliveries[index], [field]: value };
        setEditForm({ ...editForm, deliveries: newDeliveries });
    };
    
    const handleAddItem = (inventoryId, qty, returnable) => {
        if (!editForm) return;
        const item = inventory.find(i => i.id === inventoryId);
        if (!item) return;

        // Check if mapped
        const mapping = mappings.find(m => m.inventory_id === inventoryId);
        
        const newDelivery = {
            // No ID means new
            inventory_id: item.id,
            inventory_name: item.item_name,
            quantity: parseInt(qty),
            unit: item.unit,
            returnable,
            demand_name: mapping ? mapping.demand_name : 'Additional (New)',
            demand_id: 'NEW'
        };
        
        setEditForm({
            ...editForm,
            deliveries: [...editForm.deliveries, newDelivery]
        });
        setIsAddItemOpen(false);
    };

    const handleInvoiceChange = (field, value) => {
        if (!editForm) return;
        setEditForm({ ...editForm, [field]: value });
    };

    const handleDeleteInvoice = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/invoices/${selectedInvoiceId}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete');
            }

            toast.success("Invoice deleted successfully");
            setConfirmDeleteOpen(false);
            setSelectedInvoiceId(null);
            fetchInvoices();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to delete");
        } finally {
            setDeleting(false);
        }
    };

    const saveChanges = async () => {
        if (!editForm) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/invoices/${selectedInvoiceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update');
            }
            
            toast.success("Invoice updated successfully");
            setIsEditing(false);
            fetchInvoiceDetails(selectedInvoiceId); // Refresh details
            fetchInvoices(); // Refresh list
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to update invoice");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (selectedInvoiceId) {
            fetchInvoiceDetails(selectedInvoiceId);
        }
    }, [selectedInvoiceId]);

    const columns = useMemo(() => [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0">
                    Invoice ID <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-mono font-medium">#{String(row.getValue("id")).padStart(4, '0')}</div>,
        },
        {
            accessorKey: "category_name",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0">
                    Category <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium">{row.getValue("category_name")}</div>,
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0">
                    Date & Time <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                try {
                    return format(new Date(row.getValue("created_at")), 'MMM d, yyyy HH:mm');
                } catch (e) {
                    return '-';
                }
            },
            filterFn: (row, columnId, filterValue) => {
                const rowDate = new Date(row.getValue(columnId));
                const [start, end] = filterValue || [];
                
                // If filters are empty, show all
                if (!start && !end) return true;
                
                // Helper to normalize date to YYYY-MM-DD for comparison
                const checkDate = rowDate.toISOString().split('T')[0];
                
                if (start && checkDate < start) return false;
                if (end && checkDate > end) return false;
                
                return true;
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                return (
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedInvoiceId(row.original.id)}
                    >
                        <Eye className="mr-2 h-4 w-4" /> View Details
                    </Button>
                )
            }
        }
    ], []);

    const table = useReactTable({
        data: invoices,
        columns,
        autoResetPageIndex: false,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        state: {
          sorting,
          columnFilters,
          columnVisibility,
          rowSelection,
          globalFilter: deferredGlobalFilter,
          pagination,
        },
      });

    return (
        <div className="container mx-auto py-6 md:py-10 px-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
                    <p className="text-muted-foreground">View and track all delivery invoices.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle>All Invoices</CardTitle>
                        
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search invoices..."
                                    value={globalFilter ?? ""}
                                    onChange={(event) => setGlobalFilter(event.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="ml-auto w-full sm:w-auto">
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
                                                    onCheckedChange={(value) =>column.toggleVisibility(!!value)}
                                                >
                                                    {column.id.replace(/_/g, " ")}
                                                </DropdownMenuCheckboxItem>
                                            )
                                        })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                                variant="outline"
                                className="ml-auto sm:ml-2 w-full sm:w-auto"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter className="mr-2 h-4 w-4" />
                                Filter
                            </Button>
                            {(globalFilter || columnFilters.length > 0) && (
                                <Button
                                    variant="ghost"
                                    className="ml-auto sm:ml-0 w-full sm:w-auto"
                                    onClick={() => {
                                        setGlobalFilter('');
                                        setColumnFilters([]);
                                    }}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Clear
                                </Button>
                            )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                             {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p>No invoices found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="rounded-md border">
                                <Table>
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
                                        {table.getRowModel().rows?.length ? (
                                            table.getRowModel().rows.map((row) => (
                                                <TableRow
                                                    key={row.id}
                                                    data-state={row.getIsSelected() && "selected"}
                                                >
                                                    {row.getVisibleCells().map((cell) => (
                                                        <TableCell key={cell.id}>
                                                            {flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )}
                                                        </TableCell>
                                                    ))}
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

                            <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 py-4">
                                <div className="flex-1 text-sm text-muted-foreground w-full text-center md:text-left">
                                    {table.getFilteredRowModel().rows.length} row(s) found.
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 sm:space-x-6 lg:space-x-8">
                                    <div className="flex items-center space-x-2">
                                        <p className="text-sm font-medium hidden sm:block">Rows per page</p>
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
                                    <div className="flex items-center justify-center text-sm font-medium">
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
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!selectedInvoiceId} onOpenChange={(open) => !open && setSelectedInvoiceId(null)}>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:pr-8">
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-lg">
                                    Invoice #{String(selectedInvoiceId).padStart(4, '0')}
                                </DialogTitle>
                                <DialogDescription>
                                    View and manage invoice details
                                </DialogDescription>
                            </div>
                            {!loadingDetails && invoiceDetails && (
                                <div className="flex gap-2 justify-end w-full sm:w-auto">
                                    <Button 
                                        variant={isEditing ? "ghost" : "outline"} 
                                        size="sm" 
                                        onClick={handleEditToggle}
                                        disabled={saving || deleting}
                                        className="h-8"
                                    >
                                        {isEditing ? "Cancel Editing" : "Edit Invoice"}
                                    </Button>
                                    {!isEditing && user?.role === 'CC' && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => setConfirmDeleteOpen(true)}
                                            disabled={saving || deleting}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {invoiceDetails && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 bg-muted/40 p-3 rounded-md">
                                <div>
                                    <span className="text-xs font-semibold uppercase text-muted-foreground block">Category</span>
                                    <span className="text-sm font-medium">{invoiceDetails.category_name}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold uppercase text-muted-foreground block">Date</span>
                                    {isEditing ? (
                                        <Input
                                            type="datetime-local"
                                            value={editForm.created_at ? format(new Date(editForm.created_at), "yyyy-MM-dd'T'HH:mm") : ''}
                                            onChange={(e) => handleInvoiceChange('created_at', new Date(e.target.value).toISOString())}
                                            className="h-8 mt-1 w-full"
                                        />
                                    ) : (
                                        <span className="text-sm font-medium">{format(new Date(invoiceDetails.created_at), 'PPP pp')}</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogHeader>
                    
                    {loadingDetails ? (
                         <div className="space-y-4 py-4">
                             {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : (isEditing ? editForm : invoiceDetails) && (isEditing ? editForm : invoiceDetails).deliveries ? (
                        <div className="py-2">
                            <h4 className="text-sm font-semibold mb-3 flex items-center justify-between">
                                <span>Delivery Items</span>
                                {isEditing && (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                         <Button variant="secondary" size="sm" onClick={() => setIsAddItemOpen(true)} className="w-full sm:w-auto">
                                            <Plus className="mr-2 h-3 w-3" /> Add Item
                                         </Button>
                                         <span className="text-xs text-muted-foreground font-normal self-center hidden sm:inline">Modify quantities or return status</span>
                                    </div>
                                )}
                            </h4>
                            {isEditing && (
                                <div className="mb-4">
                                     <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search items..."
                                            value={editSearch}
                                            onChange={(e) => setEditSearch(e.target.value)}
                                            className="pl-8 w-full"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="border rounded-md overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="min-w-[150px]">Item</TableHead>
                                            <TableHead className="w-24 text-right">Qty</TableHead>
                                            <TableHead className="w-16">Unit</TableHead>
                                            <TableHead className="min-w-[120px]">Demand</TableHead>
                                            <TableHead className="w-24 text-center">Returnable</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(isEditing ? editForm.deliveries : invoiceDetails.deliveries)
                                          .map((item, index) => ({ ...item, originalIndex: index }))
                                          .filter(item => {
                                                if (!editSearch) return true;
                                                const searchLower = editSearch.toLowerCase();
                                                return (
                                                    item.inventory_name.toLowerCase().includes(searchLower) ||
                                                    (item.demand_name && item.demand_name.toLowerCase().includes(searchLower)) ||
                                                    String(item.demand_id).includes(searchLower)
                                                );
                                          })
                                          .map((item) => (
                                            <TableRow key={item.originalIndex}>
                                                <TableCell className="font-medium">
                                                    <div>{item.inventory_name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.demand_id === 'NEW' ? (
                                                            <span className="text-blue-500 font-semibold">New Item</span>
                                                        ) : (
                                                            `Demand ID: D${String(item.demand_id).padStart(3, '0')}`
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isEditing ? (
                                                        <Input 
                                                            type="number" 
                                                            value={item.quantity} 
                                                            onChange={(e) => handleDeliveryChange(item.originalIndex, 'quantity', e.target.value)}
                                                            className="text-right h-8"
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-base">{item.quantity}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{item.demand_name}</TableCell>
                                                <TableCell className="text-center">
                                                    {isEditing ? (
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!item.returnable} 
                                                            onChange={(e) => handleDeliveryChange(item.originalIndex, 'returnable', e.target.checked)}
                                                            className="h-4 w-4 rounded border-gray-300"
                                                        />
                                                    ) : (
                                                        item.returnable ? <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Yes</Badge> : <span className="text-muted-foreground text-xs text-center block">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {isEditing && (
                                <div className="flex justify-end gap-2 mt-6">
                                    <Button variant="outline" onClick={handleEditToggle} disabled={saving}>Cancel</Button>
                                    <Button onClick={saveChanges} disabled={saving}>
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-4 text-center text-muted-foreground">
                            Details unavailable.
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AddItemDialog 
                key={isAddItemOpen ? 'open' : 'closed'}
                open={isAddItemOpen} 
                onOpenChange={setIsAddItemOpen}
                inventory={inventory}
                mappings={mappings}
                onAdd={handleAddItem}
                existingItems={editForm ? editForm.deliveries : []}
            />

            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Invoice</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this invoice?
                            <br />
                            This action cannot be undone. All associated inventory items will be restored to stock.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteInvoice} disabled={deleting}>
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const AddItemDialog = ({ open, onOpenChange, inventory, mappings, onAdd, existingItems = [] }) => {
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [qty, setQty] = useState('');
    const [returnable, setReturnable] = useState(false);

    // Mapped set for visual indication
    const mappedMap = useMemo(() => {
        const map = new Map();
        mappings.forEach(m => map.set(m.inventory_id, m.demand_name));
        return map;
    }, [mappings]);

    // Existing items set
    const existingIds = useMemo(() => {
        return new Set(existingItems.map(i => i.inventory_id));
    }, [existingItems]);

    const filtered = useMemo(() => {
        if (!search) return [];
        return inventory.filter(i => 
            i.item_name.toLowerCase().includes(search.toLowerCase()) || 
            String(i.id).includes(search)
        ).slice(0, 10);
    }, [inventory, search]);

    const handleAdd = () => {
        if (selectedId && qty > 0) {
            onAdd(selectedId, qty, returnable);
        }
    };

    const selectedItem = inventory.find(i => i.id === selectedId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Item to Invoice</DialogTitle>
                    <DialogDescription>
                        Select an item. Existing mappings will be used if available.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Search Item</Label>
                        <Input 
                            placeholder="Type inventory name or ID..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    {search && (
                        <div className="border rounded max-h-[150px] overflow-y-auto">
                            {filtered.map(item => {
                                const demandName = mappedMap.get(item.id);
                                const isAdded = existingIds.has(item.id);
                                return (
                                <div 
                                    key={item.id} 
                                    className={`p-2 text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 ${
                                        isAdded 
                                            ? 'opacity-50 cursor-not-allowed bg-muted/20' 
                                            : selectedId === item.id 
                                                ? 'bg-muted font-medium cursor-pointer' 
                                                : 'cursor-pointer hover:bg-muted'
                                    }`}
                                    onClick={() => !isAdded && setSelectedId(item.id)}
                                >
                                    <div className="flex-1">
                                        <span>{item.item_name}</span>
                                        {isAdded && <span className="ml-2 text-xs text-red-500 font-medium">(Added)</span>}
                                        {!isAdded && demandName && <span className="text-[10px] text-blue-600 block">Mapped to: {demandName}</span>}
                                    </div>
                                    <span className="text-muted-foreground text-xs whitespace-nowrap">{item.quantity} {item.unit} available</span>
                                </div>
                                );
                            })}
                            {filtered.length === 0 && <div className="p-2 text-sm text-muted-foreground">No items found</div>}
                        </div>
                    )}

                    {selectedItem && (
                        <div className="bg-muted/50 p-2 rounded text-sm border">
                             <div className="font-semibold">{selectedItem.item_name}</div>
                             <div className="text-xs text-muted-foreground">Available Stock: {selectedItem.quantity} {selectedItem.unit}</div>
                             {mappedMap.has(selectedItem.id) ? (
                                 <div className="text-blue-600 mt-1">✓ Using existing mapping: {mappedMap.get(selectedItem.id)}</div>
                             ) : (
                                 <div className="text-amber-600 mt-1">⚠ Will be treated as Additional Item</div>
                             )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Quantity</Label>
                            <Input 
                                type="number" 
                                value={qty} 
                                onChange={(e) => setQty(e.target.value)}
                                placeholder="0"
                                max={selectedItem ? selectedItem.quantity : undefined}
                            />
                        </div>
                        <div className="flex items-end pb-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="add-ret" 
                                    checked={returnable}
                                    onCheckedChange={setReturnable}
                                />
                                <Label htmlFor="add-ret">Returnable</Label>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAdd} disabled={!selectedId || !qty || qty <= 0}>Add Item</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
