'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Code, Sparkles, ExternalLink, ImagePlus, Loader2, Share2 } from 'lucide-react';
import { getCollection } from '@/services/firestore';
import type { ProductDrop } from '@/types/product';
import Image from 'next/image';

export default function WidgetBuilderPage() {
    const { toast } = useToast();
    const [products, setProducts] = useState<ProductDrop[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<ProductDrop | null>(null);
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
        async function loadProducts() {
            try {
                const allProducts = await getCollection<ProductDrop>('product_drops');
                setProducts(allProducts);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error loading products" });
            } finally {
                setIsLoading(false);
            }
        }
        loadProducts();
    }, [toast]);

    const getWidgetUrl = (product: ProductDrop) => {
        const params = new URLSearchParams();
        // Use product ID instead of full image data to avoid 414 Request-URI Too Long error
        params.set('id', product.id);
        return `${origin}/magic-mirror/widget?${params.toString()}`;
    };

    const getEmbedCode = (product: ProductDrop) => {
        const url = getWidgetUrl(product);
        return `<iframe 
    src="${url}" 
    width="100%" 
    height="600px" 
    style="border:none; border-radius:32px; overflow:hidden; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);"
    allow="camera">
</iframe>`;
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Code Copied!", description: "You can now paste this into any website's HTML." });
    };

    return (
        <AppShell title="Magic Mirror Widget Builder">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 shadow-xl rounded-[32px] border-none bg-slate-900 text-white">
                    <CardHeader>
                        <div className="p-3 bg-primary/20 rounded-2xl w-fit mb-4"><Sparkles className="h-8 w-8 text-primary-foreground" /></div>
                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter leading-none">Sell Try-On as a Service</CardTitle>
                        <CardDescription className="text-slate-400 mt-2">Generate embeddable Magic Mirror widgets for your clients' websites.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">How to use</Label>
                            <ol className="text-xs space-y-3 text-slate-300">
                                <li className="flex gap-3"><span className="font-black italic text-primary">01.</span> Select a product from your catalog.</li>
                                <li className="flex gap-3"><span className="font-black italic text-primary">02.</span> Copy the generated IFrame code.</li>
                                <li className="flex gap-3"><span className="font-black italic text-primary">03.</span> Paste it into any website (Shopify, WordPress, etc.).</li>
                            </ol>
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-[32px] shadow-sm">
                        <CardHeader>
                            <CardTitle>1. Select a Product</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-12"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[40vh] overflow-y-auto pr-2">
                                    {products.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => setSelectedProduct(p)}
                                            className={`p-3 border-2 rounded-2xl transition-all cursor-pointer flex flex-col gap-3 ${selectedProduct?.id === p.id ? 'border-primary bg-primary/5' : 'hover:border-slate-300'}`}
                                        >
                                            <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-white">
                                                <Image src={p.imageDataUris[0]} alt={p.title} fill className="object-contain p-1" />
                                            </div>
                                            <p className="font-bold text-[10px] uppercase truncate">{p.title}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {selectedProduct && (
                        <Card className="rounded-[32px] shadow-xl border-2 border-primary/10 animate-in slide-in-from-bottom-4 duration-500">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Code className="h-5 w-5 text-primary" /> 2. Get Embed Code
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">HTML Iframe Code</Label>
                                    <div className="relative group">
                                        <pre className="p-6 bg-slate-50 rounded-2xl text-[10px] font-mono text-slate-600 overflow-x-auto border">
                                            {getEmbedCode(selectedProduct)}
                                        </pre>
                                        <Button 
                                            size="sm" 
                                            className="absolute top-4 right-4 h-8 font-bold"
                                            onClick={() => handleCopy(getEmbedCode(selectedProduct))}
                                        >
                                            <Copy className="mr-2 h-3.5 w-3.5" /> Copy Code
                                        </Button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t flex flex-col sm:flex-row gap-4">
                                    <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" asChild>
                                        <a href={getWidgetUrl(selectedProduct)} target="_blank">
                                            <ExternalLink className="mr-2 h-4 w-4" /> Preview Widget
                                        </a>
                                    </Button>
                                    <Button className="flex-1 rounded-xl h-12 font-bold bg-green-600 hover:bg-green-700" onClick={() => handleCopy(getWidgetUrl(selectedProduct))}>
                                        <Share2 className="mr-2 h-4 w-4" /> Copy Direct URL
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
