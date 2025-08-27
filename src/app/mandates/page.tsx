
'use client';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { MandateStatus } from "@/components/mandate-status";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { format } from "date-fns";
import { useEffect, useState, useCallback } from "react";
import type { EditableOrder } from "../orders/page";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";

type Mandate = {
  id: string;
  orderId: string;
  orderLink: string;
  customerName: string;
  contactNo: string;
  amount: string;
  productOrdered: string;
  status: 'active' | 'pending' | 'failed' | 'completed' | 'halted' | 'cancelled' | 'created' | 'intent-verified';
  createdAt: string;
  nextBilling: string;
};

// Map payment status from order to a mandate status
function mapPaymentStatusToMandateStatus(paymentStatus: string): Mandate['status'] {
    switch (paymentStatus.toLowerCase()) {
        case 'authorized':
            return 'active';
        case 'paid':
            return 'completed';
        case 'pending':
            return 'pending';
        case 'voided':
            return 'cancelled';
        case 'refunded':
            return 'halted';
        case 'intent verified':
            return 'intent-verified';
        default:
            return 'created';
    }
}


export default function MandatesPage() {
  const [allMandates, setAllMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAndSetOrders = useCallback(async () => {
    setLoading(true);
    let combinedOrders: EditableOrder[] = [];
    try {
        const shopifyOrders = await getOrders();
        const shopifyEditableOrders: EditableOrder[] = shopifyOrders.map(o => ({
            id: o.id.toString(),
            orderId: o.name,
            customerName: `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim(),
            customerAddress: '',
            pincode: '',
            contactNo: o.customer?.phone || 'N/A',
            productOrdered: o.line_items.map(item => item.title).join(', '),
            quantity: o.line_items.reduce((sum, item) => sum + item.quantity, 0),
            price: o.total_price,
            paymentStatus: o.financial_status || 'pending',
            date: format(new Date(o.created_at), "yyyy-MM-dd"),
        }));
        combinedOrders = [...shopifyEditableOrders];
    } catch (error) {
        console.error("Failed to fetch Shopify orders:", error);
        toast({
            variant: 'destructive',
            title: "Failed to load Shopify Orders",
            description: "Displaying manually added orders only. Check Shopify API keys in Settings.",
        });
    }

    try {
        const manualOrdersJSON = localStorage.getItem('manualOrders');
        const manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
        combinedOrders = [...combinedOrders, ...manualOrders];
    } catch (error) {
        console.error("Failed to load manual orders:", error);
        toast({
            variant: 'destructive',
            title: "Error loading manual orders",
            description: "Could not load orders from local storage.",
        });
    }

    const orderGroups = new Map<string, EditableOrder[]>();
    combinedOrders.forEach(order => {
        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${order.id}`) || '{}');
        const finalOrder = { ...order, ...storedOverrides };
        const group = orderGroups.get(finalOrder.orderId) || [];
        group.push(finalOrder);
        orderGroups.set(finalOrder.orderId, group);
    });

    const unifiedOrders: EditableOrder[] = [];
    orderGroups.forEach((group) => {
        let representativeOrder = group.reduce((acc, curr) => ({ ...acc, ...curr }), group[0]);

        const hasVoided = group.some(o => o.paymentStatus === 'Voided' || o.cancellationStatus === 'Processed');
        const hasRefunded = group.some(o => o.paymentStatus === 'Refunded' || o.refundStatus === 'Processed');

        if (hasVoided) {
            representativeOrder.paymentStatus = 'Voided';
        } else if (hasRefunded) {
            representativeOrder.paymentStatus = 'Refunded';
        }
        
        const sharedCancellationId = group.find(o => o.cancellationId)?.cancellationId;
        if (sharedCancellationId) {
            representativeOrder.cancellationId = sharedCancellationId;
        } else {
             representativeOrder.cancellationId = `CNCL-${uuidv4().substring(0, 8).toUpperCase()}`;
        }

        unifiedOrders.push(representativeOrder);
    });

    const mandates: Mandate[] = unifiedOrders
        .map(order => ({
            id: order.id,
            orderId: order.orderId,
            orderLink: `/orders/${order.id}`,
            customerName: order.customerName,
            contactNo: order.contactNo,
            amount: order.price,
            productOrdered: order.productOrdered,
            status: mapPaymentStatusToMandateStatus(order.paymentStatus),
            createdAt: order.date,
            nextBilling: 'N/A' // This data isn't available on the order
        }));

    setAllMandates(mandates);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAndSetOrders();
  }, [fetchAndSetOrders]);

    const sendWhatsAppReminder = (mandate: Mandate) => {
        const secureUrl = `${window.location.origin}/secure-cod?amount=${encodeURIComponent(mandate.amount)}&name=${encodeURIComponent(mandate.productOrdered)}&order_id=${encodeURIComponent(mandate.orderId)}`;
        const message = `Hi ${mandate.customerName}, please complete the payment for your Snazzify order ${mandate.orderId} by clicking this secure link: ${secureUrl}`;
        const whatsappUrl = `https://wa.me/${mandate.contactNo}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

  return (
    <AppShell title="Mandates">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Mandate Management</CardTitle>
              <CardDescription>View status of all payment authorizations. Includes 'Intent Verified', 'Authorized', and 'Paid' orders.</CardDescription>
            </div>
             <Button variant="outline" onClick={fetchAndSetOrders}>
                <RefreshCw className="mr-2 h-4 w-4"/>
                Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Max Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allMandates.map((mandate) => (
                <TableRow key={mandate.id}>
                  <TableCell>
                      <Link href={mandate.orderLink} className="font-medium text-primary hover:underline cursor-pointer">
                          {mandate.orderId}
                      </Link>
                  </TableCell>
                  <TableCell>{mandate.customerName}</TableCell>
                  <TableCell>₹{mandate.amount}</TableCell>
                  <TableCell className="text-center">
                    <MandateStatus status={mandate.status} />
                  </TableCell>
                  <TableCell>{mandate.createdAt}</TableCell>
                  <TableCell className="text-right">
                    {mandate.status === 'intent-verified' && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => sendWhatsAppReminder(mandate)}
                            disabled={!mandate.contactNo}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Remind
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
