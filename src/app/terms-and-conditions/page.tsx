
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, MessageSquare, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function TermsAndConditionsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const handleShare = (termType: 'seller' | 'partner-pay' | 'logistics', method: 'link' | 'email' | 'whatsapp') => {
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/terms/${termType}`;
        const subject = `SnazzPay Business Agreement for ${termType.replace('-', ' ')}`;
        const body = `Please review the terms of our business agreement here: ${url}`;

        if (method === 'link') {
            navigator.clipboard.writeText(url);
            toast({
                title: "Link Copied!",
                description: "The link to the agreement has been copied to your clipboard.",
            });
        } else if (method === 'email') {
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        } else if (method === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-3xl shadow-lg">
                <CardHeader className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Contracts & Agreements</CardTitle>
                    <CardDescription>View and share the business agreements for all stakeholders.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg">For Sellers</CardTitle>
                            <CardDescription>The master service agreement for sellers using the SnazzPay platform.</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-between items-center">
                             <Link href="/terms/seller" passHref>
                                <Button variant="outline">View Contract</Button>
                             </Link>
                             <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => handleShare('seller', 'link')}>Copy Link</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleShare('seller', 'email')}><Mail className="h-4 w-4"/></Button>
                                <Button size="sm" variant="secondary" onClick={() => handleShare('seller', 'whatsapp')}><MessageSquare className="h-4 w-4"/></Button>
                             </div>
                        </CardFooter>
                    </Card>
                     <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg">For Partner Pay Agents</CardTitle>
                            <CardDescription>Agreement for agents in the Snazzify Coin and Shakti Card network.</CardDescription>
                        </CardHeader>
                         <CardFooter className="flex justify-between items-center">
                             <Link href="/terms/partner-pay" passHref>
                                <Button variant="outline">View Contract</Button>
                             </Link>
                             <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => handleShare('partner-pay', 'link')}>Copy Link</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleShare('partner-pay', 'email')}><Mail className="h-4 w-4"/></Button>
                                <Button size="sm" variant="secondary" onClick={() => handleShare('partner-pay', 'whatsapp')}><MessageSquare className="h-4 w-4"/></Button>
                             </div>
                        </CardFooter>
                    </Card>
                     <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-lg">For Logistics Partners</CardTitle>
                            <CardDescription>Agreement for courier and delivery partners managing shipments.</CardDescription>
                        </CardHeader>
                         <CardFooter className="flex justify-between items-center">
                             <Link href="/terms/logistics" passHref>
                                <Button variant="outline">View Contract</Button>
                             </Link>
                             <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => handleShare('logistics', 'link')}>Copy Link</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleShare('logistics', 'email')}><Mail className="h-4 w-4"/></Button>
                                <Button size="sm" variant="secondary" onClick={() => handleShare('logistics', 'whatsapp')}><MessageSquare className="h-4 w-4"/></Button>
                             </div>
                        </CardFooter>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}
