
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, MessageSquare, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// This would be a shared type or fetched data
type Magazine = {
    id: string;
    title: string;
    productCount: number;
    creator: string;
    shareLink: string;
};

// Dummy data for magazines
const magazines: Magazine[] = [
    { id: 'mag-01', title: 'Summer Sizzlers', productCount: 12, creator: 'Admin', shareLink: 'https://snazzify.co.in/smart-magazine?id=summersale' },
    { id: 'mag-02', title: 'Ethnic Elegance', productCount: 8, creator: 'Global Textiles', shareLink: 'https://snazzify.co.in/smart-magazine?id=ethnic' },
    { id: 'mag-03', title: 'Daily Deals by FabFashions', productCount: 5, creator: 'FabFashions Seller', shareLink: 'https://snazzify.co.in/smart-magazine?id=dailydeals' },
];

export default function CollaboratorMagazinesPage() {
    const router = useRouter();
    const { toast } = useToast();

    const handleCopy = (link: string) => {
        navigator.clipboard.writeText(link);
        toast({ title: "Link Copied!" });
    };

    const handleShare = (link: string, title: string) => {
        const message = `Check out this amazing collection: *${title}*\n\n${link}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                 <header className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Smart Magazine Library</h1>
                        <p className="text-muted-foreground">Find curated collections to share with your network.</p>
                    </div>
                </header>

                <div className="space-y-6">
                    {magazines.map(mag => (
                         <Card key={mag.id} className="shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/>{mag.title}</CardTitle>
                                        <CardDescription>
                                            {mag.productCount} products curated by {mag.creator}
                                        </CardDescription>
                                    </div>
                                     <Button variant="ghost" asChild>
                                        <a href={mag.shareLink} target="_blank">View</a>
                                     </Button>
                                </div>
                            </CardHeader>
                             <CardFooter className="flex justify-end gap-2">
                                <Button variant="secondary" onClick={() => handleCopy(mag.shareLink)}><Copy className="mr-2 h-4 w-4"/>Copy Link</Button>
                                <Button onClick={() => handleShare(mag.shareLink, mag.title)}><MessageSquare className="mr-2 h-4 w-4"/>Share on WhatsApp</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
