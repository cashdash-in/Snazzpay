
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
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  WalletCards,
  ShoppingCart,
  Settings,
  ShieldCheck,
  Bell,
  FileCode,
  Truck,
  Ban,
  CircleDollarSign,
  Users,
  FileSpreadsheet,
  LogIn,
  Video,
  Store,
  Box,
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
} from 'lucide-react';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { useAuth } from '@/hooks/use-auth';
import { getCookie } from 'cookies-next';

const adminCoreMenuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mandates', label: 'Mandates', icon: WalletCards },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/delivery-tracking', label: 'Delivery Tracking', icon: Truck },
  { href: '/cancellations', label: 'Cancellations', icon: Ban },
  { href: '/refunds', label: 'Refunds', icon: CircleDollarSign },
  { href: '/reports', label: 'Reports', icon: FileSpreadsheet },
];

const adminGrowthMenuItems = [
    { href: '/ai-product-uploader', label: 'AI Product Uploader', icon: Wand2 },
    { href: '/seller-accounts', label: 'Seller Accounts', icon: UserCheckIcon },
    { href: '/vendors', label: 'Vendors', icon: Factory },
    { href: '/partner-pay', label: 'Partner Pay', icon: Handshake },
    { href: '/settle', label: 'Settle Code', icon: SendToBack },
    { href: '/partner-cancellations', label: 'Partner Cancellations', icon: ShieldAlert },
    { href: '/logistics-secure', label: 'Logistics Hub', icon: Combine },
];

const adminConfigMenuItems = [
  { href: '/explainer-video', label: 'Explainer Video', icon: Video },
  { href: '/cod-instructions', label: 'Embedding', icon: FileCode },
  { href: '/terms-and-conditions', label: 'Contracts', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const sellerMenuItems = [
    { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/seller/product-drops', label: 'Product Drops', icon: Send },
    { href: '/seller/products', label: 'My Products', icon: Package },
    { href: '/seller/ai-product-uploader', label: 'AI Product Uploader', icon: Sparkles },
    { href: '/seller/orders', label: 'My Orders', icon: ShoppingCart },
    { href: '/seller/resellers', label: 'My Resellers', icon: Users },
    { href: '/seller/earnings', label: 'Earnings', icon: DollarSign },
    { href: '/seller/reports', label: 'Reports', icon: FileSpreadsheet },
    { href: '/seller/settings', label: 'Settings', icon: Settings },
]

const vendorMenuItems = [
    { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/vendor/product-drops', label: 'Product Drops', icon: Send },
    { href: '/vendor/products', label: 'My Products', icon: Package },
    { href: '/vendor/orders', label: 'Orders from Sellers', icon: ShoppingCart },
    { href: '/vendor/settings', label: 'Settings', icon: Settings },
];


export const AppShell: FC<PropsWithChildren<{ title: string }>> = ({ children, title }) => {
  const pathname = usePathname();
  const { triggerRefresh } = usePageRefresh();
  const { user, signOut } = useAuth();
  
  const role = getCookie('userRole');
  const isSeller = role === 'seller';
  const isVendor = role === 'vendor';

  const getMenuItems = () => {
    if (isSeller) {
        return { core: sellerMenuItems, growth: [], config: [] };
    }
    if (isVendor) {
        return { core: vendorMenuItems, growth: [], config: [] };
    }
    // Default to Admin view
    return {
        core: adminCoreMenuItems,
        growth: adminGrowthMenuItems,
        config: adminConfigMenuItems
    };
  }

  const {core, growth, config} = getMenuItems();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-primary bg-primary-foreground hover:bg-primary-foreground/90 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-semibold text-sidebar-foreground">SnazzPay</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {core.map((item) => (
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

          {growth.length > 0 && <SidebarSeparator />}
          
          <SidebarMenu>
            {growth.map((item) => (
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
          
          {config.length > 0 && <SidebarSeparator />}

          <SidebarMenu>
             {config.map((item) => (
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
          {/* Footer content if any */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={triggerRefresh}>
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
                    <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/avatar/100/100"} alt="User avatar" data-ai-hint="user avatar" />
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
                <Link href="/customer/login" target="_blank">
                  <DropdownMenuItem>
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Customer Login</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut(isSeller || isVendor)}>
                  <LogOut className="mr-2 h-4 w-4"/>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};
