import {
  Box, Typography, Button, IconButton, Stack, Grid as Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Checkbox, FormControlLabel, TextField, InputAdornment, Chip, Switch, Autocomplete
} from '@mui/material';
import { X, Printer, Search } from 'lucide-react';
import '../POS.css';
import { AppHeader } from '../Header';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Save } from 'lucide-react';

declare global {
  interface Window {
    BluetoothDevice: any;
  }
}

interface POSItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

type Unit = 'kg' | 'pcs' | 'pkt';
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  unit: Unit;
  size: string;
  type: string;
}

const CATEGORIES = ['Type 1', 'Type 2', 'Type 3', 'Type 4', 'Type 5', 'Type 6'];

const PRODUCTS: Product[] = [
  { id: 'app1_250', name: 'Type 1 (250g)', price: 0, category: 'Type 1', size: '250g', type: 'Type 1', unit: 'pkt' },
  { id: 'app1_500', name: 'Type 1 (500g)', price: 0, category: 'Type 1', size: '500g', type: 'Type 1', unit: 'pkt' },
  { id: 'app1_1kg', name: 'Type 1 (1kg)', price: 0, category: 'Type 1', size: '1kg', type: 'Type 1', unit: 'pkt' },
  { id: 'app1_2kg', name: 'Type 1 (2kg)', price: 0, category: 'Type 1', size: '2kg', type: 'Type 1', unit: 'pkt' },

  { id: 'app2_250', name: 'Type 2 (250g)', price: 0, category: 'Type 2', size: '250g', type: 'Type 2', unit: 'pkt' },
  { id: 'app2_500', name: 'Type 2 (500g)', price: 0, category: 'Type 2', size: '500g', type: 'Type 2', unit: 'pkt' },
  { id: 'app2_1kg', name: 'Type 2 (1kg)', price: 0, category: 'Type 2', size: '1kg', type: 'Type 2', unit: 'pkt' },
  { id: 'app2_2kg', name: 'Type 2 (2kg)', price: 0, category: 'Type 2', size: '2kg', type: 'Type 2', unit: 'pkt' },

  { id: 'app3_250', name: 'Type 3 (250g)', price: 0, category: 'Type 3', size: '250g', type: 'Type 3', unit: 'pkt' },
  { id: 'app3_500', name: 'Type 3 (500g)', price: 0, category: 'Type 3', size: '500g', type: 'Type 3', unit: 'pkt' },
  { id: 'app3_1kg', name: 'Type 3 (1kg)', price: 0, category: 'Type 3', size: '1kg', type: 'Type 3', unit: 'pkt' },
  { id: 'app3_2kg', name: 'Type 3 (2kg)', price: 0, category: 'Type 3', size: '2kg', type: 'Type 3', unit: 'pkt' },

  { id: 'app4_250', name: 'Type 4 (250g)', price: 0, category: 'Type 4', size: '250g', type: 'Type 4', unit: 'pkt' },
  { id: 'app4_500', name: 'Type 4 (500g)', price: 0, category: 'Type 4', size: '500g', type: 'Type 4', unit: 'pkt' },
  { id: 'app4_1kg', name: 'Type 4 (1kg)', price: 0, category: 'Type 4', size: '1kg', type: 'Type 4', unit: 'pkt' },
  { id: 'app4_2kg', name: 'Type 4 (2kg)', price: 0, category: 'Type 4', size: '2kg', type: 'Type 4', unit: 'pkt' },

  { id: 'app5_250', name: 'Type 5 (250g)', price: 0, category: 'Type 5', size: '250g', type: 'Type 5', unit: 'pkt' },
  { id: 'app5_500', name: 'Type 5 (500g)', price: 0, category: 'Type 5', size: '500g', type: 'Type 5', unit: 'pkt' },
  { id: 'app5_1kg', name: 'Type 5 (1kg)', price: 0, category: 'Type 5', size: '1kg', type: 'Type 5', unit: 'pkt' },
  { id: 'app5_2kg', name: 'Type 5 (2kg)', price: 0, category: 'Type 5', size: '2kg', type: 'Type 5', unit: 'pkt' },

  { id: 'app6_250', name: 'Type 6 (250g)', price: 0, category: 'Type 6', size: '250g', type: 'Type 6', unit: 'pkt' },
  { id: 'app6_500', name: 'Type 6 (500g)', price: 0, category: 'Type 6', size: '500g', type: 'Type 6', unit: 'pkt' },
  { id: 'app6_1kg', name: 'Type 6 (1kg)', price: 0, category: 'Type 6', size: '1kg', type: 'Type 6', unit: 'pkt' },
  { id: 'app6_2kg', name: 'Type 6 (2kg)', price: 0, category: 'Type 6', size: '2kg', type: 'Type 6', unit: 'pkt' },
];

