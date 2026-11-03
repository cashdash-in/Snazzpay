'use client';
import type {FC, PropsWithChildren} from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  WalletCards,
  ShoppingCart,
  Settings,
  ShieldCheck,
  Bell,
  Truck,
  Ban,
  CircleDollarSign,
  Users,
  FileSpreadsheet,
  LogIn,
  Store,
  Handshake,
  ShieldAlert,
  Combine,
  SendToBack,
  RefreshCw,
  LogOut,
  Package,
  DollarSign,
  FileText,
  UserCheck as UserCheckIcon,
  MessageSquare,
  Sparkles,
  Wand2,
  Factory,
  Send,
  PackagePlus,
  Receipt,
  BookOpen,
  UserPlus,
  Briefcase,
  ShoppingBasket,
  BadgeCheck,
  MonitorCheck,
  ClipboardList,
  Image as LucideImage,
  UsersRound,
  LayoutTemplate,
  Zap,
  Gem,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getCookie } from 'cookies-next';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { getCollection } from '@/services/firestore';
import type { EditableOrder } from '@/types/order';
import { SellerGenee } from '@/components/genee/seller-genee';
import { cn } from '@/lib/utils';

type MenuItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    notificationKey?: 'orders' | 'leads' | 'wholesale';
};

const adminCoreMenuItems: MenuItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/inventory', label: 'Ziptally AI', icon: Zap },
  { href: '/admin/snapstock-licenses', label: 'Ziptally Partners', icon: Gem },
  { href: '/admin/wholesale-inquiries', label: 'Wholesale Requests', icon: ShoppingBasket, notificationKey: 'wholesale' },
  { href: '/mandates', label: 'Mandates', icon: WalletCards },
  { href: '/orders', label: 'Orders', icon: ShoppingCart, notificationKey: 'orders' as const },
  { href: '/leads', label: 'Leads', icon: Users, notificationKey: 'leads' as const },
  { href: '/delivery-tracking', label: 'Delivery Tracking', icon: Truck },
];

const adminGrowthMenuItems: MenuItem[] = [
    { href: '/admin/staff', label: 'Staff Management', icon: UsersRound },
    { href: '/admin/site-builder', label: 'AI Site Builder', icon: MonitorCheck },
    { href: '/admin/widget-builder', label: 'Widget Builder', icon: LayoutTemplate },
    { href: '/ai-product-uploader', label: 'AI Product Uploader', icon: Wand2 },
    { href: '/admin/whatsapp-uploader', label: 'WhatsApp Uploader', icon: MessageSquare },
    { href: '/admin/image-bulk-uploader', label: 'Image Bulk Uploader', icon: LucideImage },
    { href: '/product-drops', label: 'Product Drops', icon: Send },
    { href: '/admin/products', label: 'My Products', icon: Package },
    { href: '/share/magazine', label: 'Smart Magazine', icon: BookOpen },
    { href: '/seller-accounts', label: 'Seller Accounts', icon: UserCheckIcon },
    { href: '/vendors', label: 'Vendors', icon: Factory },
    { href: '/collaborators', label: 'Collaborators', icon: UserPlus },
    { href: '/collaborator-billing', label: 'Collaborator Billing', icon: Briefcase },
    { href: '/partner-pay', label: 'Partner Pay', icon: Handshake },
    { href: '/settle', label: 'Settle Code', icon: SendToBack },
    { href: '/partner-cancellations', label: 'Partner Cancellations', icon: ShieldAlert },
    { href: '/logistics-secure', label: 'Logistics Hub', icon: Combine },
];

