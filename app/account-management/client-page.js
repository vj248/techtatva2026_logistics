'use client';

import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
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
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  AlertCircle, Plus, Pencil, Key, Loader2, Search, Filter, ArrowUpDown, 
  Upload, FileSpreadsheet, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Eye, EyeOff
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Skeleton } from '@/components/ui/skeleton';

const SearchInput = ({ value, onChange, className }) => {
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
    <div className="relative flex-1">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search by name or email..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className={className}
      />
    </div>
  );
};

export default function AccountManagementClient() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });

  // Deferred search for optimization
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Bulk Upload State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Confirmation Dialog State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type: 'add'|'edit'|'reset'|'toggle', data: ... }

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'OC',
    status: 'active',
    password: '',
    confirmPassword: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cc/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter and Sort Logic
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search
    if (deferredSearchQuery) {
      const lowerQuery = deferredSearchQuery.toLowerCase();
      result = result.filter(user => 
        (user.name && user.name.toLowerCase().includes(lowerQuery)) ||
        (user.email && user.email.toLowerCase().includes(lowerQuery))
      );
    }

    // Role Filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(user => user.status === statusFilter);
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [users, deferredSearchQuery, roleFilter, statusFilter, sortConfig]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'OC',
      status: 'active',
      password: '',
      confirmPassword: ''
    });
    setFormError('');
    setSelectedUser(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEditDialog = (user) => {
    resetForm();
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email,
      role: user.role,
      status: user.status,
      password: '',
      confirmPassword: ''
    });
    setIsEditOpen(true);
  };

  const openPasswordDialog = (user) => {
    resetForm();
    setSelectedUser(user);
    setIsPasswordOpen(true);
  };

  // Bulk Upload Handlers
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
        
        // Normalize keys to lowercase and trim whitespace
        const normalizedData = data.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.toString().trim().toLowerCase();
            let value = row[key];
            if (typeof value === 'string') {
              value = value.trim();
            }
            newRow[normalizedKey] = value;
          });
          return newRow;
        });

        setBulkPreview(normalizedData);
      } catch (err) {
        console.error("Error parsing file:", err);
        setFormError("Failed to parse file. Please ensure it is a valid Excel or CSV file.");
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
      const res = await fetch('/api/cc/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: bulkPreview }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setBulkResult(data);
        fetchUsers(); // Refresh list
      } else {
        setFormError(data.error || 'Bulk upload failed');
      }
    } catch (err) {
      setFormError('An error occurred during upload');
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

  // Initiate Actions (Open Confirmation)
  const initiateAddUser = (e) => {
    e.preventDefault();
    setPendingAction({ type: 'add' });
    setIsConfirmOpen(true);
  };

  const initiateEditUser = (e) => {
    e.preventDefault();
    setPendingAction({ type: 'edit' });
    setIsConfirmOpen(true);
  };

  const initiateResetPassword = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    setPendingAction({ type: 'reset' });
    setIsConfirmOpen(true);
  };

  const initiateToggleStatus = (user) => {
    // Don't toggle immediately, wait for confirmation
    setPendingAction({ type: 'toggle', data: user });
    setIsConfirmOpen(true);
  };

  // Execute Actions (After Confirmation)
  const executeAction = async () => {
    setIsConfirmOpen(false);
    setFormLoading(true);
    setFormError('');

    try {
      if (pendingAction.type === 'add') {
        const res = await fetch('/api/cc/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: formData.role,
            password: formData.password
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create user');
        setUsers(prev => [...prev, data]);
        setIsAddOpen(false);
      } 
      else if (pendingAction.type === 'edit') {
        const res = await fetch(`/api/cc/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: formData.role,
            status: formData.status
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user');
        setUsers(prev => prev.map(u => u.id === data.id ? data : u));
        setIsEditOpen(false);
      }
      else if (pendingAction.type === 'reset') {
        const res = await fetch(`/api/cc/users/${selectedUser.id}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: formData.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password');
        setIsPasswordOpen(false);
      }
      else if (pendingAction.type === 'toggle') {
        const user = pendingAction.data;
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));

        const res = await fetch(`/api/cc/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: user.name,
            email: user.email,
            role: user.role,
            status: newStatus
          }),
        });

        if (!res.ok) {
          // Revert on failure
          setUsers(prev => prev.map(u => u.id === user.id ? user : u));
          const data = await res.json();
          throw new Error(data.error || 'Failed to update status');
        }
      }
    } catch (err) {
      setFormError(err.message);
      // If it was a toggle action, show alert since there's no form to show error on
      if (pendingAction.type === 'toggle') {
        alert(err.message);
      }
    } finally {
      setFormLoading(false);
      setPendingAction(null);
    }
  };

  const getConfirmationMessage = () => {
    if (!pendingAction) return '';
    switch (pendingAction.type) {
      case 'add': return `Are you sure you want to create a new user with email ${formData.email}?`;
      case 'edit': return `Are you sure you want to update the details for ${selectedUser?.name}?`;
      case 'reset': return `Are you sure you want to reset the password for ${selectedUser?.name}?`;
      case 'toggle': return `Are you sure you want to change the status of ${pendingAction.data?.name} to ${pendingAction.data?.status === 'active' ? 'inactive' : 'active'}?`;
      default: return 'Are you sure?';
    }
  };

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and access.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            A list of all users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              className="pl-8"
            />
            <div className="flex flex-wrap gap-4">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="OC">OC</SelectItem>
                  <SelectItem value="CC">CC</SelectItem>
                  <SelectItem value="SC">SC</SelectItem>
                  <SelectItem value="Category">Category</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <div className="text-red-500 py-4">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('email')}>
                      <div className="flex items-center">
                        Email
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('role')}>
                      <div className="flex items-center">
                        Role
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                      <div className="flex items-center">
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium whitespace-nowrap">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${user.role === 'CC' ? 'bg-purple-100 text-purple-800' : 
                              user.role === 'OC' ? 'bg-blue-100 text-blue-800' : 
                              user.role === 'SC' ? 'bg-green-100 text-green-800' : 
                              'bg-gray-100 text-gray-800'}`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={user.status === 'active'} 
                              onCheckedChange={() => initiateToggleStatus(user)}
                            />
                            <span className="text-sm text-muted-foreground capitalize">{user.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => openEditDialog(user)} title="Edit User">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => openPasswordDialog(user)} title="Reset Password">
                              <Key className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!loading && !error && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
              <div className="text-sm text-muted-foreground text-center md:text-left">
                {filteredUsers.length} total users.
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
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
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  Page {currentPage} of {totalPages}
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

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={initiateAddUser}>
            <div className="grid gap-4 py-4">
              {formError && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">Password</Label>
                <div className="col-span-3 relative">
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password} 
                    onChange={handleInputChange} 
                    className="pr-10" 
                    required 
                    minLength={6} 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select value={formData.role} onValueChange={(val) => handleSelectChange('role', val)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OC">OC</SelectItem>
                    <SelectItem value="CC">CC</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="Category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={formLoading}>
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user profile here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={initiateEditUser}>
            <div className="grid gap-4 py-4">
              {formError && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Name</Label>
                <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">Email</Label>
                <Input id="edit-email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">Role</Label>
                <Select value={formData.role} onValueChange={(val) => handleSelectChange('role', val)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OC">OC</SelectItem>
                    <SelectItem value="CC">CC</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="Category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">Status</Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch 
                    id="edit-status"
                    checked={formData.status === 'active'} 
                    onCheckedChange={handleSwitchChange}
                  />
                  <span className="text-sm text-muted-foreground capitalize">{formData.status}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={formLoading}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={initiateResetPassword}>
            <div className="grid gap-4 py-4">
              {formError && (
                <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-password" className="text-right">New Password</Label>
                <div className="col-span-3 relative">
                  <Input 
                    id="new-password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password} 
                    onChange={handleInputChange} 
                    className="pr-10" 
                    required 
                    minLength={6} 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirm-password" className="text-right">Confirm Password</Label>
                <div className="col-span-3 relative">
                  <Input 
                    id="confirm-password" 
                    name="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={formData.confirmPassword} 
                    onChange={handleInputChange} 
                    className="pr-10" 
                    required 
                    minLength={6} 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={formLoading}>
                Reset Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={closeBulkDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk User Upload</DialogTitle>
            <DialogDescription>
              Upload an Excel or CSV file to create multiple users at once.
              <br />
              Required columns: <strong>Email, Role</strong>.
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
                    <p className="text-sm font-medium mb-2">Preview ({bulkPreview.length} users found):</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkPreview.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.name || <span className="text-muted-foreground italic">User</span>}</TableCell>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>{row.role}</TableCell>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-md text-center">
                    <div className="text-2xl font-bold text-green-600">{bulkResult.success}</div>
                    <div className="text-sm text-green-800">Created Successfully</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-md text-center">
                    <div className="text-2xl font-bold text-red-600">{bulkResult.failed}</div>
                    <div className="text-sm text-red-800">Failed</div>
                  </div>
                </div>
                {bulkResult.errors.length > 0 && (
                  <div className="border rounded-md p-4 max-h-[200px] overflow-y-auto bg-red-50/50">
                    <p className="text-sm font-medium mb-2 text-red-800">Errors:</p>
                    <ul className="space-y-1 text-sm text-red-700">
                      {bulkResult.errors.map((err, i) => (
                        <li key={i}>
                          <span className="font-medium">{err.email}:</span> {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {!bulkResult ? (
              <Button onClick={handleBulkUpload} disabled={!bulkPreview.length || bulkLoading}>
                {bulkLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload {bulkPreview.length > 0 ? `${bulkPreview.length} Users` : ''}
              </Button>
            ) : (
              <Button onClick={closeBulkDialog}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} disabled={formLoading}>
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
