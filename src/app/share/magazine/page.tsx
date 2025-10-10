'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { SellerProduct } from '@/app/seller/ai-product-uploader/page';
import Image from 'next/image';
import { Loader2, Share2, Copy, MessageSquare, BookOpen, Percent, Factory } from 'lucide-react';
import { getCollection, saveDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { Label } from '@/components/ui/label';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from 'date-fns';


type Magazine = {
    id: string;
    title: string;
    vendorTitle?: string; // New field for admin
    productIds: string[];
    creatorId: string;
    creatorName: string;
    createdAt: string;
    discount?: number;
};

export default function ShareMagazinePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<Array<SellerProduct | ProductDrop>>([]);
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [magazineLink, setMagazineLink] = useState('');
    const [magazineTitle, setMagazineTitle] = useState('Our Latest Collection');
    const [vendorTitle, setVendorTitle] = useState('');
    const [discount, setDiscount] = useState<number>(0);
    const [isAdmin, setIsAdmin] = useState(false);


    useEffect(() => {
        const role = getCookie('userRole');
        setIsAdmin(role === 'admin');

        async function loadData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            try {
                let productsCollection: Array<SellerProduct | ProductDrop> = [];
                
                if (role === 'seller') {
                    const sellerProducts = await getCollection<SellerProduct>('seller_products');
                    productsCollection = sellerProducts.filter(p => p.sellerId === user.uid);
                } else if (role === 'vendor') {
                    const allDrops = await getCollection<ProductDrop>('product_drops');
                    productsCollection = allDrops.filter(p => p.vendorId === user.uid);
                } else { // admin
                    const allDrops = await getCollection<ProductDrop>('product_drops');
                    productsCollection = allDrops;
                }

                setProducts(productsCollection.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

                const allMagazines = await getCollection<Magazine>('smart_magazines');
                setMagazines(allMagazines.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

            } catch (error) {
                toast({ variant: 'destructive', title: "Error loading data", description: "Could not load your products or existing magazines." });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, toast]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProductIds(products.map(p => p.id));
        } else {
            setSelectedProductIds([]);
        }
         setMagazineLink('');
    };

    const handleProductSelect = (productId: string, checked: boolean) => {
        if (checked) {
            setSelectedProductIds(prev => [...prev, productId]);
        } else {
            setSelectedProductIds(prev => prev.filter(id => id !== productId));
        }
        setMagazineLink('');
    };

    const handleGenerateLink = async () => {
        if (selectedProductIds.length === 0) {
            toast({ variant: 'destructive', title: 'No Products Selected', description: 'Please select at least one product to create a magazine.' });
            return;
        }
        if (!user) {
            toast({ variant: 'destructive', title: 'Authentication Error' });
            return;
        }

        const role = getCookie('userRole');
        const creatorName = role === 'admin' ? 'SnazzifyOfficial' : user.displayName || 'Unknown Creator';

        const magazineId = uuidv4();
        const newMagazine: Magazine = {
            id: magazineId,
            title: magazineTitle,
            vendorTitle: isAdmin && vendorTitle ? vendorTitle : undefined,
            productIds: selectedProductIds,
            creatorId: user.uid,
            creatorName: creatorName,
            createdAt: new Date().toISOString(),
            discount: discount > 0 ? discount : undefined,
        };

        try {
            await saveDocument('smart_magazines', newMagazine, magazineId);
            setMagazines(prev => [newMagazine, ...prev]); // Add to the list
            
            const baseUrl = window.location.origin;
            let link = `${baseUrl}/smart-magazine?id=${magazineId}`;
            if (discount > 0) {
                link += `&discount=${discount}`;
            }
            setMagazineLink(link);
            
            toast({ title: 'Magazine Created & Link Generated!', description: 'Your new magazine is saved and can be shared.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Failed to Save Magazine' });
        }
    };
    
    const getShareLink = (mag: Magazine) => {
        const baseUrl = window.location.origin;
        let link = `${baseUrl}/smart-magazine?id=${mag.id}`;
        if (mag.discount) {
            link += `&discount=${mag.discount}`;
        }
        return link;
    };

    const handleCopyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast({ title: 'Link Copied!' });
    };

    const handleShareOnWhatsApp = (title: string, link: string) => {
        const message = `Check out our new collection: *${title}*\n${link}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <AppShell title="Smart Magazine Hub">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Build Your Smart Magazine</CardTitle>
                            <CardDescription>Select the products you want to feature in this collection.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : (
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                                     <div className="flex items-center space-x-2 p-2 border-b">
                                        <Checkbox
                                            id="select-all"
                                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                            checked={selectedProductIds.length === products.length && products.length > 0}
                                            aria-label="Select all"
                                        />
                                        <Label htmlFor="select-all" className="font-semibold">Select All Products</Label>
                                    </div>
                                    {products.map(product => (
                                        <div key={product.id} className="flex items-center gap-4 p-2 border rounded-lg">
                                            <Checkbox 
                                                id={`product-${product.id}`}
                                                onCheckedChange={(checked) => handleProductSelect(product.id, !!checked)}
                                                checked={selectedProductIds.includes(product.id)}
                                            />
                                            <label htmlFor={`product-${product.id}`} className="flex items-center gap-4 cursor-pointer w-full">
                                                <Image src={product.imageDataUris[0]} alt={product.title} width={60} height={60} className="rounded-md object-contain aspect-square bg-muted" />
                                                <div className="flex-grow">
                                                    <p className="font-semibold">{product.title}</p>
                                                    <p className="text-sm text-muted-foreground">Price: ₹{((product as SellerProduct).price || (product as ProductDrop).costPrice).toFixed(2)}</p>
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>Generate & Share</CardTitle>
                            <CardDescription>Give your collection a title and an optional discount, then generate a shareable link.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="magazine-title">Magazine Title</Label>
                                <Input 
                                    id="magazine-title" 
                                    value={magazineTitle} 
                                    onChange={(e) => setMagazineTitle(e.target.value)}
                                    placeholder="e.g., Summer Collection"
                                />
                            </div>
                            {isAdmin && (
                                <div className="space-y-2">
                                    <Label htmlFor="vendor-title">Vendor Title (Admin Only)</Label>
                                     <div className="relative">
                                        <Input
                                            id="vendor-title"
                                            value={vendorTitle}
                                            onChange={(e) => setVendorTitle(e.target.value)}
                                            placeholder="e.g., Curated by Snazzify"
                                            className="pl-8"
                                        />
                                        <Factory className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="discount">Discount % (Optional)</Label>
                                <div className="relative">
                                    <Input
                                        id="discount"
                                        type="number"
                                        value={discount || ''}
                                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                        placeholder="e.g., 10 for 10%"
                                        className="pl-8"
                                    />
                                    <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                            <p className="font-medium">{selectedProductIds.length} product(s) selected.</p>
                             <Button onClick={handleGenerateLink} className="w-full" disabled={selectedProductIds.length === 0}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Save Magazine & Generate Link
                            </Button>
                            {magazineLink && (
                                <div className="space-y-2 pt-4 border-t">
                                    <Label htmlFor="magazine-link">Your Sharable Link</Label>
                                    <div className="flex gap-2">
                                        <Input id="magazine-link" readOnly value={magazineLink} className="w-full text-xs p-2 border rounded-md bg-muted" />
                                        <Button size="icon" variant="outline" onClick={() => handleCopyLink(magazineLink)}><Copy className="h-4 w-4"/></Button>
                                    </div>
                                    <Button onClick={() => handleShareOnWhatsApp(magazineTitle, magazineLink)} className="w-full" variant="secondary">
                                        <MessageSquare className="mr-2 h-4 w-4"/>
                                        Share on WhatsApp
                                    </Button>
                                    <p className="text-xs text-muted-foreground">Share this link on WhatsApp, Instagram, or anywhere else!</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Existing Magazines</CardTitle>
                            <CardDescription>View and re-share previously created magazines.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[50vh] overflow-y-auto space-y-3">
                             {magazines.length > 0 ? magazines.map(mag => {
                                const link = getShareLink(mag);
                                return (
                                    <div key={mag.id} className="p-3 border rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary"/>{mag.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    by {mag.creatorName} &bull; {formatDistanceToNow(new Date(mag.createdAt), { addSuffix: true })}
                                                    {mag.discount && <span className="ml-2 font-bold text-destructive">({mag.discount}% off)</span>}
                                                </p>
                                            </div>
                                            <a href={link} target="_blank" className="text-xs text-primary hover:underline">View</a>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-2">
                                            <Button size="sm" variant="outline" onClick={() => handleCopyLink(link)}><Copy className="mr-2 h-3 w-3"/>Copy</Button>
                                            <Button size="sm" variant="outline" onClick={() => handleShareOnWhatsApp(mag.title, link)}><MessageSquare className="mr-2 h-3 w-3"/>Share</Button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No magazines created yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
