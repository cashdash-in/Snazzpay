
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Package, MessageSquare, BookOpen, DollarSign, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import type { SellerProduct } from '@/app/seller/ai-product-uploader/page';
import type { SellerUser } from '@/app/seller-accounts/page';
import type { EditableOrder } from '@/types/order';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
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
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import { getCollection, deleteDocument } from '@/services/firestore';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';


type ProductStats = {
    sellers: SellerUser[];
    totalUnitsSold: number;
    totalRevenue: number;
};

export default function AdminProductsPage() {
    const { toast } = useToast();
    const [products, setProducts] = useState<ProductDrop[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [selectedProductForStats, setSelectedProductForStats] = useState<ProductDrop | null>(null);
    const [productStats, setProductStats] = useState<ProductStats | null>(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);

    const storageKey = 'product_drops';

    useEffect(() => {
        async function loadProducts() {
            try {
                const allDrops = await getCollection<ProductDrop>(storageKey);
                // Filter for drops created by admin
                const adminDrops = allDrops.filter(drop => drop.vendorId === 'admin_snazzify');
                
                setProducts(adminDrops.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

            } catch (error) {
                toast({ variant: 'destructive', title: "Error loading data", description: "Could not load products from Firestore." });
            } finally {
                setIsLoading(false);
            }
        }
        loadProducts();
    }, [toast]);
    
    const handleViewStats = async (product: ProductDrop) => {
        setSelectedProductForStats(product);
        setIsStatsLoading(true);

        try {
            const [allSellerProducts, allSellers, allOrders] = await Promise.all([
                getCollection<SellerProduct>('seller_products'),
                getCollection<SellerUser>('seller_users'),
                getCollection<EditableOrder>('orders'),
            ]);

            // Find sellers who have added this product
            const sellerProductEntries = allSellerProducts.filter(sp => sp.id === product.id);
            const sellerIds = new Set(sellerProductEntries.map(sp => sp.sellerId));
            const sellersWhoAdded = allSellers.filter(s => sellerIds.has(s.id));

            // Calculate sales stats
            const productOrders = allOrders.filter(o => 
                o.productId === product.id && 
                o.paymentStatus === 'Paid'
            );
            
            const totalUnitsSold = productOrders.reduce((sum, o) => sum + o.quantity, 0);
            const totalRevenue = productOrders.reduce((sum, o) => sum + parseFloat(o.price), 0);

            setProductStats({
                sellers: sellersWhoAdded,
                totalUnitsSold,
                totalRevenue
            });

        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading stats", description: "Could not load analytics for this product." });
        } finally {
            setIsStatsLoading(false);
        }
    };


    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProducts(products.map(p => p.id));
        } else {
            setSelectedProducts([]);
        }
    };
    
    const handleSelectProduct = (productId: string, checked: boolean) => {
        if (checked) {
            setSelectedProducts(prev => [...prev, productId]);
        } else {
            setSelectedProducts(prev => prev.filter(id => id !== productId));
        }
    };

    const handleDeleteProduct = async (id: string) => {
        try {
            await deleteDocument(storageKey, id);
            
            setProducts(prev => prev.filter(p => p.id !== id));

            toast({
                variant: 'destructive',
                title: "Product Deleted",
                description: "The product drop has been removed."
            });
        } catch (error) {
             toast({ variant: 'destructive', title: "Error Deleting Product", description: "Could not delete the product." });
        }
    };

  return (
    <AppShell title="My Products (Admin)">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>My Products Catalog</CardTitle>
                    <CardDescription>
                        These are products you have created as the administrator.
                    </CardDescription>
                </div>
                 <Link href="/share/magazine">
                    <Button>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Create Smart Magazine
                    </Button>
                </Link>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : products.length === 0 ? (
                     <div className="text-center py-16">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                        <h3 className="text-xl font-semibold">No Products Found</h3>
                        <p className="text-muted-foreground mt-2">Use the "Product Drops", "AI Product Uploader", or "WhatsApp Uploader" to create products as an admin.</p>
                    </div>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    checked={selectedProducts.length === products.length && products.length > 0}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Cost Price</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map(product => (
                            <TableRow key={product.id}>
                                <TableCell>
                                    <Checkbox
                                        onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                                        checked={selectedProducts.includes(product.id)}
                                        aria-label={`Select product ${product.title}`}
                                    />
                                </TableCell>
                                <TableCell className="font-medium flex items-center gap-4">
                                     <Image src={product.imageDataUris[0]} alt={product.title} width={40} height={40} className="rounded-md object-cover aspect-square" />
                                     <span>{product.title}</span>
                                </TableCell>
                                <TableCell>₹{product.costPrice.toFixed(2)}</TableCell>
                                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{product.description}</TableCell>
                                <TableCell>{formatDistanceToNow(new Date(product.createdAt), { addSuffix: true })}</TableCell>
                                <TableCell className="text-right space-x-1">
                                     <Button variant="outline" size="sm" onClick={() => handleViewStats(product)}>
                                        View Stats
                                    </Button>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                             <Button variant="secondary" size="sm">
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Share
                                            </Button>
                                        </DialogTrigger>
                                        <ShareComposerDialog product={product} />
                                    </Dialog>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the product drop.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                                    Yes, delete product
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
        <Dialog open={!!selectedProductForStats} onOpenChange={(open) => !open && setSelectedProductForStats(null)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Stats for: {selectedProductForStats?.title}</DialogTitle>
                    <DialogDescription>Performance of this product across your seller network.</DialogDescription>
                </DialogHeader>
                {isStatsLoading ? (
                    <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : productStats ? (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Units Sold</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{productStats.totalUnitsSold}</div></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">₹{productStats.totalRevenue.toFixed(2)}</div></CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Sellers with this Product</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Seller Name</TableHead><TableHead>Contact</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {productStats.sellers.length > 0 ? productStats.sellers.map(seller => (
                                            <TableRow key={seller.id}><TableCell>{seller.companyName}</TableCell><TableCell>{seller.phone || seller.email}</TableCell></TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={2} className="text-center">No sellers have added this product yet.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    </AppShell>
  );
}
