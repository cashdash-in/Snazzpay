
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Package, MessageSquare, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
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
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ShareComposerDialog } from '@/components/share-composer-dialog';
import { getCollection, deleteDocument } from '@/services/firestore';
import Link from 'next/link';

export default function VendorProductsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<ProductDrop[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const storageKey = 'product_drops';

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        async function loadProducts() {
            try {
                const allDrops = await getCollection<ProductDrop>(storageKey);
                // Filter drops to show only those created by the current vendor
                const vendorDrops = allDrops.filter(drop => drop.vendorId === user.uid);
                
                // Filter out products older than 30 days
                const thirtyDaysAgo = subDays(new Date(), 30);
                const recentProducts = vendorDrops.filter(p => 
                    !isBefore(new Date(p.createdAt), thirtyDaysAgo)
                );
                
                setProducts(recentProducts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

            } catch (error) {
                toast({ variant: 'destructive', title: "Error loading data", description: "Could not load products from Firestore." });
            } finally {
                setIsLoading(false);
            }
        }
        loadProducts();
    }, [user, toast]);

    const handleDeleteProduct = async (id: string) => {
        try {
            await deleteDocument(storageKey, id);
            
            // Update the component's state to reflect the change
            setProducts(prev => prev.filter(p => p.id !== id));

            toast({
                variant: 'destructive',
                title: "Product Deleted",
                description: "The product drop has been removed from your list and from your sellers' view."
            });
        } catch (error) {
             toast({ variant: 'destructive', title: "Error Deleting Product", description: "Could not delete the product." });
        }
    };

  return (
    <AppShell title="My Products">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>My Products Catalog</CardTitle>
                    <CardDescription>
                        Products you have dropped in the last 30 days. Deleting removes it for all sellers.
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
                        <p className="text-muted-foreground mt-2">You haven't created any product drops yet.</p>
                    </div>
                ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
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
                                <TableCell className="font-medium flex items-center gap-4">
                                     <Image src={product.imageDataUris[0]} alt={product.title} width={40} height={40} className="rounded-md object-cover aspect-square" />
                                     <span>{product.title}</span>
                                </TableCell>
                                <TableCell>₹{product.costPrice.toFixed(2)}</TableCell>
                                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{product.description}</TableCell>
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
                                                    This action cannot be undone. This will permanently delete the product drop for you and all of your sellers.
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
