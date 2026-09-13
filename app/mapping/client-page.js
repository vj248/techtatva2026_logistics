'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings2, Link as LinkIcon, Plus, Trash2, Check, ChevronsUpDown, CornerDownRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Filter, ArrowUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function MappingClient() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [categoryMappings, setCategoryMappings] = useState([]);
  
  // Mapping Dialog State
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [currentMappings, setCurrentMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // Selection State
  const [selectedDemands, setSelectedDemands] = useState([]);

  // Default visible columns: ID, Name, Negotiated, Unit, Remarks, Status
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    itemName: true,
    quantity: false,
    unit: true,
    status: true,
    negotiated: true,
    remarks: true,
    reason: false,
    actions: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, demandsRes, invRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/demands'),
          fetch('/api/inventory')
        ]);
        
        if (catsRes.ok && demandsRes.ok) {
          const cats = await catsRes.json();
          const dems = await demandsRes.json();
          setCategories(Array.isArray(cats) ? cats : []);
          setDemands(Array.isArray(dems) ? dems : []);
        }
        if (invRes.ok) {
           const inv = await invRes.json();
           setInventory(Array.isArray(inv) ? inv : []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    const fetchCategoryMappings = async () => {
      if (!selectedCategory) {
        setCategoryMappings([]);
        return;
      }
      try {
        const res = await fetch(`/api/mappings?category_id=${selectedCategory}`);
        if (res.ok) {
          const data = await res.json();
          setCategoryMappings(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching mappings:", error);
      }
    };
    fetchCategoryMappings();
  }, [selectedCategory]);

  const filteredDemands = useMemo(() => {
    if (!selectedCategory) return [];

                          const filtered = demands.filter(d => {
        const matchesCategory = (d.user_id === selectedCategory || d.category_id === selectedCategory);
        // Only show approved
        const isApproved = d.status && d.status.toLowerCase() === 'approved';
        
        if (!matchesCategory || !isApproved) return false;

        const formattedId = `D${String(d.id).padStart(3, '0')}`;
        const matchesSearch = searchQuery === '' || 
            d.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.id.toString().includes(searchQuery) ||
            formattedId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.unit && d.unit.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortOrder === 'asc') return a.id - b.id;
      return b.id - a.id;
    });
  }, [selectedCategory, demands, searchQuery, sortOrder]);

  // Reset page when filtering changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedDemands([]);
  }, [selectedCategory, searchQuery, sortOrder]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredDemands.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDemands = filteredDemands.slice(startIndex, startIndex + itemsPerPage);

  // Selection Logic
  const handleSelectAll = (checked) => {
    if (checked) {
      // Select all visible items on current page
      const currentIds = paginatedDemands.map(d => d.id);
      setSelectedDemands(prev => [...new Set([...prev, ...currentIds])]);
    } else {
      // Deselect all visible items on current page
      const currentIds = paginatedDemands.map(d => d.id);
      setSelectedDemands(prev => prev.filter(id => !currentIds.includes(id)));
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedDemands(prev => [...prev, id]);
    } else {
      setSelectedDemands(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const allPageSelected = paginatedDemands.length > 0 && paginatedDemands.every(d => selectedDemands.includes(d.id));
  const isIndeterminate = paginatedDemands.some(d => selectedDemands.includes(d.id)) && !allPageSelected;

  const handleDeleteMappings = async () => {
     if (!confirm(`Are you sure you want to delete mappings for ${selectedDemands.length} items? This will unlink them from inventory.`)) return;
     
     setIsDeleting(true);
     try {
       await Promise.all(selectedDemands.map(id => 
          fetch('/api/mappings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  demandId: id,
                  mappings: [] 
              })
          })
       ));
       
       // Refresh mappings
       if (selectedCategory) {
          const mappingsRes = await fetch(`/api/mappings?category_id=${selectedCategory}`);
          if (mappingsRes.ok) {
              const data = await mappingsRes.json();
              setCategoryMappings(data);
          }
       }
       
       setSelectedDemands([]);
     } catch(e) {
       console.error("Failed to delete mappings", e);
       alert("Failed to delete some mappings");
     } finally {
       setIsDeleting(false);
     }
  };

  const getStatusBadge = (status) => {
      // Normalize status to lowercase for matching
      const s = status ? status.toLowerCase() : '';
      const styles = {
        'approved': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800',
        'pending': 'bg-yellow-100 text-yellow-800',
        'under review': 'bg-orange-100 text-orange-800'
      };
      
      const defaultStyle = 'bg-gray-100 text-gray-800';
      
      return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[s] || defaultStyle}`}>
            {status}
        </span>
      );
  };
  
  const toggleColumn = (column) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const formatId = (id) => {
    if (!id) return '';
    return `D${String(id).padStart(3, '0')}`;
  };

  const formatInventoryId = (id) => {
    if (!id) return '';
    return `I${String(id).padStart(3, '0')}`;
  };

  const openMappingDialog = async (demand) => {
      setSelectedDemand(demand);
      setMappingDialogOpen(true);
      setSavingMapping(false);
      setLoadingMappings(true);
      // Fetch existing mappings and latest inventory
      try {
          const [mappingsRes, inventoryRes] = await Promise.all([
             fetch(`/api/mappings?demand_id=${demand.id}`),
             fetch('/api/inventory')
          ]);

          if (inventoryRes.ok) {
              const inv = await inventoryRes.json();
              setInventory(Array.isArray(inv) ? inv : []);
          }

          if (mappingsRes.ok) {
              const data = await mappingsRes.json();
              setCurrentMappings(data.map(m => ({
                  inventory_id: m.inventory_id.toString(),
                  quantity: m.quantity
              })));
          } else {
              setCurrentMappings([]);
          }
      } catch (e) {
          console.error("Failed to fetch data", e);
          setCurrentMappings([]);
      } finally {
        setLoadingMappings(false);
      }
  };

  const handleAddMappingRow = () => {
      setCurrentMappings([...currentMappings, { inventory_id: "", quantity: "" }]);
  };

  const handleRemoveMappingRow = (index) => {
      const newMappings = [...currentMappings];
      newMappings.splice(index, 1);
      setCurrentMappings(newMappings);
  };

  const handleMappingChange = (index, field, value) => {
      const newMappings = [...currentMappings];
      newMappings[index][field] = value;
      setCurrentMappings(newMappings);
  };

  const InventoryCombobox = ({ value, onChange, inventory }) => {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("");
    const selectedItem = inventory.find((item) => item.id.toString() === value)
 
    // Optimization: Filter and slice inventory to prevent rendering lag
    const filteredInventory = useMemo(() => {
        if (!search) return inventory.slice(0, 50);
        return inventory.filter(item => 
            item.item_name.toLowerCase().includes(search.toLowerCase()) || 
            formatInventoryId(item.id).toLowerCase().includes(search.toLowerCase())
        ).slice(0, 50);
    }, [inventory, search]);

    return (
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedItem
              ? `${formatInventoryId(selectedItem.id)} - ${selectedItem.item_name}`
              : "Select item..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search inventory..." onValueChange={setSearch} />
            <CommandList className="max-h-[300px] overflow-y-auto">
                <CommandEmpty>No item found.</CommandEmpty>
                <CommandGroup>
                {filteredInventory.map((item) => (
                    <CommandItem
                    key={item.id}
                    value={item.item_name}
                    onSelect={() => {
                        onChange(item.id.toString())
                        setOpen(false)
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                    />
                    <div className="flex flex-col">
                        <span>{item.item_name}</span>
                        <span className="text-xs text-muted-foreground">{formatInventoryId(item.id)}, Unit: {item.unit}, Qty: {item.quantity}</span>
                    </div>
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  const CategoryCombobox = ({ value, onChange, categories }) => {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const selectedCat = categories.find((cat) => cat.id.toString() === value)

    return (
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCat ? selectedCat.name : "-- Choose a Category --"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search category..." value={search} onValueChange={setSearch} />
            <CommandList className="max-h-[300px] overflow-y-auto">
                <CommandEmpty>No category found.</CommandEmpty>
                <CommandGroup>
                {categories.map((cat) => (
                    <CommandItem
                    key={cat.id}
                    value={cat.name}
                    onSelect={() => {
                        onChange(cat.id.toString())
                        setOpen(false)
                        setSearch("")
                    }}
                    >
                    <Check
                        className={cn(
                        "mr-2 h-4 w-4",
                        value === cat.id.toString() ? "opacity-100" : "opacity-0"
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
    )
  }

  const saveMappings = async () => {
      setSavingMapping(true);
      try {
          // Validation: Check for invalid quantities
          const hasInvalidQuantity = currentMappings.some(m => m.inventory_id && Number(m.quantity) <= 0);
          if (hasInvalidQuantity) {
              alert("Quantity must be greater than 0");
              setSavingMapping(false);
              return;
          }

          // Filter out empty rows (no inventory selected)
          const validMappings = currentMappings.filter(m => m.inventory_id);
          
          const res = await fetch('/api/mappings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  demandId: selectedDemand.id,
                  mappings: validMappings
              })
          });

          if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || 'Failed to save mappings');
          }
          
          setMappingDialogOpen(false);
          // Refetch mappings for category
          if (selectedCategory) {
              const mappingsRes = await fetch(`/api/mappings?category_id=${selectedCategory}`);
              if (mappingsRes.ok) {
                  const data = await mappingsRes.json();
                  setCategoryMappings(data);
              }
          }
      } catch (error) {
          console.error("Error saving mappings:", error);
          // Optional: Show error toast
      } finally {
          setSavingMapping(false);
      }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[200px] mb-2" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-1/3 space-y-2">
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
               <Skeleton className="h-8 w-[150px]" />
               <Skeleton className="h-4 w-[250px]" />
            </div>
            <Skeleton className="h-9 w-[100px]" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-4">
               <div className="flex flex-1 items-center space-x-2 w-full">
                  <Skeleton className="h-10 w-full sm:w-80" />
               </div>
            </div>
            <div className="rounded-md border">
              <div className="p-4 space-y-4">
                 {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                       <Skeleton className="h-12 w-full" />
                    </div>
                 ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
           <CardTitle>Category Selection</CardTitle>
           <CardDescription>Select a category to view their demands</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="w-full md:w-1/3 space-y-2">
                <Label htmlFor="category-select">Category</Label>
                <CategoryCombobox 
                    value={selectedCategory} 
                    onChange={setSelectedCategory} 
                    categories={categories} 
                />
            </div>
        </CardContent>
      </Card>

      {selectedCategory && (
        <Card className="overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                     <CardTitle>Demands</CardTitle>
                     <CardDescription className="hidden sm:block">
                         {selectedDemands.length} of {filteredDemands.length} row(s) selected
                     </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="sm:hidden text-xs text-muted-foreground mr-2">
                      {selectedDemands.length}/{filteredDemands.length} selected
                  </div>
                  {selectedDemands.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleDeleteMappings}
                      className="mr-2"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      {isDeleting ? 'Deleting...' : `Delete Mappings (${selectedDemands.length})`}
                    </Button>
                  )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto h-8 lg:flex">
                      <Settings2 className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[150px]">
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.id}
                      onCheckedChange={() => toggleColumn('id')}
                    >
                      ID
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.itemName}
                      onCheckedChange={() => toggleColumn('itemName')}
                    >
                      Item Name
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.quantity}
                      onCheckedChange={() => toggleColumn('quantity')}
                    >
                      Quantity
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.unit}
                      onCheckedChange={() => toggleColumn('unit')}
                    >
                      Unit
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.status}
                      onCheckedChange={() => toggleColumn('status')}
                    >
                      Status
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.negotiated}
                      onCheckedChange={() => toggleColumn('negotiated')}
                    >
                      Negotiated
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.remarks}
                      onCheckedChange={() => toggleColumn('remarks')}
                    >
                      Remarks
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.reason}
                      onCheckedChange={() => toggleColumn('reason')}
                    >
                      Reason
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.actions}
                      onCheckedChange={() => toggleColumn('actions')}
                    >
                      Actions
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
                  <div className="flex flex-1 items-center space-x-2 w-full">
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Filter demands..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-md border overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                  <Checkbox 
                                    checked={allPageSelected}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Select all"
                                  />
                                </TableHead>
                                {visibleColumns.id && (
                                  <TableHead>
                                    <Button 
                                      variant="ghost" 
                                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} 
                                      className="h-8 p-0 hover:bg-transparent"
                                    >
                                      ID
                                      <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                  </TableHead>
                                )}
                                {visibleColumns.itemName && <TableHead>Item Name</TableHead>}
                                {visibleColumns.quantity && <TableHead>Quantity (Demanded)</TableHead>}
                                {visibleColumns.negotiated && <TableHead>Negotiated</TableHead>}
                                {visibleColumns.unit && <TableHead>Unit</TableHead>}
                                {visibleColumns.status && <TableHead>Status</TableHead>}
                                {visibleColumns.remarks && <TableHead>Remarks</TableHead>}
                                {visibleColumns.reason && <TableHead>Reason</TableHead>}
                                {visibleColumns.actions && <TableHead>Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedDemands.length > 0 ? (
                                paginatedDemands.map((demand) => {
                                    const demandMappings = categoryMappings.filter(m => m.demand_id === demand.id);
                                    
                                    return (
                                    <Fragment key={demand.id}>
                                    <TableRow className={demandMappings.length > 0 ? "border-b-0" : ""}>
                                        <TableCell>
                                          <Checkbox 
                                            checked={selectedDemands.includes(demand.id)}
                                            onCheckedChange={(checked) => handleSelectOne(demand.id, checked)}
                                            aria-label={`Select demand ${demand.id}`}
                                          />
                                        </TableCell>
                                        {visibleColumns.id && (
                                            <TableCell className="font-medium text-xs text-muted-foreground">
                                                {formatId(demand.id)}
                                            </TableCell>
                                        )}
                                        {visibleColumns.itemName && (
                                            <TableCell className="font-medium">{demand.item_name || demand.name}</TableCell>
                                        )}
                                        {visibleColumns.quantity && (
                                            <TableCell>{demand.quantity}</TableCell>
                                        )}
                                        {visibleColumns.negotiated && (
                                            <TableCell>{demand.negotiated !== null ? demand.negotiated : '-'}</TableCell>
                                        )}
                                        {visibleColumns.unit && (
                                            <TableCell>{demand.unit}</TableCell>
                                        )}
                                        {visibleColumns.status && (
                                            <TableCell>{getStatusBadge(demand.status)}</TableCell>
                                        )}
                                        {visibleColumns.remarks && (
                                            <TableCell className="max-w-[200px] break-words whitespace-normal">{demand.remarks || '-'}</TableCell>
                                        )}
                                        {visibleColumns.reason && (
                                            <TableCell className="max-w-[200px] break-words whitespace-normal">{demand.reason || '-'}</TableCell>
                                        )}
                                         {visibleColumns.actions && (
                                            <TableCell>
                                                {demand.status?.toLowerCase() === 'approved' && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => openMappingDialog(demand)}
                                                    >
                                                        <LinkIcon className="h-4 w-4 mr-1" />
                                                        Link
                                                    </Button>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                    {demandMappings.length > 0 && (
                                        <TableRow key={`${demand.id}-mappings`} className="bg-transparent hover:bg-transparent border-b">
                                            <TableCell className="p-0 border-t-0"></TableCell>
                                            <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="p-0 border-t-0">
                                                <div className="flex flex-col pb-3 pt-1">
                                                     {demandMappings.map((m) => (
                                                         <div key={m.id} className="relative flex items-center pl-12 py-1 text-sm group">
                                                             <CornerDownRight className="h-3 w-3 text-muted-foreground mr-2 opacity-50" />
                                                             <div className="flex items-baseline gap-3">
                                                                <span className="font-mono text-xs text-muted-foreground">{formatInventoryId(m.inventory_id)}</span>
                                                                <span className="font-medium text-foreground">{m.item_name}</span>
                                                                <span className="text-muted-foreground text-s">
                                                                    unit: {m.unit}
                                                                </span>
                                                                <span className="font-medium text-muted-foreground test-s">
                                                                    qty: {m.quantity}
                                                                </span>
                                                                {m.description && (
                                                                    <span className="text-muted-foreground text-xs italic opacity-70 truncate max-w-xs">
                                                                        - {m.description}
                                                                    </span>
                                                                )}
                                                             </div>
                                                         </div>
                                                     ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    </Fragment>
                                )})
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="h-24 text-center text-muted-foreground">
                                        No demands found for this category.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                 {/* Pagination Controls */}
                 {filteredDemands.length > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
                      {/* Empty div for spacing on mobile, can be removed or used for "selected count" if moved here */}
                      <div className="hidden md:block"></div> 
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8 w-full md:w-auto">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium">Rows per page</p>
                          <Select
                            value={`${itemsPerPage}`}
                            onValueChange={(value) => {
                              setItemsPerPage(Number(value));
                              setCurrentPage(1);
                            }}
                          >
                            <SelectTrigger className="h-8 w-[70px]">
                              <SelectValue placeholder={itemsPerPage} />
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
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                          >
                            <span className="sr-only">Go to first page</span>
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <span className="sr-only">Go to previous page</span>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="flex w-[80px] sm:w-[100px] items-center justify-center text-sm font-medium">
                            Page {currentPage} of {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                          >
                            <span className="sr-only">Go to next page</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                          >
                            <span className="sr-only">Go to last page</span>
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
            </CardContent>
        </Card>
      )}

      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Inventory Items</DialogTitle>
            <DialogDescription>
              Map inventory items to this demand.
            </DialogDescription>
          </DialogHeader>

          {selectedDemand && (
            <div className="bg-muted/30 p-3 rounded-md border text-sm grid grid-cols-2 lg:grid-cols-5 gap-y-3 gap-x-4 mt-2">
                <div>
                    <span className="text-muted-foreground text-xs block mb-0.5">ID</span>
                    <span className="font-medium">{formatId(selectedDemand.id)}</span>
                </div>
                 <div>
                    <span className="text-muted-foreground text-xs block mb-0.5">Item Name</span>
                    <span className="font-medium">{selectedDemand.item_name || selectedDemand.name}</span>
                </div>
                <div>
                    <span className="text-muted-foreground text-xs block mb-0.5">Approved Qty</span>
                     <span className="font-medium">{selectedDemand.negotiated ?? selectedDemand.quantity}</span>
                </div>
                <div>
                    <span className="text-muted-foreground text-xs block mb-0.5">Unit</span>
                     <span className="font-medium">{selectedDemand.unit}</span>
                </div>
                <div>
                    <span className="text-muted-foreground text-xs block mb-0.5">Status</span>
                    {getStatusBadge(selectedDemand.status)}
                </div>
                <div className="col-span-2 lg:col-span-5">
                    <span className="text-muted-foreground text-xs block mb-0.5">Remarks</span>
                    <span className="font-medium block break-words text-muted-foreground italic" title={selectedDemand.remarks}>{selectedDemand.remarks || '-'}</span>
                </div>
            </div>
          )}
          
          <div className="space-y-4 py-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="text-sm font-medium">Mapped Items</h4>
                  <Button variant="outline" size="sm" onClick={handleAddMappingRow} className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                  </Button>
              </div>
              
               <div className="border rounded-md p-0 overflow-x-auto">
                   <Table className="min-w-[600px]">
                       <TableHeader>
                           <TableRow>
                               <TableHead className="w-[80px]">ID</TableHead>
                               <TableHead>Inventory Item</TableHead>
                               <TableHead className="w-[100px]">Unit</TableHead>
                               <TableHead className="w-[100px]">Quantity</TableHead>
                               <TableHead className="w-[50px]"></TableHead>
                           </TableRow>
                       </TableHeader>
                       <TableBody>
                           {loadingMappings ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={`skeleton-${i}`}>
                                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                        <TableCell><Skeleton className="h-9 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                        <TableCell><Skeleton className="h-9 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                                    </TableRow>
                                ))
                           ) : currentMappings.length > 0 ? (
                               currentMappings.map((mapping, index) => {
                                   const selectedInv = inventory.find(i => i.id.toString() === mapping.inventory_id);
                                   return (
                                   <TableRow key={index}>
                                       <TableCell className="text-muted-foreground text-xs">
                                           {selectedInv ? formatInventoryId(selectedInv.id) : '-'}
                                       </TableCell>
                                       <TableCell>
                                           <InventoryCombobox 
                                                value={mapping.inventory_id} 
                                                onChange={(val) => handleMappingChange(index, 'inventory_id', val)}
                                                inventory={inventory}
                                           />
                                       </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                           {selectedInv ? selectedInv.unit : '-'}
                                       </TableCell>
                                       <TableCell>
                                           <Input 
                                                type="number" 
                                                min="1"
                                                value={mapping.quantity}
                                                onChange={(e) => handleMappingChange(index, 'quantity', e.target.value)}
                                            />
                                       </TableCell>
                                       <TableCell>
                                           <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRemoveMappingRow(index)}
                                            >
                                               <Trash2 className="h-4 w-4" />
                                           </Button>
                                       </TableCell>
                                   </TableRow>
                               )})
                           ) : (
                               <TableRow>
                                   <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                       No items linked. Click &quot;Add Item&quot; to start mapping.
                                   </TableCell>
                               </TableRow>
                           )}
                       </TableBody>
                   </Table>
               </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveMappings} disabled={savingMapping}>
                {savingMapping ? 'Saving...' : 'Save Mappings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

