# SnazzPay SaaS Scaling Roadmap 🚀

This document outlines the architectural and business requirements to transform the current application into a multi-tenant platform for "Small and Big Sellers."

## 1. Multi-Tenancy Architecture
- **Data Isolation:** Update all Firestore collections (`inventory`, `orders`, `leads`) to include a `storeId`.
- **Security Rules:** Update `firestore.rules` to enforce that users can only read/write documents where the `storeId` matches their assigned tenant.
- **Middleware Scoping:** Update `middleware.ts` to detect the tenant from the URL or user profile and route requests accordingly.

## 2. Onboarding & Billing
- **Store Creation Wizard:** A self-service portal for new sellers to register, set up their brand, and link their own Razorpay/Stripe keys.
- **Subscription Tiers:**
  - **Basic:** Manual tools only.
  - **AI Pro:** Includes AI Bill Intake, Magic Segregation, and Social Ad Studio.
  - **Enterprise:** Multi-location support and custom API access.
- **Credit Logic:** Implement an `ai_credits` counter to manage LLM and Image generation costs per seller.

## 3. Advanced Feature Set for Big Sellers
- **Bulk CSV Tools:** Capability to import thousands of SKUs from Excel/CSV.
- **Advanced Permissions:** Granular roles (Admin, Manager, Cashier, Delivery Boy).
- **Warehouse Management:** Support for multiple "Shelves" and "Locations" across different physical warehouses.
- **Analytics API:** Webhooks to push order data into the seller's existing ERP/Accounting software.

## 4. Whitelabeling
- **Custom Domains:** Allow big brands to map their own domains (e.g., `orders.brandname.com`).
- **Theming Engine:** Dynamic CSS variables that change the dashboard colors and fonts based on the seller's brand identity.

## 5. Global Marketplace (The "Big Idea")
- **Aggregated Discovery:** A central customer-facing portal where users can search for products across *all* SnazzPay sellers.
- **Trust Badge:** A unified "Snazzify Verified" badge to provide trust across the entire network of independent sellers.
