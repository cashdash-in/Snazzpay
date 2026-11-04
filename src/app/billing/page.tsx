
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/tabs/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Sparkles, Save, Tag, Percent, Search, Download } from "lucide-react";
import { getCollection, saveDocument, getDocument, deleteDocument } from "@/services/firestore";
import type { SellerUser } from "@/app/seller-accounts/page";
import type { Vendor } from "@/app/vendors/page";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CollaboratorBillingPage } from "@/components/collaborator-billing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type ShopifyCollection = { id: number; title: string };
type ShopifyProduct = { id: number; title: string; vendor: string; product_type: string; };

type UsageStat = {
    id: string;
    name: string;
    totalValue: number;
    commission: number;
    aiUploads?: number;
    aiUploadLimit?: number;
    productDrops?: number;
    productDropLimit?: number;
};

type LimitIncreaseRequest = {
    id: string;
    userId: string;
    userName: string;
    featureType: 'ai' | 'drops';
    increaseAmount: number;
    cost: number;
    paymentId: string;
    status: 'Pending Approval' | 'Approved';
    requestDate: string;
};

type DiscountRule = {
    id: string;
    type: 'collection' | 'vendor' | 'product';
    name: string;
    discount: number;
};

function DiscountManager() {
    const { toast } = useToast();
    const [collections, setCollections] = useState<ShopifyCollection[]>([]);
    const [vendors, setVendors] = useState<string[]>([]);
    const [products, setProducts] = useState<ShopifyProduct[]>([]);
    const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedCollection, setSelectedCollection] = useState('');
    const [collectionDiscount, setCollectionDiscount] = useState(0);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [vendorDiscount, setVendorDiscount] = useState(0);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [productDiscount, setProductDiscount] = useState(0);
    
    const [searchTerms, setSearchTerms] = useState({ collection: '', vendor: '', product: '' });
    const [activeTab, setActiveTab] = useState('collection');

    const loadDiscountData = useCallback(async () => {
        setLoading(true);
        try {
            const [collectionsRes, vendorsRes, productsRes, savedDiscounts] = await Promise.all([
                fetch('/api/shopify/collections'),
                fetch('/api/shopify/vendors'),
                fetch('/api/shopify/products'),
                getCollection<DiscountRule>('discounts'),
            ]);

            const shopifyCollections = collectionsRes.ok ? await collectionsRes.json() : [];
            const shopifyVendors = vendorsRes.ok ? await vendorsRes.json() : [];
            const shopifyProducts = productsRes.ok ? await productsRes.json() : [];

            setCollections(shopifyCollections);
            setVendors(shopifyVendors);
            setProducts(shopifyProducts);
            setDiscounts(savedDiscounts);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to load Shopify data" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadDiscountData();
    }, [loadDiscountData]);

    const handleSaveDiscount = async (type: 'collection' | 'vendor' | 'product') => {
        let id: string, name: string, discount: number;

        if (type === 'collection') {
            if (!selectedCollection || collectionDiscount <= 0) {
                toast({ variant: 'destructive', title: 'Invalid Input' });
                return;
            }
            const collection = collections.find(c => c.id.toString() === selectedCollection);
            if (!collection) return;
            id = `collection_${collection.id}`;
            name = collection.title;
            discount = collectionDiscount;
        } else if (type === 'vendor') {
            if (!selectedVendor || vendorDiscount <= 0) {
                 toast({ variant: 'destructive', title: 'Invalid Input' });
                return;
            }
            id = `vendor_${selectedVendor}`;
            name = selectedVendor;
            discount = vendorDiscount;
        } else { // product
            if (!selectedProduct || productDiscount <= 0) {
                 toast({ variant: 'destructive', title: 'Invalid Input' });
                return;
            }
             const product = products.find(p => p.id.toString() === selectedProduct);
            if (!product) return;
            id = `product_${product.id}`;
            name = product.title;
            discount = productDiscount;
        }

        const newRule: DiscountRule = { id, type, name, discount };
        await saveDocument('discounts', newRule, id);
        setDiscounts(prev => [...prev.filter(d => d.id !== id), newRule]);
        toast({ title: 'Discount Saved!' });
    };

    const handleDeleteDiscount = async (id: string) => {
        await deleteDocument('discounts', id);
        setDiscounts(prev => prev.filter(d => d.id !== id));
        toast({ variant: 'destructive', title: 'Discount Deleted' });
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Discount Management</CardTitle>
                <CardDescription>Set discounts for Secure COD orders.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="collection" className="text-[9px] font-black uppercase tracking-tighter">Collection</TabsTrigger>
                        <TabsTrigger value="vendor" className="text-[9px] font-black uppercase tracking-tighter">Vendor</TabsTrigger>
                        <TabsTrigger value="product" className="text-[9px] font-black uppercase tracking-tighter">Product</TabsTrigger>
                    </TabsList>
                    <TabsContent value="collection" className="mt-4 space-y-4">
                        <div className="flex gap-4 items-end">
                            <div className="flex-grow space-y-2">
                                <Label className="text-[9px] uppercase font-black">Collection</Label>
                                <Select onValueChange={setSelectedCollection} value={selectedCollection}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {collections.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={() => handleSaveDiscount('collection')} className="h-10 font-bold"><Save className="mr-2 h-4 w-4" /> Save</Button>
                        </div>
                    </TabsContent>
                </Tabs>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {discounts.map(rule => (
                        <div key={rule.id} className="p-4 border-2 rounded-2xl flex justify-between items-center bg-slate-50">
                            <div className="space-y-0.5">
                                <Badge variant="outline" className="text-[8px] font-black uppercase">{rule.type}</Badge>
                                <p className="font-bold text-xs truncate max-w-[150px]">{rule.name}</p>
                                <p className="text-lg font-black text-primary">{rule.discount}% OFF</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDiscount(rule.id)}><Percent className="h-4 w-4" /></Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function BillingPage() {
    const { toast } = useToast();
    const [sellerUsage, setSellerUsage] = useState<UsageStat[]>([]);
    const [limitRequests, setLimitRequests] = useState<LimitIncreaseRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadBillingData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sellers, orders, requests] = await Promise.all([
                getCollection<SellerUser>('seller_users'),
                getCollection<any>('orders'),
                getCollection<LimitIncreaseRequest>('limitIncreaseRequests')
            ]);
            setLimitRequests(requests);
            setSellerUsage(sellers.map(s => ({ id: s.id, name: s.companyName, totalValue: 0, commission: 0 })));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadBillingData(); }, [loadBillingData]);

    return (
        <AppShell title="Billing & Usage">
            <Tabs defaultValue="sellers">
                <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto">
                    <TabsTrigger value="discounts" className="text-[9px] font-black uppercase tracking-tighter px-1"><Tag className="mr-1 h-3 w-3" /> Rules</TabsTrigger>
                    <TabsTrigger value="sellers" className="text-[9px] font-black uppercase tracking-tighter px-1">Sellers</TabsTrigger>
                    <TabsTrigger value="vendors" className="text-[9px] font-black uppercase tracking-tighter px-1">Vendors</TabsTrigger>
                    <TabsTrigger value="collaborators" className="text-[9px] font-black uppercase tracking-tighter px-1">Partners</TabsTrigger>
                    <TabsTrigger value="requests" className="text-[9px] font-black uppercase tracking-tighter px-1">Limits</TabsTrigger>
                </TabsList>
                <TabsContent value="discounts"><DiscountManager /></TabsContent>
                <TabsContent value="sellers"><Card><CardContent className="py-20 text-center">Seller billing data will appear here.</CardContent></Card></TabsContent>
            </Tabs>
        </AppShell>
    );
}
