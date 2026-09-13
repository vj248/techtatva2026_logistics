'use client';

import { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, Search, Plus, ArrowUpDown, ChevronDown, Filter, 
  X, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Save, Lock, RotateCcw, Unlock, Check
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
  
  if (column.id === 'quantity' || column.id === 'negotiated') {
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

export default function NegotiationsClient({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Categories
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Negotiation Metadata
  const [negotiationData, setNegotiationData] = useState({
    status: 'pending',
    cc_present: [],
    category_representatives: []
  });
  const [originalNegotiationData, setOriginalNegotiationData] = useState(null);
  const [ccUsers, setCcUsers] = useState([]);
  const [ccUsersLoading, setCcUsersLoading] = useState(true);
  const [ccSearch, setCcSearch] = useState('');

  // Modified Items
  const [modifiedItems, setModifiedItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [isLockOpen, setIsLockOpen] = useState(false);

  // Table State
  const [sorting, setSorting] = useState([{ id: 'id', desc: false }]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({
    created_at: false,
    category_name: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Deferred values for table state optimization
  const deferredGlobalFilter = useDeferredValue(globalFilter);

  const canSelect = true;
  const isLocked = negotiationData.status === 'done';
  const canAdd = user.role === 'CC' && !isLocked && selectedCategory;

  const handleAddRow = () => {
    if (!canAdd) return;
    const tempId = -(Date.now());
    const newItem = {
      id: tempId,
      category_id: selectedCategory,
      item_name: '',
      quantity: 0,
      unit: '',
      reason: '',
      status: 'pending',
      negotiated: '', 
      remarks: '',
      isNew: true,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    setItems(prev => [newItem, ...prev]);
    setModifiedItems(prev => ({
      ...prev,
      [tempId]: newItem
    }));
  };

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const fetchCCUsers = useCallback(async () => {
    setCcUsersLoading(true);
    try {
      const res = await fetch('/api/cc/users');
      if (res.ok) {
        const data = await res.json();
        setCcUsers(data.filter(u => u.role === 'CC'));
      }
    } catch (err) {
      console.error('Failed to fetch CC users', err);
    } finally {
      setCcUsersLoading(false);
    }
  }, []);

  const fetchNegotiationData = useCallback(async () => {
    try {
      const res = await fetch(`/api/negotiations/${selectedCategory}`);
      if (res.ok) {
        const data = await res.json();
        const formattedData = {
          status: data.status || 'pending',
          cc_present: data.cc_present || [],
          category_representatives: data.category_representatives || []
        };
        setNegotiationData(formattedData);
        setOriginalNegotiationData(formattedData);
      }
    } catch (err) {
      console.error('Failed to fetch negotiation data', err);
    }
  }, [selectedCategory]);

  const fetchDemands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/demands');
      if (!res.ok) throw new Error('Failed to fetch demands');
      const data = await res.json();
      // Filter by selected category immediately since we don't support 'all' anymore
      setItems(data.filter(item => item.category_id === selectedCategory));
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchCategories();
    fetchCCUsers();
  }, [fetchCategories, fetchCCUsers]);

  useEffect(() => {
    if (selectedCategory) {
      fetchDemands();
      fetchNegotiationData();
    }
  }, [selectedCategory, fetchDemands, fetchNegotiationData]);

  const handleCellChange = useCallback((id, field, value) => {
    if (isLocked) return;

    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));

    setModifiedItems(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  }, [isLocked]);

  const handleNegotiationDataChange = (field, value) => {
    if (isLocked) return;
    setNegotiationData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allModified = Object.keys(modifiedItems).map(id => ({
        id: id,
        ...modifiedItems[id]
      }));

      const newDemands = allModified.filter(item => item.isNew);
      const updates = allModified.filter(item => !item.isNew);

      const payload = {
        categoryId: selectedCategory,
        negotiation: negotiationData,
        demands: updates,
        newDemands: newDemands
      };

      const res = await fetch('/api/negotiations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save changes');
      
      setModifiedItems({});
      setOriginalNegotiationData(negotiationData);
      toast.success('Changes saved successfully');
      fetchDemands(); // Refresh data

    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLock = async () => {
    const newStatus = isLocked ? 'pending' : 'done';
    const action = isLocked ? 'unlock' : 'lock';
    
    setSaving(true);
    try {
      const allModified = Object.keys(modifiedItems).map(id => ({
        id: id,
        ...modifiedItems[id]
      }));

      const newDemands = allModified.filter(item => item.isNew);
      const updates = allModified.filter(item => !item.isNew);

      const payload = {
        categoryId: selectedCategory,
        negotiation: { ...negotiationData, status: newStatus },
        demands: updates,
        newDemands: newDemands
      };

      const res = await fetch('/api/negotiations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to ${action} negotiation`);
      
      setModifiedItems({});
      
      toast.success(`Negotiation ${action}ed and saved successfully`);
      fetchNegotiationData();
      fetchDemands();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${action} negotiation: ` + err.message);
    } finally {
      setSaving(false);
      setIsLockOpen(false);
    }
  };

  const handleDiscard = () => {
    setModifiedItems({});
    if (originalNegotiationData) {
      setNegotiationData(originalNegotiationData);
    }
    fetchDemands();

    toast.success('Changes discarded');
  };

  const columnLabels = {
    id: 'ID',
    item_name: 'Item Name',
    quantity: 'Quantity',
    negotiated: 'Negotiated',
    unit: 'Unit',
    reason: 'Reason',
    remarks: 'Remarks',
    status: 'Status',
    created_at: 'Created At',
    updated_at: 'Modified At',
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
        cell: ({ row }) => {
            if (row.original.isNew) return <div className="font-medium text-blue-600">New</div>;
            return <div className="font-medium">{formatId(row.getValue("id"))}</div>;
        },
      },
      {
        accessorKey: "category_name",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Category <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("category_name") || '-'}</div>,
      },
      {
        accessorKey: "item_name",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Item Name <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
            if (row.original.isNew) {
                return (
                    <Input 
                        value={row.getValue("item_name") || ''}
                        onChange={(e) => handleCellChange(row.original.id, 'item_name', e.target.value)}
                        className="h-8 min-w-[150px]"
                        placeholder="Item Name"
                    />
                )
            }
            return <div className="whitespace-normal break-words">{row.getValue("item_name")}</div>
        },
      },
      {
        accessorKey: "quantity",
        filterFn: 'inNumberRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Quantity <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
            if (row.original.isNew) {
                return (
                    <Input 
                        type="number"
                        value={row.getValue("quantity")}
                        onChange={(e) => handleCellChange(row.original.id, 'quantity', Number(e.target.value))}
                        className="h-8 w-24"
                        min="0"
                    />
                )
            }
            return <div className="font-medium">{row.getValue("quantity")}</div>
        },
      },
      {
        accessorKey: "negotiated",
        filterFn: 'inNumberRange',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Negotiated <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Input 
            type="number" 
            value={row.getValue("negotiated") ?? ''} 
            onChange={(e) => handleCellChange(row.original.id, 'negotiated', e.target.value)}
            className="h-8 w-24"
            min="0"
          />
        ),
      },
      {
        accessorKey: "unit",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Unit <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
            if (row.original.isNew) {
                return (
                    <Input 
                        value={row.getValue("unit") || ''}
                        onChange={(e) => handleCellChange(row.original.id, 'unit', e.target.value)}
                        className="h-8 w-24"
                        placeholder="Unit"
                    />
                )
            }
            return <div>{row.getValue("unit")}</div>
        },
      },
      {
        accessorKey: "reason",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Reason <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
             if (row.original.isNew) {
                 return (
                     <Input 
                         value={row.getValue("reason") || ''}
                         onChange={(e) => handleCellChange(row.original.id, 'reason', e.target.value)}
                         className="h-8 min-w-[200px]"
                         placeholder="Reason"
                     />
                 )
             }
             return <div className="whitespace-normal break-words min-w-[200px]">{row.getValue("reason") || '-'}</div>
        },
      },
      {
        accessorKey: "remarks",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Remarks <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Textarea 
            value={row.getValue("remarks") || ''} 
            onChange={(e) => {
              handleCellChange(row.original.id, 'remarks', e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            className="min-h-[32px] w-full min-w-[200px] py-1 px-2 resize-none overflow-hidden"
            rows={1}
            onFocus={(e) => {
               e.target.style.height = 'auto';
               e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="justify-start">
            Status <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") || 'under review';
          let colorClass = "bg-gray-100 text-gray-800";
          if (status === 'approved') colorClass = "bg-green-100 text-green-800 border-green-200";
          else if (status === 'rejected') colorClass = "bg-red-100 text-red-800 border-red-200";

          return (
            <Select
              value={status}
              onValueChange={(value) => handleCellChange(row.original.id, 'status', value)}
              disabled={isLocked}
            >
              <SelectTrigger className={`h-8 w-[130px] ${colorClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="under review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
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
  }, [canSelect, handleCellChange, isLocked]);

  const table = useReactTable({
    data: items,
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
    autoResetPageIndex: false,
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

  const handleBulkStatusChange = (status) => {
    if (isLocked) return;
    
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    setItems(prev => prev.map(item => {
      const isSelected = selectedRows.some(row => row.original.id === item.id);
      if (isSelected) {
        return { ...item, status };
      }
      return item;
    }));

    setModifiedItems(prev => {
      const newModified = { ...prev };
      selectedRows.forEach(row => {
        const id = row.original.id;
        newModified[id] = {
          ...newModified[id],
          status
        };
      });
      return newModified;
    });
    
    setRowSelection({});
  };

  const hasChanges = useMemo(() => {
    if (Object.keys(modifiedItems).length > 0) return true;
    if (!originalNegotiationData) return false;
    return JSON.stringify(negotiationData) !== JSON.stringify(originalNegotiationData);
  }, [modifiedItems, negotiationData, originalNegotiationData]);

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Negotiations</h1>
          <p className="text-muted-foreground">Manage negotiations and approvals.</p>
        </div>
        {selectedCategory && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 w-full sm:w-auto">
            <div className="hidden md:block text-sm text-muted-foreground mr-2">
              Current Category:
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  role="combobox" 
                  className="w-full sm:w-[250px] justify-between border-primary/50 bg-primary/5 font-medium shadow-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {selectedCategory 
                    ? categories.find((cat) => cat.id === selectedCategory)?.name 
                    : "Select Category"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[calc(100vw-3rem)] sm:w-[250px] p-0">
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search category..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-8"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                  {categoriesLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {categories
                        .filter((cat) => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map((cat) => (
                          <DropdownMenuItem
                            key={cat.id}
                            onSelect={() => {
                              setSelectedCategory(cat.id);
                              setCategorySearch('');
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedCategory === cat.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {cat.name}
                          </DropdownMenuItem>
                        ))}
                      {categories.filter((cat) => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">No category found</div>
                      )}
                    </>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {!selectedCategory ? (
        <div className="flex flex-col items-center justify-center py-10 md:py-20 px-6 space-y-6 border-2 rounded-xl bg-muted/5 border-dashed animate-in fade-in zoom-in-95 duration-500">
            <div className="p-6 rounded-full bg-primary/10 shadow-inner">
                <Search className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold tracking-tight">No Category Selected</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-lg">
                    Please select a category to begin negotiation.
                </p>
            </div>
            <div className="w-full max-w-sm pt-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="outline" 
                            role="combobox" 
                            className="w-full h-14 text-md px-4 justify-between shadow-md border-primary/20 hover:border-primary/50 transition-colors"
                        >
                            {selectedCategory 
                                ? categories.find((cat) => cat.id === selectedCategory)?.name 
                                : "Select a Category..."}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[calc(100vw-3rem)] sm:w-[380px] p-0" align="center">
                        <div className="p-2 border-b">
                            <Input
                                placeholder="Search category..."
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                className="h-10 text-base"
                                onKeyDown={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-1">
                            {categoriesLoading ? (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    {categories
                                        .filter((cat) => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                                        .map((cat) => (
                                            <DropdownMenuItem
                                                key={cat.id}
                                                onSelect={() => {
                                                    setSelectedCategory(cat.id);
                                                    setCategorySearch('');
                                                }}
                                                className="py-3 text-base cursor-pointer"
                                            >
                                                <Check
                                                    className={`mr-2 h-4 w-4 ${
                                                        selectedCategory === cat.id ? "opacity-100" : "opacity-0"
                                                    }`}
                                                />
                                                {cat.name}
                                            </DropdownMenuItem>
                                        ))}
                                    {categories.filter((cat) => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                                        <div className="p-4 text-muted-foreground text-center">No category found</div>
                                    )}
                                </>
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      ) : (
        <>
        <Card className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader>
            <CardTitle>Negotiation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logistics CC Present</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                  {negotiationData.cc_present.map((ccId) => {
                    const user = ccUsers.find(u => u.id === ccId);
                    return (
                      <div key={ccId} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1">
                        {user?.name || ccId}
                        {!isLocked && (
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-destructive" 
                            onClick={() => handleNegotiationDataChange('cc_present', negotiationData.cc_present.filter(id => id !== ccId))}
                          />
                        )}
                      </div>
                    );
                  })}
                  {!isLocked && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[280px] sm:w-[200px] p-0">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Search CC..."
                            value={ccSearch}
                            onChange={(e) => setCcSearch(e.target.value)}
                            className="h-9 sm:h-8 text-base sm:text-sm"
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto p-1">
                          {ccUsersLoading ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <>
                              {ccUsers
                                .filter(u => !negotiationData.cc_present.includes(u.id))
                                .filter(u => u.name.toLowerCase().includes(ccSearch.toLowerCase()))
                                .map(u => (
                                  <DropdownMenuItem 
                                    key={u.id}
                                    onClick={() => {
                                      handleNegotiationDataChange('cc_present', [...negotiationData.cc_present, u.id]);
                                      setCcSearch('');
                                    }}
                                    className="py-2 sm:py-1.5 text-base sm:text-sm"
                                  >
                                    {u.name}
                                  </DropdownMenuItem>
                                ))
                              }
                              {ccUsers
                                .filter(u => !negotiationData.cc_present.includes(u.id))
                                .filter(u => u.name.toLowerCase().includes(ccSearch.toLowerCase()))
                                .length === 0 && (
                                <div className="p-2 text-sm text-muted-foreground text-center">No users found</div>
                              )}
                            </>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category Representatives</Label>
                <Input 
                  placeholder="Enter names separated by comma"
                  value={Array.isArray(negotiationData.category_representatives) ? negotiationData.category_representatives.join(', ') : negotiationData.category_representatives}
                  onChange={(e) => handleNegotiationDataChange('category_representatives', e.target.value.split(',').map(s => s.trim()))}
                  disabled={isLocked}
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">

              <Button 
                variant={isLocked ? "outline" : "destructive"} 
                className="w-full sm:w-auto"
                onClick={() => setIsLockOpen(true)}
              >
                {isLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                {isLocked ? "Unlock Negotiation" : "Lock Negotiation"}
              </Button>

              <AlertDialog open={isLockOpen} onOpenChange={setIsLockOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{isLocked ? "Unlock Negotiation?" : "Lock Negotiation?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {isLocked 
                        ? "Are you sure you want to unlock this negotiation? Changes will be allowed again." 
                        : "Are you sure you want to lock this negotiation? Any pending changes will be saved automatically, and no further changes will be allowed."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={(e) => {
                        e.preventDefault();
                        handleLock();
                      }}
                      disabled={saving}
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isLocked ? "Unlock" : (saving ? "Saving & Locking..." : "Lock")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {hasChanges && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isLocked} className="w-full sm:w-auto">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Discard Changes
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to discard all unsaved changes? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDiscard}>Discard</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}


              <Button onClick={handleSave} disabled={saving || isLocked} className="w-full sm:w-auto">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

      <Card className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <CardHeader>
          <CardTitle>Demands</CardTitle>
          <CardDescription>
            Manage demand items for this category.
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
                onClick={fetchDemands}
                disabled={loading}
                title="Refresh Negotiations"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              {Object.keys(rowSelection).length > 0 && !isLocked && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="mr-2">
                      Update Status <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('under review')}>
                      Under Review
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('approved')}>
                      Approved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange('rejected')}>
                      Rejected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

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
              {canAdd && (
                <Button 
                  className="ml-2"
                  onClick={handleAddRow}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Demand
                </Button>
              )}
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
        </>
      )}
    </div>
  );
}
