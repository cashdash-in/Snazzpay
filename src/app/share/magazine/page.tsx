
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
import { Loader2, Share2, Copy } from 'lucide-react';
import { getCollection } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { Label } from '@/components/ui/label';
import type { ProductDrop } from '@/app/vendor/product-drops/page';


export default function ShareMagazinePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<Array<SellerProduct | ProductDrop>>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [magazineLink, setMagazineLink] = useState('');

    useEffect(() => {
        async function loadProducts() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            try {
                const role = getCookie('userRole');
                let productsCollection: Array<SellerProduct | ProductDrop> = [];
                
                if (role === 'seller') {
                    const sellerProducts = await getCollection<SellerProduct>('seller_products');
                    productsCollection = sellerProducts.filter(p => p.sellerId === user.uid);
                } else { // admin or vendor
                    const allDrops = await getCollection<ProductDrop>('product_drops');
                     // For admin, show all. For vendor, filter by their ID.
                    productsCollection = role === 'admin' 
                        ? allDrops
                        : allDrops.filter(p => p.vendorId === user.uid);
                }

                setProducts(productsCollection.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            } catch (error) {
                toast({ variant: 'destructive', title: "Error loading products", description: "Could not load your products catalog." });
            } finally {
                setIsLoading(false);
            }
        }
        loadProducts();
    }, [user, toast]);

    const handleProductSelect = (productId: string, checked: boolean) => {
        if (checked) {
            setSelectedProductIds(prev => [...prev, productId]);
        } else {
            setSelectedProductIds(prev => prev.filter(id => id !== productId));
        }
        // Clear the generated link when selection changes
        setMagazineLink('');
    };

    const handleGenerateLink = () => {
        if (selectedProductIds.length === 0) {
            toast({ variant: 'destructive', title: 'No Products Selected', description: 'Please select at least one product to create a magazine.' });
            return;
        }

        const baseUrl = window.location.origin;
        // CORRECT: Pass only the IDs, not the full product objects
        const productsParam = encodeURIComponent(selectedProductIds.join(','));
        const link = `${baseUrl}/smart-magazine?products=${productsParam}`;
        
        setMagazineLink(link);
        
        toast({ title: 'Magazine Link Generated!', description: 'You can now copy the link below.' });
    };

    const handleCopyLink = () => {
        if(!magazineLink) return;
        navigator.clipboard.writeText(magazineLink);
        toast({ title: 'Link Copied!' });
    };

    return (
        <AppShell title="Create Smart Magazine">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Build Your Smart Magazine</CardTitle>
                            <CardDescription>Select the products you want to feature in this collection. Your 30 most recent products are shown here.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : (
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                                    {products.slice(0, 30).map(product => (
                                        <div key={product.id} className="flex items-center gap-4 p-2 border rounded-lg">
                                            <Checkbox 
                                                id={`product-${product.id}`}
                                                onCheckedChange={(checked) => handleProductSelect(product.id, !!checked)}
                                                checked={selectedProductIds.includes(product.id)}
                                            />
                                            <label htmlFor={`product-${product.id}`} className="flex items-center gap-4 cursor-pointer w-full">
                                                <Image src={product.imageDataUris[0]} alt={product.title} width={60} height={60} className="rounded-md object-cover aspect-square" />
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
                <div className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>Generate & Share</CardTitle>
                            <CardDescription>Once you've selected your products, generate a shareable link.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="font-medium">{selectedProductIds.length} product(s) selected.</p>
                             <Button onClick={handleGenerateLink} className="w-full" disabled={selectedProductIds.length === 0}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Generate Magazine Link
                            </Button>
                            {magazineLink && (
                                <div className="space-y-2 pt-4 border-t">
                                    <Label htmlFor="magazine-link">Your Sharable Link</Label>
                                    <div className="flex gap-2">
                                        <input id="magazine-link" readOnly value={magazineLink} className="w-full text-xs p-2 border rounded-md bg-muted" />
                                        <Button size="icon" variant="outline" onClick={handleCopyLink}><Copy className="h-4 w-4"/></Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Share this link on WhatsApp, Instagram, or anywhere else!</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