let cachedDevice: any = null;

export function PointOfSale() {
  const cartEndRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<POSItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'SCANNER'>('CASH');
  const [discount, setDiscount] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Customer & GST States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [billNo, setBillNo] = useState(() => {
    const saved = localStorage.getItem('lastBillNo');
    return saved ? parseInt(saved, 10) : 1;
  });

  useEffect(() => {
    const saved = localStorage.getItem('pos-cart');
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pos-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('lastBillNo', billNo.toString());
  }, [billNo]);

  useEffect(() => {
    if (cart.length > 0) {
      cartEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [cart]);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalQty = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const discountedSubtotal = Math.max(0, subtotal - discount);

  const cgstAmount = gstEnabled ? discountedSubtotal * 0.025 : 0;
  const sgstAmount = gstEnabled ? discountedSubtotal * 0.025 : 0;
  const finalTotal = Math.round(discountedSubtotal + cgstAmount + sgstAmount);
  const noOfItems = cart.length;

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(p => {
      if (activeCategory && p.category !== activeCategory) return false;
      return true;
    });
  }, [activeCategory]);

  const addItemToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (existing) return prev;
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price || 0,
        total: (product.price || 0) * 1
      }];
    });
  }, []);

  const updateCartItemRate = (id: string, newRate: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) {
        const rate = isNaN(newRate) ? 0 : newRate;
        return { ...item, price: rate, total: rate * item.quantity };
      }
      return item;
    }));
  };

  const updateCartItemQty = (id: string, newQty: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) {
        const qty = isNaN(newQty) ? 0 : newQty;
        return { ...item, quantity: qty, total: item.price * qty };
      }
      return item;
    }));
  };

  const getImageBytes = async (url: string, printWidth: number = 200): Promise<Uint8Array | null> => {
    try {
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      const width = printWidth;
      const height = Math.floor(img.height * (width / img.width));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const { data } = imageData;
      const printData: number[] = [];
      printData.push(0x1d, 0x76, 0x30, 0, Math.ceil(width / 8), 0, height % 256, Math.floor(height / 256));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < Math.ceil(width / 8); x++) {
          let byte = 0;
          for (let b = 0; b < 8; b++) {
            const i = ((y * width) + (x * 8) + b) * 4;
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (avg < 128) byte |= (0x80 >> b);
          }
          printData.push(byte);
        }
      }
      return new Uint8Array(printData);
    } catch (e) { return null; }
  };

  const handleSaveOnly = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
      const invoiceData = {
        billNo: billNo,
        date: dateStr,
        time: timeStr,
        customerName: customerName || 'Walk-in',
        customerPhone: customerPhone || '',
        customerAddress: customerAddress || '',
        customerGst: customerGst || '',
        gstEnabled: gstEnabled,
        items: cart.map(i => `${i.productName}(${i.price}x${i.quantity})`).join(", "),
        subtotal: Math.round(subtotal),
        discount: discount,
        finalTotal: finalTotal,
        paymentMode: paymentMode
      };
      const scriptURL = "https://script.google.com/macros/s/AKfycbwO6j5rzaFkVUQyYeFWNTT1k-kdx6P4M61iPH1pSlQFXa04al99FyR982zoqJb3VdXl4g/exec";
      await fetch(scriptURL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData)
      });
      alert("Appalam Bill Saved Successfully!");
      setBillNo(prev => prev + 1);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerGst('');
      setShowPreview(false);
    } catch (error) {
      console.error("Error saving to sheet:", error);
      alert("Failed to save bill.");
    }
  };

  const handleFinalPrint = async () => {
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) {
        alert("Bluetooth Service not available.");
        return;
      }
      let device = cachedDevice;
      if (!device || !device.gatt?.connected) {
        try {
          device = await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb']
          });
          cachedDevice = device;
        } catch (err) {
          return;
        }
      }
      const server = await device.gatt?.connect();
      const services = await server.getPrimaryServices();
      const char = (await services[0].getCharacteristics()).find((c: any) =>
        c.properties.write || c.properties.writeWithoutResponse
      );
      if (!char) {
        alert("Cannot connect to Printer characteristic.");
        return;
      }

      const enc = new TextEncoder();
      const INIT = '\x1B\x40';
      const CENTER = '\x1B\x61\x01';
      const BOLD_ON = '\x1B\x45\x01';
      const BOLD_OFF = '\x1B\x45\x00';
      const SIZE_BIG = '\x1D\x21\x11';
      const SIZE_NORMAL = '\x1D\x21\x00';

      await char.writeValue(enc.encode(INIT + CENTER));
      await char.writeValue(enc.encode('\x1B\x40'));
      await new Promise(r => setTimeout(r, 500));
      await char.writeValue(enc.encode('\x1B\x61\x01'));

      const sendLargeData = async (characteristic: any, data: string | Uint8Array) => {
        const chunkSize = 100;
        const encoder = new TextEncoder();
        const bytes = typeof data === 'string' ? encoder.encode(data) : data;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          await characteristic.writeValue(chunk);
          await new Promise(r => setTimeout(r, 10));
        }
      };

      const logoBytes = await getImageBytes('/icon-521.png', 150);
      if (logoBytes) {
        await sendLargeData(char, logoBytes);
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let billHeader = `\n${SIZE_BIG}${BOLD_ON}Niranjana EnterPrises ${SIZE_NORMAL}.${BOLD_OFF}\n` +
        `Niranjana Enterprises\n` +
        `Mob: 9043707705\n--------------------------------\n` +
        `GST NO: 33##WPA61061Z#\n--------------------------------\n` +
        `DT: ${dateStr}  TM: ${timeStr}\nBill No: ${billNo}\n`;

      if (customerName || customerPhone || customerAddress || customerGst) {
        billHeader += `--------------------------------\n`;
        if (customerName) billHeader += `Customer: ${customerName}\n`;
        if (customerPhone) billHeader += `Phone: ${customerPhone}\n`;
        if (customerAddress) billHeader += `Address: ${customerAddress}\n`;
        if (customerGst) billHeader += `Cust GST: ${customerGst}\n`;
      }

      billHeader += `--------------------------------\n` +
        `${BOLD_ON}  Item                Rate     Qty  Amount${BOLD_OFF}\n` +
        `------------------------------------------\n`;
      await sendLargeData(char, billHeader);

      let itemsData = "";
      const STYLE_NORMAL = '\x1B\x21\x00';

      cart.forEach((item, index) => {
        const sno = (index + 1).toString().padEnd(3);
        const name = item.productName.substring(0, 10).padEnd(14);
        const rate = parseFloat(String(item.price)).toFixed(2).padStart(9);
        const qty = parseFloat(String(item.quantity)).toFixed(2).padStart(9);
        const total = parseFloat(String(item.total)).toFixed(2).padStart(7);
        itemsData += `${STYLE_NORMAL}${sno}${name}${rate}${qty}${total}\n`;
        itemsData += `----------------------------------------------\n`;
      });

      await sendLargeData(char, itemsData);

      let billFooter = `___________________________________________________\n`;
      billFooter += `${BOLD_ON}${"Subtotal:".padEnd(12)}Rs.${Math.round(subtotal).toString().padStart(10)}${BOLD_OFF}\n`;
      billFooter += `${"Total Qty:".padEnd(12)}${totalQty.toString().padStart(13)}\n`;
      if (discount > 0) {
        billFooter += `${"Discount:".padEnd(12)}-Rs.${Math.round(discount).toString().padStart(10)}\n`;
      }

      if (gstEnabled) {
        billFooter += `${"CGST @ 2.5%:".padEnd(12)}Rs.${cgstAmount.toFixed(2).padStart(10)}\n`;
        billFooter += `${"SGST @ 2.5%:".padEnd(12)}Rs.${sgstAmount.toFixed(2).padStart(10)}\n`;
      }

      billFooter += `\n${SIZE_BIG}${"NET TOTAL:".padEnd(10)}Rs.${Math.round(finalTotal).toString().padStart(6)}${STYLE_NORMAL}\n`;
      billFooter += `************************************************\n`;
      billFooter += `Payment: ${paymentMode}\n`;

      await sendLargeData(char, billFooter);

      if (paymentMode === 'SCANNER') {
        const qrBytes = await getImageBytes('/qr-code1.jpeg', 350);
        if (qrBytes) {
          await char.writeValue(enc.encode(CENTER));
          for (let i = 0; i < qrBytes.length; i += 25) {
            await char.writeValue(qrBytes.slice(i, i + 25));
            await new Promise(r => setTimeout(r, 10));
          }
        }
      }
      await char.writeValue(new Uint8Array([0x1b, 0x21, 0x01]));
      await char.writeValue(enc.encode(`${CENTER}No Returns or Exchanges on Food Items.\n`));
      await char.writeValue(enc.encode(`${CENTER}Thank You! Visit Again`));
      await char.writeValue(new Uint8Array([0x1b, 0x21, 0x00]));

      await new Promise(r => setTimeout(r, 1000));
      const FEED_PAPER = '\n';
      await char.writeValue(enc.encode(FEED_PAPER));

      const CUT_PAPER = '\n\n\x1D\x56\x42\x00';
      try {
        await char.writeValue(enc.encode(CUT_PAPER));
      } catch (e) {
        console.error("Cut failed", e);
      }

      const scriptURL = "https://script.google.com/macros/s/AKfycbwO6j5rzaFkVUQyYeFWNTT1k-kdx6P4M61iPH1pSlQFXa04al99FyR982zoqJb3VdXl4g/exec";
      await fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          billNo, 
          date: dateStr, 
          time: timeStr, 
          customerName: customerName || 'Walk-in',
          customerPhone: customerPhone || '',
          customerAddress: customerAddress || '',
          customerGst: customerGst || '',
          gstEnabled,
          items: cart.map(i => `${i.productName}(${i.price}x${i.quantity})`).join(", "), 
          subtotal, 
          discount, 
          finalTotal, 
          paymentMode 
        })
      });

      setBillNo(prev => prev + 1);
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerGst('');
      setShowPreview(false);
      alert("Bill Printed Successfully!");
    } catch (error: any) { alert("Error: " + error.message); }
  };

  return (
    <Box className="pos-container">
      <AppHeader
        title="Appalam Billing"
        onBack={() => {
          if (cart.length > 0) {
            if (confirm("Cart will be cleared! Go back?")) window.history.back();
          } else {
            window.history.back();
          }
        }}
      />

      <Box className="pos-header">
        <Typography variant="h6" fontWeight="bold" align="center">Niranjana Enterprises</Typography>
        <Stack direction="row" justifyContent="space-between" px={1}>
          <Typography variant="caption">Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
          <Typography variant="caption">Date: {new Date().toLocaleDateString('en-GB')}</Typography>
        </Stack>
      </Box>

      {/* Dropdown Select */}
      <Box sx={{ px: 1, py: 1 }}>
        <Autocomplete
          options={PRODUCTS}
          getOptionLabel={(option) => `${option.name}`}
          onChange={(_, selectedOption) => {
            if (selectedOption) addItemToCart(selectedOption);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Search Type 1 to Type 6 (250g, 500g, 1kg, 2kg)..."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      </Box>

      {/* Filter Chips */}
      <Box sx={{ px: 1, pb: 1, overflowX: 'auto' }}>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'nowrap', minWidth: 'max-content' }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <Chip
                key={cat}
                label={cat}
                size="small"
                clickable
                color={isActive ? 'primary' : 'default'}
                variant={isActive ? 'filled' : 'outlined'}
                onClick={() => setActiveCategory(isActive ? null : cat)}
                onDelete={isActive ? () => setActiveCategory(null) : undefined}
              />
            );
          })}
        </Stack>
      </Box>

      {/* Product Tiles */}
      <Box sx={{ px: 1, pb: 1, maxHeight: '25vh', overflowY: 'auto' }}>
        <Grid container spacing={0.75}>
          {filteredProducts.map(p => (
            <Grid size={4} key={p.id}>
              <Box
                onClick={() => addItemToCart(p)}
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  p: 0.75,
                  cursor: 'pointer',
                  bgcolor: '#fff',
                  minHeight: 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:active': { transform: 'scale(0.97)' }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }} align="center">
                  {p.name}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Cart List */}
      <Box className="item-list" sx={{ mt: 1, flex: 1, minHeight: '180px', overflowY: 'auto' }}>
        <Typography variant="caption" sx={{ px: 1, color: '#666', fontWeight: 'bold' }}>
          Cart Items (Enter Amount & Qty below):
        </Typography>
        {cart.map((item, index) => (
          <Box key={item.productId} sx={{ p: 1, borderBottom: '1px solid #eee' }}>
            <Grid container alignItems="center" spacing={1}>
              <Grid size={1}>
                <Typography variant="body2">{index + 1}</Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="body2" fontWeight="bold" noWrap>
                  {item.productName}
                </Typography>
              </Grid>
              <Grid size={4} display="flex" alignItems="center" gap={0.5}>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Rate"
                  value={item.price || ''}
                  onChange={(e) => updateCartItemRate(item.productId, parseFloat(e.target.value))}
                  sx={{ width: '70px', '& input': { p: 0.5, textAlign: 'center', fontSize: '0.85rem' } }}
                />
                <Typography variant="caption">×</Typography>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Qty"
                  value={item.quantity || ''}
                  onChange={(e) => updateCartItemQty(item.productId, parseFloat(e.target.value))}
                  sx={{ width: '50px', '& input': { p: 0.5, textAlign: 'center', fontSize: '0.85rem' } }}
                />
              </Grid>
              <Grid size={3} display="flex" justifyContent="flex-end" alignItems="center">
                <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
                  ₹{item.total}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setCart(cart.filter(i => i.productId !== item.productId))}
                >
                  <X size={14} />
                </IconButton>
              </Grid>
            </Grid>
          </Box>
        ))}
        <div ref={cartEndRef} className="scroll-anchor" />
      </Box>

      {/* Actions Footer */}
      <Box className="footer-actions" sx={{ mt: 'auto', borderTop: '1px solid #ccc', pt: 1 }}>
        <Stack direction="row" justifyContent="space-around" mb={1} sx={{ bgcolor: '#f5f5f5', py: 0.5 }}>
          <Typography variant="body2">Items: <b>{noOfItems}</b></Typography>
          <Typography variant="body2">Total Qty: <b>{totalQty}</b></Typography>
        </Stack>
        <Stack direction="row" justifyContent="center" spacing={3} mb={1}>
          <FormControlLabel control={<Checkbox size="small" checked={paymentMode === 'CASH'} onChange={() => setPaymentMode('CASH')} />} label="CASH" />
          <FormControlLabel control={<Checkbox size="small" checked={paymentMode === 'SCANNER'} onChange={() => setPaymentMode('SCANNER')} />} label="SCANNER" />
        </Stack>
        <Button variant="contained" fullWidth sx={{ bgcolor: '#242845', py: 1.5 }} startIcon={<Printer size={20} />} onClick={() => setShowPreview(true)}>
          Total: ₹{finalTotal.toLocaleString('en-IN')} - PREVIEW
        </Button>
      </Box>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ bgcolor: '#fff9c4', textAlign: 'center', fontWeight: 'bold' }}>Appalam Bill Preview</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight="bold">Niranjana Enterprises</Typography>
            <Typography variant="caption" display="block">Appalam Store, GST: 3##ZWPA61061#</Typography>
          </Box>
          
          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
          
          {/* Customer & GST Fields */}
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            <TextField 
              label="Customer Name" 
              size="small" 
              fullWidth 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)} 
            />
            <TextField 
              label="Customer Phone" 
              size="small" 
              fullWidth 
              value={customerPhone} 
              onChange={(e) => setCustomerPhone(e.target.value)} 
            />
            <TextField 
              label="Address" 
              size="small" 
              fullWidth 
              value={customerAddress} 
              onChange={(e) => setCustomerAddress(e.target.value)} 
            />
            <TextField 
              label="Customer GSTIN (Optional)" 
              size="small" 
              fullWidth 
              value={customerGst} 
              onChange={(e) => setCustomerGst(e.target.value)} 
            />
            <FormControlLabel
              control={<Switch checked={gstEnabled} onChange={(e) => setGstEnabled(e.target.checked)} />}
              label={`Enable GST (2.5% CGST + 2.5% SGST)`}
            />
          </Stack>

          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

          {/* Customer info display inside preview */}
          {(customerName || customerPhone || customerAddress || customerGst) && (
            <Box sx={{ mb: 1, p: 1, bgcolor: '#f9f9f9', borderRadius: 1 }}>
              {customerName && <Typography variant="caption" display="block"><b>Customer:</b> {customerName}</Typography>}
              {customerPhone && <Typography variant="caption" display="block"><b>Phone:</b> {customerPhone}</Typography>}
              {customerAddress && <Typography variant="caption" display="block"><b>Address:</b> {customerAddress}</Typography>}
              {customerGst && <Typography variant="caption" display="block"><b>GSTIN:</b> {customerGst}</Typography>}
            </Box>
          )}

          {cart.map((item, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">
                {i + 1}. {item.productName} ({item.price}x{item.quantity})
              </Typography>
              <Typography variant="body2">
                ₹{Number(item.total).toFixed(2)}
              </Typography>
            </Box>
          ))}

          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Subtotal:</Typography>
            <Typography variant="body2">₹{subtotal.toFixed(2)}</Typography>
          </Box>

          {discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Discount:</Typography>
              <Typography variant="body2">-₹{discount.toFixed(2)}</Typography>
            </Box>
          )}

          {gstEnabled && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">CGST @ 2.5%:</Typography>
                <Typography variant="body2">₹{cgstAmount.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">SGST @ 2.5%:</Typography>
                <Typography variant="body2">₹{sgstAmount.toFixed(2)}</Typography>
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="h6" fontWeight="bold">Net Total:</Typography>
            <Typography variant="h6" fontWeight="bold">₹{finalTotal.toFixed(2)}</Typography>
          </Box>

          {paymentMode === 'SCANNER' && (
            <Box sx={{
              textAlign: 'center',
              mt: 2, pt: 2,
              borderTop: '1px dashed #ccc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <Typography variant="body2" sx={{ mb: 1 }}>Scan to Pay</Typography>
              <Box
                component="img"
                src="/qr-code1.jpeg"
                alt="QR"
                sx={{
                  width: '120px',
                  height: '120px',
                  objectFit: 'contain',
                  mt: 1
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#fff9c4', p: 2, flexDirection: 'column', gap: 1 }}>
          {showDiscountInput && (
            <TextField label="Discount" type="number" size="small" fullWidth autoFocus sx={{ bgcolor: 'white' }}
              value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
          )}
          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            <Button fullWidth variant="outlined" onClick={() => setShowPreview(false)}>Edit</Button>
            <Button fullWidth variant="outlined" onClick={() => setShowDiscountInput(!showDiscountInput)}>Discount</Button>
          </Stack>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, width: '100%' }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleFinalPrint}
              sx={{ bgcolor: '#4caf50' }}
            >
              Print & Save
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleSaveOnly}
              startIcon={<Save size={20} />}
              sx={{ color: '#2196f3', borderColor: '#2196f3' }}
            >
              Save Only
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}