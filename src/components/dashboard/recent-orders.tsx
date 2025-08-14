
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { MandateStatus } from "@/components/mandate-status";
import { getOrders, type Order as ShopifyOrder } from "@/services/shopify";
import { format } from "date-fns";


type Order = {
  orderId: string;
  customerName: string;
  amount: number;
  status: 'active' | 'pending' | 'failed' | 'completed' | 'none';
  date: string;
};

function mapShopifyOrderToAppOrder(shopifyOrder: ShopifyOrder): Order {
    const customer = shopifyOrder.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';

    return {
        orderId: shopifyOrder.name,
        customerName,
        amount: parseFloat(shopifyOrder.total_price),
        status: 'none', // This needs to be determined based on your app's logic
        date: format(new Date(shopifyOrder.created_at), "yyyy-MM-dd"),
    };
}


export async function RecentOrders() {
  const shopifyOrders = await getOrders();
  const orders: Order[] = shopifyOrders.slice(0, 5).map(mapShopifyOrderToAppOrder);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>A list of recent orders from your Shopify store.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Mandate Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.orderId}>
                <TableCell className="font-medium">{order.orderId}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell className="text-right">₹{order.amount.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  {order.status !== 'none' ? <MandateStatus status={order.status} /> : <Badge variant="outline">N/A</Badge>}
                </TableCell>
                <TableCell>{order.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
