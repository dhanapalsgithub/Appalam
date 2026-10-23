import { useEffect, useState, useCallback, useMemo } from 'react';
import { Delete, ChevronRight, CalendarMonth, Event, ArrowBack } from '@mui/icons-material';
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
const getImageBytes = async (url: string, width: number) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const img = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const height = Math.round((img.height / img.width) * width);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const bits = new Uint8Array((width * height) / 8);
    for (let i = 0; i < pixels.length; i += 4) {
      const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      if (avg < 128) {
        const pixelIdx = i / 4;
        bits[Math.floor(pixelIdx / 8)] |= (128 >> (pixelIdx % 8));
      }
    }
    const header = new Uint8Array([0x1D, 0x76, 0x30, 0, width / 8, 0, height % 256, Math.floor(height / 256)]);
    const result = new Uint8Array(header.length + bits.length);
    result.set(header);
    result.set(bits, header.length);
    return result;
  } catch (e) { return null; }
};

const sendLargeData = async (characteristic: any, data: any) => {
  const enc = new TextEncoder();
  const bytes = typeof data === 'string' ? enc.encode(data) : data;
  const CHUNK_SIZE = 512;
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    await characteristic.writeValue(chunk);
  }
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

  // --- DATA LOADING WITH STRING DATE FIX & CUSTOMER GST DETAILS ---
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
            if (!isNaN(d.getTime())) {
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const yyyy = d.getFullYear();
              dateStr = `${dd}/${mm}/${yyyy}`;
            }
          }

          return {
            ...inv,
            date: dateStr,
            finalTotal: Number(inv.finalTotal || 0),
            billNo: String(inv.billNo || ''),
            customerName: inv.customerName || inv.billTo || 'Walk-in',
            customerPhone: inv.customerPhone || inv.customerNumber || '',
            customerAddress: inv.customerAddress || inv.address || '',
            customerGst: inv.customerGst || inv.customerGstin || ''
          };
        });
        setInvoices(formattedData.filter(inv => !deletedBills.includes(inv.billNo)));
      }
    } catch (error) { console.error("Fetch Error:", error); }
    finally { setLoading(false); setRefreshing(false); }
  }, [deletedBills]);

  useEffect(() => { loadData(); }, [loadData]);

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
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristics = await service.getCharacteristics();
      const char = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
      if (!char) return;

      const enc = new TextEncoder();
      const INIT = '\x1B\x40';
      const CENTER = '\x1B\x61\x01';

      await char.writeValue(enc.encode(INIT + CENTER));
      await char.writeValue(enc.encode('\x1B\x40'));
      await new Promise(r => setTimeout(r, 500));
      await char.writeValue(enc.encode('\x1B\x61\x01'));

      const logoBytes = await getImageBytes('/logobf5.png', 120);
      if (logoBytes) await sendLargeData(char, logoBytes);

      let header = `Niranjana Enterprises\nChennai - 600069\n9043707705\n--------------------------------\n` +
        `Bill No: ${selectedInvoice.billNo}\n` +
        `DT: ${selectedInvoice.date} | ${selectedInvoice.time}\n`;

      if (selectedInvoice.customerName || selectedInvoice.customerPhone || selectedInvoice.customerAddress || selectedInvoice.customerGst) {
        header += `--------------------------------\n`;
        if (selectedInvoice.customerName) header += `Customer: ${selectedInvoice.customerName}\n`;
        if (selectedInvoice.customerPhone) header += `Phone: ${selectedInvoice.customerPhone}\n`;
        if (selectedInvoice.customerAddress) header += `Address: ${selectedInvoice.customerAddress}\n`;
        if (selectedInvoice.customerGst) header += `Cust GST: ${selectedInvoice.customerGst}\n`;
      }

      header += `--------------------------------\n` +
        `   Item            Rate     Qty   Amount\n` +
        `--------------------------------------------\n`;
      await sendLargeData(char, header);

      const itemsList = selectedInvoice.displayItems.map((item: string) => {
        let name = item.split('(')[0].trim().substring(0, 12);
        const details = item.split('(')[1]?.replace(')', '') || "";

        const ratePart = details.split('x')[0] || "0";
        const qtyPart = details.split('x')[1] || "1";
        const amountPart = (Number(ratePart) * Number(qtyPart)).toString();

        const paddedName = name.padEnd(12, ' ');
        const paddedRate = ratePart.padStart(7, ' ');
        const paddedQty = qtyPart.padStart(10, ' ');
        const paddedAmount = amountPart.padStart(8, ' ');

        return `${paddedName}${paddedRate}${paddedQty}${paddedAmount}\n` +
          `-----------------------------------------------\n`;
      }).join('');
      await sendLargeData(char, itemsList);

      await char.writeValue(enc.encode(CENTER));
      const footer = `TOTAL: Rs.${selectedInvoice.finalTotal}\n\nNo Returns & No Exchange!!\n\nThank you Visit Again\n\n\n\n\n`;
      await sendLargeData(char, footer);

    } catch (err) {
      console.error(err);
      alert("Printing failed. Please check connection.");
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
        <IconButton onClick={() => loadData()}><Refresh className={refreshing ? 'spin' : ''} /></IconButton>
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
              {hierarchyData[activeMonth].dates[activeDate].map((inv: any, idx: number) => (
                <Card key={idx} onClick={() => { const items = typeof inv.items === 'string' ? inv.items.split(", ") : []; setSelectedInvoice({ ...inv, displayItems: items }); }}
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
              ))}
            </Stack>
          )}
        </Card>
      )}

      {/* Invoice Detail Dialog with Customer & GST Details */}
      <Dialog open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight="800">Invoice Details</Typography>
          <IconButton onClick={() => setSelectedInvoice(null)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent id="printable-bill">
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="900">Niranjana Enterprises</Typography>
            <Typography variant="caption">Chennai - 600069 | 9043707705</Typography>
          </Box>
          <Divider sx={{ borderStyle: 'dashed', my: 1 }} />
          <Stack spacing={0.5}>
            <Typography variant="caption"><b>Bill No:</b> {selectedInvoice?.billNo}</Typography>
            <Typography variant="caption"><b>Date:</b> {displayFriendlyDate(selectedInvoice?.date)} | {selectedInvoice?.time}</Typography>
            <Typography variant="caption"><b>Mode:</b> {selectedInvoice?.paymentMode}</Typography>
            
            {/* Customer & GST Details Display Section */}
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
            {selectedInvoice?.displayItems?.map((item: string, i: number) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '11px', flex: 2 }}>{item.split('(')[0]}</Typography>
                <Typography sx={{ fontSize: '11px', flex: 1, textAlign: 'right' }}>{item.split('x')[1]?.replace(')', '') || 1} x {item.split('(')[1]?.split('x')[0]}</Typography>
              </Box>
            ))}
          </Box>
          <Divider sx={{ my: 1 }} />
          <Typography variant="h6" textAlign="right" fontWeight="900">Total: ₹{selectedInvoice?.finalTotal}</Typography>
        </DialogContent>
        <Stack direction="row" spacing={1} p={2}>
          <Button fullWidth variant="outlined" color="success" onClick={shareBillAsImage}>WhatsApp</Button>
          <Button fullWidth variant="contained" onClick={handleDashboardPrint} sx={{ bgcolor: '#4318FF' }}>Print</Button>
        </Stack>
      </Dialog>

      <style>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; } `}</style>
    </Box>
  );
};