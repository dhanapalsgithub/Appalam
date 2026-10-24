// import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, IconButton, Stack, Grid as Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Checkbox, FormControlLabel, TextField
} from '@mui/material';
import { X, Printer } from 'lucide-react';
import '../POS.css';
import { AppHeader } from './Header';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, } from 'lucide-react'; // Save ஐகானை இங்கே சேர்க்கவும்
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

const CATEGORIES = ['Fancy', 'Stationery', 'Cosmetic', 'Tailoring', 'Plastic', 'Steel.', 'Gift', 'Others', 'cleaning', 'Toys', 'Jewellery', 'Hair Care'];
// const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let cachedDevice: any = null; // இது ஆப் இருக்கும் வரை மெமரியில் இருக்கும்

export function PointOfSale() {
  //
  const [printerDevice, setPrinterDevice] = useState<any>(null);
  const cartEndRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<POSItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'rate' | 'qty'>('rate');
  const [calcBuffer, setCalcBuffer] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'SCANNER'>('CASH');
  const [lastCategory, setLastCategory] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [billNo, setBillNo] = useState(() => {
    const saved = localStorage.getItem('lastBillNo');
    return saved ? parseInt(saved, 10) : 1;
  });
  // 1. தொடுதலைக் கணக்கிட ஸ்டேட்
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (id: string) => {
    // ஒரு ஐட்டத்தை 70 பிக்சலுக்கு மேல் இடது பக்கம் இழுத்தால் அது டெலிட் ஆகும்
    if (touchStart - touchEnd > 70) {
      setCart(prev => prev.filter(item => item.productId !== id));
    }
  };

  // ... JSX பகுதிக்குள் ...

  {
    cart.map((item, index) => (
      <Box key={item.productId} className="swipe-delete-container" sx={{ flexShrink: 0 }}>
        {/* பின்னால் தெரியும் டெலிட் வாசகம் */}
        <Typography className="delete-action">Remove</Typography>

        <Grid
          container
          className={`item-row ${activeId === item.productId ? 'item-row-active' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => handleTouchEnd(item.productId)}
          onClick={() => { setActiveId(item.productId); setCalcBuffer(''); }}
          alignItems="center"
        >
          <Grid size={1}><Typography variant="body2">{index + 1}</Typography></Grid>
          <Grid size={4}><Typography variant="body2" noWrap>{item.productName}</Typography></Grid>
          {/* ... மற்ற காலம்கள் ... */}
        </Grid>
      </Box>
    ))
  }

  // --- 1. Mobile Back Button Handling ---
  useEffect(() => {
    window.history.pushState(null, "", window.location.pathname);
    const handleBackButton = (event: PopStateEvent) => {
      if (showPreview) {
        event.preventDefault();
        setShowPreview(false);
        window.history.pushState(null, "", window.location.pathname);
      } else if (cart.length > 0) {
        if (!window.confirm("Cart will be cleared. Exit?")) {
          window.history.pushState(null, "", window.location.pathname);
        }
      }
    };
    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [showPreview, cart.length]);
  useEffect(() => {
    // ஏற்கனவே ஒரு முறை கனெக்ட் ஆகியிருந்தால் அதை ரீகனெக்ட் செய்ய இது உதவும்
    if (printerDevice) {
      printerDevice.addEventListener('gattserverdisconnected', onDisconnected);
    }
  }, [printerDevice]);
  const onDisconnected = (event: any) => {
    const device = event.target;
    console.log(`Device ${device.name} is disconnected.`);
    // இணைப்பை மீண்டும் புதுப்பிக்க அல்லது ஸ்டேட்டை மாற்ற இங்கு கோட் எழுதலாம்
    setPrinterDevice(null);
  };

  useEffect(() => {
    localStorage.setItem('lastBillNo', billNo.toString());
  }, [billNo]);
  // 2. கார்ட் மாறும்போது தானாக ஸ்க்ரோல் செய்ய இந்த useEffect-ஐச் சேர்க்கவும்
  useEffect(() => {
    if (cart.length > 0) {
      cartEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [cart]);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalQty = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const finalTotal = Math.round(subtotal - discount);
  const noOfItems = cart.length;

  // Image Processing Logic (Keeping your original logic)
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
      const printData = [];
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
  const connectPrinter = async () => {
    try {
      // ஒருமுறை பயனர் அனுமதி அளித்த பிறகு, அந்த device ஆப்ஜெக்ட்டை வைத்துக்கொள்ளலாம்
      if (printerDevice && printerDevice.gatt?.connected) {
        return printerDevice.gatt;
      }

      // முதன்முறை மட்டும் இது பாப்-அப் கேட்கும்
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // பிரிண்டர் சர்வீஸ் ஐடி
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      setPrinterDevice(device);
      const server = await device.gatt?.connect();
      return server;
    } catch (error) {
      console.error("Bluetooth connection failed", error);
    }
  };
  const updateItem = useCallback((id: string, updates: Partial<POSItem>) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) {
        const newItem = { ...item, ...updates };
        newItem.total = Math.round((newItem.quantity || 0) * (newItem.price || 0));
        return newItem;
      }
      return item;
    }));
  }, []);

  const handleConfirmValue = useCallback((explicitBuffer?: string) => {
    const bufferToUse = explicitBuffer !== undefined ? explicitBuffer : calcBuffer;
    if (!activeId || !bufferToUse) return;
    try {
      const result = Function(`"use strict"; return (${bufferToUse.replace(/%/g, "/100")})`)();
      if (!bufferToUse.includes('*')) {
        updateItem(activeId, { [editMode === 'rate' ? 'price' : 'quantity']: Math.round(Number(result)) || 0 });
      }
      setCalcBuffer('');
      if (editMode === 'rate') setEditMode('qty');
    } catch (e) {
      setCalcBuffer('Error');
      setTimeout(() => setCalcBuffer(''), 800);
    }
  }, [activeId, calcBuffer, editMode, updateItem]);

  // --- 2. Enhanced handleCalcPress for 9*6 auto qty ---
  const handleCalcPress = useCallback((val: string | number) => {
    if (!activeId) return;
    if (val === 'x') { setEditMode(editMode === 'rate' ? 'qty' : 'rate'); setCalcBuffer(''); return; }
    if (val === '←') { setCalcBuffer(prev => prev.slice(0, -1)); return; }

    setCalcBuffer(prev => {
      const next = prev + val.toString();
      const match = next.match(/^(\d+\.?\d*)\*(\d+\.?\d*)$/);
      if (match) {
        const rateVal = Number(match[1]);
        const qtyVal = Number(match[2]);
        setCart(prevCart => prevCart.map(item => {
          if (item.productId === activeId) {
            return {
              ...item,
              price: rateVal,
              quantity: qtyVal,
              total: Math.round(rateVal * qtyVal)
            };
          }
          return item;
        }));
      }
      return next;
    });
  }, [activeId, editMode]);

  const addManualCategory = (label: string) => {
    const id = `manual-${Date.now()}`;
    setCart([...cart, { productId: id, productName: label, quantity: 1, price: 0, total: 0 }]);
    setActiveId(id);
    setEditMode('rate');
    setCalcBuffer('');
    setLastCategory(label);

    // setTimeout(() => {
    //   itemListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // }, 100); // <--- இங்கே '100' மற்றும் பிராக்கெட் ')' விடுபட்டிருந்தது
  };
  const handleSaveOnly = async () => {
    if (cart.length === 0) return alert("Cart is empty!");

    // 1. கூட்டுத்தொகையை கணக்கிடுதல்
    const currentTotal = cart.reduce((sum, item) => sum + item.total, 0);

    try {
      const invoiceData = {
        billNo: `INV-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        items: JSON.stringify(cart),
        subtotal: subtotal, // உங்கள் ஸ்டேட்டில் இருந்து
        discount: discount, // உங்கள் ஸ்டேட்டில் இருந்து
        finalTotal: Math.round(currentTotal - discount),
        // <--- இங்கே 'total'-க்கு பதில் 'currentTotal' என மாற்றவும்
        paymentMode: paymentMode
      };

      // ... மீதி fetch கோட் ...

      const scriptURL = "https://script.google.com/macros/s/AKfycby6SFDrCC0fylRk7JakWvhK53ZR9Vt3LgBdSH81FW6KaxXmdYa0Ii84tMyD-UvSwIcm/exec";

      // 'response' ஐ பயன்படுத்தாததால் எர்ரர் வருகிறது, எனவே நேரடியாக await செய்யவும்
      await fetch(scriptURL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData)
      });

      alert("Bill Saved to DataBase Successfully!(Sheet2)");
      setCart([]);
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
      // const device = await nav.bluetooth.requestDevice({
      //   acceptAllDevices: true,
      //    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb']
      //  });
      if (!device || !device.gatt?.connected) {
        try {
          device = await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb']
          });
          cachedDevice = device; // டிவைஸை மெமரியில் சேமிக்கிறோம்
        } catch (err) {
          console.log("User cancelled device selection or error occurred.");
          return; // பயனர் கேன்சல் செய்தால் பங்க்ஷனை நிறுத்தவும்
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
      // const LEFT = '\x1B\x61\x00';
      const BOLD_ON = '\x1B\x45\x01';
      const BOLD_OFF = '\x1B\x45\x00';
      const SIZE_BIG = '\x1D\x21\x11';    // 90% வித் மற்றும் பெரிய எழுத்து
      const SIZE_NORMAL = '\x1D\x21\x00'; // சாதாரண அளவு

      await char.writeValue(enc.encode(INIT + CENTER));
      // await sleep(100);
      const logoBytes = await getImageBytes('/icon-5121.png', 280);

      if (logoBytes) {
        for (let i = 0; i < logoBytes.length; i += 100) {
          await char.writeValue(logoBytes.slice(i, i + 100));
          // await sleep(100);
        }
      }
      const connectPrinter = async () => {
        try {
          // ஒருமுறை பயனர் அனுமதி அளித்த பிறகு, அந்த device ஆப்ஜெக்ட்டை வைத்துக்கொள்ளலாம்
          if (printerDevice && printerDevice.gatt?.connected) {
            return printerDevice.gatt;
          }

          // முதன்முறை மட்டும் இது பாப்-அப் கேட்கும்
          const device = await (navigator as any).bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // பிரிண்டர் சர்வீஸ் ஐடி
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
          });

          setPrinterDevice(device);
          const server = await device.gatt?.connect();
          return server;
        } catch (error) {
          console.error("Bluetooth connection failed", error);
        }
      };

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB');
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let billHeader = `\n${SIZE_BIG}${BOLD_ON}Niranjana Enterprises ${BOLD_OFF}${SIZE_NORMAL}\n` +
        `No.13/139, sikkarapuram,\n Kovur ,Chennai - 600069\n` +
        `Mob:9940134227 \n--------------------------------\n` +
        `Gst no 3##ZWPA6106G1##\n--------------------------------\n` +
        `DT: ${dateStr}  TM: ${timeStr}\nBill No: ${billNo}\n` +
        `--------------------------------\n` +
        `${BOLD_ON}  Item                 Rate        Qty   Amount${BOLD_OFF}\n` +
        `------------------------------------------\n`;
      await char.writeValue(enc.encode(billHeader));
      // await sleep(100);

