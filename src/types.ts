// src/types.ts
export type Category = 'fancy-items' | 'cosmetics' | 'stationery' | 'tailoring' | 'toys' | 'gift' | 'soft-toys' | 'plastic' | 'other' | 'steels';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  barcode: string; // sku-வை நீக்கிவிட்டு இதைப் பயன்படுத்தவும்
}
export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}