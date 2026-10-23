import { useState, useRef } from 'react';
import {
    Box, Typography, TextField,
    Button, Paper, Stack, useTheme, useMediaQuery, IconButton, CircularProgress
} from '@mui/material';

import { PlusCircle, Download, Trash2, Printer, Eye } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

declare global {
    interface Window {
        BluetoothDevice: any;
    }
}

interface CartItem {
    productName: string;
    quantity: number;
    productId: string;
    price: number;
    total: number;
}

export const InvoiceBill = () => {
    // 1. HOOKS & STATE
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [discount] = useState(0);
    const [isPrinting, setIsPrinting] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [customer, setCustomer] = useState({
        name: '',
        mobile: '9043707705',
        address: '',
        Number: '',
    });

    const [items, setItems] = useState<CartItem[]>([
        { productName: '', quantity: 1, productId: '', price: 0, total: 0 }
    ]);

    // CALCULATIONS based on 'items' state
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalQtyCount = items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const finalTotalValue = Math.round(subtotal - discount);

    const dateStr = new Date().toLocaleDateString('en-GB');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const wrapText = (text: string, limit: number) => {
        const words = text.split(' ');
        let lines = [];
        let currentLine = "";

        words.forEach(word => {
            if ((currentLine + word).length <= limit) {
                currentLine += (currentLine === "" ? "" : " ") + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        });
        lines.push(currentLine);
        return lines;
    };


    // GOOGLE SHEETS SAVE LOGIC
    const saveToGoogleSheet = async () => {
        const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbw_rfjw70CGoK3rDEE36ZEkEc7rYTUtIJqUeNwQvfObAOsf3-GF0LQDuM9mDOMNOkQI/exec";

        const sheetPayload = {
            billNo: "TAXINV",
            date: dateStr,
            time: timeStr,
            customerName: customer.name,
            "Bill To": customer.name + ", " + customer.address,
            customerNumber: customer.Number,
            "Customer Number": customer.Number + ", " + customer.Number,
            // 'items' ஸ்டேட்டில் இருந்து தகவல்களைத் திரட்டுகிறது
            items: items.map(i => `${i.productName}(${i.price}x${i.quantity})`).join(", "),
            subtotal: Math.round(subtotal),
            discount: discount,
            finalTotal: finalTotalValue,
            totalQty: totalQtyCount,
        };

        console.log("Sending Payload to Sheet:", sheetPayload);

        try {
            await fetch(GOOGLE_SHEET_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sheetPayload)
            });
            console.log("Success: Sent to Sheet");
        } catch (error) {
            console.error("Sheet Save Error:", error);
        }
    };
    // 2. HANDLERS
    const handleItemChange = (index: number, field: keyof CartItem, value: any) => {
        const newItems = [...items];

        // தற்காலிகமாக 'any' ஆக மாற்றுவதன் மூலம் index signature பிரச்சனையைத் தவிர்க்கலாம்
        (newItems[index] as any)[field] = value;

        // கணக்கீடு செய்யும் போது எண்களை மட்டும் எடுக்கிறோம்
        const qty = parseFloat(String(newItems[index].quantity)) || 0;
        const prc = parseFloat(String(newItems[index].price)) || 0;

        newItems[index].total = prc * qty;
        setItems(newItems);
    };
    const removeItem = (index: number) => {
        if (items.length > 1) setItems(items.filter((_, i) => i !== index));
    };

    // BROWSER PRINT & PREVIEW (POS STYLE)
    const handleBrowserPrint = () => {
        const printContent = invoiceRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '', 'width=900,height=900');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Invoice</title>
                    <style>
                        body { margin: 0; padding: 20px; font-family: sans-serif; }
                        /* பிரிண்ட் ஆகும்போது தேவையற்ற பட்டன்களை மறைக்க */
                        .no-print { display: none !important; }
                        /* மெட்டீரியல் UI இன்புட்களை பிரிண்டில் சரியாகக் காட்ட */
                        input { border: none !important; outline: none !important; width: 100%; font-size: 14px; }
                        @page { size: A4; margin: 10mm; }
                        .invoice-container { width: 100%; display: flex; flexDirection: column; min-height: 90vh; }
                    </style>
                </head>
                <body>
                    <div class="invoice-container">
                        ${printContent.innerHTML}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();

        // இமேஜ்கள் மற்றும் ஸ்டைல்கள் லோட் ஆக சிறிது நேரம்
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 800);
    };

    // PDF DOWNLOAD LOGIC
    const handleDownloadPDF = async () => {
        const element = invoiceRef.current;
        if (!element) return;
        await saveToGoogleSheet();
        setIsDownloading(true);

        try {
            // 1. மொபைலில் ஸ்க்ரோல் பொசிஷனை சரிசெய்தல்
            const originalScrollY = window.scrollY;
            window.scrollTo(0, 0);

            // 2. html2canvas-க்கு விர்ச்சுவல் விண்டோ அளவை கொடுத்தல்
            const canvas = await html2canvas(element, {
                scale: 2, // மொபைலில் தெளிவான பிம்பத்திற்கு
                useCORS: true,
                allowTaint: true,
                // மொபைல் ஸ்கிரீன் சிறியதாக இருந்தாலும், 800px அகலம் இருப்பதாகக் கருது (A4-க்கு ஏற்றது)
                windowWidth: 800,
                // எலிமெண்ட்டின் முழு உயரத்தையும் கேப்சர் செய்யscrollHeight பயன்படுத்துகிறோம்
                windowHeight: element.scrollHeight,
                scrollY: -window.scrollY,
                x: 0,
                y: 0
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice_BSF.pdf`);

            // பழைய ஸ்க்ரோல் நிலைக்குத் திரும்புதல்
            window.scrollTo(0, originalScrollY);
        } catch (e) {
            console.error("PDF Error", e);
        }
        setIsDownloading(false);
    };
    // BLUETOOTH PRINT (THERMAL POS)
    const handleBluetoothPrint = async () => {
        setIsPrinting(true);
        await saveToGoogleSheet();
        try {
            const nav = navigator as any;
            if (!nav.bluetooth) return alert("Bluetooth not supported");

            const device = await nav.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });

            const server = await device.gatt?.connect();
            const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const characteristics = await service?.getCharacteristics();
            const char = characteristics?.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);

            if (!char) throw new Error("Characteristic not found");

            const enc = new TextEncoder();
            const INIT = '\x1B\x40';
            const CENTER = '\x1B\x61\x01';
            const BOLD_ON = '\x1B\x45\x01';
            const BOLD_OFF = '\x1B\x45\x00';
            const SIZE_BIG = '\x1D\x21\x11';
            const SIZE_NORMAL = '\x1D\x21\x00';
            //const LEFT = '\x1B\x61\x00';

            // பெரிய அளவிலான டேட்டாவை அனுப்பும் பங்க்ஷன்
            const sendLargeData = async (characteristic: any, data: string | Uint8Array) => {
                const chunkSize = 100;
                const bytes = typeof data === 'string' ? enc.encode(data) : data;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    await characteristic.writeValue(bytes.slice(i, i + chunkSize));
                    await new Promise(r => setTimeout(r, 15));
                }
            };

            // 1. ஆரம்பம் & லோகோ
            await char.writeValue(enc.encode(INIT + CENTER));
            await char.writeValue(enc.encode('\x1B\x61\x01'));
            //await char.writeValue(enc.encode('\x1B\x61\x01'));
            const logoBytes = await getImageBytes('/logobf5.png', 120); // உங்கள் லோகோ பாத்
            if (logoBytes) await sendLargeData(char, logoBytes);

            // 2. ஹெடர் (Header)
            const header = `\n${SIZE_BIG}${BOLD_ON}Niranjana Enterprises${SIZE_NORMAL}${BOLD_OFF}\n.No.13/139, Sikkarayapuram,\nKovur EB, Chennai - 600069\nMob: 9043707705\n--------------------------------\n` +
                `GST NO 3#BEEPK4616J1#\n` +
                `DT: ${new Date().toLocaleDateString('en-GB')}  TM: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n` +
                `Bill No: BSFTAXINV\n\n` +
                `_____________________________\n` +
                `BILL TO: ${customer.name}\n` +
                `Mobile Number: ${customer.Number}\n` +
                `--------------------------------\n` +
                `${BOLD_ON}  Item                   Rate   Qty   Amount${BOLD_OFF}\n` +
                `-----------------------------------------\n`;
            await sendLargeData(char, header);
            //const SIZE_NORMAL = '\x1D\x21\x00';

            // 3. பொருட்களின் பட்டியல் (Items with Underline)

            let itemsContent = "";
            const STYLE_NORMAL = '\x1B\x21\x00';


            //const SIZE_NORMAL = '\x1D\x21\x00';
            items.forEach((item, index) => {
                // ஒரு வரிக்கு 14 எழுத்துக்கள் இருக்குமாறு பிரிக்கிறோம்
                const wrappedName = wrapText(item.productName, 28);

                const rate = item.price.toString().padStart(4, ' ');
                const qty = item.quantity.toString().padStart(6, ' ');
                const amt = Math.round(item.total).toString().padStart(8, ' ');

                // 1. முதல் வரி: இதில் மட்டும் வரிசை எண் (S.No) மற்றும் எண்கள் வரும்
                // padEnd(14) என்பது பெயருக்கான இடத்தை நிலையாக வைத்திருக்கும்
                itemsContent += `${(index + 1).toString().padEnd(2, ' ')}${wrappedName[0].trim().padEnd(20, ' ')}${rate}${qty}${amt}\n`;

                // 2. அடுத்த வரிகள்: எந்த ஒரு ஸ்பேஸும் (Space) இல்லாமல் இடது ஓரத்தில் (Zero) தொடங்கும்
                if (wrappedName.length > 1) {
                    for (let i = 1; i < wrappedName.length; i++) {
                        // இதில் ${` -க்கு முன்னால் எந்த ஸ்பேஸும் இல்லை என்பதை உறுதிப்படுத்தவும்
                        itemsContent += `${wrappedName[i]}\n`;
                    }
                }

                // 3. ஒவ்வொரு பொருளுக்கும் பிறகு ஒரு கோடு
                itemsContent += `------------------------------------------\n`;
            });
            await sendLargeData(char, itemsContent);

            // 4. பூட்டர் (Footer)
          // handleBluetoothPrint பங்க்ஷனில் footer-க்கு பிறகு
const footer = `\n` +
    `         ${BOLD_ON} Subtotal: Rs.  ${subtotal.toFixed(0).padStart(8, ' ')}${BOLD_OFF}\n` +
    `          Total Qty:      ${items.length.toString().padStart(8, ' ')}\n\n` +
    `${SIZE_BIG}NET TOTAL:Rs. ${subtotal.toFixed(0).padStart(10, ' ')}${STYLE_NORMAL}\n` +
    `************************************************\n` +
    `         Payment: CASH\n\n` +
    `For Niranjana Enterprises\n` +
    `________________________\n` +
    `Authorized Signatory\n\n`;

await sendLargeData(char, footer);

// --- கொள்கை வாசகங்கள் (Policies) ---
await char.writeValue(new Uint8Array([0x1b, 0x21, 0x01])); // சிறிய எழுத்து முறை

await char.writeValue(enc.encode(`${CENTER}No Returns, Exchanges, or Refunds.`));
await char.writeValue(enc.encode(`${CENTER}No Warranty for China Items.`));
await char.writeValue(enc.encode(`${CENTER}Goods Sold are Final.`));
await char.writeValue(enc.encode(`${CENTER}Thank You! Visit Again BalaJi Fancy, Kovur.\n`));

await char.writeValue(new Uint8Array([0x1b, 0x21, 0x00])); // எழுத்து முறையை மீட்டமைக்க
await char.writeValue(enc.encode(`\n${CENTER}R I Billing Pro.\n`));

// பேப்பர் கட்
await char.writeValue(enc.encode('\x1D\x56\x42\x00'));

        } catch (e) {
            console.error(e);
            alert("Bluetooth Print Failed");
        }
        setIsPrinting(false);
    };
    const getImageBytes = async (url: string, width: number) => {
        try {
            const img = new Image();
            img.src = url;
            await new Promise((resolve) => (img.onload = resolve));
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            canvas.width = width;
            canvas.height = (img.height * width) / img.width;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // இது ஒரு சுருக்கமான ESC/POS இமேஜ் லாஜிக்
            return new Uint8Array([0x1B, 0x61, 0x01]); // தற்காலிக ரிட்டன்
        } catch (e) { return null; }
    };

    const a4PaperStyles = {
        width: '100%',
        maxWidth: '210mm',
        minHeight: '297mm', // மிக முக்கியம்
        margin: 'auto',
        padding: isMobile ? '15px' : '30px',
        bgcolor: '#fff',
        display: 'flex', // வரிசையாக அடுக்க
        flexDirection: 'column', // செங்குத்தாக அடுக்க
        boxSizing: 'border-box' as const,
        overflow: 'visible', // மொபைலில் மறைந்திருக்கும் பகுதிகளைக் காட்ட
    };
    return (
        <Box sx={{ pb: 15, maxWidth: '900px', margin: 'auto', bgcolor: '#f4f7f6', minHeight: '100vh', p: isMobile ? 1 : 3 }}>

            <Paper elevation={isMobile ? 0 : 3} ref={invoiceRef} sx={a4PaperStyles} id="invoice-capture">
                {/* HEADER */}
                <Box sx={{ mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">Niranjana Enterprises</Typography>
                    <Typography variant="caption" display="block">Sikkarayapuram, 13/139  Chennai</Typography>
                    <Typography variant="caption" display="block">GSTIN: 3#BEEPK4616##ZF</Typography>
                </Box>

                <Box sx={{ bgcolor: '#b4b6ca', py: 0.8, my: 1 }}>
                    <Typography variant="body2" sx={{ textAlign: 'center', color: '#fff', fontWeight: 'bold' }}>TAX INVOICE</Typography>
                </Box>

                {/* INFO */}
                <Box sx={{ py: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="primary" fontWeight="bold">BILL TO</Typography>
                        {/* <Typography variant="caption" color="primary" fontWeight="bold">Customer Number</Typography> */}
                        <TextField variant="standard" fullWidth value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} sx={{ fontWeight: 'bold' }} />
                        <TextField variant="standard" fullWidth multiline value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
                        <Box sx={{ flex: 1 }}>
                            {/* <Typography variant="caption" color="primary" fontWeight="bold">BILL TO</Typography> */}
                            <Typography variant="caption" color="primary" fontWeight="bold">Customer Number</Typography>
                            <TextField variant="standard" fullWidth value={customer.Number} onChange={(e) => setCustomer({ ...customer, Number: e.target.value })} sx={{ fontWeight: 'bold' }} />
                            {/* <TextField variant="standard" fullWidth multiline value={customer.Number} onChange={(e) => setCustomer({ ...customer, Number: e.target.value })} /> */}
                        </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" fontWeight="bold">Invoice:BSFTAXINV</Typography>
                        <Typography variant="caption" display="block">Date: {new Date().toLocaleDateString('en-GB')}</Typography>
                        <TextField variant="standard" value={customer.mobile} onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })} inputProps={{ style: { textAlign: 'right' } }} />
                    </Box>
                </Box>

                {/* TABLE HEADER */}
                <Box sx={{ display: 'flex', bgcolor: '#242845', p: 1, color: '#fff', mt: 2 }}>
                    <Typography sx={{ flex: 3, fontSize: '12px', fontWeight: 'bold' }}>ITEM DESCRIPTION</Typography>
                    <Typography sx={{ flex: 2, fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>RATE x QTY</Typography>
                    <Typography sx={{ flex: 1.5, fontSize: '12px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL</Typography>
                </Box>

                {/* ITEMS */}
                {items.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', py: 1 }}>
                        <Box sx={{ flex: 3 }}>
                            <TextField fullWidth variant="standard" value={item.productName} onChange={(e) => handleItemChange(index, 'productName', e.target.value)} />
                        </Box>
                        <Box sx={{ flex: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <TextField
                                variant="standard"
                                type="number"
                                // கீழே உள்ள வரியை மட்டும் மாற்றவும்
                                value={item.price === 0 ? '' : item.price}
                                onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                                inputProps={{ style: { width: '50px', textAlign: 'center' } }}
                            />
                            <Typography>x</Typography>
                            <TextField
                                variant="standard"
                                type="text" // 'text' ஆக மாற்றவும்
                                value={item.quantity === 0 ? '' : item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                inputProps={{ style: { width: '80px', textAlign: 'center' } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1.5, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Typography fontWeight="bold">₹{item.total}</Typography>
                            <IconButton className="no-print" onClick={() => removeItem(index)} size="small" color="error"><Trash2 size={14} /></IconButton>
                        </Box>
                    </Box>
                ))}

                <Button className="no-print" startIcon={<PlusCircle size={16} />} onClick={() => setItems([...items, {
                    productId: Date.now().toString(), // ஒரு தற்காலிக ஐடி
                    productName: '',
                    price: 0,
                    quantity: 1,
                    total: 0
                }])}>Add Item</Button>

                {/* TOTAL */}
                {/* கையெழுத்து பகுதியை உள்ளடக்கிய Box */}
                <Box sx={{ flexGrow: 1 }} >
                    {/* mt: 'auto' கொடுப்பதன் மூலம் இது எப்போதும் இன்வாய்ஸின் கடைசிக்கு தள்ளப்படும் */}
                    <Box sx={{
                        mt: 'auto',
                        pt: 2,
                        width: '100%',
                        // டவுன்லோட் செய்யும்போது பிரேக் ஆகாமல் இருக்க
                        pageBreakInside: 'avoid'
                    }}>
                        <Box sx={{ width: '200px' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Typography fontWeight="bold">Grand Total</Typography>
                                <Typography fontWeight="bold">₹{subtotal.toFixed(2)}</Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right', mb: 10 }}>
                        <Typography variant="caption" fontWeight="bold">For Niranjana Enterprises</Typography>
                        <Box sx={{ height: '50px' }}></Box>
                        <Typography variant="caption" sx={{ borderTop: '1px solid #000', pt: 0.5, display: 'inline-block', minWidth: '150px' }}>
                            Authorized Signatory
                        </Typography>
                        <Box sx={{ textAlign: 'right', mb: 10 }}>
                            <Typography variant="caption" fontWeight="bold">For Niranjana Enterprises</Typography>
                            <Box sx={{ height: '50px' }}></Box>
                            <Typography variant="caption" sx={{ borderTop: '1px solid #000', pt: 0.5, display: 'inline-block', minWidth: '150px' }}>
                                Authorized Signatory
                            </Typography>

                            {/* புதிய வரி இங்கே */}
                            <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold', fontStyle: 'italic', textAlign: 'center', width: '100%', display: 'block' }}>
                                " No Returns, Exchanges, or Refunds. No Warranty for China Items. "
                            </Typography>
                        </Box>
                    </Box>
                </Box>

            </Paper>

            {/* FLOATING ACTION BAR */}
            <Paper elevation={10} sx={{ position: 'fixed', bottom: 50, left: '50%', transform: 'translateX(-50%)', p: 2, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', zIndex: 9999 }}>  <Stack direction="row" spacing={2}>
                <Button variant="outlined" startIcon={<Eye />} onClick={handleBrowserPrint} sx={{ borderRadius: 3 }}>
                    Preview
                </Button>

                <Button
                    variant="contained"
                    color="secondary"
                    startIcon={isPrinting ? <CircularProgress size={20} /> : <Printer />}
                    onClick={handleBluetoothPrint}
                    sx={{ borderRadius: 3, bgcolor: '#9333ea' }}
                >
                    POS Print
                </Button>

                <Button
                    variant="contained"
                    startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <Download />}
                    onClick={handleDownloadPDF}
                    sx={{ borderRadius: 3, bgcolor: '#242845' }}
                >
                    Save PDF
                </Button>
            </Stack>
            </Paper>
        </Box>
    );
};