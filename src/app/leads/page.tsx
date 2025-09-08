
'use client';

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Send, Loader2 as ButtonLoader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableOrder } from '../orders/page';
import { format } from "date-fns";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { saveOrder } from "@/services/firestore";
import { v4 as uuidv4 } from "uuid";


export default function LeadsPage() {
  const [leads, setLeads] = useState<EditableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingLinkId, setSendingLinkId] = useState<string | null>(null);
  const { toast } = useToast();
  const { refreshKey } = usePageRefresh();

  const fetchAndSetLeads = useCallback(() => {
    setLoading(true);
    try {
        const leadsJSON = localStorage.getItem('leads');
        const loadedLeads: EditableOrder[] = leadsJSON ? JSON.parse(leadsJSON) : [];
        setLeads(loadedLeads);
    } catch (error) {
        console.error("Failed to load leads:", error);
        toast({
            variant: 'destructive',
            title: "Error loading leads",
            description: "Could not load leads from local storage.",
        });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAndSetLeads();
  }, [fetchAndSetLeads, refreshKey]);
  
  const handleRemoveLead = (leadId: string) => {
    const updatedLeads = leads.filter(lead => lead.id !== leadId);
    setLeads(updatedLeads);
    localStorage.setItem('leads', JSON.stringify(updatedLeads));
    toast({
        variant: 'destructive',
        title: "Lead Removed",
        description: "The lead has been removed successfully.",
    });
  };

  const handleSendLink = async (lead: EditableOrder) => {
    setSendingLinkId(lead.id);
    try {
        const response = await fetch('/api/create-payment-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: lead.price,
                customerName: lead.customerName,
                customerContact: lead.contactNo,
                customerEmail: lead.customerEmail,
                orderId: lead.orderId,
                productName: lead.productOrdered,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to send payment link.');
        }

        toast({
            title: "Payment Link Sent!",
            description: result.message,
        });

    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: "Error Sending Link",
            description: error.message,
        });
    } finally {
        setSendingLinkId(null);
    }
  };

  const handleConvertToOrder = async (lead: EditableOrder) => {
    try {
        const newOrder = {
            ...lead,
            id: uuidv4(), // Assign a unique ID for React keys and local storage
            paymentStatus: 'Pending', // Set as a pending manual order
            source: 'Manual' as const,
        };
        
        // Save to localStorage as a manual order
        const manualOrdersJSON = localStorage.getItem('manualOrders');
        let manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
        manualOrders.push(newOrder);
        localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
        
        handleRemoveLead(lead.id); // Remove from leads after converting

        toast({
            title: "Converted to Order",
            description: `Lead for ${lead.customerName} has been converted to an order. It will now appear in the main orders list.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Error Converting Lead",
            description: error.message,
        });
    }
  };

  return (
    <AppShell title="Leads from Secure COD">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Intent Verified Leads</CardTitle>
              <CardDescription>Customers who completed ₹1 verification but did not complete the final authorization. Follow up to convert them!</CardDescription>
            </div>
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
                  <TableHead>Captured On</TableHead>
                  <TableHead>Original Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contact No</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Product(s)</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.date}</TableCell>
                    <TableCell className="font-medium">{lead.orderId}</TableCell>
                    <TableCell>{lead.customerName}</TableCell>
                    <TableCell>{lead.customerEmail}</TableCell>
                    <TableCell>{lead.contactNo}</TableCell>
                    <TableCell>{lead.customerAddress}, {lead.pincode}</TableCell>
                    <TableCell>{lead.productOrdered}</TableCell>
                    <TableCell>₹{lead.price}</TableCell>
                    <TableCell className="text-center space-x-2">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleSendLink(lead)}
                            disabled={sendingLinkId === lead.id}
                        >
                            {sendingLinkId === lead.id ? <ButtonLoader className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send Payment Link
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleConvertToOrder(lead)}
                        >
                            Convert to Order
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleRemoveLead(lead.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
