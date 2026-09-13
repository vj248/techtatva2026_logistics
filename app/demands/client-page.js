'use client';

import { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, Search, Plus, Pencil, Trash2, ArrowUpDown, ChevronDown, Filter, 
  Download, Upload, FileSpreadsheet, AlertCircle, X, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Skeleton } from '@/components/ui/skeleton';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}/${month}, ${time}`;
};

const formatId = (id) => {
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
  
  if (column.id === 'quantity') {
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

  if (column.id === 'created_at' || column.id === 'updated_at') {
     return (
      <div className="flex flex-col gap-1">
        <Input 
          type="datetime-local"
          value={(value?.[0] ?? '')}
          onChange={e => setValue((old) => [e.target.value, old?.[1]])}
          className="h-8 text-[10px] px-1"
        />
        <Input 
          type="datetime-local"
          value={(value?.[1] ?? '')}
          onChange={e => setValue((old) => [old?.[0], e.target.value])}
          className="h-8 text-[10px] px-1"
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

const AddItemDialog = ({ open, onOpenChange, items, onItemAdded }) => {
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: 0,
    unit: '',
    reason: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [highlightedUnitIndex, setHighlightedUnitIndex] = useState(-1);

  // Deferred values for INP optimization
  const deferredItemName = useDeferredValue(formData.item_name);
  const deferredUnit = useDeferredValue(formData.unit);

  const filteredSuggestions = useMemo(() => {
    if (!deferredItemName) return [];
    return items.filter(i => 
      i.item_name.toLowerCase().includes(deferredItemName.toLowerCase())
    );
  }, [items, deferredItemName]);

  // Unit Logic
  const matchingItems = useMemo(() => {
    if (!deferredItemName) return [];
    return items.filter(i => i.item_name.toLowerCase() === deferredItemName.trim().toLowerCase());
  }, [items, deferredItemName]);

  const existingUnits = useMemo(() => {
    return [...new Set(matchingItems.map(i => i.unit))];
  }, [matchingItems]);

  const allUnits = useMemo(() => {
    return [...new Set(items.map(i => i.unit))];
  }, [items]);

  const filteredUnitSuggestions = useMemo(() => {
    const sourceUnits = matchingItems.length > 0 ? existingUnits : allUnits;
    if (showAllUnits) return sourceUnits;
    if (!deferredUnit) return sourceUnits;
    return sourceUnits.filter(u => u.toLowerCase().includes(deferredUnit.toLowerCase()));
  }, [matchingItems, existingUnits, allUnits, deferredUnit, showAllUnits]);

  const isNewUnit = useMemo(() => {
    if (matchingItems.length === 0) return false; // New item, skip message
    if (!deferredUnit) return false;
    return !existingUnits.some(u => u.toLowerCase() === deferredUnit.toLowerCase());
  }, [matchingItems, existingUnits, deferredUnit]);

  const existingItem = useMemo(() => {
    if (!deferredItemName) return null;
    return items.find(i => i.item_name.toLowerCase() === deferredItemName.trim().toLowerCase());
  }, [deferredItemName, items]);

  const exactMatchItem = useMemo(() => {
    if (!deferredItemName || !deferredUnit) return null;
    return items.find(i => 
      i.item_name.toLowerCase() === deferredItemName.trim().toLowerCase() &&
      i.unit.toLowerCase() === deferredUnit.trim().toLowerCase()
    );
  }, [deferredItemName, deferredUnit, items]);

  // Auto-fill Type, Location, and Reason
  useEffect(() => {
    const sourceItem = exactMatchItem || existingItem;
    if (sourceItem) {
      setFormData(prev => {
        const next = { ...prev };
        if (!prev.reason) next.reason = sourceItem.reason || '';
        return next;
      });
    }
  }, [exactMatchItem, existingItem]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const initiateAdd = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const payload = {
        ...formData,
        item_name: formData.item_name.trim(),
        quantity: Number(formData.quantity),
        unit: formData.unit.trim(),
        reason: formData.reason ? formData.reason.trim() : ''
    };

    try {
      const res = await fetch('/api/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save demand');
      
      onItemAdded(data);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      quantity: 0,
      unit: '',
      reason: ''
    });
    setFormError('');
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
        resetForm();
    }
  }, [open]);

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Demand</DialogTitle>
            <DialogDescription>
              Add new or update existing item demand.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={initiateAdd}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item_name" className="text-right">Name</Label>
                <div className="col-span-3 relative">
                  <Input 
                    id="item_name" 
                    name="item_name" 
                    value={formData.item_name} 
                    onChange={(e) => {
                      handleInputChange(e);
                      setShowSuggestions(true);
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (!showSuggestions || filteredSuggestions.length === 0) return;

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedIndex(prev => (prev + 1) % filteredSuggestions.length);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
                      } else if (e.key === 'Enter') {
                        if (highlightedIndex >= 0) {
                          e.preventDefault();
                          const selected = filteredSuggestions[highlightedIndex];
                          setFormData(prev => ({ 
                            ...prev, 
                            item_name: selected.item_name,
                            unit: selected.unit 
                          }));
                          setShowSuggestions(false);
                          setHighlightedIndex(-1);
                        }
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    autoComplete="off"
                    required 
                  />
                  {showSuggestions && formData.item_name && filteredSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-popover text-popover-foreground shadow-md rounded-md border mt-1 max-h-60 overflow-auto">
                      {filteredSuggestions.map((item, index) => (
                        <div 
                          key={item.id} 
                          className={`px-3 py-2 cursor-pointer text-sm ${index === highlightedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData(prev => ({ 
                              ...prev, 
                              item_name: item.item_name,
                              unit: item.unit 
                            }));
                            setShowSuggestions(false);
                          }}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          {item.item_name} - {item.unit}
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.item_name && (
                    <div className="text-xs mt-1">
                      {existingItem ? (
                        <span className="text-amber-600 font-medium">Item name exists.</span>
                      ) : (
                        <span className="text-green-600 font-medium">New item name</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                <div className="col-span-3">
                  <Input id="quantity" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} required min="0" />
                  {exactMatchItem && (
                    <div className="text-xs mt-1 text-muted-foreground">
                      Current Quantity: {exactMatchItem.quantity}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit" className="text-right">Unit</Label>
                <div className="col-span-3 relative">
                  <Input 
                    id="unit" 
                    name="unit" 
                    value={formData.unit} 
                    onChange={(e) => {
                      handleInputChange(e);
                      setShowUnitSuggestions(true);
                      setShowAllUnits(false);
                      setHighlightedUnitIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (!showUnitSuggestions || filteredUnitSuggestions.length === 0) return;

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedUnitIndex(prev => (prev + 1) % filteredUnitSuggestions.length);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedUnitIndex(prev => (prev - 1 + filteredUnitSuggestions.length) % filteredUnitSuggestions.length);
                      } else if (e.key === 'Enter') {
                        if (highlightedUnitIndex >= 0) {
                          e.preventDefault();
                          setFormData(prev => ({ ...prev, unit: filteredUnitSuggestions[highlightedUnitIndex] }));
                          setShowUnitSuggestions(false);
                          setHighlightedUnitIndex(-1);
                        }
                      } else if (e.key === 'Escape') {
                        setShowUnitSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      setShowUnitSuggestions(true);
                      setShowAllUnits(true);
                    }}
                    onBlur={() => setTimeout(() => setShowUnitSuggestions(false), 200)}
                    required 
                    placeholder="e.g., kg, pcs" 
                    autoComplete="off"
                  />
                  {showUnitSuggestions && filteredUnitSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-popover text-popover-foreground shadow-md rounded-md border mt-1 max-h-60 overflow-auto">
                      {filteredUnitSuggestions.map((unit, index) => (
                        <div 
                          key={unit} 
                          className={`px-3 py-2 cursor-pointer text-sm ${index === highlightedUnitIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData(prev => ({ ...prev, unit: unit }));
                            setShowUnitSuggestions(false);
                          }}
                          onMouseEnter={() => setHighlightedUnitIndex(index)}
                        >
                          {unit}
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.unit && (
                    <div className="text-xs mt-1">
                      {exactMatchItem ? (
                        <span className="text-blue-600 font-medium">
                          Updating: {formatId(exactMatchItem.id)} - {exactMatchItem.item_name}
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">
                          {existingItem ? "Creating new demand (New Unit)" : "Creating new demand"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">Reason</Label>
                <Input id="reason" name="reason" value={formData.reason} onChange={handleInputChange} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              {formError && (
                <div className="text-red-500 text-sm mr-auto self-center">
                  {formError}
                </div>
              )}
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {formLoading ? "Adding..." : "Add Demand"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
};

export default function DemandsClient({ user, isNegotiationLocked }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Table State
  const [sorting, setSorting] = useState([{ id: 'updated_at', desc: true }]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({
    // Hide if negotiation pending
    ...(!isNegotiationLocked ? { negotiated: false } : {}),
    ...(!isNegotiationLocked ? { remarks: false} : {}),
    // Hide if negotiation done
    ...(isNegotiationLocked ? { quantity: false} : {}),
    created_at: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Deferred values for table state optimization
  const deferredGlobalFilter = useDeferredValue(globalFilter);

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); 
  
  // Bulk Upload State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: 0,
    unit: '',
    reason: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const canWrite = ['Category'].includes(user.role) && !isNegotiationLocked;
  const canSelect = ['CC', 'OC', 'SC', 'Category'].includes(user.role);
  const canViewCategory = ['CC', 'OC', 'SC'].includes(user.role);

  useEffect(() => {
    fetchDemands();
    const interval = setInterval(() => fetchDemands(true), 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchDemands = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch('/api/demands');
      if (!res.ok) throw new Error('Failed to fetch demands');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      quantity: 0,
      unit: '',
      reason: ''
    });
    setFormError('');
    setSelectedItem(null);
  };

  const openEditDialog = (item) => {
    resetForm();
    setSelectedItem(item);
    setFormData({
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      reason: item.reason || ''
    });
    setIsEditOpen(true);
  };

  const initiateDelete = (item) => {
    setPendingAction({ type: 'delete', data: item });
    setIsConfirmOpen(true);
  };

  // Columns Definition
  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            ID <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{formatId(row.getValue("id"))}</div>,
      },
      ...(canViewCategory ? [{
        accessorKey: "category_name",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Category <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("category_name") || '-'}</div>,
      }] : []),
      {
        accessorKey: "item_name",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Item Name <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="whitespace-normal break-words">{row.getValue("item_name")}</div>,
      },
      {
        accessorKey: "quantity",
        filterFn: 'inNumberRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Quantity <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("quantity")}</div>,
      },
      {
        accessorKey: "negotiated",
        filterFn: 'inNumberRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Negotiated <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("negotiated") || '-'}</div>,
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
        accessorKey: "reason",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Reason <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="whitespace-normal break-words min-w-[200px]">{row.getValue("reason") || '-'}</div>,
      },
      {
        accessorKey: "remarks",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Remarks <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="whitespace-normal break-words min-w-[200px]">{row.getValue("remarks") || '-'}</div>,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Status <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = row.getValue("status");
          let colorClass = "bg-gray-100 text-gray-800";
          if (status === 'approved') colorClass = "bg-green-100 text-green-800";
          else if (status === 'rejected') colorClass = "bg-red-100 text-red-800";
          else if (status === 'under review') colorClass = "bg-gray-100 text-gray-800";
          
          return (
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} capitalize`}>
              {status}
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        filterFn: 'inDateRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Created At <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{formatDate(row.getValue("created_at"))}</div>,
      },
      {
        accessorKey: "updated_at",
        filterFn: 'inDateRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Modified At <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{formatDate(row.getValue("updated_at"))}</div>,
      },
      {
        id: "actions",
        enableHiding: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const item = row.original;
          if (!canWrite) return null;

          return (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => initiateDelete(item)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        },
      },
    ];

    if (canSelect) {
      cols.unshift({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
        enableColumnFilter: false,
      });
    }

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite, canSelect]);

  const table = useReactTable({
    data: items,
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

        // Handle ID Custom Search
        if (columnId === 'id') {
            const formatted = formatId(value);
            return formatted.toLowerCase().includes(String(filterValue).toLowerCase());
        }

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
      inDateRange: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const [start, end] = filterValue;
        const val = row.getValue(columnId);
        if (!val) return false;
        const date = new Date(val).getTime();
        if (start && date < new Date(start).getTime()) return false;
        if (end && date > new Date(end).getTime()) return false;
        return true;
      }
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddDialog = () => {
    fetchDemands(true);
    setIsAddOpen(true);
  };

  const handleItemAdded = (newItem) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === newItem.id);
      if (exists) return prev.map(i => i.id === newItem.id ? newItem : i);
      return [newItem, ...prev];
    });
  };

  const initiateEdit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const payload = {
        ...formData,
        item_name: formData.item_name.trim(),
        quantity: Number(formData.quantity),
        unit: formData.unit.trim(),
        reason: formData.reason ? formData.reason.trim() : ''
    };

    try {
      const res = await fetch(`/api/demands/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update item');
      setItems(prev => prev.map(i => i.id === data.id ? data : i));
      setIsEditOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const initiateBulkDelete = () => {
    setPendingAction({ type: 'bulk-delete' });
    setIsConfirmOpen(true);
  };

  const executeAction = async () => {
    setIsConfirmOpen(false);
    setFormLoading(true);
    setFormError('');

    try {
      if (pendingAction.type === 'delete') {
        const res = await fetch(`/api/demands/${pendingAction.data.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete item');
        setItems(prev => prev.filter(i => i.id !== pendingAction.data.id));
        setRowSelection(prev => {
          // Reset selection if deleted item was selected
          return {}; 
        });
      }
      else if (pendingAction.type === 'bulk-delete') {
        const selectedRows = table.getFilteredSelectedRowModel().rows;
        const ids = selectedRows.map(r => r.original.id);
        
        const res = await fetch('/api/demands/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error('Failed to delete items');
        setItems(prev => prev.filter(i => !ids.includes(i.id)));
        setRowSelection({});
      }
    } catch (err) {
      setFormError(err.message);
      alert(err.message);
    } finally {
      setFormLoading(false);
      setPendingAction(null);
    }
  };

  const getConfirmationMessage = () => {
    if (!pendingAction) return '';
    switch (pendingAction.type) {
      case 'delete': return `Are you sure you want to delete "${pendingAction.data?.item_name}"?`;
      case 'bulk-delete': return `Are you sure you want to delete ${table.getFilteredSelectedRowModel().rows.length} demands?`;
      default: return 'Are you sure?';
    }
  };

  const columnLabels = {
    id: 'ID',
    ...(canViewCategory ? { category_name: 'Category' } : {}),
    item_name: 'Item Name',
    quantity: 'Quantity',
    negotiated: 'Negotiated',
    unit: 'Unit',
    reason: 'Reason',
    remarks: 'Remarks',
    status: 'Status',
    created_at: 'Created At',
    updated_at: 'Modified At',
    actions: 'Actions',
    select: 'Select'
  };

  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file) => {
    if (!file) return;

    setBulkFile(file);
    setBulkResult(null);
    setFormError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const normalizedData = data.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
                const lowerKey = key.toLowerCase().trim();
                if (lowerKey === 'name' || lowerKey === 'item name' || lowerKey === 'item_name') newRow.item_name = row[key];
                else if (lowerKey === 'quantity' || lowerKey === 'qty') newRow.quantity = row[key];
                else if (lowerKey === 'unit') newRow.unit = row[key];
                else if (lowerKey === 'reason') newRow.reason = row[key];
            });
            return newRow;
        });

        const validItems = normalizedData.filter(i => 
            i.item_name && 
            i.quantity !== undefined && 
            !isNaN(Number(i.quantity)) && 
            i.unit
        );
        setBulkPreview(validItems);

        if (validItems.length === 0) {
            setFormError('No valid items found in file. Please ensure headers are correct (Name, Quantity, Unit) and Quantity is a number.');
        } else if (validItems.length < normalizedData.length) {
            setFormError(`Warning: ${normalizedData.length - validItems.length} invalid rows were skipped (missing name/unit or invalid quantity).`);
        }
      } catch (err) {
        console.error(err);
        setFormError('Error parsing file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
        processFile(file);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkPreview.length) return;
    
    setBulkLoading(true);
    try {
        const res = await fetch('/api/demands/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bulkPreview),
        });
        
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Bulk import failed');
        }

        setBulkResult({
            success: (data.created || 0) + (data.updated || 0),
            failed: 0,
            errors: []
        });
        await fetchDemands();
    } catch (err) {
        setFormError(err.message);
    } finally {
        setBulkLoading(false);
    }
  };

  const closeBulkDialog = () => {
    setIsBulkOpen(false);
    setBulkFile(null);
    setBulkPreview([]);
    setBulkResult(null);
    setFormError('');
  };

  const handleExportAll = () => {
    const data = items.map(item => {
        const rowData = {};
        Object.keys(columnLabels).forEach(key => {
            if (key === 'select' || key === 'actions') return;
            const label = columnLabels[key];
            let value = item[key];
            if (key === 'created_at' || key === 'updated_at') {
                value = formatDate(value);
            }
            rowData[label] = value;
        });
        return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demands");
    XLSX.writeFile(wb, "demands_full.xlsx");
  };

  const handleExportSelected = () => {
    const rows = table.getFilteredSelectedRowModel().rows;
    
    const data = rows.map(row => {
        const original = row.original;
        const visibleColumns = table.getVisibleLeafColumns();
        const rowData = {};
        visibleColumns.forEach(col => {
            if (col.id === 'select' || col.id === 'actions') return;
            const key = col.id;
            const label = columnLabels[key] || key;
            
            let value = original[key];
            if (key === 'created_at' || key === 'updated_at') {
                value = formatDate(value);
            }
            rowData[label] = value;
        });
        return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demands");
    XLSX.writeFile(wb, "selected_demands.xlsx");
  };

  const canExport = ['CC', 'OC', 'SC', 'Category'].includes(user.role);

  const fileInputRef = useRef(null);

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demands</h1>
          <p className="text-muted-foreground">View and manage your item demands.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" /> Export <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportAll}>
                  All Demands
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSelected} disabled={Object.keys(rowSelection).length === 0}>
                  Selected Column and Rows
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canWrite && (
            <>
              {Object.keys(rowSelection).length > 0 && (
                <Button variant="destructive" onClick={initiateBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete ({Object.keys(rowSelection).length})
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsBulkOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Import
              </Button>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" /> Add Demand
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demands</CardTitle>
          <CardDescription>
            A list of all item demands.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row py-4 gap-4">
            <GlobalFilterInput
              value={globalFilter}
              onChange={setGlobalFilter}
              className="pl-8 w-full md:w-auto"
            />
            <div className="flex flex-wrap items-center gap-2 md:ml-auto">
              <Button
                variant="outline"
                size="icon"
                className="mr-2"
                onClick={() => fetchDemands(false)}
                disabled={loading}
                title="Refresh Demands"
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
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="h-[52px]">
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
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
            <div className="text-sm text-muted-foreground text-center md:text-left">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
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

      {/* Add Dialog */}
      <AddItemDialog 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        items={items} 
        onItemAdded={handleItemAdded} 
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Demand</DialogTitle>
            <DialogDescription>
              Update demand details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={initiateEdit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-item_name" className="text-right">Name</Label>
                <Input id="edit-item_name" name="item_name" value={formData.item_name} onChange={handleInputChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-quantity" className="text-right">Quantity</Label>
                <Input id="edit-quantity" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} className="col-span-3" required min="0" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-unit" className="text-right">Unit</Label>
                <Input id="edit-unit" name="unit" value={formData.unit} onChange={handleInputChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-reason" className="text-right">Reason</Label>
                <Input id="edit-reason" name="reason" value={formData.reason} onChange={handleInputChange} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={closeBulkDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Demand Upload</DialogTitle>
            <DialogDescription>
              Upload an Excel or CSV file to add multiple demands at once.
              <br />
              Required columns: <strong>Name, Quantity, Unit</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {!bulkResult ? (
              <>
                <div className="flex items-center justify-center w-full">
                  <label 
                    htmlFor="dropzone-file" 
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 ${isDragging ? 'border-primary bg-blue-50' : 'border-gray-300'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-500">XLSX, XLS or CSV</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                  </label>
                </div>
                
                {bulkFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    {bulkFile.name}
                  </div>
                )}

                {formError && (
                  <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                    {formError}
                  </div>
                )}

                {bulkPreview.length > 0 && (
                  <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto">
                    <p className="text-sm font-medium mb-2">Preview ({bulkPreview.length} items found):</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkPreview.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.item_name}</TableCell>
                            <TableCell>{row.quantity}</TableCell>
                            <TableCell>{row.unit}</TableCell>
                          </TableRow>
                        ))}
                        {bulkPreview.length > 5 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              ...and {bulkPreview.length - 5} more
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Upload Complete</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-green-50 p-4 rounded-md text-center">
                    <div className="text-2xl font-bold text-green-600">{bulkResult.success}</div>
                    <div className="text-sm text-green-800">Demands Added/Updated Successfully</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!bulkResult ? (
              <Button onClick={handleBulkUpload} disabled={!bulkPreview.length || bulkLoading}>
                {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload {bulkPreview.length > 0 ? `${bulkPreview.length} Items` : ''}
              </Button>
            ) : (
              <Button onClick={closeBulkDialog}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {formError && (
            <div className="text-red-500 text-sm px-4">
              Error: {formError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={formLoading}>
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
