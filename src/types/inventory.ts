/**
 * @fileOverview Core types for the Inventory Intelligence system.
 */

export type MovementType = 
    | 'Opening' 
    | 'Purchase' 
    | 'Sale' 
    | 'Damage' 
    | 'Return to Supplier' 
    | 'Customer Return' 
    | 'Adjustment';

export interface StockMovement {
    id: string;
    productId: string;
    type: MovementType;
    quantity: number; // Positive for additions, negative for deductions
    date: string;
    note?: string;
    previousStock: number;
    newStock: number;
}

export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    wholesalePrice: number;
    mrp: number;
    shelfNumber: string;
    imageDataUri: string;
    category: string;
    lastUpdated: string;
    description?: string;
    sellingPoints?: string[];
    marketInsight?: string;
    competitors?: { sellerName: string; price: number }[];
}