let itemsData = "";
// தலைப்பிற்கு இணையாக தகவல்கள் வர, நாம் WIDE மோடைத் தவிர்த்து 
// சீரான இடைவெளிகளைப் (Padding) பயன்படுத்த வேண்டும்.
const STYLE_NORMAL = '\x1B\x21\x00'; 

cart.forEach((item, index) => {
  // 1. வரிசை எண் (3 இடங்கள்)
  const sno = (index + 1).toString().padEnd(3);
  
  // 2. ஐட்டம் பெயர் (10 எழுத்துக்கள் - தலைப்பிற்கு நேராக அமைய)
  const name = item.productName.substring(0, 10).padEnd(14);
  
  // 3. எண்கள் - தலைப்பில் உள்ள 'Rate', 'Qty', 'Amount' தூரத்திற்கு ஏற்ப 
  // ஸ்பேசிங் கொடுக்கப்பட்டுள்ளது.
  const rate = Math.round(item.price).toString().padStart(9);
  const qty = item.quantity.toString().padStart(9);
  const total = Math.round(item.total).toString().padStart(7);

  // ஒவ்வொரு பொருளுக்கும் மேலே ஒரு சிறு இடைவெளி
  itemsData += `\n`;

  // நேர்க்கோட்டில் தலைப்பிற்கு இணையாக தகவல்கள் அடுக்கப்படுகின்றன
  itemsData += `${STYLE_NORMAL}${sno}${name}${rate}${qty}${total}\n`;

  // ஒவ்வொரு பொருளுக்கும் கீழே ஒரு பிரிப்புக் கோடு (பில் 95% நிறைய)
  itemsData += `----------------------------------------------\n`;
});

