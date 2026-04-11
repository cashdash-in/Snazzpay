
'use client';
import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Package, MessageSquare, BookOpen, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { SellerProduct } from '@/app/seller/ai-product-uploader/page';
import Image from 'next/image';
import { formatDistanceToNow, isBefore, subDays } from 'date-fns';
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import type { SellerUser } from '@/app/seller-accounts/page';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SellerProductsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<SellerProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadProducts() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            try {
                // Get products generated or added by the seller
                const sellerProducts = await getCollection<SellerProduct>('seller_products');
                const myProducts = sellerProducts.filter(p => p.sellerId === user.uid);
                
                // Filter out products older than 30 days
                const thirtyDaysAgo = subDays(new Date(), 30);
                const recentProducts = myProducts.filter(p => 
                    !isBefore(new Date(p.createdAt), thirtyDaysAgo)
                );
                
                setProducts(recentProducts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

            } catch (error) {
                toast({ variant: 'destructive', title: "Error loading data", description: "Could not load your products." });
            } finally {
                setIsLoading(false);
            }
        }
        loadProducts();

    }, [user, toast]);

    const handleSavePrice = async (productToUpdate: SellerProduct, newPrice: number) => {
        try {
            const updatedProduct = { ...productToUpdate, price: newPrice };
            await saveDocument('seller_products', updatedProduct, productToUpdate.id);
            setProducts(prev => prev.map(p => p.id === productToUpdate.id ? updatedProduct : p));
            toast({ title: 'Price Updated!' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error updating price' });
        }
    };


    const handleDeleteProduct = async (id: string) => {
        if (!user) return;
        try {
            await deleteDocument('seller_products', id);
            setProducts(prev => prev.filter(p => p.id !== id));
            toast({
                variant: 'destructive',
                title: "Product Deleted",
                description: "The product has been removed from your catalog."
            });
        } catch (error) {
             toast({ variant: 'destructive', title: "Error Deleting Product" });
        }
    };

    return (
    <AppShell title="My Products">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>My Products Catalog</CardTitle>
                    <CardDescription>
                        Products you have generated or received in the last 30 days.
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
                        <p className="text-muted-foreground mt-2">Use the AI Uploader or add products from the Product Drops page.</p>
                    </div>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map(product => (
                            <TableRow key={product.id}>
                                <TableCell className="font-medium flex items-center gap-4">
                                     <Image src={product.imageDataUris[0]} alt={product.title} width={40} height={40} className="rounded-md object-cover aspect-square" />
                                     <span>{product.title}</span>
                                </TableCell>
                                <TableCell>₹{product.price.toFixed(2)}</TableCell>
                                <TableCell>{formatDistanceToNow(new Date(product.createdAt), { addSuffix: true })}</TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                             <Button variant="secondary" size="sm">
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Share
                                            </Button>
                                        </DialogTrigger>
                                        <ShareComposerDialog product={product} />
                                    </Dialog>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="icon">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Edit Price for {product.title}</DialogTitle>
                                            </DialogHeader>
                                            <div className="py-4 space-y-2">
                                                <Label htmlFor={`price-${product.id}`}>New Selling Price (INR)</Label>
                                                <Input
                                                    id={`price-${product.id}`}
                                                    type="number"
                                                    defaultValue={product.price.toFixed(2)}
                                                />
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline">Cancel</Button>
                                                </DialogClose>
                                                <DialogClose asChild>
                                                    <Button onClick={() => {
                                                        const input = document.getElementById(`price-${product.id}`) as HTMLInputElement;
                                                        const newProductPrice = parseFloat(input.value);
                                                        if (!isNaN(newProductPrice) && newProductPrice >= 0) {
                                                            handleSavePrice(product, newProductPrice);
                                                        } else {
                                                            toast({variant: 'destructive', title: 'Invalid Price'});
                                                        }
                                                    }}>Save Price</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
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
                                                    This will permanently delete the product from your catalog. This action cannot be undone.
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
    </AppShell>
    );
}
