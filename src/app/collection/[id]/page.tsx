
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Percent, MessageCircle, Send } from 'lucide-react';
import Image from 'next/image';
import type { SellerProduct } from '@/app/seller/ai-product-uploader/page';
import { getCollection, getDocument, saveDocument } from '@/services/firestore';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
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


function BrandedCollectionContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const [products, setProducts] = useState<DisplayProduct[]>([]);
    const [magazine, setMagazine] = useState<Magazine | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [discount, setDiscount] = useState<number>(0);
    
    const [enquiryProduct, setEnquiryProduct] = useState<DisplayProduct | null>(null);
    const [enquiryForm, setEnquiryForm] = useState({ name: '', phone: '', message: '' });
    const [isEnquiring, setIsEnquiring] = useState(false);

    useEffect(() => {
        const discountParam = searchParams.get('discount');
        if (discountParam) {
            setDiscount(parseFloat(discountParam));
        }

        // Track session start
        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'magazineSessionStart' }),
            keepalive: true,
        });

        async function fetchProducts() {
            const slug = params.id as string;

            if (!slug) {
                setIsLoading(false);
                return;
            }

            try {
                // Track visit
                fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'magazineVisit' }),
                    keepalive: true,
                });

                const fetchedMagazine = await getDocument<Magazine>('smart_magazines', slug);
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
                
                const fetchedProducts: DisplayProduct[] = [];
                const [sellerProducts, productDrops] = await Promise.all([
                    getCollection<SellerProduct>('seller_products'),
                    getCollection<ProductDrop>('product_drops')
                ]);
                
                const productMap = new Map<string, DisplayProduct>();
                sellerProducts.forEach(p => productMap.set(p.id, p));
                productDrops.forEach(p => productMap.set(p.id, p));

                for (const id of productIds) {
                    const product = productMap.get(id);
                    if (product) {
                        fetchedProducts.push(product);
                    }
                }
                setProducts(fetchedProducts);
            } catch (error) {
                console.error("Failed to fetch products for magazine:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProducts();
    }, [params.id, searchParams]);
    
    const handleOrderClick = (product: DisplayProduct) => {
        const catalogueParams = new URLSearchParams();
        
        catalogueParams.set('id', product.id);
        catalogueParams.set('return_url', window.location.href);

        if (magazine?.creatorId && magazine.creatorName) {
            catalogueParams.set('sellerId', magazine.creatorId);
            catalogueParams.set('sellerName', magazine.creatorName);
        }

        const discountFromMagazine = searchParams.get('discount');
        if (discountFromMagazine) {
            catalogueParams.set('discount', discountFromMagazine);
        }
    
        router.push(`/catalogue?${catalogueParams.toString()}`);
    };

    const handleSendEnquiry = async () => {
        if (!enquiryProduct || !enquiryForm.name || !enquiryForm.phone) {
            toast({ variant: 'destructive', title: "Details Required", description: "Please provide your name and phone number." });
            return;
        }

        setIsEnquiring(true);
        const leadId = uuidv4();
        const price = ((enquiryProduct as SellerProduct).price || (enquiryProduct as ProductDrop).costPrice);
        const finalPrice = discount > 0 ? price - (price * (discount / 100)) : price;

        try {
            const leadData = {
                id: leadId,
                orderId: `ENQ-${uuidv4().substring(0, 6).toUpperCase()}`,
                customerName: enquiryForm.name,
                contactNo: enquiryForm.phone,
                productOrdered: enquiryProduct.title,
                productId: enquiryProduct.id,
                price: finalPrice.toString(),
                paymentStatus: 'Enquiry',
                date: new Date().toISOString(),
                sellerId: magazine?.creatorId || 'admin',
                sellerName: magazine?.creatorName || 'Admin',
                source: 'SmartMagazine',
                message: enquiryForm.message,
                isRead: false,
                imageDataUris: enquiryProduct.imageDataUris,
            };

            await saveDocument('leads', leadData, leadId);
            
            toast({ title: "Enquiry Sent!", description: "We have received your interest. Our team will contact you shortly." });
            setEnquiryProduct(null);
            setEnquiryForm({ name: '', phone: '', message: '' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to send enquiry" });
        } finally {
            setIsEnquiring(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!magazine || products.length === 0) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-2xl shadow-lg text-center">
                    <CardHeader>
                        <CardTitle>Collection Not Found</CardTitle>
                        <CardDescription>The requested collection is empty or the link is invalid.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                 <header className="text-center mb-12 space-y-6">
                    {magazine.logoDataUri && (
                        <div className="flex justify-center mb-6">
                            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white">
                                <Image 
                                    src={magazine.logoDataUri} 
                                    alt="Brand Logo" 
                                    fill 
                                    className="object-contain p-2"
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">{magazine.title}</h1>
                        <p className="mt-4 text-lg text-muted-foreground">
                            {magazine.vendorTitle || `A curated collection by ${magazine.creatorName}`}
                        </p>
                    </div>
                </header>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => {
                         const price = ((product as SellerProduct).price || (product as ProductDrop).costPrice);
                         const discountedPrice = discount > 0 ? price - (price * (discount / 100)) : price;
                         const hasVideo = !!(product as any).videoDataUri;

                        return (
                        <Card key={product.id} className="shadow-md hover:shadow-xl transition-shadow overflow-hidden flex flex-col group rounded-lg">
                            {hasVideo ? (
                                <video
                                    src={(product as any).videoDataUri}
                                    width="400"
                                    height="400"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="object-cover w-full h-48 sm:h-64"
                                />
                            ) : (
                                <Carousel className="w-full relative group/carousel">
                                    <CarouselContent>
                                        {product.imageDataUris.map((uri, index) => (
                                            <CarouselItem key={index}>
                                                <Image
                                                    src={uri}
                                                    alt={`${product.title} image ${index + 1}`}
                                                    width={400}
                                                    height={400}
                                                    className="object-cover w-full h-48 sm:h-64"
                                                />
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    {product.imageDataUris.length > 1 && (
                                        <>
                                            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
                                            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
                                        </>
                                    )}
                                    {discount > 0 && (
                                        <Badge className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground">
                                            <Percent className="h-3 w-3 mr-1" />
                                            {discount}% OFF
                                        </Badge>
                                    )}
                                </Carousel>
                            )}
                             <CardContent className="p-4 flex-grow flex flex-col">
                                <h3 className="text-base font-semibold mb-1 line-clamp-2 flex-grow">{product.title}</h3>
                                <div className="mt-2">
                                     <p className="text-lg font-bold text-primary">
                                        ₹{discountedPrice.toFixed(2)}
                                        {discount > 0 && (
                                            <span className="text-sm font-normal text-muted-foreground ml-2 line-through">
                                                ₹{price.toFixed(2)}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter className="p-2 bg-slate-50 flex flex-col gap-2">
                                <Button className="w-full" size="sm" onClick={() => handleOrderClick(product)}>
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Order Now
                                </Button>
                                <Dialog onOpenChange={(open) => !open && setEnquiryProduct(null)}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full" variant="outline" size="sm" onClick={() => setEnquiryProduct(product)}>
                                            <MessageCircle className="mr-2 h-4 w-4" />
                                            Enquire
                                        </Button>
                                    </DialogTrigger>
                                    {enquiryProduct?.id === product.id && (
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Enquire about this product</DialogTitle>
                                                <DialogDescription>
                                                    Interested in {product.title}? Send us your details and we'll get back to you.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="enq-name">Your Name</Label>
                                                    <Input id="enq-name" value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="enq-phone">Phone Number</Label>
                                                    <Input id="enq-phone" type="tel" value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value})} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="enq-msg">Message (Optional)</Label>
                                                    <Textarea id="enq-msg" placeholder="Tell us what you'd like to know..." value={enquiryForm.message} onChange={e => setEnquiryForm({...enquiryForm, message: e.target.value})} />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button onClick={handleSendEnquiry} disabled={isEnquiring} className="w-full">
                                                    {isEnquiring ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                                                    Send Enquiry
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    )}
                                </Dialog>
                            </CardFooter>
                        </Card>
                    )})}
                </div>
            </div>
        </div>
    );
}

export default function BrandedCollectionPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <BrandedCollectionContent />
        </Suspense>
    );
}
