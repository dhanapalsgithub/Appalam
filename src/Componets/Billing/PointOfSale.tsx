import {
  Box, Typography, Button, IconButton, Stack, Grid as Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Checkbox, FormControlLabel, TextField, Chip, Switch
} from '@mui/material';
import { X, Printer } from 'lucide-react';
import '../POS.css';
import { AppHeader } from '../Header';
import { useState, useEffect, useRef } from 'react';
import { Save } from 'lucide-react';

declare global {
  interface Window {
    BluetoothDevice: any;
  }
}

interface POSItem {
  productId: string;
  productName: string;
  subDetail?: string;
  quantity: number;
  price: number;
  total: number;
  pkgType?: string;
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

const INITIAL_PRODUCTS: Product[] = [
  { id: 'app_1', name: 'No:01-6inch', price: 0, category: 'Appalam', size: '6inch', type: 'Appalam', unit: 'pkt' },
  { id: 'app_2', name: 'No:02-5.25inch', price: 0, category: 'Appalam', size: '5.25inch', type: 'Appalam', unit: 'pkt' },
  { id: 'app_3', name: 'No:03-4.75inch', price: 0, category: 'Appalam', size: '4.75inch', type: 'Appalam', unit: 'pkt' },
  { id: 'app_4', name: 'No:04-4.25inch', price: 0, category: 'Appalam', size: '4.25inch', type: 'Appalam', unit: 'pkt' },
  { id: 'app_5', name: 'No:05-4inch', price: 0, category: 'Appalam', size: '4inch', type: 'Appalam', unit: 'pkt' },
  { id: 'app_6', name: 'No:06-3.25inch', price: 0, category: 'Appalam', size: '3.25inch', type: 'Appalam', unit: 'pkt' },
];

let cachedDevice: any = null;

export function PointOfSale() {
  const cartEndRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<POSItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'SCANNER'>('CASH');
  const [discount, setDiscount] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Selected item for Package Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPkgModal, setShowPkgModal] = useState(false);

  // Focus tracking state for newly added item rate input
  const [focusId, setFocusId] = useState<string | null>(null);
  const rateInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Products State
  const [productsList] = useState<Product[]>(INITIAL_PRODUCTS);

  // Customer & GST States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);

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

  // Focus Rate Input when new item is added
  useEffect(() => {
    if (focusId && rateInputRefs.current[focusId]) {
      rateInputRefs.current[focusId]?.focus();
      rateInputRefs.current[focusId]?.select();
      setFocusId(null);
    }
  }, [focusId, cart]);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalQty = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const discountedSubtotal = Math.max(0, subtotal - discount);

  const cgstAmount = gstEnabled ? discountedSubtotal * 0.025 : 0;
  const sgstAmount = gstEnabled ? discountedSubtotal * 0.025 : 0;
  const finalTotal = Math.round(discountedSubtotal + cgstAmount + sgstAmount);
  const noOfItems = cart.length;

  // Tile Click handler -> open modal
  const handleTileClick = (product: Product) => {
    setSelectedProduct(product);
    setShowPkgModal(true);
  };

  // Add Selected Product with default Appalam category to Cart
  const handleSelectPackage = (pkgType: string) => {
    if (!selectedProduct) return;
    const newId = `${selectedProduct.id}_${Date.now()}`;
    const mainTitle = `Appalam ${pkgType}`;
    const subTitle = `[${selectedProduct.name}]`;

    setCart(prev => [
      ...prev,
      {
        productId: newId,
        productName: mainTitle,
        subDetail: subTitle,
        quantity: 1,
        price: 0,
        total: 0,
        pkgType: pkgType
      }
    ]);

    setShowPkgModal(false);
    setSelectedProduct(null);
    setFocusId(newId);
  };

  // Add Custom / Package directly from bottom bar
  const handleDirectPackageClick = (pkgName: string) => {
    const newId = `custom_${Date.now()}`;
    const name = pkgName === 'custom' ? 'Appalam Custom' : `Appalam ${pkgName}`;
    setCart(prev => [...prev, {
      productId: newId,
      productName: name,
      quantity: 1,
      price: 0,
      total: 0
    }]);
    setFocusId(newId);
  };