const adminConfigMenuItems: MenuItem[] = [
  { href: '/billing', label: 'Billing & Usage', icon: Receipt },
  { href: '/terms-and-conditions', label: 'Contracts', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const partnerMenuItems: MenuItem[] = [
    { href: '/ziptally/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/ziptally/audit', label: 'Shelf Audit', icon: ShieldCheck },
    { href: '/ai-product-uploader', label: 'AI Product Uploader', icon: Sparkles },
    { href: '/share/magazine', label: 'Smart Magazine', icon: BookOpen },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
];

const sellerMenuItems: MenuItem[] = [
    { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/seller/leads', label: 'Leads', icon: Users, notificationKey: 'leads' as const },
    { href: '/seller/product-drops', label: 'Product Drops', icon: Send },
    { href: '/seller/products', label: 'My Products', icon: Package },
    { href: '/share/magazine', label: 'Smart Magazine', icon: BookOpen },
    { href: '/seller/ai-product-uploader', label: 'AI Product Uploader', icon: Sparkles },
    { href: '/seller/orders', label: 'My Orders', icon: ShoppingCart, notificationKey: 'orders' as const },
    { href: '/seller/logistics', label: 'Logistics Hub', icon: Truck },
    { href: '/seller/collaborators', label: 'My Collaborators', icon: UserPlus },
    { href: '/collaborator-billing', label: 'Collaborator Billing', icon: Briefcase },
    { href: '/seller/earnings', label: 'Earnings', icon: DollarSign },
    { href: '/seller/reports', label: 'Reports', icon: FileSpreadsheet },
    { href: '/seller/settings', label: 'Settings', icon: Settings },
]

const vendorMenuItems: MenuItem[] = [
    { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/vendor/wholesale-inquiries', label: 'Wholesale Requests', icon: BadgeCheck, notificationKey: 'wholesale' },
    { href: '/vendor/product-drops', label: 'Product Drops', icon: PackagePlus },
    { href: '/vendor/products', label: 'My Products', icon: Package },
    { href: '/share/magazine', label: 'Smart Magazine', icon: BookOpen },
    { href: '/vendor/ai-product-uploader', label: 'AI Product Uploader', icon: Sparkles },
    { href: '/vendor/orders', label: 'Orders from Sellers', icon: ShoppingCart },
    { href: '/vendor/logistics', label: 'Logistics Hub', icon: Truck },
    { href: '/vendor/sellers', label: 'My Sellers', icon: Users },
    { href: '/vendor/collaborators', label: 'My Collaborators', icon: UserPlus },
     { href: '/collaborator-billing', label: 'Collaborator Billing', icon: Briefcase },
    { href: '/vendor/earnings', label: 'Earnings', icon: DollarSign },
    { href: '/vendor/reports', label: 'Reports', icon: FileSpreadsheet },
    { href: '/vendor/settings', label: 'Settings', icon: Settings },
];

const collaboratorMenuItems: MenuItem[] = [
    { href: '/collaborator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/collaborator/magazines', label: 'Magazines', icon: BookOpen },
    { href: '/collaborator/orders', label: 'My Order Requests', icon: Package },
    { href: '/collaborator/leads', label: 'My Leads', icon: Users },
    { href: '/collaborator/commissions', label: 'My Commissions', icon: DollarSign },
    { href: '/collaborator/reports', label: 'My Reports', icon: FileSpreadsheet },
];

export const AppShell: FC<PropsWithChildren<{ title: string }>> = ({ children, title }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [notificationCounts, setNotificationCounts] = useState({ orders: 0, leads: 0, wholesale: 0 });

  useEffect(() => {
    setMounted(true);
    setRole(getCookie('userRole') as string);
    
    const fetchCounts = async () => {
        if (!user) return;

        try {
            const [allOrders, allLeads, allWholesale] = await Promise.all([
                getCollection<EditableOrder>('orders'),
                getCollection<EditableOrder>('leads'),
                getCollection<any>('wholesale_inquiries')
            ]);
            
            let newOrdersCount = 0;
            let newLeadsCount = 0;
            let newWholesaleCount = 0;

            const currentRole = getCookie('userRole');

            if (currentRole === 'admin') {
                newOrdersCount = allOrders.filter(o => o.isRead === false).length;
                newLeadsCount = allLeads.filter(l => l.isRead === false && ['Lead', 'Intent Verified', 'Enquiry'].includes(l.paymentStatus)).length;
                newWholesaleCount = allWholesale.filter((w: any) => w.isReadByAdmin === false).length;
            } else if (currentRole === 'seller') {
                 newOrdersCount = allOrders.filter(o => o.sellerId === user.uid && o.isRead === false).length;
                 newLeadsCount = allLeads.filter(l => l.sellerId === user.uid && l.isRead === false && ['Lead', 'Intent Verified', 'Enquiry'].includes(l.paymentStatus)).length;
            } else if (currentRole === 'vendor') {
                newWholesaleCount = allWholesale.filter((w: any) => w.vendorId === user.uid && w.status === 'Pending').length;
            }

            setNotificationCounts({ orders: newOrdersCount, leads: newLeadsCount, wholesale: newWholesaleCount });
        } catch (error) {
            console.error("Failed to fetch notification counts", error);
        }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);

  }, [pathname, user]);

  const getMenuItems = () => {
    if (!mounted) return { core: [], growth: [], config: [] };

    switch (role) {
      case 'seller':
        return { core: sellerMenuItems, growth: [], config: [] };
      case 'vendor':
        return { core: vendorMenuItems, growth: [], config: [] };
      case 'collaborator':
        return { core: collaboratorMenuItems, growth: [], config: [] };
      case 'snapstock_partner':
        return { 
          core: partnerMenuItems, 
          growth: [], 
          config: [] 
        };
      default: // Admin view
        return {
            core: adminCoreMenuItems,
            growth: adminGrowthMenuItems,
            config: adminConfigMenuItems
        };
    }
  }

  const {core, growth, config} = getMenuItems();

  const isPartner = role === 'snapstock_partner';
  const logoText = isPartner ? "Ziptally" : "SnazzPay";
  const taglineText = isPartner ? "Zip your Stock with AI" : "Admin Central";

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black italic tracking-tighter text-sidebar-foreground uppercase leading-none">{logoText}</h1>
              <span className="text-[7px] font-bold uppercase tracking-widest text-primary">{taglineText}</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {core.map((item) => {
              const count = item.notificationKey ? notificationCounts[item.notificationKey] : 0;
              return (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span className="flex-grow">{item.label}</span>
                     {count > 0 && <Badge className="h-5">{count}</Badge>}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )})}
          </SidebarMenu>

          {growth && growth.length > 0 && <SidebarSeparator />}
          
          <SidebarMenu>
            {growth && growth.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          
          {config && config.length > 0 && <SidebarSeparator />}

          <SidebarMenu>
             {config && config.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.refresh()}>
              <RefreshCw className="h-5 w-5" />
              <span className="sr-only">Refresh Data</span>
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/avatar/100/100"} alt="User avatar" />
                    <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user?.displayName || user?.email || "My Account"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                 <Link href="/seller/login" target="_blank">
                  <DropdownMenuItem>
                    <Store className="mr-2 h-4 w-4" />
                    <span>Seller Login</span>
                  </DropdownMenuItem>
                </Link>
                 <Link href="/vendor/login" target="_blank">
                  <DropdownMenuItem>
                    <Factory className="mr-2 h-4 w-4" />
                    <span>Vendor Login</span>
                  </DropdownMenuItem>
                </Link>
                 <Link href="/partner-pay/login" target="_blank">
                  <DropdownMenuItem>
                    <Handshake className="mr-2 h-4 w-4" />
                    <span>Partner Login</span>
                  </DropdownMenuItem>
                </Link>
                 <Link href="/logistics-secure/login" target="_blank">
                  <DropdownMenuItem>
                    <Truck className="mr-2 h-4 w-4" />
                    <span>Logistics Login</span>
                  </DropdownMenuItem>
                </Link>
                 <Link href="/collaborator/login" target="_blank">
                  <DropdownMenuItem>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Collaborator Login</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/customer/login" target="_blank">
                  <DropdownMenuItem>
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Customer Login</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4"/>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 relative">
          {children}
        </main>

        {mounted && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-2 z-50">
                <Link href="/" className={cn("flex flex-col items-center gap-1", pathname === '/' ? "text-primary" : "text-slate-400")}>
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
                </Link>
                <Link href="/admin/inventory" className={cn("flex flex-col items-center gap-1", pathname === '/admin/inventory' ? "text-primary" : "text-slate-400")}>
                    <Zap className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Stock</span>
                </Link>
                <div className="relative -top-6">
                    <Button className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40 border-4 border-white" onClick={() => router.push('/ai-product-uploader')}>
                        <Sparkles className="h-6 w-6" />
                    </Button>
                </div>
                <Link href="/orders" className={cn("flex flex-col items-center gap-1", pathname === '/orders' ? "text-primary" : "text-slate-400")}>
                    <ShoppingCart className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Orders</span>
                </Link>
                <Link href="/settings" className={cn("flex flex-col items-center gap-1", pathname === '/settings' ? "text-primary" : "text-slate-400")}>
                    <Settings className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Settings</span>
                </Link>
            </div>
        )}

        <SellerGenee />
      </SidebarInset>
    </SidebarProvider>
  );
};
