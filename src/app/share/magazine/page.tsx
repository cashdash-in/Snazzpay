
'use client';

import { useState, useEffect, useMemo, DragEvent, ClipboardEvent } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { SellerProduct } from '@/app/seller/ai-product-uploader/page';
import Image from 'next/image';
import { Loader2, Share2, Copy, MessageSquare, BookOpen, Percent, Factory, Edit, Wand2, PlusCircle, ImagePlus } from 'lucide-react';
import { getCollection, saveDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { Label } from '@/components/ui/label';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { parseTextForMagazine } from '@/ai/flows/magazine-paste-parser';


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

const MAX_IMAGE_SIZE_PX = 800; // Max width/height for resizing

export default function ShareMagazinePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<Array<SellerProduct | ProductDrop>>([]);
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPasting, setIsPasting] = useState(false);
    const [magazineLink, setMagazineLink] = useState('');
    const [magazineTitle, setMagazineTitle] = useState('Our Latest Collection');
    const [vendorTitle, setVendorTitle] = useState('');
    const [discount, setDiscount] = useState<number>(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const [editingProduct, setEditingProduct] = useState<SellerProduct | ProductDrop | null>(null);

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({
        title: '',
        description: '',
        price: '',
        imageDataUris: [] as string[],
        imagePreviews: [] as string[],
    });

    const userRole = useMemo(() => getCookie('userRole'), []);

    useEffect(() => {
        setIsAdmin(userRole === 'admin');

        async function loadData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            try {
                let productsCollection: Array<SellerProduct | ProductDrop> = [];
                
                if (userRole === 'seller') {
                    const sellerProducts = await getCollection<SellerProduct>('seller_products');
                    productsCollection = sellerProducts.filter(p => p.sellerId === user.uid);
                } else if (userRole === 'vendor') {
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
    }, [user, toast, userRole]);

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    if (width > height) {
                        if (width > MAX_IMAGE_SIZE_PX) {
                            height *= MAX_IMAGE_SIZE_PX / width;
                            width = MAX_IMAGE_SIZE_PX;
                        }
                    } else {
                        if (height > MAX_IMAGE_SIZE_PX) {
                            width *= MAX_IMAGE_SIZE_PX / height;
                            height = MAX_IMAGE_SIZE_PX;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };
    
    const handleNewProductImages = async (files: FileList | File[]) => {
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (fileArray.length === 0) return;

        toast({ title: 'Processing images...', description: 'Resizing and compressing images.' });
        
        const newPreviews: string[] = [];
        const newDataUris: string[] = [];

        for (const file of fileArray) {
            const resizedDataUri = await resizeImage(file);
            newPreviews.push(resizedDataUri);
            newDataUris.push(resizedDataUri);
        }
        
        setNewProduct(prev => ({
            ...prev,
            imagePreviews: [...prev.imagePreviews, ...newPreviews],
            imageDataUris: [...prev.imageDataUris, ...newDataUris],
        }));
        
        toast({ title: 'Images added!' });
    }

    const handleCreateProduct = async () => {
        if (!newProduct.title || !newProduct.description || !newProduct.price || newProduct.imageDataUris.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please fill out all fields and upload at least one image.',
            });
            return;
        }
        if (!user) {
            toast({ variant: 'destructive', title: 'Authentication Error' });
            return;
        }

        setIsCreatingProduct(true);

        const newProductId = uuidv4();
        let productToSave: SellerProduct | ProductDrop;
        let collectionName: string;

        if (userRole === 'seller') {
            collectionName = 'seller_products';
            productToSave = {
                id: newProductId,
                sellerId: user.uid,
                sellerName: user.displayName || 'Seller',
                title: newProduct.title,
                description: newProduct.description,
                price: parseFloat(newProduct.price),
                imageDataUris: newProduct.imageDataUris,
                createdAt: new Date().toISOString(),
                category: '',
                sizes: [],
                colors: [],
            } as SellerProduct;
        } else { // admin or vendor
            collectionName = 'product_drops';
            productToSave = {
                id: newProductId,
                vendorId: userRole === 'admin' ? 'admin_snazzify' : user.uid,
                vendorName: userRole === 'admin' ? 'SnazzifyOfficial' : user.displayName || 'Vendor',
                title: newProduct.title,
                description: newProduct.description,
                costPrice: parseFloat(newProduct.price),
                imageDataUris: newProduct.imageDataUris,
                createdAt: new Date().toISOString(),
                category: '',
                sizes: [],
                colors: [],
            } as ProductDrop;
        }

        try {
            await saveDocument(collectionName, productToSave, newProductId);
            setProducts(prev => [productToSave, ...prev]);
            setSelectedProductIds(prev => [newProductId, ...prev]);

            toast({
                title: 'Product Created!',
                description: 'Your new product has been added to the list and selected.',
            });

            setNewProduct({ title: '', description: '', price: '', imageDataUris: [], imagePreviews: [] });
            setIsCreateDialogOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error Creating Product',
                description: error.message || 'Could not save the product.',
            });
        } finally {
            setIsCreatingProduct(false);
        }
    };


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

        const creatorName = userRole === 'admin' ? 'SnazzifyOfficial' : user.displayName || 'Unknown Creator';

        const magazineId = uuidv4();
        const newMagazine: Magazine = {
            id: magazineId,
            title: magazineTitle,
            productIds: selectedProductIds,
            creatorId: user.uid,
            creatorName: creatorName,
            createdAt: new Date().toISOString(),
        };

        if (isAdmin && vendorTitle) {
            newMagazine.vendorTitle = vendorTitle;
        }
        if (discount > 0) {
            newMagazine.discount = discount;
        }


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

    const handleUpdateProduct = async () => {
        if (!editingProduct) return;
        
        const collectionName = userRole === 'seller' ? 'seller_products' : 'product_drops';

        try {
            await saveDocument(collectionName, editingProduct, editingProduct.id);
            setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
            toast({ title: 'Product Updated', description: 'Your changes have been saved.' });
            setEditingProduct(null); // Close the dialog
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error Updating Product' });
        }
    };

    const handleMagicPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        if (pastedText.trim().length < 10) return;
        if (e.clipboardData.files.length > 0) return;

        e.preventDefault();
        e.stopPropagation();

        setIsPasting(true);
        try {
            const result = await parseTextForMagazine({ chatText: pastedText });
            
            if (!result.products || result.products.length === 0) {
                toast({
                    variant: 'destructive',
                    title: 'No Products Found',
                    description: 'The AI could not find any products in the pasted text.',
                });
                setIsPasting(false);
                return;
            }

            const creatorId = user!.uid;
            const creatorName = user!.displayName || 'Creator';

            const newProductsFromPaste: Array<SellerProduct | ProductDrop> = result.products.map(p => {
                const baseProduct = {
                    id: uuidv4(),
                    title: p.title,
                    description: p.description,
                    imageDataUris: [],
                    createdAt: new Date().toISOString(),
                    category: '',
                    sizes: [],
                    colors: [],
                };

                if (userRole === 'seller') {
                    return {
                        ...baseProduct,
                        sellerId: creatorId,
                        sellerName: creatorName,
                        price: p.price,
                    } as SellerProduct;
                } else {
                    return {
                        ...baseProduct,
                        vendorId: creatorId,
                        vendorName: creatorName,
                        costPrice: p.price,
                    } as ProductDrop;
                }
            });

            setProducts(prev => [...newProductsFromPaste, ...prev]);
            
            toast({
                title: "AI Parsing Complete!",
                description: `${newProductsFromPaste.length} products have been extracted and added to your list below. You can now edit their details.`,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'AI Parsing Failed',
                description: error.message || 'Could not process the pasted text.',
            });
        } finally {
            setIsPasting(false);
        }
    };

    return (
        <AppShell title="Smart Magazine Hub">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Build Your Smart Magazine</CardTitle>
                                    <CardDescription>Select the products you want to feature in this collection.</CardDescription>
                                </div>
                                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="shrink-0">
                                            <PlusCircle className="mr-2 h-4 w-4"/> Create New Product
                                        </Button>
                                    </DialogTrigger>
                                     <DialogContent className="sm:max-w-[600px]">
                                        <DialogHeader>
                                            <DialogTitle>Create New Product</DialogTitle>
                                            <DialogDescription>Add a new product to your catalog. It will be available for selection immediately.</DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="new-title">Product Title</Label>
                                                <Input id="new-title" value={newProduct.title} onChange={(e) => setNewProduct(p => ({...p, title: e.target.value}))}/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-desc">Description</Label>
                                                <Textarea id="new-desc" value={newProduct.description} onChange={(e) => setNewProduct(p => ({...p, description: e.target.value}))} rows={4}/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-price">{userRole === 'seller' ? 'Your Selling Price' : 'Your Cost Price'} (INR)</Label>
                                                <Input id="new-price" type="number" value={newProduct.price} onChange={(e) => setNewProduct(p => ({...p, price: e.target.value}))}/>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Product Images</Label>
                                                <div 
                                                    className="relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50"
                                                    onDrop={(e) => { e.preventDefault(); handleNewProductImages(e.dataTransfer.files); }}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onClick={() => document.getElementById('new-product-image-input')?.click()}
                                                >
                                                    <div className="text-center"><ImagePlus className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-1 text-xs text-muted-foreground">Click or drag & drop</p></div>
                                                </div>
                                                <Input id="new-product-image-input" type="file" accept="image/*" onChange={(e) => handleNewProductImages(e.target.files!)} className="hidden" multiple />
                                                {newProduct.imagePreviews.length > 0 && (
                                                    <div className="mt-2 grid grid-cols-4 gap-2">
                                                        {newProduct.imagePreviews.map((src, index) => (
                                                            <Image key={index} src={src} alt={`preview ${index}`} width={100} height={100} className="object-contain rounded-md aspect-square"/>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                            <Button onClick={handleCreateProduct} disabled={isCreatingProduct}>
                                                {isCreatingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                Save Product
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="relative space-y-2 mb-6">
                                <Label htmlFor="magic-paste" className="flex items-center gap-2">
                                    <Wand2 className="h-4 w-4 text-purple-600" />
                                    Magic Paste Box (AI-Powered)
                                </Label>
                                {isPasting && <Loader2 className="absolute top-8 right-2 h-4 w-4 animate-spin text-primary" />}
                                <Textarea
                                    id="magic-paste"
                                    placeholder="Paste a WhatsApp chat here. The AI will extract products and add them to the list below."
                                    onPaste={handleMagicPaste}
                                    className="bg-purple-50/50 border-purple-200 focus-visible:ring-purple-400"
                                />
                            </div>
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
                                            <label htmlFor={`product-${product.id}`} className="flex items-center gap-4 cursor-pointer flex-grow">
                                                {product.imageDataUris && product.imageDataUris.length > 0 ? (
                                                    <Image src={product.imageDataUris[0]} alt={product.title} width={60} height={60} className="rounded-md object-contain aspect-square bg-muted" />
                                                ) : (
                                                    <div className="w-[60px] h-[60px] bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs p-1 text-center">No Image</div>
                                                )}
                                                <div className="flex-grow">
                                                    <p className="font-semibold">{product.title}</p>
                                                    <p className="text-sm text-muted-foreground">Price: ₹{(((product as SellerProduct).price || (product as ProductDrop).costPrice) ?? 0).toFixed(2)}</p>
                                                </div>
                                            </label>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" onClick={() => setEditingProduct(product)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                            </Dialog>
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
             {editingProduct && (
                <Dialog open={!!editingProduct} onOpenChange={(isOpen) => !isOpen && setEditingProduct(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Product: {editingProduct.title}</DialogTitle>
                            <DialogDescription>Make changes to the product details below.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="edit-title">Title</Label>
                                <Input 
                                    id="edit-title" 
                                    value={editingProduct.title} 
                                    onChange={(e) => setEditingProduct(p => p ? {...p, title: e.target.value} : null)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-desc">Description</Label>
                                <Textarea 
                                    id="edit-desc"
                                    value={editingProduct.description}
                                    onChange={(e) => setEditingProduct(p => p ? {...p, description: e.target.value} : null)}
                                    rows={5}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="edit-price">Price (INR)</Label>
                                <Input 
                                    id="edit-price"
                                    type="number"
                                    value={(editingProduct as any).price ?? (editingProduct as any).costPrice}
                                    onChange={(e) => setEditingProduct(p => {
                                        if (!p) return null;
                                        const newPrice = parseFloat(e.target.value);
                                        const updatedProduct = {...p};
                                        if ('price' in updatedProduct) {
                                            (updatedProduct as SellerProduct).price = newPrice;
                                        } else {
                                            (updatedProduct as ProductDrop).costPrice = newPrice;
                                        }
                                        return updatedProduct;
                                    })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
                            <Button onClick={handleUpdateProduct}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </AppShell>
    );
}