await char.writeValue(enc.encode(itemsData));

      // இந்த பகுதியை உங்கள் handleFinalPrint பங்க்ஷனின் இறுதியில் பயன்படுத்தவும்
// கீழே உள்ள வரிகளில் 'const' வார்த்தையை நான் நீக்கிவிட்டேன், 
// இதனால் "Cannot redeclare" எரர் வராது.

let billFooter = `\n______________________________________________________\n\n`; // மேலே Space

// Subtotal - Bold-ல் மட்டும்
billFooter += `${BOLD_ON}${"Subtotal:".padEnd(12)}Rs.${Math.round(subtotal).toString().padStart(10)}${BOLD_OFF}\n`;
billFooter += `${"Total Qty:".padEnd(12)}${totalQty.toString().padStart(13)}\n`;

if (discount > 0) {
  billFooter += `${"Discount:".padEnd(12)}-Rs.${Math.round(discount).toString().padStart(10)}\n`;
}

// NET TOTAL - 95% இடத்தை நிரப்ப பெரிய எழுத்து (SIZE_BIG)
// \n\n என்பது மேலேயும் கீழேயும் போதிய இடைவெளியைத் தரும்
billFooter += `\n${SIZE_BIG}${"NET TOTAL:".padEnd(10)}Rs.${Math.round(finalTotal).toString().padStart(6)}${STYLE_NORMAL}\n\n`;

