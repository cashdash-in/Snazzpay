
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Loader2, Package, Sparkles, MessageSquare, CheckCircle, PlusCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from '@/hooks/use-auth';
import type { SellerUser } from '@/app/seller-accounts/page';
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import type { SellerProduct } from '@/app/seller/ai-product-uploader/page';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SellerProductDropsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [drops, setDrops] = useState<ProductDrop[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const [addedProductIds, setAddedProductIds] = useState(new Set<string>());
    const [selectedDropForPricing, setSelectedDropForPricing] = useState<ProductDrop | null>(null);
    const [sellingPrice, setSellingPrice] = useState('');
    const [currentSeller, setCurrentSeller] = useState<SellerUser | null>(null);
    
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        };

        async function loadData() {
            try {
                // Get the seller's vendor ID and full details
                const sellerDoc = await getDocument<SellerUser>('seller_users', user.uid);
                setCurrentSeller(sellerDoc);
                const sellerVendorId = sellerDoc?.vendorId;

                // Load all drops
                const storedDrops = await getCollection<ProductDrop>('product_drops');
                
                // Filter drops to only show those from the seller's vendor and admin
                const relevantDrops = storedDrops.filter(drop => 
                    drop.vendorId === sellerVendorId || drop.vendorId === 'admin_snazzify'
                );
                
                setDrops(relevantDrops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

                // Get IDs of products already added by the seller
                const sellerProducts = await getCollection<SellerProduct>('seller_products');
                const myProductIds = new Set(sellerProducts.filter(p => p.sellerId === user.uid).map(p => p.id));
                setAddedProductIds(myProductIds);

            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Error loading drops',
                    description: 'Could not load product drops from Firestore.',
                });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();

    }, [toast, user]);

    const handleSaveToMyProducts = async () => {
        if (!selectedDropForPricing || !sellingPrice || !user || !currentSeller) {
            toast({ variant: 'destructive', title: 'Error', description: 'Missing information to add product.' });
            return;
        }

        const newSellerProduct: SellerProduct = {
            id: selectedDropForPricing.id, // Use drop ID to link them
            sellerId: user.uid,
            sellerName: currentSeller.companyName,
            title: selectedDropForPricing.title,
            description: selectedDropForPricing.description,
            category: selectedDropForPricing.category || 'Uncategorized',
            price: parseFloat(sellingPrice),
            sizes: selectedDropForPricing.sizes || [],
            colors: selectedDropForPricing.colors || [],
            imageDataUris: selectedDropForPricing.imageDataUris,
            createdAt: new Date().toISOString(),
        };

        try {
            await saveDocument('seller_products', newSellerProduct, newSellerProduct.id);
            setAddedProductIds(prev => new Set(prev).add(newSellerProduct.id));
            toast({ title: 'Product Added!', description: `${newSellerProduct.title} is now in your "My Products" list.` });
            setSelectedDropForPricing(null);
            setSellingPrice('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to Add Product', description: error.message });
        }
    };
    
    return (
        <AppShell title="Product Drops">
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Incoming Product Drops from Your Vendor</CardTitle>
                        <CardDescription>
                            This is your feed of new products shared by your approved vendor. Add them to your catalog to start selling.
                        </CardDescription>
                    </CardHeader>
                </Card>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : drops.length === 0 ? (
                    <Card className="text-center py-16">
                        <CardContent>
                             <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                            <h3 className="text-xl font-semibold">No Product Drops Yet</h3>
                            <p className="text-muted-foreground mt-2">When your vendor shares new products, they will appear here.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {drops.map(drop => {
                            const isAdded = addedProductIds.has(drop.id);
                            return (
                                <Card key={drop.id} className="flex flex-col">
                                    <CardHeader>
                                        <div className="flex justify-center mb-4 h-40">
                                            <Image src={drop.imageDataUris[0]} alt={drop.title} width={200} height={200} className="object-contain rounded-md"/>
                                        </div>
                                        <CardTitle>{drop.title}</CardTitle>
                                        <CardDescription>From: {drop.vendorName} &bull; {formatDistanceToNow(new Date(drop.createdAt), { addSuffix: true })}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-muted-foreground line-clamp-3">{drop.description}</p>
                                        <div className="mt-4">
                                            <p className="text-lg font-bold">Your Cost: ₹{drop.costPrice.toFixed(2)}</p>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col items-stretch space-y-2">
                                        <Dialog onOpenChange={(isOpen) => { if(!isOpen) setSelectedDropForPricing(null)}}>
                                            <DialogTrigger asChild>
                                                <Button className="w-full" disabled={isAdded} onClick={() => {
                                                    setSelectedDropForPricing(drop);
                                                    setSellingPrice((drop.costPrice * 2).toFixed(2)); // Default to 100% margin
                                                }}>
                                                    {isAdded ? <CheckCircle className="mr-2"/> : <PlusCircle className="mr-2"/>}
                                                    {isAdded ? 'Added to My Products' : 'Add & Set Price'}
                                                </Button>
                                            </DialogTrigger>
                                            {selectedDropForPricing && selectedDropForPricing.id === drop.id && (
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Set Your Selling Price</DialogTitle>
                                                        <DialogDescription>Set the price at which you want to sell "{selectedDropForPricing.title}".</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-4 space-y-4">
                                                        <div className="p-4 border rounded-lg bg-muted">
                                                            <p className="text-sm">Your Cost Price from Vendor:</p>
                                                            <p className="font-bold text-lg">₹{selectedDropForPricing.costPrice.toFixed(2)}</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="selling-price">Your Selling Price (INR)</Label>
                                                            <Input 
                                                                id="selling-price" 
                                                                type="number" 
                                                                value={sellingPrice} 
                                                                onChange={(e) => setSellingPrice(e.target.value)}
                                                                placeholder="e.g., 499"
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button onClick={handleSaveToMyProducts}>Save to My Products</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            )}
                                        </Dialog>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button className="w-full" variant="secondary">
                                                    <MessageSquare className="mr-2 h-4 w-4" />
                                                    Share
                                                </Button>
                                            </DialogTrigger>
                                            <ShareComposerDialog product={drop} />
                                        </Dialog>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
