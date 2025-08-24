
'use client';

import { useState } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import type { PartnerData } from '../partner-pay/page';

type CashCode = {
    code: string;
    amount: number;
    partnerId: string;
    partnerName: string;
    status: 'Pending' | 'Settled';
};

export default function SettleCodePage() {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifiedCode, setVerifiedCode] = useState<CashCode | null>(null);
    const { toast } = useToast();

    const handleVerifyCode = () => {
        setIsVerifying(true);
        setVerifiedCode(null);
        
        // Simulate API call to verify code
        setTimeout(() => {
            const allCodesJSON = localStorage.getItem('cashCodes');
            const allCodes: CashCode[] = allCodesJSON ? JSON.parse(allCodesJSON) : [];
            const foundCode = allCodes.find(c => c.code === code && c.status === 'Pending');

            if (foundCode) {
                setVerifiedCode(foundCode);
                 toast({ title: "Code Verified", description: `Pending collection of ₹${foundCode.amount} from ${foundCode.partnerName}.` });
            } else {
                toast({ variant: 'destructive', title: "Invalid Code", description: "This code is invalid, already settled, or does not exist." });
            }
            setIsVerifying(false);
        }, 500);
    };
    
    const handleSettleCode = () => {
        if (!verifiedCode) return;
        setIsLoading(true);

        // Simulate API call to settle code
        setTimeout(() => {
            // Update code status
            const allCodesJSON = localStorage.getItem('cashCodes');
            let allCodes: CashCode[] = allCodesJSON ? JSON.parse(allCodesJSON) : [];
            allCodes = allCodes.map(c => c.code === verifiedCode.code ? { ...c, status: 'Settled' } : c);
            localStorage.setItem('cashCodes', JSON.stringify(allCodes));

            // Update partner balance
            const allPartnersJSON = localStorage.getItem('payPartners');
            let allPartners: PartnerData[] = allPartnersJSON ? JSON.parse(allPartnersJSON) : [];
            allPartners = allPartners.map(p => p.id === verifiedCode.partnerId ? { ...p, balance: p.balance + verifiedCode.amount, totalCollected: p.totalCollected + verifiedCode.amount } : p);
            localStorage.setItem('payPartners', JSON.stringify(allPartners));

            toast({ title: "Settlement Successful", description: `₹${verifiedCode.amount} has been settled and partner balance updated.` });
            
            setVerifiedCode(null);
            setCode('');
            setIsLoading(false);
        }, 1000);
    };

    return (
        <AppShell title="Settle Partner Cash Code">
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Settle Collection Code</CardTitle>
                    <CardDescription>
                        Enter the 8-digit code provided by the Partner Pay agent to verify and settle their cash collection.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="e.g., CASH-4B7X" 
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            disabled={!!verifiedCode}
                        />
                        <Button onClick={handleVerifyCode} disabled={isVerifying || !code || !!verifiedCode}>
                             {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                        </Button>
                    </div>
                    
                    {verifiedCode && (
                        <Card className="bg-muted/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle /> Code Verified</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p><strong>Partner:</strong> {verifiedCode.partnerName} ({verifiedCode.partnerId})</p>
                                <p><strong>Amount to Collect:</strong> <span className="font-bold text-2xl">₹{verifiedCode.amount.toFixed(2)}</span></p>
                                <p className="text-xs text-muted-foreground">Please confirm you have collected this exact amount in cash from the partner before proceeding.</p>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button onClick={handleSettleCode} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Confirm and Settle
                                </Button>
                                <Button variant="outline" onClick={() => { setVerifiedCode(null); setCode(''); }}>Cancel</Button>
                            </CardFooter>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}
