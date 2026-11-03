# SnazStock SaaS Scaling Roadmap 🚀

This document outlines the architectural and business requirements to transform the current application into a multi-tenant platform centered around the **SnazStock AI** ecosystem.

## 1. Multi-Tenancy Architecture
- **Data Isolation:** Update all Firestore collections (`inventory`, `orders`, `leads`) to include a `storeId`.
- **Security Rules:** Update `firestore.rules` to enforce that users can only read/write documents where the `storeId` matches their assigned tenant.
- **SnazStock Scoping:** Ensure AI segregation and bill matching logic is isolated per store to maintain data privacy.

## 2. Onboarding & Billing
- **Store Creation Wizard:** A self-service portal for new sellers to register, set up their brand, and link their own Razorpay/Stripe keys.
- **Subscription Tiers (SnazStock Pro):**
  - **Basic:** Manual tools only.
  - **SnazStock Pro:** Includes AI Bill Intake, Magic Segregation, and Visual Shelf Audits.
  - **Enterprise:** Multi-location support and custom API access.
- **Credit Logic:** Implement a "Pay-per-Snap" counter to manage LLM and Image generation costs per seller.

## 3. SnazStock AI Advanced Features
- **Bulk CSV Tools:** Capability to import thousands of SKUs from Excel/CSV for big sellers.
- **AI Analytics API:** Webhooks to push SnazStock audit data into the seller's existing ERP/Accounting software.
- **Multi-Staff RBAC:** Granular roles for "Inventory Managers" (SnazStock access) vs "Billing Clerks" (POS access).

## 4. Whitelabeling
- **Custom Domains:** Allow big brands to map their own domains (e.g., `inventory.brandname.com`).
- **Theming Engine:** Dynamic CSS variables that change the dashboard colors and fonts based on the seller's brand identity.

## 5. Global Marketplace (The "Big Idea")
- **Aggregated Discovery:** A central customer-facing portal where users can search for products across *all* SnazStock sellers.
- **Trust Badge:** A unified "SnazStock Verified" badge to provide trust across the entire network of independent sellers.
