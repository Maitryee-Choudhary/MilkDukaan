export interface Consumer {
  id?: string;
  name: string;
  address?: string;
  defaultQuantity: number;
  defaultMilkType?: string; // e.g., "Full Cream", "Toned"
  defaultPrice?: number; // Custom price for this consumer
  active: boolean;
  uid: string;
}

export interface Delivery {
  id?: string;
  consumerId: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  milkType: string;
  status: 'delivered' | 'skipped';
  pricePerUnit: number;
  uid: string;
}

export interface Inventory {
  id?: string;
  date: string; // YYYY-MM-DD
  type: 'buy' | 'sell';
  quantity: number;
  source?: string;
  totalAmount: number;
  uid: string;
}

export interface Settings {
  pricePerLitre: number;
  language?: 'en' | 'hi';
  milkTypes?: string[];
  uid: string;
}
