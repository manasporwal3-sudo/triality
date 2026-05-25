
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Search, Database, Loader2, Sparkles, Flame, AlertCircle, Edit, Store, Check, ChevronDown, Filter, X } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, deleteDoc, addDoc, updateDoc, writeBatch, serverTimestamp, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export const MENU_CATEGORIES = [
  'PIZZAS',
  'BURGERS',
  'NORTH_INDIAN',
  'SOUTH_INDIAN',
  'STREET_FOOD',
  'DESSERTS',
  'BEVERAGES'
];

/**
 * PartnerSelector Component
 * Optimized for stability inside Dialogs. Uses a simple state-driven dropdown
 * to avoid portal-related focus traps.
 */
const PartnerSelector = ({ 
  partners, 
  selectedId, 
  onSelect 
}: { 
  partners: any[] | null, 
  selectedId: string | null, 
  onSelect: (id: string | null) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const selectedPartner = partners?.find(p => p.id === selectedId);

  const filtered = useMemo(() => {
    if (!partners) return [];
    return partners.filter(p => 
      p.restaurantName?.toLowerCase().includes(search.toLowerCase()) ||
      p.city?.toLowerCase().includes(search.toLowerCase())
    );
  }, [partners, search]);

  return (
    <div className="space-y-2 relative">
      <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Fulfillment Assignment</Label>
      
      <Button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        variant="outline" 
        className={cn(
          "w-full h-14 justify-between rounded-2xl px-6 font-bold border-muted-foreground/20 bg-white hover:bg-white text-foreground shadow-sm transition-all",
          isOpen && "ring-2 ring-primary/20 border-primary/40"
        )}
      >
        <span className="truncate flex items-center gap-2">
          {selectedPartner ? <Store className="w-4 h-4 text-primary" /> : null}
          {selectedPartner ? selectedPartner.restaurantName : "Select Fulfilling Partner..."}
        </span>
        <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform opacity-50", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full z-50 bg-white border rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Find partner..."
                className="pl-9 h-10 rounded-xl bg-white border-none shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <ScrollArea className="h-[250px]">
            <div className="p-2 space-y-1">
              {filtered.map((p) => {
                const isSelected = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect(isSelected ? null : p.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all border-2 text-left group",
                      isSelected
                        ? "bg-primary/5 border-primary/30 shadow-inner"
                        : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                      isSelected 
                        ? "bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20" 
                        : "border-primary/20 bg-white"
                    )}>
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[4px]" />}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "font-black text-sm truncate leading-none mb-1",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {p.restaurantName}
                      </span>
                      <div className="flex items-center gap-1 opacity-40">
                        <Store className="w-3 h-3" />
                        <span className="text-[10px] uppercase font-black tracking-widest truncate">
                          {p.city}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-12 text-center flex flex-col items-center gap-3 opacity-30">
                  <AlertCircle className="w-8 h-8" />
                  <p className="font-bold text-xs italic">No matching partners.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default function AdminDatabasePage() {
  const db = useFirestore();
  const [search, setSearch] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('All');
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<any>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const dishesQuery = useMemoFirebase(() => {
    return query(collection(db, 'dishes'), orderBy('name', 'asc'));
  }, [db]);
  
  const { data: dishes, isLoading } = useCollection(dishesQuery);

  const partnersQuery = useMemoFirebase(() => {
    return query(collection(db, 'partners'), orderBy('restaurantName', 'asc'));
  }, [db]);
  const { data: partners } = useCollection(partnersQuery);

  const filteredDishes = useMemo(() => {
    if (!dishes) return [];
    return dishes.filter(d => {
      const matchesSearch = d.name?.toLowerCase().includes(search.toLowerCase());
      const matchesPartner = partnerFilter === 'All' || d.partnerIds?.includes(partnerFilter);
      return matchesSearch && matchesPartner;
    });
  }, [dishes, search, partnerFilter]);

  // Sync state when editing
  useEffect(() => {
    if (editingDish && isEditOpen) {
      setSelectedPartnerId(editingDish.partnerIds?.[0] || null);
    } else if (!isEditOpen && !isAddDishOpen) {
      setSelectedPartnerId(null);
    }
  }, [editingDish, isEditOpen, isAddDishOpen]);

  const handleDelete = (id: string, name: string) => {
    if (!id) return;
    const confirmDelete = confirm(`Are you sure you want to permanently remove "${name}"?`);
    if (!confirmDelete) return;

    setIsDeleting(id);
    const docRef = doc(db, 'dishes', id);
    
    deleteDoc(docRef)
      .then(() => {
        toast.success(`${name} removed successfully`);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsDeleting(null);
      });
  };

  const handleAddDish = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    // Resolve partner name from ID
    const partner = partners?.find(p => p.id === selectedPartnerId);
    const partnerIds = selectedPartnerId ? [selectedPartnerId] : [];
    const partnerNames = partner ? [partner.restaurantName] : [];

    const newDish = {
      name: formData.get('name') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as string,
      description: formData.get('description') as string,
      image: formData.get('image') as string || `https://picsum.photos/seed/${Date.now()}/800/600`,
      rating: 4.5,
      isVeg: formData.get('isVeg') === 'on',
      createdAt: serverTimestamp(),
      totalOrders: 0,
      totalRevenue: 0,
      partnerIds,
      partnerNames
    };

    const dishesRef = collection(db, 'dishes');
    addDoc(dishesRef, newDish)
      .then(() => {
        toast.success(`${newDish.name} added to catalog`);
        setIsAddDishOpen(false);
        setSelectedPartnerId(null);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'dishes',
          operation: 'create',
          requestResourceData: newDish,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleUpdateDish = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDish) return;
    
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);

    const partner = partners?.find(p => p.id === selectedPartnerId);
    const partnerIds = selectedPartnerId ? [selectedPartnerId] : [];
    const partnerNames = partner ? [partner.restaurantName] : [];

    const updatedData = {
      name: formData.get('name') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as string,
      description: formData.get('description') as string,
      image: formData.get('image') as string,
      isVeg: formData.get('isVeg') === 'on',
      partnerIds,
      partnerNames,
      updatedAt: serverTimestamp()
    };

    const docRef = doc(db, 'dishes', editingDish.id);
    updateDoc(docRef, updatedData)
      .then(() => {
        toast.success("Dish records updated");
        setIsEditOpen(false);
        setEditingDish(null);
        setSelectedPartnerId(null);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleMegaSeed = async () => {
    if (!partners || partners.length === 0) {
      toast.error("Please onboard at least one Partner location first.");
      return;
    }
    
    setIsSeeding(true);
    const seedToast = toast.loading("Seeding mega repository...");
    
    try {
      const templates = [
        { category: 'PIZZAS', items: ['Margherita', 'Paneer Tikka', 'Double Cheese', 'Spicy Veggie'] },
        { category: 'BURGERS', items: ['Maharaja', 'Aloo Tikki', 'Crispy Paneer', 'Veggie Supreme'] },
        { category: 'NORTH_INDIAN', items: ['Dal Makhani', 'Paneer Butter Masala', 'Shahi Paneer', 'Mix Veg'] }
      ];

      const batch = writeBatch(db);
      templates.forEach(tpl => {
        tpl.items.forEach((itemName, i) => {
          const dishDocRef = doc(collection(db, 'dishes'));
          const randomPartner = partners[Math.floor(Math.random() * partners.length)];
          
          batch.set(dishDocRef, {
            name: `${itemName} #${Math.floor(Math.random() * 1000)}`,
            category: tpl.category,
            price: Math.floor(Math.random() * 400 + 100),
            image: `https://picsum.photos/seed/${tpl.category.toLowerCase()}${i}/800/600`,
            description: `Authentic ${itemName} curated for premium taste.`,
            isVeg: true,
            rating: 4.5,
            totalOrders: Math.floor(Math.random() * 50),
            totalRevenue: 0,
            partnerIds: [randomPartner.id],
            partnerNames: [randomPartner.restaurantName],
            createdAt: serverTimestamp()
          });
        });
      });
      
      await batch.commit();
      toast.success(`Successfully seeded dishes across ${partners.length} partners.`, { id: seedToast });
    } catch (e: any) {
      console.error("Seeding error:", e);
      toast.error("Seeding failed.", { id: seedToast });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-headline font-black mb-2 flex items-center gap-3 text-foreground">
            <Database className="w-10 h-10 text-primary" />
            Mega Repository
          </h1>
          <p className="text-muted-foreground font-medium">Standardized menu catalog ({filteredDishes.length} items).</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <Button 
            variant="default" 
            onClick={handleMegaSeed} 
            disabled={isSeeding}
            className="rounded-xl bg-accent hover:bg-accent/90 text-white font-black h-11 px-6 shadow-lg shadow-accent/20 transition-all group overflow-hidden relative active:scale-95"
          >
            {isSeeding ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2 group-hover:animate-bounce" />
            )}
            <span className="relative z-10">{isSeeding ? "SYNCING..." : "SYNC ALL"}</span>
          </Button>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search dish..." 
                className="pl-10 h-11 bg-white rounded-xl border shadow-sm transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-11 rounded-xl font-bold gap-2 px-4 shadow-sm border-none bg-white ring-1 ring-primary/10">
                  <Filter className="w-4 h-4 text-primary" />
                  {partnerFilter === 'All' ? 'All Partners' : partners?.find(p => p.id === partnerFilter)?.restaurantName}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[300px] rounded-[2rem]">
                <DialogHeader>
                  <DialogTitle>Filter by Partner</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-1">
                    <Button 
                      variant="ghost" 
                      className={cn("w-full justify-start rounded-xl", partnerFilter === 'All' && "bg-primary/10 text-primary font-black")}
                      onClick={() => setPartnerFilter('All')}
                    >
                      All Partners
                    </Button>
                    {partners?.map(p => (
                      <Button 
                        key={p.id}
                        variant="ghost" 
                        className={cn("w-full justify-start rounded-xl text-left truncate", partnerFilter === p.id && "bg-primary/10 text-primary font-black")}
                        onClick={() => setPartnerFilter(p.id)}
                      >
                        {p.restaurantName}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Card className="border shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
        <div className="p-8 border-b flex justify-between items-center bg-muted/20">
          <h3 className="font-black text-xl text-foreground flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            Repository Stream
          </h3>
          <Dialog open={isAddDishOpen} onOpenChange={setIsAddDishOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl bg-primary hover:bg-primary/90 font-black h-12 px-8 transition-transform active:scale-95 shadow-xl shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" /> Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[550px] rounded-[2.5rem] p-10 max-h-[90vh] overflow-y-auto"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle className="font-headline font-black text-3xl text-primary">New Catalog Item</DialogTitle>
                <DialogDescription>
                  Add a new dish to the centralized menu catalog and assign it to a fulfilling partner.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddDish} className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Dish Identity</Label>
                  <Input id="name" name="name" required placeholder="e.g. Paneer Tikka" className="rounded-2xl h-14 bg-muted/30 border-none shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Market Price (₹)</Label>
                    <Input id="price" name="price" type="number" required placeholder="320" className="rounded-2xl h-14 bg-muted/30 border-none shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Food Category</Label>
                    <select name="category" className="w-full h-14 px-4 border-none rounded-2xl bg-muted/30 text-sm focus:ring-2 focus:ring-primary/20 font-bold" required>
                      {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                </div>
                
                <PartnerSelector 
                  partners={partners || []}
                  selectedId={selectedPartnerId} 
                  onSelect={setSelectedPartnerId} 
                />

                <div className="space-y-2">
                  <Label htmlFor="description" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Palate Description</Label>
                  <Textarea id="description" name="description" placeholder="Describe the flavors..." className="rounded-2xl min-h-[100px] bg-muted/30 border-none p-4" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Visual Asset URL</Label>
                  <Input id="image" name="image" placeholder="https://..." className="rounded-2xl h-14 bg-muted/30 border-none" />
                </div>
                <div className="flex items-center gap-4 bg-green-50/50 p-5 rounded-[2rem] border border-green-100">
                  <input type="checkbox" id="isVeg" name="isVeg" defaultChecked className="w-6 h-6 rounded-lg border-green-600 text-green-600 accent-green-600 cursor-pointer" />
                  <div className="flex flex-col">
                    <Label htmlFor="isVeg" className="font-black text-green-700 cursor-pointer">Vegetarian Item</Label>
                    <p className="text-[10px] text-green-600/70 font-bold uppercase tracking-widest">Mark as meat-free selection</p>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isSaving} className="w-full rounded-[2rem] font-black bg-primary h-16 shadow-2xl active:scale-95 text-xl transition-all">
                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : "Publish to Catalog"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-none">
                <TableHead className="font-black px-8 h-20 uppercase tracking-widest text-[10px]">Dish Info</TableHead>
                <TableHead className="font-black h-20 uppercase tracking-widest text-[10px]">Type / Category</TableHead>
                <TableHead className="font-black h-20 uppercase tracking-widest text-[10px]">Linked Partner</TableHead>
                <TableHead className="font-black h-20 uppercase tracking-widest text-[10px]">Price</TableHead>
                <TableHead className="font-black h-20 uppercase tracking-widest text-[10px] text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredDishes.map((dish) => (
                <TableRow key={dish.id} className="hover:bg-muted/5 transition-colors group border-b last:border-none">
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border bg-muted shrink-0 shadow-sm transition-transform group-hover:scale-110">
                        <img src={dish.image} alt={dish.name} className="object-cover w-full h-full" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-lg text-foreground leading-tight">{dish.name}</span>
                        <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[200px]">{dish.description?.slice(0, 40)}...</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <Badge className={cn("w-fit rounded-full px-3 py-0.5 text-[8px] border-none font-black uppercase", dish.isVeg ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {dish.isVeg ? 'Veg' : 'Non-Veg'}
                      </Badge>
                      <Badge variant="outline" className="w-fit rounded-full text-[9px] uppercase font-black text-muted-foreground border-muted-foreground/20">
                        {dish.category?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[250px]">
                      {(dish.partnerNames || []).map((name: string, i: number) => (
                        <Badge key={i} variant="secondary" className="rounded-full text-[8px] font-bold h-5 bg-primary/5 text-primary border-none">
                          {name}
                        </Badge>
                      ))}
                      {!dish.partnerNames?.length && (
                        <span className="text-[10px] font-bold text-destructive italic flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Unassigned
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-black text-primary text-xl">₹{dish.price}</TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl text-muted-foreground hover:text-primary transition-all active:scale-90" 
                        onClick={() => {
                          setEditingDish(dish);
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl text-muted-foreground hover:text-destructive transition-all active:scale-90" 
                        onClick={() => handleDelete(dish.id, dish.name)}
                        disabled={isDeleting === dish.id}
                      >
                        {isDeleting === dish.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent
          className="sm:max-w-[550px] rounded-[2.5rem] p-10 max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-headline font-black text-3xl text-primary">Update Catalog Info</DialogTitle>
            <DialogDescription>
              Modify the details of an existing menu item.
            </DialogDescription>
          </DialogHeader>
          {editingDish && (
            <form onSubmit={handleUpdateDish} className="space-y-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Dish Identity</Label>
                <Input id="edit-name" name="name" defaultValue={editingDish.name} required className="rounded-2xl h-14 bg-muted/30 border-none shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Market Price (₹)</Label>
                  <Input id="edit-price" name="price" type="number" defaultValue={editingDish.price} required className="rounded-2xl h-14 bg-muted/30 border-none shadow-inner" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Food Category</Label>
                  <select name="category" defaultValue={editingDish.category} className="w-full h-14 px-4 border-none rounded-2xl bg-muted/30 text-sm focus:ring-2 focus:ring-primary/20 font-bold" required>
                    {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <PartnerSelector 
                partners={partners || []}
                selectedId={selectedPartnerId} 
                onSelect={setSelectedPartnerId} 
              />

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Palate Description</Label>
                <Textarea id="edit-description" name="description" defaultValue={editingDish.description} className="rounded-2xl min-h-[100px] bg-muted/30 border-none p-4" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-image" className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Visual Asset URL</Label>
                <Input id="edit-image" name="image" defaultValue={editingDish.image} placeholder="https://..." className="rounded-2xl h-14 bg-muted/30 border-none" />
              </div>
              <div className="flex items-center gap-4 bg-green-50/50 p-5 rounded-[2rem] border border-green-100">
                <input type="checkbox" id="edit-isVeg" name="isVeg" defaultChecked={editingDish.isVeg} className="w-6 h-6 rounded-lg border-green-600 text-green-600 accent-green-600 cursor-pointer" />
                <div className="flex flex-col">
                  <Label htmlFor="edit-isVeg" className="font-black text-green-700 cursor-pointer">Vegetarian Item</Label>
                  <p className="text-[10px] text-green-600/70 font-bold uppercase tracking-widest">Mark as meat-free selection</p>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isSaving} className="w-full rounded-[2rem] font-black bg-primary h-16 shadow-2xl active:scale-95 text-xl transition-all">
                  {isSaving ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : "Update Records"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
