
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Percent, MessageCircle, Send, Sparkles, Camera } from 'lucide-react';
import Image from 'next/image';
import type { SellerProduct } from '../seller/ai-product-uploader/page';
import { getCollection, getDocument, saveDocument } from '@/services/firestore';
import type { ProductDrop } from '../vendor/product-drops/page';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

type DisplayProduct = SellerProduct | ProductDrop;

type Magazine = {
    id: string;
    title: string;
    vendorTitle?: string;
    productIds: string[];
    creatorId: string;
    creatorName: string;
    createdAt: string;
    discount?: number;
    logoDataUri?: string;
};


function SmartMagazineContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const [products, setProducts] = useState<DisplayProduct[]>([]);
    const [magazine, setMagazine] = useState<Magazine | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [discount, setDiscount] = useState<number>(0);
    
    // Enquiry State
    const [enquiryProduct, setEnquiryProduct] = useState<DisplayProduct | null>(null);
    const [enquiryForm, setEnquiryForm] = useState({ name: '', phone: '', message: '' });
    const [isEnquiring, setIsEnquiring] = useState(false);

    useEffect(() => {
        const discountParam = searchParams.get('discount');
        if (discountParam) {
            setDiscount(parseFloat(discountParam));
        }

        async function fetchProducts() {
            const magazineId = searchParams.get('id');

            if (!magazineId) {
                setIsLoading(false);
                return;
            }

            try {
                const fetchedMagazine = await getDocument<Magazine>('smart_magazines', magazineId);
                if (!fetchedMagazine) {
                    setIsLoading(false);
                    return;
                }
                setMagazine(fetchedMagazine);
                
                const productIds = fetchedMagazine.productIds;
                if (productIds.length === 0) {
                    setIsLoading(false);
                    return;
                }
                
                const [sellerProducts, productDrops] = await Promise.all([
                    getCollection<SellerProduct>('seller_products'),
                    getCollection<ProductDrop>('product_drops')
                ]);
                
                const productMap = new Map<string, DisplayProduct>();
                sellerProducts.forEach(p => productMap.set(p.id, p));
                productDrops.forEach(p => productMap.set(p.id, p));

                const fetched = productIds.map(id => productMap.get(id)).filter(p => !!p) as DisplayProduct[];
                setProducts(fetched);
            } catch (error) {
                console.error("Failed to fetch products for magazine:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProducts();
    }, [searchParams]);
    
    const handleOrderClick = (product: DisplayProduct) => {
        const catalogueParams = new URLSearchParams();
        catalogueParams.set('id', product.id);
        catalogueParams.set('return_url', window.location.href);

        if (magazine?.creatorId && magazine.creatorName) {
            catalogueParams.set('sellerId', magazine.creatorId);
            catalogueParams.set('sellerName', magazine.creatorName);
        }

        if (discount > 0) catalogueParams.set('discount', discount.toString());
        router.push(`/catalogue?${catalogueParams.toString()}`);
    };

    const handleSendEnquiry = async () => {
        if (!enquiryProduct || !enquiryForm.name || !enquiryForm.phone) {
            toast({ variant: 'destructive', title: "Details Required" });
            return;
        }
        setIsEnquiring(true);
        try {
            const leadId = uuidv4();
            await saveDocument('leads', {
                id: leadId,
                customerName: enquiryForm.name,
                contactNo: enquiryForm.phone,
                productOrdered: enquiryProduct.title,
                productId: enquiryProduct.id,
                price: ((enquiryProduct as any).price || (enquiryProduct as any).costPrice).toString(),
                paymentStatus: 'Enquiry',
                date: new Date().toISOString(),
                sellerId: magazine?.creatorId || 'admin',
                sellerName: magazine?.creatorName || 'Admin',
                source: 'SmartMagazine',
                isRead: false,
                imageDataUris: enquiryProduct.imageDataUris,
            }, leadId);
            toast({ title: "Enquiry Sent!" });
            setEnquiryProduct(null);
            setEnquiryForm({ name: '', phone: '', message: '' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to send" });
        } finally {
            setIsEnquiring(false);
        }
    };

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b sticky top-0 z-50 px-4 py-6 md:px-8 text-center">
                {magazine?.logoDataUri && (
                    <div className="relative w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-white shadow-lg">
                        <Image src={magazine.logoDataUri} fill alt="logo" className="object-contain p-1" />
                    </div>
                )}
                <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900">{magazine?.title}</h1>
                <p className="text-sm text-muted-foreground mt-2 font-bold uppercase tracking-widest">{magazine?.vendorTitle || `Curated by ${magazine?.creatorName}`}</p>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {products.map(product => {
                    const price = (product as any).price || (product as any).costPrice;
                    return (
                        <Card key={product.id} className="group rounded-[32px] border-none shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white flex flex-col">
                            <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                                <Image src={product.imageDataUris[0]} fill alt={product.title} className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 gap-3">
                                    <Button onClick={() => handleOrderClick(product)} className="w-full h-12 rounded-xl font-black uppercase italic bg-primary text-white">
                                        <ShoppingCart className="mr-2 h-4 w-4" /> Order Now
                                    </Button>
                                    <Button onClick={() => handleOrderClick(product)} variant="secondary" className="w-full h-12 rounded-xl font-black uppercase italic bg-white text-primary">
                                        <Sparkles className="mr-2 h-4 w-4" /> Magic Mirror
                                    </Button>
                                </div>
                                {discount > 0 && <Badge className="absolute top-4 right-4 bg-destructive text-white font-black italic">-{discount}%</Badge>}
                            </div>
                            <CardContent className="p-6 flex-1 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-black italic uppercase text-slate-800 line-clamp-1">{product.title}</h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 italic">"{product.description}"</p>
                                </div>
                                <div className="pt-4 border-t mt-4 flex justify-between items-center">
                                    <span className="text-xl font-black text-primary">₹{price}</span>
                                    <Dialog onOpenChange={(open) => !open && setEnquiryProduct(null)}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="font-bold text-xs uppercase" onClick={() => setEnquiryProduct(product)}>Enquire</Button>
                                        </DialogTrigger>
                                        {enquiryProduct?.id === product.id && (
                                            <DialogContent className="rounded-[32px] p-8 border-none">
                                                <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Product Enquiry</DialogTitle></DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-black">Your Name</Label><Input value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} className="h-12 rounded-xl" /></div>
                                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-black">WhatsApp Number</Label><Input value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
                                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-black">Message</Label><Textarea value={enquiryForm.message} onChange={e => setEnquiryForm({...enquiryForm, message: e.target.value})} className="rounded-xl" /></div>
                                                </div>
                                                <DialogFooter><Button onClick={handleSendEnquiry} className="w-full h-14 rounded-2xl font-black uppercase italic" disabled={isEnquiring}>{isEnquiring ? <Loader2 className="animate-spin"/> : "Send Request"}</Button></DialogFooter>
                                            </DialogContent>
                                        )}
                                    </Dialog>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </main>
        </div>
    );
}

export default function SmartMagazinePage() {
    return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>}><SmartMagazineContent /></Suspense>;
}
