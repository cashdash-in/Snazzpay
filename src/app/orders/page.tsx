import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { MandateStatus } from "@/components/mandate-status";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type Order = {
  orderId: string;
  customerName: string;
  amount: number;
  paymentStatus: 'Paid' | 'Pending' | 'COD';
  mandateStatus: 'active' | 'pending' | 'failed' | 'completed' | 'none';
  date: string;
};

const allOrders: Order[] = [
    { orderId: "#3210", customerName: "Olivia Martin", amount: 250.00, paymentStatus: 'COD', mandateStatus: 'active', date: "2023-11-20" },
    { orderId: "#3209", customerName: "Jackson Lee", amount: 150.75, paymentStatus: 'COD', mandateStatus: 'pending', date: "2023-11-19" },
    { orderId: "#3208", customerName: "Isabella Nguyen", amount: 350.00, paymentStatus: 'COD', mandateStatus: 'failed', date: "2023-11-18" },
    { orderId: "#3207", customerName: "William Kim", amount: 450.50, paymentStatus: 'Paid', mandateStatus: 'completed', date: "2023-11-17" },
    { orderId: "#3206", customerName: "Sophia Davis", amount: 550.00, paymentStatus: 'COD', mandateStatus: 'active', date: "2023-11-16" },
    { orderId: "#3205", customerName: "Liam Johnson", amount: 125.00, paymentStatus: 'Paid', mandateStatus: 'none', date: "2023-11-15" },
    { orderId: "#3204", customerName: "Ava Garcia", amount: 275.00, paymentStatus: 'COD', mandateStatus: 'active', date: "2023-11-14" },
];

export default function OrdersPage() {
  return (
    <AppShell title="Orders">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                  <CardTitle>All Orders</CardTitle>
                  <CardDescription>View and manage all orders from your Shopify store.</CardDescription>
              </div>
              <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search orders..." className="pl-8" />
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Payment Status</TableHead>
                <TableHead className="text-center">Mandate Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell className="text-right">₹{order.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'} className={order.paymentStatus === 'Paid' ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {order.mandateStatus !== 'none' ? <MandateStatus status={order.mandateStatus} /> : <Badge variant="outline">N/A</Badge>}
                  </TableCell>
                  <TableCell>{order.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