  const updateCartItemName = (id: string, newName: string) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) {
        return { ...item, productName: newName };
      }
      return item;
    }));
  };

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
        items: cart.map(i => `${i.productName} ${i.subDetail || ''}(${i.price}x${i.quantity}Kg)`).join(", "),
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
      const LEFT = '\x1B\x61\x00';
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

      const logoBytes = await getImageBytes('/icon-5121.png', 170);
      if (logoBytes) {
        await sendLargeData(char, logoBytes);
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let billHeader = `\n${SIZE_BIG}${BOLD_ON}Niranjana Enterprises ${SIZE_NORMAL}.${BOLD_OFF}\n` +
        `Namma Appalam\n` +
        `no 13/139,sivashakthi Nagar,sikkarayapuram \n--------------------------------\n` +
        `chennai-69.\n` +
        `Mob: 9043707705,8248455168\n--------------------------------\n` +
        `GST NO: 33BWUPR7527N1ZI\n--------------------------------\n` +
        `DT: ${dateStr}  TM: ${timeStr}\nBill No: ${billNo}\n`;

      if (customerName || customerPhone || customerAddress || customerGst) {
        billHeader += `--------------------------------\n`;
        if (customerName) billHeader += `Customer: ${customerName}\n`;
        if (customerPhone) billHeader += `Phone: ${customerPhone}\n`;
        if (customerAddress) billHeader += `Address: ${customerAddress}\n`;
        if (customerGst) billHeader += `Cust GST: ${customerGst}\n`;
      }

      // Column Header - Fixed width layout matching 32 characters for thermal printer
      billHeader += `----------------------------------------------\n` +
        `${LEFT}${BOLD_ON}Item                Rate         Qty      Amount${BOLD_OFF}\n` +
        `-----------------------------------------------\n`;
      await sendLargeData(char, billHeader);

      let itemsData = "";
      const STYLE_NORMAL = '\x1B\x21\x00';

      cart.forEach((item) => {
        const name = (item.productName || 'Appalam').substring(0, 12).padEnd(15);
        const rate = parseFloat(String(item.price)).toFixed(0).padStart(10);
        const qty = (String(item.quantity) + 'Kg').padStart(9);
        const total = parseFloat(String(item.total)).toFixed(0).padStart(9);

        itemsData += `${STYLE_NORMAL}${name} ${rate} ${qty} ${total}\n`;
        if (item.subDetail) {
          itemsData += `  ${item.subDetail}\n`;
        }
        itemsData += `----------------------------------------------\n`;
      });

      await sendLargeData(char, itemsData);

      let billFooter = `${BOLD_ON}${"Subtotal:".padEnd(10)}Rs.${Math.round(subtotal).toString().padStart(8)}${BOLD_OFF}\n`;
      billFooter += `${"Total Qty:".padEnd(10)}${totalQty.toString().padStart(11)}Kg\n`;
      if (discount > 0) {
        billFooter += `${"Discount:".padEnd(10)}-Rs.${Math.round(discount).toString().padStart(8)}\n`;
      }

      if (gstEnabled) {
        billFooter += `${"CGST @ 2.5%:".padEnd(10)}Rs.${cgstAmount.toFixed(2).padStart(8)}\n`;
        billFooter += `${"SGST @ 2.5%:".padEnd(10)}Rs.${sgstAmount.toFixed(2).padStart(8)}\n`;
      }

      billFooter += `\n${SIZE_BIG}${"NET TOTAL:".padEnd(10)}Rs.${Math.round(finalTotal).toString().padStart(6)}${STYLE_NORMAL}\n`;
      billFooter += `********************************\n`;
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
          items: cart.map(i => `${i.productName} ${i.subDetail || ''}(${i.price}x${i.quantity}Kg)`).join(", "), 
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
    <Box className="pos-container" sx={{ bgcolor: '#0b1d42', minHeight: '100vh', color: '#fff', pb: 4 }}>
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

      <Box className="pos-header" sx={{ textAlign: 'center', py: 1 }}>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>{new Date().toLocaleDateString('en-GB')}</Typography>
        <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff' }}>Niranjana Enterprises</Typography>
        <Stack direction="row" justifyContent="space-between" px={2} sx={{ mt: 0.5 }}>
          <Typography variant="caption">Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
          <Typography variant="caption">Date: {new Date().toLocaleDateString('en-GB')}</Typography>
        </Stack>
      </Box>

      {/* No:01 to No:06 Product Tiles */}
      <Box sx={{ px: 1.5, py: 1 }}>
        <Grid container spacing={1}>
          {productsList.map(p => (
            <Grid size={4} key={p.id}>
              <Box
                onClick={() => handleTileClick(p)}
                sx={{
                  border: '1px solid #ffffff33',
                  borderRadius: 1.5,
                  p: 1,
                  cursor: 'pointer',
                  bgcolor: '#ffffff',
                  color: '#0b1d42',
                  minHeight: 55,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  '&:active': { transform: 'scale(0.97)' }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#0b1d42' }}>
                  {p.name.split('-')[0]}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#555' }}>
                  {p.name.split('-')[1]}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Package Direct Buttons */}
      <Box sx={{ px: 1.5, pt: 1 }}>
        <Typography variant="caption" sx={{ color: '#ccc', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
          Items package:
        </Typography>
        <Stack direction="row" spacing={1}>
          {['1kg', '1/2kg', 'custom'].map(pkg => (
            <Chip
              key={pkg}
              label={pkg}
              size="small"
              clickable
              onClick={() => handleDirectPackageClick(pkg)}
              sx={{
                bgcolor: 'transparent',
                color: '#fff',
                border: '1px solid #fff',
                fontWeight: 'bold',
                borderRadius: '16px',
                px: 1,
                '&:hover': { bgcolor: '#ffffff22' },
                '&:active': { transform: 'scale(0.95)' }
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Cart List */}
      <Box className="item-list" sx={{ mt: 1.5, px: 1, flex: 1, minHeight: '160px', maxHeight: '24vh', overflowY: 'auto', bgcolor: '#ffffff0a', borderRadius: 2, mx: 1 }}>
        <Typography variant="caption" sx={{ px: 1, py: 0.5, color: '#ffeb3b', fontWeight: 'bold', display: 'block' }}>
          Cart Items (Edit Name, Amount & Qty below):
        </Typography>
        {cart.map((item, index) => (
          <Box key={item.productId} sx={{ p: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Grid container alignItems="center" spacing={1}>
              <Grid size={1}>
                <Typography variant="body2" sx={{ color: '#fff' }}>{index + 1}</Typography>
              </Grid>
              <Grid size={4}>
                <TextField
                  size="small"
                  variant="standard"
                  placeholder="Enter item name..."
                  value={item.productName}
                  onChange={(e) => updateCartItemName(item.productId, e.target.value)}
                  InputProps={{ disableUnderline: true }}
                  sx={{ '& input': { fontWeight: 'bold', fontSize: '0.85rem', p: 0, color: '#fff' }, '& input::placeholder': { color: 'rgba(255,255,255,0.5)', opacity: 1 } }}
                />
                {item.subDetail && (
                  <Typography variant="caption" sx={{ color: '#aaa', display: 'block' }}>
                    {item.subDetail}
                  </Typography>
                )}
              </Grid>
              <Grid size={4} display="flex" alignItems="center" gap={0.5}>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Rate"
                  inputRef={(el) => (rateInputRefs.current[item.productId] = el)}
                  value={item.price || ''}
                  onChange={(e) => updateCartItemRate(item.productId, parseFloat(e.target.value))}
                  sx={{ width: '60px', bgcolor: '#fff', borderRadius: 1, '& input': { p: 0.5, textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold' } }}
                />
                <Typography variant="caption" sx={{ color: '#fff' }}>×</Typography>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Qty"
                  value={item.quantity || ''}
                  onChange={(e) => updateCartItemQty(item.productId, parseFloat(e.target.value))}
                  sx={{ width: '45px', bgcolor: '#fff', borderRadius: 1, '& input': { p: 0.5, textAlign: 'center', fontSize: '0.85rem' } }}
                />
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 'bold' }}>Kg</Typography>
              </Grid>
              <Grid size={3} display="flex" justifyContent="flex-end" alignItems="center">
                <Typography variant="body2" fontWeight="bold" sx={{ mr: 1, color: '#4caf50' }}>
                  ₹{item.total}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setCart(cart.filter(i => i.productId !== item.productId))}
                  sx={{ color: '#ff5252' }}
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
      <Box className="footer-actions" sx={{ mt: 'auto', px: 2, pt: 1 }}>
        <Stack direction="row" justifyContent="space-around" mb={1} sx={{ py: 0.5 }}>
          <Typography variant="body2">Items: <b>{noOfItems}</b></Typography>
          <Typography variant="body2">Total Qty: <b>{totalQty}Kg</b></Typography>
        </Stack>
        <Stack direction="row" justifyContent="center" spacing={4} mb={1}>
          <FormControlLabel 
            control={<Checkbox size="small" checked={paymentMode === 'CASH'} onChange={() => setPaymentMode('CASH')} sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }} />} 
            label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>CASH</Typography>} 
          />
          <FormControlLabel 
            control={<Checkbox size="small" checked={paymentMode === 'SCANNER'} onChange={() => setPaymentMode('SCANNER')} sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }} />} 
            label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>SCANNER</Typography>} 
          />
        </Stack>
        <Button variant="contained" fullWidth sx={{ bgcolor: '#0b1d42', border: '1px solid #fff', py: 1.5, fontWeight: 'bold' }} startIcon={<Printer size={20} />} onClick={() => setShowPreview(true)}>
          TOTAL: ₹{finalTotal.toLocaleString('en-IN')} - PREVIEW
        </Button>
      </Box>

      {/* Package Selection Dialog / Popup */}
      <Dialog open={showPkgModal} onClose={() => setShowPkgModal(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', color: '#0b1d42' }}>
          Select Package Type
        </DialogTitle>
        <DialogContent sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#333' }}>
            {selectedProduct?.name}
          </Typography>
          <Stack spacing={1.5} direction="row" justifyContent="center">
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => handleSelectPackage('1Kg')}
              sx={{ bgcolor: '#0b1d42', color: '#fff', fontWeight: 'bold', py: 1.5 }}
            >
              1 KG
            </Button>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={() => handleSelectPackage('1/2Kg')}
              sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 'bold', py: 1.5 }}
            >
              1/2 KG
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button variant="outlined" color="error" onClick={() => setShowPkgModal(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ bgcolor: '#fff9c4', textAlign: 'center', fontWeight: 'bold' }}>Appalam Bill Preview</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight="bold">Niranjana Enterprises</Typography>
            <Typography variant="caption" display="block">Appalam Store, GST: 3BWUPR7527N1ZI</Typography>
          </Box>
          
          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
          
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            <TextField label="Customer Name" size="small" fullWidth value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <TextField label="Customer Phone" size="small" fullWidth value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            <TextField label="Address" size="small" fullWidth value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            <TextField label="Customer GSTIN (Optional)" size="small" fullWidth value={customerGst} onChange={(e) => setCustomerGst(e.target.value)} />
            <FormControlLabel
              control={<Switch checked={gstEnabled} onChange={(e) => setGstEnabled(e.target.checked)} />}
              label={`Enable GST (2.5% CGST + 2.5% SGST)`}
            />
          </Stack>

          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

          {cart.map((item, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, borderBottom: '1px dashed #eee', pb: 0.5 }}>
              <Typography variant="body2">
                {i + 1}. {item.productName} {item.subDetail ? item.subDetail : ''} ({item.price}x{item.quantity}Kg)
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
            <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>Scan to Pay</Typography>
              <Box component="img" src="/qr-code1.jpeg" alt="QR" sx={{ width: '120px', height: '120px', objectFit: 'contain', mt: 1 }} />
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
            <Button variant="contained" fullWidth onClick={handleFinalPrint} sx={{ bgcolor: '#4caf50' }}>Print & Save</Button>
            <Button variant="outlined" fullWidth onClick={handleSaveOnly} startIcon={<Save size={20} />} sx={{ color: '#2196f3', borderColor: '#2196f3' }}>Save Only</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}