billFooter += `************************************************\n`;
billFooter += `Payment: ${paymentMode}\n`;
billFooter += `\nThank You! Visit Again\n\n\n`; // கீழே கூடுதல் Space

await char.writeValue(enc.encode(billFooter));


      if (paymentMode === 'SCANNER') {
        const qrBytes = await getImageBytes('/qr-code1.jpeg', 450);

        if (qrBytes) {
          await char.writeValue(enc.encode(CENTER));
          for (let i = 0; i < qrBytes.length; i += 100) {
            await char.writeValue(qrBytes.slice(i, i + 100));

          }
        }
      }
      await char.writeValue(enc.encode(`\n${CENTER}Thank You! Visit Again Niranjana Enterprises, Sikkarayapuram.\n\n\n\n`));

      // --- இதோ Auto Cutter-க்கான புதிய வரிகள் ---
      const CUT_PAPER = '\x1D\x56\x42\x00'; // இதுதான் பேப்பரை கட் செய்யும் Command
      await char.writeValue(enc.encode(CUT_PAPER));

      // Save to Google Sheet Logic
      const scriptURL = "https://script.google.com/macros/s/AKfycby6SFDrCC0fylRk7JakWvhK53ZR9Vt3LgBdSH81FW6KaxXmdYa0Ii84tMyD-UvSwIcm/exec";
      await fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billNo, date: dateStr, time: timeStr, items: cart.map(i => `${i.productName}(${i.price}x${i.quantity})`).join(", "), subtotal, discount, finalTotal, paymentMode })
      });

      setBillNo(prev => prev + 1);
      setCart([]);
      setDiscount(0);
      setShowPreview(false);
      alert("Printed..");
    } catch (error: any) { alert("Error: " + error.message); }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPreview) { if (e.key === 'Escape') setShowPreview(false); return; }
      if (/^[0-9.+\-*/%]$/.test(e.key)) { e.preventDefault(); handleCalcPress(e.key); }
      else if (e.key === 'Enter') { e.preventDefault(); handleConfirmValue(); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleCalcPress('←'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCalcPress, handleConfirmValue, showPreview]);

  return (
    <Box className="pos-container">
      <AppHeader
        title="Niranjana  EnterPrises"
        onBack={() => {
          if (cart.length > 0) {
            if (confirm("Cart will be cleared! Go back?")) window.history.back();
          } else {
            window.history.back();
          }
        }}
      />
      {/* Header & Categories... same as your original */}
      <Box className="pos-header">
        <Typography variant="h6" fontWeight="bold" align="center">Namma Appalam</Typography>
        <Stack direction="row" justifyContent="space-between" px={1}>
          <Typography variant="caption">Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
          <Typography variant="caption">Date: {new Date().toLocaleDateString('en-GB')}</Typography>
        </Stack>
      </Box>

      <Box className="pos-category-grid-container" id="category-section">
        <Box className="category-grid">
          {CATEGORIES.map(cat => (
            <Box key={cat} className="category-item-box" onClick={() => addManualCategory(cat)}>{cat}</Box>
          ))}
        </Box>
      </Box>

      <Box className="item-list" sx={{ mt: 1 }}>
        {cart.map((item, index) => (
          <Box key={item.productId} className="swipe-delete-container">
            {/* பின்னால் இருக்கும் Delete லேபல் */}
            <Typography className="delete-hint-text">
              DELETE
            </Typography>

            <Grid
              container
              className={`item-row swipeable-row ${activeId === item.productId ? 'item-row-active' : ''}`}
              // ஸ்வைப் லாஜிக் (ஏற்கனவே சேர்த்தது)
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(item.productId)}
              onClick={() => { setActiveId(item.productId); setCalcBuffer(''); }}
              alignItems="center"
            >
              <Grid size={1}><Typography variant="body2">{index + 1}</Typography></Grid>
              <Grid size={4}><Typography variant="body2" noWrap>{item.productName}</Typography></Grid>

              <Grid size={4} display="flex" justifyContent="center">
                <div className="manual-input-group no-border-group">
                  {/* Rate Input */}
                  <input
                    readOnly
                    type="text"
                    title="Rate" // Screen readers மற்றும் ஹோவர் செய்யும்போது காட்டும்
                    aria-label="Item Rate" // Accessibility-க்காக
                    className={`rate-input-minimal width-rate ${(activeId === item.productId && editMode === 'rate') ? 'input-focus-minimal' : ''}`}
                    value={(activeId === item.productId && editMode === 'rate' && calcBuffer) ? calcBuffer : item.price}
                  />

                  <Typography variant="caption" sx={{ mx: 0.5 }}>×</Typography>

                  {/* Quantity Input */}
                  <input
                    readOnly
                    type="text"
                    title="Quantity"
                    aria-label="Item Quantity"
                    className={`rate-input-minimal width-qty ${(activeId === item.productId && editMode === 'qty') ? 'input-focus-minimal' : ''}`}
                    value={(activeId === item.productId && editMode === 'qty' && calcBuffer) ? calcBuffer : item.quantity}
                  />
                </div>
              </Grid>

              <Grid size={3} display="flex" justifyContent="flex-end" alignItems="center">
                <Typography variant="body2" fontWeight="bold">₹{item.total}</Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCart(cart.filter(i => i.productId !== item.productId));
                  }}
                >
                  <X size={14} />
                </IconButton>
              </Grid>
            </Grid>
          </Box>
        ))}

        {/* ஆட்டோ-ஸ்க்ரோல் இலக்கு - இன்லைன் ஸ்டைல் நீக்கப்பட்டது */}
        <div ref={cartEndRef} className="scroll-anchor" />
      </Box>
      {/* Calculator... same as your original */}
      <Box className="calculator-grid">
        <Grid container spacing={0.5}>
          <Grid size={9}>
            <Grid container spacing={0.5}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, '←'].map((val) => (
                <Grid size={4} key={val}>
                  <Button className="calc-btn" fullWidth onClick={() => handleCalcPress(val)}>{val}</Button>
                </Grid>
              ))}
              <Grid size={6}><Button className="calc-btn btn-add-more" fullWidth disabled={!lastCategory} onClick={() => lastCategory && addManualCategory(lastCategory)}>AddMore</Button></Grid>
              <Grid size={6}><Button className="calc-btn btn-ok-confirm" fullWidth onClick={() => handleConfirmValue()}>ENTER</Button></Grid>
            </Grid>
          </Grid>
          <Grid size={3}>
            <Stack spacing={0.5}>
              <Button className="calc-btn btn-switch-mode" onClick={() => handleCalcPress('x')}>{editMode === 'rate' ? 'QTY' : 'RATE'}</Button>
              <Button className="calc-btn btn-op" onClick={() => handleCalcPress('*')}>*</Button>
              <Button className="calc-btn btn-op" onClick={() => handleCalcPress('-')}>-</Button>
              <Button className="calc-btn btn-op" onClick={() => handleCalcPress('+')}>+</Button>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Box className="footer-actions">
        {/* --- 3. UI Display for Total Qty --- */}
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

      <Dialog open={showPreview} onClose={() => setShowPreview(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ bgcolor: '#fff9c4', textAlign: 'center', fontWeight: 'bold' }}>PrintPreview</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 1 }}>
            <Box component="img" src="/icon-5121.png" alt="" sx={{ width: '60px', height: '60px', mb: '5px' }} />
            <Typography variant="h6" fontWeight="bold">Niranjana Enterprises </Typography>
            <Typography variant="caption" display="block">No.13/139, sikkarayapuram,CH-600069, Gst no 3##ZWPA6106G1##</Typography>
          </Box>
          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
          {cart.map((item, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">{i + 1}. {item.productName} ({item.price}x{item.quantity})</Typography>
              <Typography variant="body2">₹{item.total}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">No. of Items:</Typography>
            <Typography variant="body2">{noOfItems}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Total Quantity:</Typography>
            <Typography variant="body2">{totalQty}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="h6" fontWeight="bold">Total:</Typography>
            <Typography variant="h6" fontWeight="bold">₹{finalTotal.toFixed(2)}</Typography>
          </Box>
          {paymentMode === 'SCANNER' && (
            <Box sx={{
              textAlign: 'center',
              mt: 2, pt: 2,
              borderTop: '1px dashed #ccc',
              display: 'flex',
              flexDirection: 'column',
              //  width: '100%',      // நிலையான அளவு (Standard size)
              // height: '100%',
              alignItems: 'center'
            }}>
              <Typography variant="body2" sx={{ mb: 1 }}>Scan to Pay</Typography>
              <Box
                component="img"
                src="/qr-code1.jpeg"
                alt=""
                sx={{
                  width: '100%',      // நிலையான அளவு (Standard size)
                  height: '100%',
                  objectFit: 'contain',
                  imageRendering: 'pixelated', // மங்கலாகத் தெரிவதைத் தவிர்க்கும்
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
          <Button variant="contained" fullWidth sx={{ bgcolor: '#242845', py: 1.5 }} onClick={handleFinalPrint}>
            Confirm & Print
          </Button>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            {/* ஏற்கனவே உள்ள Print Button */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleFinalPrint}
              sx={{ bgcolor: '#4caf50' }}
            >
              Print & Save
            </Button>

            {/* புதிய Save Only Button */}
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