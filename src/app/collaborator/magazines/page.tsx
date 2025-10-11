'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, MessageSquare, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCollection, getDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';

type Magazine = {
    id: string;
    title: string;
    productIds: string[];
    creatorId: string;
    creatorName: string;
    createdAt: string;
};

export default function CollaboratorMagazinesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadMagazines() {
            try {
                // Now shows all magazines from all users
                const allMagazines = await getCollection<Magazine>('smart_magazines');
                
                const formattedMagazines = allMagazines.map(mag => ({
                    ...mag,
                    id: mag.id || uuidv4(),
                })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                setMagazines(formattedMagazines);
            } catch (error) {
                console.error("Failed to load magazines:", error);
                toast({ variant: 'destructive', title: "Could not load magazines." });
            } finally {
                setIsLoading(false);
            }
        }
        loadMagazines();
    }, [toast]);
    
    const getShareLink = (mag: Magazine) => {
        const baseUrl = window.location.origin;
        return \`\${baseUrl}/smart-magazine?id=\${mag.id}\`;
    };

    const handleCopy = (mag: Magazine) => {
        const link = getShareLink(mag);
        navigator.clipboard.writeText(link);
        toast({ title: "Link Copied!" });
    };

    const handleShare = (mag: Magazine) => {
        const link = getShareLink(mag);
        const message = \`Check out this amazing collection: *\${mag.title}*\n\n\${link}\`;
        const whatsappUrl = \`https://wa.me/?text=\${encodeURIComponent(message)}\`;
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

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : magazines.length === 0 ? (
                    <Card className="text-center py-16">
                        <CardContent>
                             <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                            <h3 className="text-xl font-semibold">No Magazines Found</h3>
                            <p className="text-muted-foreground mt-2">No smart magazines have been created yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {magazines.map(mag => {
                            const shareLink = getShareLink(mag);
                            return (
                             <Card key={mag.id} className="shadow-sm hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/>{mag.title}</CardTitle>
                                            <CardDescription>
                                                {mag.productIds.length} products curated by {mag.creatorName}
                                            </CardDescription>
                                        </div>
                                         <Button variant="ghost" asChild>
                                            <a href={shareLink} target="_blank">View</a>
                                         </Button>
                                    </div>
                                </CardHeader>
                                 <CardFooter className="flex justify-end gap-2">
                                    <Button variant="secondary" onClick={() => handleCopy(mag)}><Copy className="mr-2 h-4 w-4"/>Copy Link</Button>
                                    <Button onClick={() => handleShare(mag)}><MessageSquare className="mr-2 h-4 w-4"/>Share on WhatsApp</Button>
                                 </CardFooter>
                            </Card>
                        )})}
                    </div>
                )}
            </div>
        </div>
    );
}
