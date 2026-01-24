
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Loader2, Package, Sparkles, MessageSquare, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from '@/hooks/use-auth';
import type { SellerUser } from '@/app/seller-accounts/page';
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { getCollection, saveDocument } from '@/services/firestore';
import type { SellerProduct } from '@/app/seller/ai-product-uploader/page';

export default function SellerProductDropsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [drops, setDrops] = useState<ProductDrop[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        };

        async function loadData() {
            try {
                // Get the seller's vendor ID
                const allSellers = await getCollection<SellerUser>('seller_users');
                const currentSeller = allSellers.find(s => s.id === user?.uid);
                const sellerVendorId = currentSeller?.vendorId;

                // Load all drops
                const storedDrops = await getCollection<ProductDrop>('product_drops');
                
                // Filter drops to only show those from the seller's vendor and admin
                const relevantDrops = storedDrops.filter(drop => 
                    drop.vendorId === sellerVendorId || drop.vendorId === 'admin_snazzify'
                );
                
                setDrops(relevantDrops);

                // Automatically add new drops to seller's products
                if (user && currentSeller) {
                    const sellerProducts = await getCollection<SellerProduct>('seller_products');
                    const myProductsIds = new Set(sellerProducts.filter(p => p.sellerId === user.uid).map(p => p.id));
                    
                    for (const drop of relevantDrops) {
                        if (!myProductsIds.has(drop.id)) {
                            const newSellerProduct: SellerProduct = {
                                id: drop.id, // Use drop ID to link them
                                sellerId: user.uid,
                                sellerName: currentSeller.companyName,
                                title: drop.title,
                                description: drop.description,
                                category: drop.category || 'Uncategorized',
                                price: drop.costPrice, // Seller can adjust this later
                                sizes: [],
                                colors: [],
                                imageDataUris: drop.imageDataUris,
                                createdAt: new Date().toISOString(),
                            };
                            await saveDocument('seller_products', newSellerProduct, newSellerProduct.id);
                        }
                    }
                }

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
    
    return (
        <AppShell title="Product Drops">
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Incoming Product Drops from Your Vendor</CardTitle>
                        <CardDescription>
                            This is your feed of new products shared by your approved vendor. These are automatically added to your "My Products" page.
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
                        {drops.map(drop => (
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
                                        <p className="text-lg font-bold">Cost: ₹{drop.costPrice.toFixed(2)}</p>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex-col items-stretch space-y-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button className="w-full" variant="secondary">
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Share on WhatsApp
                                            </Button>
                                        </DialogTrigger>
                                        <ShareComposerDialog product={drop} />
                                    </Dialog>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
