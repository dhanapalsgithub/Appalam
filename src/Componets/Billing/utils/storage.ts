// src/Componets/Billing/utils/storage.ts

import type { Product, Invoice } from '../../../App'; 

const PRODUCTS_KEY = 'billing_products';
const INVOICES_KEY = 'billing_invoices';

// அனைத்து தயாரிப்புகளையும் பெறுவதற்கு
export const getProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(PRODUCTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading products:", error);
    return [];
  }
};

export const saveProducts = (products: Product[]) => {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

// இன்வாய்ஸ் தொடர்பான फंக்ஷன்கள்
export const getInvoices = (): Invoice[] => {
  try {
    const stored = localStorage.getItem(INVOICES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading invoices:", error);
    return [];
  }
};

// புதிய இன்வாய்ஸ் சேர்க்கும் போது தற்போதைய தேதி மற்றும் நேரத்தை உறுதி செய்தல்
export const addInvoice = (invoice: Invoice) => {
  const invoices = getInvoices();
  // புதிய இன்வாய்ஸை முதலில் சேர்க்கிறோம் (Latest first)
  localStorage.setItem(INVOICES_KEY, JSON.stringify([invoice, ...invoices]));
};

// ஸ்டாக் அளவைக் குறைக்க - இதில் பாதுகாப்பு அம்சம் (Safety Check) சேர்க்கப்பட்டுள்ளது
export const updateProductStock = (productId: string, quantity: number) => {
  const products = getProducts();
  const updatedProducts = products.map(p => {
    if (p.id === productId) {
      const newStock = p.stock - quantity;
      // ஸ்டாக் 0-க்கு கீழ் போகாமல் பார்த்துக் கொள்ளுதல்
      return { ...p, stock: newStock < 0 ? 0 : newStock };
    }
    return p;
  });
  saveProducts(updatedProducts);
};

// பிற பயன்பாடுகள்
export const addProduct = (product: Product) => {
  const products = getProducts();
  saveProducts([...products, product]);
};

export const updateProduct = (updatedProduct: Product) => {
  const products = getProducts();
  saveProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
};

export const deleteProduct = (id: string) => {
  saveProducts(getProducts().filter(p => p.id !== id));
};