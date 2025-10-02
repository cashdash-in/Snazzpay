
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import type { EditableOrder } from '@/app/orders/page';
import { getOrders, type Order as ShopifyOrder } from '@/services/shopify';
import { format } from 'date-fns';
import { Loader2, Printer, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { getCollection, getDocument } from '@/services/firestore';

function mapShopifyOrderToEditableOrder(shopifyOrder: ShopifyOrder): EditableOrder {
    const customer = shopifyOrder.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';
    const products = shopifyOrder.line_items.map(item => item.title).join(', ');

    return {
        id: shopifyOrder.id.toString(), // Internal unique ID
        orderId: shopifyOrder.name,     // Human-readable Order ID like #1001
        customerName,
        customerEmail: customer?.email || undefined,
        customerAddress: shopifyOrder.shipping_address ? `${shopifyOrder.shipping_address.address1}, ${shopifyOrder.shipping_address.city}, ${shopifyOrder.shipping_address.zip}` : 'N/A',
        pincode: shopifyOrder.shipping_address?.zip || 'N/A',
        contactNo: shopifyOrder.customer?.phone || 'N/A',
        productOrdered: products,
        quantity: shopifyOrder.line_items.reduce((sum, item) => sum + item.quantity, 0),
        price: shopifyOrder.total_price,
        paymentStatus: shopifyOrder.financial_status || 'Pending',
        date: format(new Date(shopifyOrder.created_at), "yyyy-MM-dd"),
        source: 'Shopify',
    };
}

const EditableField = ({ value, onChange, className }: { value: string; onChange: (newValue: string) => void; className?: string }) => {
    return (
        <Input 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className={`border-none focus-visible:ring-1 focus-visible:ring-ring p-1 h-auto text-base ${className}`}
        />
    );
};

export default function InvoicePage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const orderIdParam = params.id as string;
    
    const [order, setOrder] = useState<EditableOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState('Thank you for your business. All items are non-refundable.');
    const componentRef = useRef(null);

    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Invoice-${order?.orderId || 'order'}`,
        onAfterPrint: () => toast({ title: 'Print job finished.' }),
    });
    
    useEffect(() => {
        if (!orderIdParam) return;
        
        async function loadOrder() {
            setLoading(true);
            const foundOrder = await getDocument<EditableOrder>('orders', orderIdParam);
            setOrder(foundOrder);
            setLoading(false);
        }
        
        loadOrder();
    }, [orderIdParam]);

    const handleFieldChange = (field: keyof EditableOrder, value: string | number) => {
        setOrder(prev => prev ? { ...prev, [field]: value } : null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!order) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-100 p-4">
                 <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
                 <p className="text-muted-foreground mb-6">The requested order could not be found.</p>
                 <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                </Button>
            </div>
        );
    }
    
    const subtotal = parseFloat(order.price) * order.quantity;
    const total = subtotal;

    return (
        <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6 no-print">
                     <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Order
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print / Save as PDF
                    </Button>
                </div>
                <div ref={componentRef} className="bg-white p-8 sm:p-12 shadow-lg rounded-lg">
                    <header className="flex justify-between items-start pb-8 border-b-2 border-gray-100">
                        <div className="flex items-center gap-4">
                            <ShieldCheck className="h-12 w-12 text-primary" />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">Snazzify.co.in</h1>
                                <p className="text-sm text-gray-500">114B,1st Floor, Robert Compound, Kalina Kolovery Village<br/>Santacruz East, Mumbai 400098</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-extrabold text-gray-700 uppercase">Invoice</h2>
                            <div className="flex items-center justify-end mt-2">
                                <span className="font-semibold text-gray-500 mr-2">Invoice #</span>
                                <EditableField value={order.orderId} onChange={(val) => handleFieldChange('orderId', val)} className="text-right font-bold" />
                            </div>
                        </div>
                    </header>
                    <section className="flex justify-between mt-8">
                        <div>
                            <h4 className="font-semibold text-gray-500 mb-2">Bill To</h4>
                            <EditableField value={order.customerName} onChange={(val) => handleFieldChange('customerName', val)} className="font-bold text-lg" />
                            <div className="text-gray-600">
                               <EditableField value={order.customerAddress} onChange={(val) => handleFieldChange('customerAddress', val)} />
                               <EditableField value={order.pincode} onChange={(val) => handleFieldChange('pincode', val)} />
                               <EditableField value={order.customerEmail || ''} onChange={(val) => handleFieldChange('customerEmail', val)} />
                               <EditableField value={order.contactNo} onChange={(val) => handleFieldChange('contactNo', val)} />
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="flex items-center justify-end">
                                <span className="font-semibold text-gray-500 mr-2">Date:</span>
                                <EditableField value={order.date} onChange={(val) => handleFieldChange('date', val)} className="text-right"/>
                            </div>
                             <div className="flex items-center justify-end mt-1">
                                <span className="font-semibold text-gray-500 mr-2">Payment Status:</span>
                               <EditableField value={order.paymentStatus} onChange={(val) => handleFieldChange('paymentStatus', val)} className="text-right font-medium" />
                            </div>
                        </div>
                    </section>
                    <section className="mt-10">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="p-3 font-semibold text-gray-600">Item</th>
                                    <th className="p-3 text-center font-semibold text-gray-600">Quantity</th>
                                    <th className="p-3 text-right font-semibold text-gray-600">Unit Price</th>
                                    <th className="p-3 text-right font-semibold text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="p-3"><EditableField value={order.productOrdered} onChange={(val) => handleFieldChange('productOrdered', val)} /></td>
                                    <td className="p-3 text-center"><EditableField value={order.quantity.toString()} onChange={(val) => handleFieldChange('quantity', parseInt(val, 10) || 1)} /></td>
                                    <td className="p-3 text-right"><EditableField value={order.price} onChange={(val) => handleFieldChange('price', val)} /></td>
                                    <td className="p-3 text-right font-medium">₹{subtotal.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                    <section className="flex justify-end mt-8">
                        <div className="w-full max-w-xs space-y-2 text-gray-600">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-gray-800 border-t border-gray-200 pt-2">
                                <span>Total</span>
                                <span>₹{total.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground text-right pt-1">Price is inclusive of Shipping and Tax</p>
                        </div>
                    </section>
                    <section className="mt-12">
                         <h4 className="font-semibold text-gray-500 mb-2">Notes</h4>
                         <Textarea 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)}
                            className="text-sm text-gray-600"
                        />
                    </section>
                    <footer className="text-center mt-12 pt-8 border-t-2 border-gray-100 text-sm text-gray-400">
                        <p>Thank you for choosing Snazzify. We appreciate your business.</p>
                        <p>www.snazzify.co.in</p>
                    </footer>
                </div>
            </div>
            <style jsx global>{`
                @media print {
                  .no-print {
                    display: none !important;
                  }
                  body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    background-color: #fff;
                  }
                  .print-container {
                     box-shadow: none;
                     margin: 0;
                     padding: 0;
                  }
                }
            `}</style>
        </div>
    );
}
