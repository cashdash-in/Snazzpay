
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

type PartnerCancellation = {
    id: string;
    customerName: string;
    customerPhone: string;
    value: number;
    date: string;
    sellerTransactionCode?: string;
    requestDate: string;
    status: 'Refund Requested' | 'Refunded';
};

export default function PartnerCancellationsPage() {
  const [requests, setRequests] = useState<PartnerCancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    try {
        const cancellationsJSON = localStorage.getItem('partnerCancellations');
        const loadedCancellations: PartnerCancellation[] = cancellationsJSON ? JSON.parse(cancellationsJSON) : [];
        setRequests(loadedCancellations);
    } catch (error) {
        console.error("Failed to load partner cancellations:", error);
        toast({
            variant: 'destructive',
            title: "Error loading data",
            description: "Could not load cancellation requests from local storage.",
        });
    }
    setLoading(false);
  }, [toast]);

  const handleApproveRefund = (req: PartnerCancellation) => {
    // In a real app, this would trigger the refund and then update the state.
    // Here, we just update the state to simulate approval.
    
    // Update the original transaction in the partner's transaction list
    const partnerTransactionsJSON = localStorage.getItem('partnerTransactions');
    if (partnerTransactionsJSON) {
        let partnerTransactions = JSON.parse(partnerTransactionsJSON);
        partnerTransactions = partnerTransactions.map((tx: any) => 
            tx.id === req.id ? { ...tx, status: 'Refunded' as const } : tx
        );
        localStorage.setItem('partnerTransactions', JSON.stringify(partnerTransactions));
    }
    
    // Update the request itself to show as refunded
    const updatedRequests = requests.map(r => r.id === req.id ? {...r, status: 'Refunded' as const } : r);
    setRequests(updatedRequests);
    localStorage.setItem('partnerCancellations', JSON.stringify(updatedRequests));

    toast({
      title: "Refund Approved",
      description: `The refund for transaction ${req.id} has been marked as processed.`,
    });
  };

  return (
    <AppShell title="Partner Cancellation Requests">
      <Card>
        <CardHeader>
          <CardTitle>Partner Refund Requests</CardTitle>
          <CardDescription>Review and approve refund requests submitted by your partners for orders cancelled after 24 hours.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Partner Tx ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Original Tx Date</TableHead>
                  <TableHead>Seller Tx Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length > 0 ? requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{format(parseISO(req.requestDate), 'PPp')}</TableCell>
                    <TableCell className="font-medium">{req.id}</TableCell>
                    <TableCell>{req.customerName} ({req.customerPhone})</TableCell>
                    <TableCell>₹{req.value}</TableCell>
                    <TableCell>{format(parseISO(req.date), 'PPp')}</TableCell>
                    <TableCell className="font-mono text-xs">{req.sellerTransactionCode}</TableCell>
                    <TableCell>
                        <Badge variant={req.status === 'Refunded' ? 'default' : 'destructive'}>
                            {req.status === 'Refunded' ? <CheckCircle className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}
                            {req.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                        <Button 
                            size="sm"
                            onClick={() => handleApproveRefund(req)}
                            disabled={req.status === 'Refunded'}
                        >
                           {req.status === 'Refunded' ? 'Approved' : 'Approve Refund'}
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                     <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No pending cancellation requests from partners.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
