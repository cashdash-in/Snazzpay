
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, Gem, History, Percent } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { sanitizePhoneNumber } from '@/lib/utils';
import { ShaktiCard, ShaktiCardData } from '@/components/shakti-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getCollection } from '@/services/firestore';


export default function ShaktiCardDetailsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [shaktiCard, setShaktiCard] = useState<ShaktiCardData | null>(null);

    useEffect(() => {
        const loggedInMobile = localStorage.getItem('loggedInUserMobile');
        if (!loggedInMobile) {
            router.push('/customer/login');
            return;
        }

        async function fetchCard(mobile: string) {
            if (!mobile) {
                toast({ variant: 'destructive', title: "Authentication Error", description: "Could not identify logged in user."});
                setIsLoading(false);
                return;
            }

            try {
                const sanitizedMobile = sanitizePhoneNumber(mobile);
                const allCards = await getCollection<ShaktiCardData>('shakti_cards');
                const customerCard = allCards.find(card => card.customerPhone === sanitizedMobile);
                
                if (customerCard) {
                    setShaktiCard(customerCard);
                } else {
                    toast({ variant: 'destructive', title: "No Card Found", description: "We couldn't find a Shakti Card associated with your account."});
                    router.push('/customer/dashboard');
                }
            } catch (e) {
                toast({ variant: 'destructive', title: "Error", description: "Could not fetch your card details."});
            } finally {
                setIsLoading(false);
            }
        }
        
        fetchCard(loggedInMobile);
        
    }, [router, toast]);


    if (isLoading || !shaktiCard) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                 <header className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">My Shakti Card</h1>
                        <p className="text-muted-foreground">Your rewards, benefits, and transaction history.</p>
                    </div>
                </header>

                <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <ShaktiCard card={shaktiCard} />
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Rewards</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                 <div className="p-4 bg-blue-50 rounded-lg text-center">
                                    <Gem className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold">{shaktiCard.points}</p>
                                    <p className="text-sm text-muted-foreground">Points Balance</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg text-center">
                                    <Gift className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold">₹{shaktiCard.cashback.toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">Cashback Earned</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Benefits &amp; How to Use</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>
                                            <div className="flex items-center gap-2"><Gem className="h-4 w-4 text-blue-500"/>How do I earn points?</div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            You earn points on every transaction made through a Partner Pay agent where you use your Shakti Card. The current earning rate is set by the admin.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>
                                            <div className="flex items-center gap-2"><Percent className="h-4 w-4 text-destructive"/>How do I use my points for discounts?</div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            When you are paying a Partner Pay agent, provide them with your Shakti Card number. They will verify your card and be able to see your available discount. You can then choose to apply the discount to your current purchase. 10 points usually equals ₹1 discount.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-3">
                                         <AccordionTrigger>
                                            <div className="flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground"/>Where can I see my transaction history?</div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            A detailed transaction history showing where you earned and spent your points will be available here soon.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}

    
