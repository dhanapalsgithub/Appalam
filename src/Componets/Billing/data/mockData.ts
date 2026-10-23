import type { Product, Invoice } from '../../../App';

export const mockProducts: Product[] = [
  // Fancy Items
  { id: 'f1', name: 'Crystal Vase', category: 'fancy-items', price: 450, stock: 15, unit: 'piece', barcode: 'FI001' },
  { id: 'f2', name: 'Decorative Mirror', category: 'fancy-items', price: 800, stock: 8, unit: 'piece', barcode: 'FI002' },
  { id: 'f3', name: 'Wall Clock', category: 'fancy-items', price: 350, stock: 20, unit: 'piece', barcode: 'FI003' },
  
  // Cosmetics
  { id: 'c1', name: 'Face Cream', category: 'cosmetics', price: 120, stock: 50, unit: 'piece', barcode: 'COS001' },
  { id: 'c2', name: 'Lipstick Set', category: 'cosmetics', price: 250, stock: 35, unit: 'set', barcode: 'COS002' },
  { id: 'c3', name: 'Hair Oil', category: 'cosmetics', price: 80, stock: 60, unit: 'bottle', barcode: 'COS003' },
  { id: 'c4', name: 'Perfume', category: 'cosmetics', price: 500, stock: 25, unit: 'bottle', barcode: 'COS004' },
  
  // Stationary
  { id: 's1', name: 'Notebook A4', category: 'stationary', price: 45, stock: 100, unit: 'piece', barcode: 'ST001' },
  { id: 's2', name: 'Pen Set', category: 'stationary', price: 30, stock: 150, unit: 'set', barcode: 'ST002' },
  { id: 's3', name: 'Pencil Box', category: 'stationary', price: 55, stock: 80, unit: 'piece', barcode: 'ST003' },
  
  // Tailoring
  { id: 't1', name: 'Thread Spool', category: 'tailoring', price: 15, stock: 200, unit: 'piece', barcode: 'TL001' },
  { id: 't2', name: 'Needle Set', category: 'tailoring', price: 25, stock: 120, unit: 'set', barcode: 'TL002' },
  { id: 't3', name: 'Fabric Scissors', category: 'tailoring', price: 150, stock: 30, unit: 'piece', barcode: 'TL003' },
  
  // Toys
  { id: 'ty1', name: 'Remote Control Car', category: 'toys', price: 650, stock: 20, unit: 'piece', barcode: 'TY001' },
  { id: 'ty2', name: 'Building Blocks', category: 'toys', price: 300, stock: 40, unit: 'set', barcode: 'TY002' },
  
  // Soft Toys
  { id: 'st1', name: 'Teddy Bear', category: 'soft-toys', price: 400, stock: 30, unit: 'piece', barcode: 'SF001' },
  
  // Steels
  { id: 'stl1', name: 'Steel Plate Set', category: 'steels', price: 300, stock: 50, unit: 'set', barcode: 'STL001' },
  { id: 'stl2', name: 'Steel Bowl', category: 'steels', price: 80, stock: 100, unit: 'piece', barcode: 'STL002' },
];

// Invoices updated with ISO dates for easier MUI filtering
export const mockInvoices: Invoice[] = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-2024-001',
    date: '2024-12-01', // ISO format for easy string comparison
    items: [
      { productId: 'f1', productName: 'Crystal Vase', quantity: 2, price: 450, total: 900 },
      { productId: 'c2', productName: 'Lipstick Set', quantity: 1, price: 250, total: 250 },
    ],
    subtotal: 1150,
    tax: 115,
    discount: 0,
    total: 1265,
    customerName: 'John Doe',
    customerPhone: '9876543210',
  },
  {
    id: 'inv2',
    invoiceNumber: 'INV-2024-002',
    date: '2024-12-05',
    items: [
      { productId: 'ty1', productName: 'Remote Control Car', quantity: 1, price: 650, total: 650 },
      { productId: 'f2', productName: 'Decorative Mirror', quantity: 1, price: 800, total: 800 },
    ],
    subtotal: 1450,
    tax: 145,
    discount: 50,
    total: 1545,
    customerName: 'Jane Smith',
  },
  {
    id: 'inv3',
    invoiceNumber: 'INV-2024-003',
    date: '2024-12-10',
    items: [
      { productId: 's1', productName: 'Notebook A4', quantity: 5, price: 45, total: 225 },
      { productId: 's2', productName: 'Pen Set', quantity: 10, price: 30, total: 300 },
    ],
    subtotal: 525,
    tax: 52.5,
    discount: 0,
    total: 577.5,
  },
  {
    id: 'inv4',
    invoiceNumber: 'INV-2024-004',
    date: '2024-12-15',
    items: [
      { productId: 'p1', productName: 'Storage Container', quantity: 2, price: 85, total: 170 },
    ],
    subtotal: 170,
    tax: 17,
    discount: 10,
    total: 177,
    customerName: 'Bob Wilson',
  },
  {
    id: 'inv5',
    invoiceNumber: 'INV-2024-005',
    date: '2024-12-28',
    items: [
      { productId: 'f2', productName: 'Decorative Mirror', quantity: 1, price: 800, total: 800 },
    ],
    subtotal: 800,
    tax: 80,
    discount: 0,
    total: 880,
  }
];