
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Package, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
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
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ShareComposerDialog } from '@/components/share-composer-dialog';

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
        try {
            const storedDrops = localStorage.getItem(storageKey);
            if (storedDrops) {
                const allDrops: ProductDrop[] = JSON.parse(storedDrops);
                // Filter drops to show only those created by the current vendor
                setProducts(allDrops.filter(drop => drop.vendorId === user.uid));
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load products from local storage." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    const handleDeleteProduct = (id: string) => {
        try {
            const allDropsJSON = localStorage.getItem(storageKey);
            let allDrops: ProductDrop[] = allDropsJSON ? JSON.parse(allDropsJSON) : [];
            
            // Remove the product with the matching ID
            const updatedDrops = allDrops.filter(drop => drop.id !== id);
            
            // Save the updated list back to localStorage
            localStorage.setItem(storageKey, JSON.stringify(updatedDrops));
            
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
            <CardHeader>
                <CardTitle>My Products Catalog</CardTitle>
                <CardDescription>
                    This is a list of all the products you have dropped to your sellers. Deleting a product here will remove it for everyone.
                </CardDescription>
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
                                             <Button className="w-full" variant="secondary" size="sm">
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
