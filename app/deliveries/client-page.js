'use client';

import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { 
    Loader2, 
    Truck, 
    Check, 
    Minus, 
    Plus, 
    AlertCircle, 
    RefreshCw, 
    BarChart2,
    Search,
    ChevronDown,
    ArrowUpDown,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Filter,
    X,
    ChevronsUpDown
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
  
  // No numeric range filters needed for this simple view for now, usually
  // But if quantity/stock, maybe?
  if (column.id === 'inventory_item_quantity' || column.id === 'quantity' || column.id === 'to_deliver' || column.id === 'delivered') {
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

export default function DeliveryClient({ user }) {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [openCategory, setOpenCategory] = useState(false);
    const [demands, setDemands] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [deliveredData, setDeliveredData] = useState({});
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState([]); // Needed to check availability

    // Delivery State
    // Key: mapping_id, Value: quantity to deliver
    const [deliveryQuantities, setDeliveryQuantities] = useState({});
    const [deliveryReturnables, setDeliveryReturnables] = useState({}); // Key: mapping_id, Value: boolean
    
    // Additional (Unmapped) Deliveries
    // Key: inventory_id, Value: { quantity, returnable }
    const [additionalDeliveries, setAdditionalDeliveries] = useState({}); 
    const [isAddAdditionalOpen, setIsAddAdditionalOpen] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Analytics
    const [viewingAnalyticsId, setViewingAnalyticsId] = useState(null);

    // Table State
    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);
    const [columnVisibility, setColumnVisibility] = useState({
        demandId: false,
        location: true
    });
    const [rowSelection, setRowSelection] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const deferredGlobalFilter = useDeferredValue(globalFilter);
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [globalFilter, columnFilters]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchCategories(),
                    fetchInventory()
                ]);
            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast.error("Failed to load data.");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
         // Polling for live inventory updates
         const interval = setInterval(() => fetchInventory(true), 15000); 
         return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            // Reset data before fetching new category data
            setDemands([]);
            setMappings([]);
            
            fetchCategoryData(selectedCategory);
            // Clear delivery inputs when category changes
            setDeliveryQuantities({});
            setDeliveryReturnables({});
            setAdditionalDeliveries({});
            setPagination(prev => ({ ...prev, pageIndex: 0 }));
        } else {
            setDemands([]);
            setMappings([]);
            setPagination(prev => ({ ...prev, pageIndex: 0 }));
        }
    }, [selectedCategory]);

    const fetchInitialData = async () => {
        // Moved inside useEffect
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchInventory = async (background = false) => {
        if (!background) setLoading(true);
        try {
            const res = await fetch('/api/inventory');
            if (res.ok) {
                const data = await res.json();
                setInventory(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
        } finally {
           if (!background) setLoading(false);
        }
    };

    const fetchCategoryData = async (categoryId) => {
        setLoading(true);
        try {
            const [demandsRes, mappingsRes, deliveriesRes] = await Promise.all([
                fetch('/api/demands'),
                fetch(`/api/mappings?category_id=${categoryId}`),
                fetch(`/api/deliveries?category_id=${categoryId}`)
            ]);

            if (demandsRes.ok && mappingsRes.ok && deliveriesRes.ok) {
                const allDemands = await demandsRes.json();
                const allMappings = await mappingsRes.json();
                const deliveryStats = await deliveriesRes.json();
                
                // Filter demands for this category and only APPROVED ones
                const categoryDemands = allDemands.filter(d => 
                    (d.user_id === categoryId || d.category_id === categoryId) && 
                    d.status === 'approved'
                );
                
                // Map delivery stats
                const statsMap = {};
                if (Array.isArray(deliveryStats)) {
                    deliveryStats.forEach(stat => {
                        statsMap[stat.mapping_id] = parseFloat(stat.delivered_qty);
                    });
                }

                setDemands(categoryDemands);
                setMappings(allMappings);
                setDeliveredData(statsMap);
            }
        } catch (error) {
            console.error("Error fetching category data:", error);
            toast.error("Failed to load category demands.");
        } finally {
            setLoading(false);
        }
    };

    // Helper to get inventory item details
    const getInventoryItem = (invId) => {
        return inventory.find(i => i.id === invId);
    };

    const handleQuantityChange = (mappingId, value) => {
        const val = parseInt(value, 10);
        setDeliveryQuantities(prev => {
            if (isNaN(val) || val <= 0) {
                const newState = { ...prev };
                delete newState[mappingId];
                return newState;
            }
            return { ...prev, [mappingId]: val };
        });
    };
    const handleReturnableChange = (mappingId, checked) => {
        setDeliveryReturnables(prev => ({ ...prev, [mappingId]: checked }));
    };

    const handleAddAdditional = (inventoryId, qty, returnable) => {
        const parsed = parseInt(qty);
        setAdditionalDeliveries(prev => ({
            ...prev,
            [inventoryId]: { quantity: isNaN(parsed) ? 0 : parsed, returnable }
        }));
        // Only close dialog if it's open (implied, but state update is safe)
        setIsAddAdditionalOpen(false);
    };

    const removeAdditional = (inventoryId) => {
         setAdditionalDeliveries(prev => {
            const next = { ...prev };
            delete next[inventoryId];
            return next;
         });
    };

    const handleSubmit = async () => {
        setConfirmOpen(false);
        setIsSubmitting(true);

        // Construct payload
        const deliveries = Object.entries(deliveryQuantities).map(([mappingId, quantity]) => ({
            mapping_id: parseInt(mappingId),
            quantity: quantity,
            returnable: deliveryReturnables[mappingId] || false
        }));

        // Merge Additional Deliveries
        Object.entries(additionalDeliveries).forEach(([invId, data]) => {
             deliveries.push({
                 inventory_id: parseInt(invId),
                 quantity: data.quantity,
                 returnable: data.returnable
             });
        });

        if (deliveries.length === 0) {
            toast.error("No items selected for delivery.");
            setIsSubmitting(false);
            return;
        }

        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_id: selectedCategory,
                    deliveries,
                    created_at: invoiceDate || undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create delivery invoice');
            }

            toast.success("Delivery batch created successfully!");
            
            // Reset form
            setDeliveryQuantities({});
            setDeliveryReturnables({});
            setAdditionalDeliveries({});
            setInvoiceDate('');
            
            // Refresh inventory and category data (mappings might change? no, but audit logs etc)
            await fetchInventory(true);
            
        } catch (error) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Grouping: Associate Mappings with Demands
    const groupedData = useMemo(() => {
        return demands.map(demand => {
            // Find mappings for this demand
            const demandMappings = mappings.filter(m => m.demand_id === demand.id);
            return {
                ...demand,
                mappings: demandMappings
            };
        }).filter(d => d.mappings.length > 0); // Only show demands that are mapped
    }, [demands, mappings]);

    // Create an inventory map for faster lookup in flatData
    const inventoryMap = useMemo(() => {
        return new Map(inventory.map(i => [i.id, i]));
    }, [inventory]);

    // Flatten data for table
    const flatData = useMemo(() => {
        return groupedData.flatMap(demand => 
            demand.mappings.map(mapping => ({
                ...mapping,
                demandId: demand.id,
                demandItem: demand.item_name,
                demandUnit: demand.unit,
                demandQty: demand.quantity,
                inventory_item: inventoryMap.get(mapping.inventory_id)
            }))
        );
    }, [groupedData, inventoryMap]);

    const columns = useMemo(() => [
        {
            accessorKey: "demandId",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 text-xs">
                    Demand <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">{row.original.demandItem}</span>
                    <Badge variant="outline" className="w-fit text-[10px] font-normal px-1 py-0 h-5">
                       D{String(row.getValue("demandId")).padStart(3, '0')}
                    </Badge>
                </div>
            ),
        },
        {
            accessorKey: "inventory_item.item_name",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 text-xs">
                    Mapped Item <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => {
                const invItem = row.original.inventory_item;
                return invItem ? (
                     <div className="flex items-center gap-2">
                        <div className="flex flex-col text-sm">
                            <span className="font-medium">{invItem.item_name}</span>
                            <span className="text-xs text-muted-foreground">I{String(invItem.id).padStart(3, '0')}</span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View Breakdown Analytics"
                            onClick={() => setViewingAnalyticsId(invItem.id)}
                        >
                            <BarChart2 className="h-3 w-3" />
                        </Button>
                    </div>
                ) : 'Unknown';
            }
        },
        {
            accessorKey: "inventory_item.type",
            id: "type", 
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 text-xs">
                    Type <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => {
                const invItem = row.original.inventory_item;
                return invItem ? <div className="text-sm text-muted-foreground">{invItem.type}</div> : '-';
            }
        },
        {
            accessorKey: "inventory_item.unit",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 text-xs">
                    Unit <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => {
                const invItem = row.original.inventory_item;
                return invItem ? <div className="text-sm text-muted-foreground">{invItem.unit}</div> : '-';
            }
        },
        {
            accessorKey: "inventory_item.location",
            id: "location",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 text-xs">
                    Location <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            ),
            cell: ({ row }) => {
                const invItem = row.original.inventory_item;
                return invItem ? <div className="text-sm text-muted-foreground">{invItem.location || '-'}</div> : '-';
            }
        },
        {
            accessorKey: "inventory_item.quantity",
            header: ({ column }) => (
                <div className="flex flex-col items-center">
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 text-xs">
                        Stock <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => {
                const invItem = row.original.inventory_item;
                if (!invItem) return <div className="text-center">-</div>;
                return (
                    <div className={`text-center font-mono ${invItem.quantity === 0 ? 'text-destructive' : ''}`}>
                        {invItem.quantity}
                    </div>
                );
            }
        },
        {
            accessorKey: "quantity",
            header: ({ column }) => (
                <div className="flex flex-col items-center">
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 text-xs">
                        Total Demand <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => <div className="text-center">{row.getValue("quantity")}</div>
        },
        {
            id: "delivered",
            accessorFn: (row) => deliveredData[row.id] || 0,
            header: ({ column }) => (
                <div className="flex flex-col items-center">
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 text-xs">
                        Delivered <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                </div>
            ),
            cell: ({ getValue }) => {
                return <div className="text-muted-foreground text-center">{getValue()}</div>
            },
            filterFn: (row, columnId, filterValue) => {
                const val = row.getValue(columnId);
                const [min, max] = filterValue || [];
                if (min !== '' && min !== undefined && val < Number(min)) return false;
                if (max !== '' && max !== undefined && val > Number(max)) return false;
                return true;
            }
        },
        {
            id: "to_deliver",
            accessorFn: (row) => {
                const delivered = deliveredData[row.id] || 0;
                return Math.max(0, row.quantity - delivered);
            },
            header: ({ column }) => (
                <div className="flex flex-col items-center">
                    <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="pl-0 text-xs">
                        To Deliver <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                </div>
            ),
            cell: ({ getValue }) => {
                const toDeliver = getValue();
                return (
                    <div className={`text-center font-mono font-medium ${toDeliver > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                        {toDeliver}
                    </div>
                );
            },
            filterFn: (row, columnId, filterValue) => {
                const val = row.getValue(columnId);
                const [min, max] = filterValue || [];
                if (min !== '' && min !== undefined && val < Number(min)) return false;
                if (max !== '' && max !== undefined && val > Number(max)) return false;
                return true;
            }
        },
        {
            id: "actions",
            header: "Deliver Now",
            cell: ({ row, table }) => {
                const mappingId = row.original.id;
                const invItem = row.original.inventory_item;
                const currentDelivery = table.options.meta?.deliveryQuantities[mappingId] || '';
                const isReturnable = table.options.meta?.deliveryReturnables[mappingId] || false;
                const isStockLow = invItem && invItem.quantity < (currentDelivery || 0);
                const handleQuantityChange = table.options.meta?.handleQuantityChange;
                const handleReturnableChange = table.options.meta?.handleReturnableChange;

                return (
                    <div className="flex flex-col gap-2">
                        <Input 
                             type="number" 
                             min="0"
                             className={`w-28 h-8 ${isStockLow ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                             placeholder="0"
                             value={currentDelivery} 
                             onChange={(e) => handleQuantityChange(mappingId, e.target.value)} 
                        />
                        <div className="flex items-center gap-2">
                            <Checkbox 
                                id={`returnable-${mappingId}`} 
                                checked={isReturnable}
                                onCheckedChange={(checked) => handleReturnableChange(mappingId, checked)}
                            />
                            <Label 
                                htmlFor={`returnable-${mappingId}`}
                                className="text-xs font-normal text-muted-foreground cursor-pointer"
                            >
                                Returnable
                            </Label>
                        </div>
                        {isStockLow && (
                            <span className="text-[10px] text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Stock Low
                            </span>
                        )}
                    </div>
                )
            }
        }

    ], [deliveredData]);

    const table = useReactTable({
        data: flatData,
        columns,
        autoResetPageIndex: false,
        meta: {
            deliveryQuantities,
            deliveryReturnables,
            handleQuantityChange,
            handleReturnableChange
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues(),
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

    const hasValidDeliveries = Object.keys(deliveryQuantities).length > 0;

    return (
        <div className="container mx-auto py-6 md:py-10 px-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Deliveries</h1>
                    <p className="text-muted-foreground">Manage and track inventory deliveries to categories.</p>
                </div>
                 <div className="w-full sm:w-[300px]">
                    <Popover open={openCategory} onOpenChange={setOpenCategory}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCategory}
                                className="w-full justify-between"
                            >
                                {selectedCategory
                                    ? categories.find((cat) => String(cat.id) === String(selectedCategory))?.name
                                    : "Select Category..."}
                                {loading && categories.length === 0 ? (
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin opacity-50" />
                                ) : (
                                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Search category..." />
                                <CommandList>
                                    <CommandEmpty>No category found.</CommandEmpty>
                                    <CommandGroup>
                                        {categories.map((cat) => (
                                            <CommandItem
                                                key={cat.id}
                                                value={cat.name}
                                                onSelect={() => {
                                                    setSelectedCategory(String(cat.id) === String(selectedCategory) ? "" : String(cat.id));
                                                    setOpenCategory(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        String(selectedCategory) === String(cat.id) ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {cat.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Delivery Batch</CardTitle>
                            <CardDescription>Enter quantities to create a new delivery invoice.</CardDescription>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                           <GlobalFilterInput 
                                value={globalFilter ?? ""}
                                onChange={(value) => setGlobalFilter(String(value))}
                                className="pl-8"
                           />
                           <div className="flex items-center gap-2 w-full sm:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="ml-auto w-full sm:w-auto">
                                        View <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
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
                                                    {column.id === 'inventory_item_item_name' ? 'Item Name' : 
                                                     column.id === 'inventory_item_quantity' ? 'Stock' :
                                                     column.id.replace(/_/g, " ")}
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
                    {!selectedCategory ? (
                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                            <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p>Please select a category to start a delivery.</p>
                        </div>
                    ) : loading && flatData.length === 0 ? (
                        <TableSkeleton />
                    ) : flatData.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <p>No mapped demands found for this category.</p>
                            <p className="text-sm">Ensure demands are approved and mapped to inventory items.</p>
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
                                                    className="group"
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

                            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 py-4">
                                <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left">
                                    {table.getFilteredSelectedRowModel().rows.length > 0 && 
                                      `${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} row(s) selected.`
                                    }
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <div className="flex items-center space-x-2">
                                            <p className="text-sm font-medium hidden sm:block">Rows per page</p>
                                            <Select
                                                value={`${table.getState().pagination.pageSize}`}
                                                onValueChange={(value) => {
                                                    table.setPageSize(Number(value));
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
                            
                            <div className="mt-8 mb-4 border-t pt-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Additional (Unmapped) Items</h3>
                                    <Button variant="outline" size="sm" onClick={() => setIsAddAdditionalOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Item
                                    </Button>
                                </div>
                                
                                {Object.keys(additionalDeliveries).length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead>Item Name</TableHead>
                                                    <TableHead>Available</TableHead>
                                                    <TableHead className="w-[150px]">Quantity</TableHead>
                                                    <TableHead className="w-[100px] text-center">Returnable</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(additionalDeliveries).map(([invId, data]) => {
                                                    const item = getInventoryItem(parseInt(invId));
                                                    if (!item) return null;
                                                    return (
                                                        <TableRow key={invId}>
                                                            <TableCell className="font-medium">
                                                                {item.item_name}
                                                                <span className="text-xs text-muted-foreground block">
                                                                    ID: {formatId(item.id)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{item.quantity} {item.unit}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                     <Input 
                                                                        type="number" 
                                                                        className="h-8 w-20"
                                                                        value={data.quantity}
                                                                        onChange={(e) => handleAddAdditional(item.id, e.target.value, data.returnable)} 
                                                                    />
                                                                    <span className="text-sm text-muted-foreground">{item.unit}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Checkbox 
                                                                    checked={!!data.returnable}
                                                                    onCheckedChange={(c) => handleAddAdditional(item.id, data.quantity, c)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="icon" onClick={() => removeAdditional(invId)}>
                                                                    <X className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground italic">
                                        No additional items added.
                                    </div>
                                )}
                            </div>

                            <div className="h-24 md:hidden" aria-hidden="true" />

                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end items-center gap-4 shadow-lg md:relative md:bg-transparent md:border-t-0 md:shadow-none md:p-0 z-10">
                                <div className="text-sm text-muted-foreground hidden md:block">
                                    {Object.keys(deliveryQuantities).length + Object.keys(additionalDeliveries).length} items prepared for delivery
                                </div>
                                <Button 
                                    size="lg" 
                                    onClick={() => setConfirmOpen(true)}
                                    disabled={!hasValidDeliveries && Object.keys(additionalDeliveries).length === 0 || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Truck className="mr-2 h-4 w-4" />
                                            Create Delivery Batch ({Object.keys(deliveryQuantities).length})
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Delivery Batch</DialogTitle>
                        <DialogDescription>
                            This will create an invoice and deduct items from inventory immediately.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                             <Label htmlFor="invoice-date">Invoice Date (Optional)</Label>
                             <Input
                                id="invoice-date"
                                type="datetime-local"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                            />
                             <p className="text-[10px] text-muted-foreground">Leave blank to use current time.</p>
                        </div>
                        <div className="bg-muted p-4 rounded-md max-h-[200px] overflow-y-auto">
                            <h4 className="text-sm font-medium mb-2">Summary:</h4>
                            <ul className="space-y-2 text-sm">
                                {Object.entries(deliveryQuantities).map(([mapId, qty]) => {
                                    // Find context for display
                                    let label = `Item #${mapId}`;
                                    // Heavy lookup but small N usually
                                    for(const d of groupedData) {
                                        const m = d.mappings.find(x => x.id === parseInt(mapId));
                                        if (m) {
                                            const inv = getInventoryItem(m.inventory_id);
                                            label = `${inv?.item_name || 'Item'} (${qty} ${inv?.unit || ''})`;
                                            break;
                                        }
                                    }
                                    return (
                                        <li key={mapId} className="flex justify-between border-b pb-1 last:border-0 items-start">
                                            <div className="flex flex-col">
                                                <span>{label}</span>
                                                {deliveryReturnables[mapId] && (
                                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded w-fit">
                                                        Returnable
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                                {Object.entries(additionalDeliveries).map(([invId, data]) => {
                                    const inv = getInventoryItem(parseInt(invId));
                                    const label = `${inv?.item_name || 'Item'} (${data.quantity} ${inv?.unit || ''}) [Additional]`;
                                    return (
                                        <li key={`add-${invId}`} className="flex justify-between border-b pb-1 last:border-0 items-start">
                                            <div className="flex flex-col">
                                                <span>{label}</span>
                                                {data.returnable && (
                                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded w-fit">
                                                        Returnable
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            Confirm Delivery
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BreakdownDialog 
                itemId={viewingAnalyticsId} 
                open={!!viewingAnalyticsId} 
                onOpenChange={(open) => !open && setViewingAnalyticsId(null)} 
            />

            <AdditionalItemDialog 
                key={isAddAdditionalOpen ? 'open' : 'closed'}
                open={isAddAdditionalOpen} 
                onOpenChange={setIsAddAdditionalOpen}
                inventory={inventory}
                onAdd={handleAddAdditional}
                existingMappings={mappings}
            />
        </div>
    );
}

const AdditionalItemDialog = ({ open, onOpenChange, inventory, onAdd, existingMappings }) => {
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [qty, setQty] = useState('');
    const [returnable, setReturnable] = useState(false);

    // Calculate set of inventory IDs that are already mapped
    const mappedInventoryIds = useMemo(() => {
        return new Set(existingMappings.map(m => m.inventory_id));
    }, [existingMappings]);

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
            // Logic in parent closes it.
        }
    };

    const selectedItem = inventory.find(i => i.id === selectedId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Additional Item</DialogTitle>
                    <DialogDescription>
                        Select an item from inventory to deliver without a specific demand.
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
                                const isMapped = mappedInventoryIds.has(item.id);
                                return (
                                <div 
                                    key={item.id} 
                                    className={`p-2 text-sm flex justify-between items-center ${
                                        isMapped 
                                            ? 'opacity-50 cursor-not-allowed bg-muted/20' 
                                            : selectedId === item.id 
                                                ? 'bg-muted font-medium cursor-pointer' 
                                                : 'cursor-pointer hover:bg-muted'
                                    }`}
                                    onClick={() => !isMapped && setSelectedId(item.id)}
                                >
                                    <div>
                                        <span>{item.item_name}</span>
                                        {isMapped && <span className="ml-2 text-xs text-red-500 font-medium">(Already Mapped)</span>}
                                    </div>
                                    <span className="text-muted-foreground text-xs">{item.quantity} {item.unit} available</span>
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

const BreakdownDialog = ({ itemId, open, onOpenChange }) => {
  const [data, setData] = useState([]);
  const [itemDetails, setItemDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState([{ id: 'mapped_quantity', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const deferredGlobalFilter = useDeferredValue(globalFilter);
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
        globalFilter: deferredGlobalFilter,
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
           <>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 mb-2 border rounded-lg">
               <div className="flex flex-col gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-24" /></div>
               <div className="flex flex-col gap-2 sm:col-span-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-full" /></div>
               <div className="flex flex-col gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-20" /></div>
               <div className="flex flex-col gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-16" /></div>
               <div className="flex flex-col gap-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-24" /></div>
               <div className="flex flex-col gap-2 sm:col-span-3"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-full" /></div>
             </div>
             <div className="rounded-md border mt-4">
                <Table>
                  <TableHeader>
                      <TableRow>
                          {[1,2,3,4,5,6].map(i => <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>)}
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                       {[1,2,3].map(i => (
                           <TableRow key={i}>
                               {[1,2,3,4,5,6].map(j => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                           </TableRow>
                       ))}
                  </TableBody>
                </Table>
             </div>
           </>
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

                <div className="flex flex-col sm:flex-row items-center py-2 gap-2">
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
                          onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                          }
                      >
                          {column.id.replace(/_/g, ' ')}
                      </DropdownMenuCheckboxItem>
                      )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
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

        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left">
                {table.getFilteredRowModel().rows.length} row(s)
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-4">
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

                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                </div>

                <div className="space-x-2">
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
        </div>
        </>
      )}
      </DialogContent>
    </Dialog>
  );
};

const TableSkeleton = () => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-12" /></TableHead>
            <TableHead><Skeleton className="h-4 w-24" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell>
                 <div className="flex flex-col gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-3 w-16" />
                 </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// ... existing code ...
