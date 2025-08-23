
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
} from 'lucide-react';

const coreMenuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mandates', label: 'Mandates', icon: WalletCards },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/delivery-tracking', label: 'Delivery Tracking', icon: Truck },
  { href: '/cancellations', label: 'Cancellations', icon: Ban },
  { href: '/refunds', label: 'Refunds', icon: CircleDollarSign },
  { href: '/reports', label: 'Reports', icon: FileSpreadsheet },
];

const growthMenuItems = [
    { href: '/partner-pay', label: 'Partner Pay', icon: Handshake },
    { href: '/partner-cancellations', label: 'Partner Cancellations', icon: ShieldAlert },
    { href: '/logistics-secure', label: 'Logistics Hub', icon: Combine },
];

const configMenuItems = [
  { href: '/explainer-video', label: 'Explainer Video', icon: Video },
  { href: '/cod-instructions', label: 'Embedding', icon: FileCode },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const AppShell: FC<PropsWithChildren<{ title: string }>> = ({ children, title }) => {
  const pathname = usePathname();

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
            {coreMenuItems.map((item) => (
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
          <SidebarSeparator />
           <SidebarMenu>
            {growthMenuItems.map((item) => (
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
           <SidebarSeparator />
          <SidebarMenu>
             {configMenuItems.map((item) => (
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
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src="https://placehold.co/100x100.png" alt="User avatar" data-ai-hint="user avatar" />
                    <AvatarFallback>SP</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
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
                <DropdownMenuItem>Logout</DropdownMenuItem>
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
