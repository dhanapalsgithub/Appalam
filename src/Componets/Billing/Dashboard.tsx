import { useEffect, useState, useCallback, useMemo } from 'react';
import { Delete, ChevronRight, CalendarMonth, Event, ArrowBack, RestartAlt } from '@mui/icons-material';
import {
  Box, Card, Typography, Stack, Avatar, CircularProgress, IconButton,
  Tabs, Tab, Divider, Dialog, DialogTitle, DialogContent, Button, List, ListItem, ListItemText
} from '@mui/material';
import Grid from '@mui/material/Grid';
import html2canvas from 'html2canvas';
import {
  TrendingUp, Refresh, ListAlt, Dashboard as DashIcon,
  Close,
} from '@mui/icons-material';

// --- Helper Functions for Printer ---
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

const formatFriendlyTime = (timeVal: any) => {
  if (!timeVal) return '';
  const timeStr = String(timeVal);
  if (timeStr.includes('T') || timeStr.includes('-')) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  }
  return timeStr;
};

const StatCard = ({ title, value, icon, color, trend, subtitle }: any) => (
  <Card sx={{
    p: 3, borderRadius: '20px', border: '1px solid #E0E4EC', height: '100%', bgcolor: '#242845', color: '#fff',
    transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' }
  }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Avatar sx={{ bgcolor: color, color: '#fff', width: 48, height: 48, borderRadius: '12px' }}>{icon}</Avatar>
      {trend && <Typography variant="caption" sx={{ color: '#4ADE80', fontWeight: 'bold', bgcolor: 'rgba(74, 222, 128, 0.1)', px: 1, py: 0.5, borderRadius: 1 }}>{trend}</Typography>}
    </Stack>
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" sx={{ color: '#A3AED0', fontWeight: '500' }}>{title}</Typography>
      <Typography variant="h4" sx={{ color: '#fff', fontWeight: '700', mt: 0.5 }}>{value}</Typography>
      {subtitle && <Typography variant="caption" sx={{ color: '#A3AED0', mt: 1, display: 'block' }}>{subtitle}</Typography>}
    </Box>
  </Card>
);

export const Dashboard = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [deletedBills, setDeletedBills] = useState<string[]>([]);

  const [viewLevel, setViewLevel] = useState<'months' | 'dates' | 'transactions'>('months');
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwO6j5rzaFkVUQyYeFWNTT1k-kdx6P4M61iPH1pSlQFXa04al99FyR982zoqJb3VdXl4g/exec";
  const monthsArr = ["Jan", "Feb", "Mar", "Apr", "May", "june", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=getSales&t=${Date.now()}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        const formattedData = data.map((inv: any) => {
          let dateStr = String(inv.date || '');

          if (dateStr.includes('T') || dateStr.includes('-')) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime()) && !dateStr.includes('1899')) {
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const yyyy = d.getFullYear();
              dateStr = `${dd}/${mm}/${yyyy}`;
            }
          }

          return {
            ...inv,
            date: dateStr,
            time: formatFriendlyTime(inv.time),
            finalTotal: Number(inv.finalTotal || 0),
            subtotal: Number(inv.subtotal || inv.finalTotal || 0),
            discount: Number(inv.discount || 0),
            billNo: String(inv.billNo || ''),
            customerName: inv.customerName || inv.billTo || 'Walk-in',
            customerPhone: inv.customerPhone || inv.customerNumber || '',
            customerAddress: inv.customerAddress || inv.address || '',
            customerGst: inv.customerGst || inv.customerGstin || '',
            paymentMode: inv.paymentMode || 'CASH'
          };
        });
        setInvoices(formattedData.filter(inv => !deletedBills.includes(inv.billNo)));
      }
    } catch (error) { console.error("Fetch Error:", error); }
    finally { setLoading(false); setRefreshing(false); }
  }, [deletedBills]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle Full Reset (Clears LocalStorage and resets bill number to 1)
  const handleResetDashboard = () => {
    if (window.confirm("Are you sure you want to reset all local bill counters and cache?")) {
      localStorage.setItem('lastBillNo', '1');
      localStorage.removeItem('pos-cart');
      setInvoices([]);
      alert("Dashboard and Bill Counter reset to 1 successfully!");
      window.location.reload();
    }
  };

  const hierarchyData = useMemo(() => {
    const monthsObj: { [key: string]: any } = {};

    invoices.forEach(inv => {
      const parts = inv.date.split('/'); 
      if (parts.length < 3) return;

      const monthIndex = parseInt(parts[1]) - 1;
      const year = parts[2];

      const monthName = monthsArr[monthIndex] || "Unknown";
      const monthKey = `${monthName} ${year}`;

      if (!monthsObj[monthKey]) {
        monthsObj[monthKey] = { total: 0, count: 0, dates: {} };
      }
      if (!monthsObj[monthKey].dates[inv.date]) {
        monthsObj[monthKey].dates[inv.date] = [];
      }
      monthsObj[monthKey].total += inv.finalTotal;
      monthsObj[monthKey].count += 1;
      monthsObj[monthKey].dates[inv.date].push(inv);
    });
    return monthsObj;
  }, [invoices]);

  const handleBack = () => {
    if (viewLevel === 'transactions') setViewLevel('dates');
    else if (viewLevel === 'dates') setViewLevel('months');
  };

  const deleteInvoice = async (billNo: string) => {
    if (!window.confirm(`Delete Bill #${billNo}?`)) return;
    setRefreshing(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?action=deleteInvoice&billNo=${billNo}`);
      const result = await response.json();
      if (result.status === 'success') {
        setInvoices(prev => prev.filter(inv => inv.billNo !== billNo));
        setDeletedBills(prev => [...prev, billNo]);
      }
    } catch (error) { console.error(error); }
    finally { setRefreshing(false); }
  };

  const shareBillAsImage = async () => {
    const element = document.getElementById('printable-bill');
    if (!element || !selectedInvoice) return;
    try {
      const canvas = await html2canvas(element, { backgroundColor: "#ffffff", scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.share) {
          const file = new File([blob], `Bill_${selectedInvoice.billNo}.png`, { type: 'image/png' });
          await navigator.share({ files: [file], title: 'Niranjana Enterprises' });
        }
      }, 'image/png');
    } catch (error) { console.error(error); }
  };

  const displayFriendlyDate = (dateVal: any) => {
    if (!dateVal) return '';
    let d: Date;
    if (dateVal instanceof Date) {
      d = dateVal;
    } else {
      const dateStr = String(dateVal);
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      } else {
        d = new Date(dateStr);
      }
    }
    if (isNaN(d.getTime())) return String(dateVal);

    const monthsArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, '0');
    const month = monthsArr[d.getMonth()];
    const year = d.getFullYear();

    return `${month} ${day} ${year}`;
  };

  const handleDashboardPrint = async () => {
    if (!selectedInvoice) return;
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) return alert("Bluetooth not supported");
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb']
      });
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      const char = (await services[0].getCharacteristics()).find((c: any) =>
        c.properties.write || c.properties.writeWithoutResponse
      );
      if (!char) return alert("Cannot connect to Printer characteristic.");

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

      const logoBytes = await getImageBytes('/icon-5121.png', 170);
      if (logoBytes) await sendLargeData(char, logoBytes);

      let billHeader = `\n${SIZE_BIG}${BOLD_ON}Niranjana Enterprises ${SIZE_NORMAL}.${BOLD_OFF}\n` +
        `Namma Appalam\n` +
        `no 13/139,sivashakthi Nagar,sikkarayapuram \n--------------------------------\n` +
        `chennai-69.\n` +
        `Mob: 9043707705,8248455168\n--------------------------------\n` +
        `GST NO: 33BWUPR7527N1ZI\n--------------------------------\n` +
        `DT: ${selectedInvoice.date}  TM: ${selectedInvoice.time}\nBill No: ${selectedInvoice.billNo}\n`;

      if (selectedInvoice.customerName || selectedInvoice.customerPhone || selectedInvoice.customerAddress || selectedInvoice.customerGst) {
        billHeader += `--------------------------------\n`;
        if (selectedInvoice.customerName) billHeader += `Customer: ${selectedInvoice.customerName}\n`;
        if (selectedInvoice.customerPhone) billHeader += `Phone: ${selectedInvoice.customerPhone}\n`;
        if (selectedInvoice.customerAddress) billHeader += `Address: ${selectedInvoice.customerAddress}\n`;
        if (selectedInvoice.customerGst) billHeader += `Cust GST: ${selectedInvoice.customerGst}\n`;
      }

      billHeader += `----------------------------------------------\n` +
        `${LEFT}${BOLD_ON}Item                Rate         Qty      Amount${BOLD_OFF}\n` +
        `-----------------------------------------------\n`;
      await sendLargeData(char, billHeader);

      let itemsData = "";
      const STYLE_NORMAL = '\x1B\x21\x00';

      selectedInvoice.displayItems.forEach((itemObj: any) => {
        const name = (itemObj.name || 'Appalam').substring(0, 12).padEnd(15);
        const rate = parseFloat(String(itemObj.rate)).toFixed(0).padStart(10);
        const qty = (String(itemObj.qty) + 'Kg').padStart(9);
        const total = parseFloat(String(itemObj.amount)).toFixed(0).padStart(9);

        itemsData += `${STYLE_NORMAL}${name} ${rate} ${qty} ${total}\n`;
        if (itemObj.subDetail) {
          itemsData += `  ${itemObj.subDetail}\n`;
        }
        itemsData += `----------------------------------------------\n`;
      });
      await sendLargeData(char, itemsData);

      const totalQty = selectedInvoice.displayItems.reduce((acc: number, curr: any) => acc + Number(curr.qty || 0), 0);
      let billFooter = `${BOLD_ON}${"Subtotal:".padEnd(10)}Rs.${Math.round(selectedInvoice.subtotal).toString().padStart(8)}${BOLD_OFF}\n`;
      billFooter += `${"Total Qty:".padEnd(10)}${totalQty.toString().padStart(11)}Kg\n`;
      
      if (selectedInvoice.discount > 0) {
        billFooter += `${"Discount:".padEnd(10)}-Rs.${Math.round(selectedInvoice.discount).toString().padStart(8)}\n`;
      }

      billFooter += `\n${SIZE_BIG}${"NET TOTAL:".padEnd(10)}Rs.${Math.round(selectedInvoice.finalTotal).toString().padStart(6)}${STYLE_NORMAL}\n`;
      billFooter += `********************************\n`;
      billFooter += `Payment: ${selectedInvoice.paymentMode}\n`;

      await sendLargeData(char, billFooter);

      if (selectedInvoice.paymentMode === 'SCANNER') {
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
      await char.writeValue(enc.encode('\n\n\x1D\x56\x42\x00'));

    } catch (err: any) {
      console.error(err);
      alert("Printing failed: " + err.message);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, bgcolor: '#F4F7FE', minHeight: '100vh' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="#2B3674">Niranjana Enterprises</Typography>
          <Typography variant="body2" color="textSecondary">Business Analytics</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" color="error" size="small" startIcon={<RestartAlt />} onClick={handleResetDashboard}>
            Reset Bill #1
          </Button>
          <IconButton onClick={() => loadData()}><Refresh className={refreshing ? 'spin' : ''} /></IconButton>
        </Stack>
      </Box>

      <Tabs value={currentTab} onChange={(_, val) => setCurrentTab(val)} sx={{ mb: 3 }}>
        <Tab icon={<DashIcon />} label="Overview" iconPosition="start" />
        <Tab icon={<ListAlt />} label="History" iconPosition="start" />
      </Tabs>

      {currentTab === 0 ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <StatCard title="Total Revenue" value={`₹${invoices.reduce((s, i) => s + i.finalTotal, 0).toLocaleString()}`} icon={<TrendingUp />} color="#4318FF" trend="LIFETIME" />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <StatCard title="Total Bills" value={invoices.length} icon={<ListAlt />} color="#05CD99" subtitle="Synced Records" />
          </Grid>
        </Grid>
      ) : (
        <Card sx={{ borderRadius: '20px', p: 2, border: '1px solid #E0E4EC', boxShadow: 'none' }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            {viewLevel !== 'months' && (
              <IconButton onClick={handleBack} size="small" sx={{ bgcolor: '#eee', mr: 1 }}><ArrowBack fontSize="small" /></IconButton>
            )}
            <Typography variant="h6" fontWeight="800" color="#2B3674">
              {viewLevel === 'months' && "Monthly Sales"}
              {viewLevel === 'dates' && `Dates in ${activeMonth}`}
              {viewLevel === 'transactions' && `Bills on ${activeDate}`}
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {viewLevel === 'months' && (
            <List sx={{ pt: 0 }}>
              {Object.keys(hierarchyData)
                .sort((a, b) => b.localeCompare(a))
                .map((mKey: string) => (
                  <ListItem
                    key={mKey}
                    onClick={() => { setActiveMonth(mKey); setViewLevel('dates'); }}
                    sx={{ mb: 1.5, bgcolor: '#fff', borderRadius: '15px', border: '1px solid #F0F2F8', cursor: 'pointer', transition: '0.2s', '&:hover': { bgcolor: '#F4F7FE' } }}
                  >
                    <Avatar sx={{ bgcolor: 'rgba(67, 24, 255, 0.1)', color: '#4318FF', mr: 2 }}>
                      <CalendarMonth />
                    </Avatar>

                    <ListItemText
                      primary={mKey}
                      secondary={`${hierarchyData[mKey].count} Bills`}
                      primaryTypographyProps={{ fontWeight: 'bold' }}
                    />

                    <Typography fontWeight="800" color="#4318FF">
                      ₹{hierarchyData[mKey].total.toLocaleString()}
                    </Typography>

                    <ChevronRight sx={{ ml: 2, color: '#A3AED0' }} />
                  </ListItem>
                ))}
            </List>
          )}
          {viewLevel === 'dates' && activeMonth && (
            <List>
              {Object.keys(hierarchyData[activeMonth].dates)
                .sort((a, b) => {
                  const d1 = a.split('/').reverse().join('');
                  const d2 = b.split('/').reverse().join('');
                  return d2.localeCompare(d1);
                })
                .map((dKey) => {
                  const dayTotal = hierarchyData[activeMonth!].dates[dKey].reduce(
                    (s: number, i: any) => s + i.finalTotal,
                    0
                  );

                  return (
                    <ListItem
                      key={dKey}
                      onClick={() => { setActiveDate(dKey); setViewLevel('transactions'); }}
                      sx={{ mb: 1, bgcolor: '#fff', borderRadius: '12px', border: '1px solid #F0F2F8', cursor: 'pointer' }}
                    >
                      <Avatar sx={{ bgcolor: 'rgba(5, 205, 153, 0.1)', color: '#05CD99', mr: 2, width: 32, height: 32 }}>
                        <Event fontSize="small" />
                      </Avatar>

                      <ListItemText
                        primary={displayFriendlyDate(dKey)}
                        secondary={`${hierarchyData[activeMonth!].dates[dKey].length} Bills`}
                      />

                      <Typography fontWeight="700">₹{dayTotal.toLocaleString()}</Typography>
                      <ChevronRight sx={{ ml: 1, color: '#A3AED0' }} />
                    </ListItem>
                  );
                })}
            </List>
          )}

          {viewLevel === 'transactions' && activeMonth && activeDate && (
            <Stack spacing={1}>
              {hierarchyData[activeMonth].dates[activeDate].map((inv: any, idx: number) => {
                const rawItems = typeof inv.items === 'string' ? inv.items.split(", ") : [];
                const parsedDisplayItems = rawItems.map((itemStr: string) => {
                  const match = itemStr.match(/^(.*?)(?: \[(.*?)\])?\(([\d\.]+)x([\d\.]+)Kg\)$/);
                  if (match) {
                    const name = match[1].trim();
                    const subDetail = match[2] ? `[${match[2]}]` : '';
                    const rate = Number(match[3]);
                    const qty = Number(match[4]);
                    return { name, subDetail, rate, qty, amount: rate * qty };
                  }
                  return { name: itemStr, subDetail: '', rate: 0, qty: 1, amount: 0 };
                });

                return (
                  <Card key={idx} onClick={() => setSelectedInvoice({ ...inv, displayItems: parsedDisplayItems })}
                    sx={{ p: 2, borderRadius: '12px', cursor: 'pointer', border: '1px solid #F0F2F8', '&:hover': { bgcolor: '#F9FAFB' } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography fontWeight="bold">Bill #{inv.billNo} {inv.customerName && inv.customerName !== 'Walk-in' ? `- ${inv.customerName}` : ''}</Typography>
                        <Typography variant="caption" color="textSecondary">{inv.time} • {inv.paymentMode}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight="800" color="#4318FF">₹{inv.finalTotal}</Typography>
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deleteInvoice(inv.billNo); }}><Delete fontSize="small" /></IconButton>
                      </Stack>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Card>
      )}

      {/* Invoice Detail Dialog matching POS Preview */}
      <Dialog open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight="800">Invoice Details</Typography>
          <IconButton onClick={() => setSelectedInvoice(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent id="printable-bill">
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="900">Niranjana Enterprises</Typography>
            <Typography variant="caption" display="block">Namma Appalam</Typography>
            <Typography variant="caption">no 13/139,sivashakthi Nagar,sikkarayapuram</Typography>
            <Typography variant="caption" display="block">chennai-69. Mob: 9043707705</Typography>
            <Typography variant="caption" display="block"><b>GST NO:</b> 33BWUPR7527N1ZI</Typography>
          </Box>
          <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
          <Stack spacing={0.5}>
            <Typography variant="caption"><b>DT:</b> {selectedInvoice?.date} | <b>TM:</b> {selectedInvoice?.time}</Typography>
            <Typography variant="caption"><b>Bill No:</b> {selectedInvoice?.billNo}</Typography>
            
            {(selectedInvoice?.customerName || selectedInvoice?.customerPhone || selectedInvoice?.customerAddress || selectedInvoice?.customerGst) && (
              <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                {selectedInvoice?.customerName && <Typography variant="caption" display="block"><b>Customer:</b> {selectedInvoice.customerName}</Typography>}
                {selectedInvoice?.customerPhone && <Typography variant="caption" display="block"><b>Phone:</b> {selectedInvoice.customerPhone}</Typography>}
                {selectedInvoice?.customerAddress && <Typography variant="caption" display="block"><b>Address:</b> {selectedInvoice.customerAddress}</Typography>}
                {selectedInvoice?.customerGst && <Typography variant="caption" display="block"><b>GSTIN:</b> {selectedInvoice.customerGst}</Typography>}
              </Box>
            )}
          </Stack>
          
          <Box sx={{ mt: 2, borderTop: '1px solid #000', pt: 1 }}>
            {selectedInvoice?.displayItems?.map((item: any, i: number) => (
              <Box key={i} sx={{ mb: 1, borderBottom: '1px dashed #eee', pb: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 'bold' }}>
                    {i + 1}. {item.name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px' }}>
                    ₹{item.amount}
                  </Typography>
                </Box>
                {item.subDetail && (
                  <Typography variant="caption" sx={{ fontSize: '10px', color: '#555', display: 'block', pl: 1 }}>
                    {item.subDetail}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#666', display: 'block', pl: 1 }}>
                  Rate: {item.rate} × Qty: {item.qty}Kg
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Subtotal:</Typography>
            <Typography variant="body2">₹{selectedInvoice?.subtotal}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Total Qty:</Typography>
            <Typography variant="body2">{selectedInvoice?.displayItems?.reduce((s:number, i:any)=> s + Number(i.qty || 0), 0)}Kg</Typography>
          </Box>
          {selectedInvoice?.discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Discount:</Typography>
              <Typography variant="body2">-₹{selectedInvoice?.discount}</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="h6" fontWeight="900">NET TOTAL:</Typography>
            <Typography variant="h6" fontWeight="900">₹{selectedInvoice?.finalTotal}</Typography>
          </Box>
          <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1, fontStyle: 'italic' }}>
            Payment: {selectedInvoice?.paymentMode}
          </Typography>
        </DialogContent>
        <Stack direction="row" spacing={1} p= {2}>
          <Button fullWidth variant="outlined" color="success" onClick={shareBillAsImage}>WhatsApp</Button>
          <Button fullWidth variant="contained" onClick={handleDashboardPrint} sx={{ bgcolor: '#4318FF' }}>Print</Button>
        </Stack>
      </Dialog>

      <style>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; } `}</style>
    </Box>
  );
};