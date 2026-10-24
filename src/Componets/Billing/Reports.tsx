import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack, 
  CardContent, CircularProgress, IconButton, 
  Menu, MenuItem, TablePagination, TextField, Button,
  ToggleButton, ToggleButtonGroup, InputAdornment, Divider
} from '@mui/material';
import Grid from '@mui/material/Grid'; 

import {
  DollarSign, FileText, RefreshCcw, Search, Download, Users, Package, X
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwO6j5rzaFkVUQyYeFWNTT1k-kdx6P4M61iPH1pSlQFXa04al99FyR982zoqJb3VdXl4g/exec";
const COLORS = ['#4318FF', '#05CD99', '#FFB547', '#FF5B5B', '#6AD2FF', '#707EAE', '#8E44AD'];

export function Reports() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'daily' | 'monthly' | 'custom'>('daily');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date selection states
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination States
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
            finalTotal: Number(inv.finalTotal || inv.subtotal || 0),
            customerName: inv.customerName || inv.billTo || 'Walk-in',
            customerPhone: inv.customerPhone || inv.customerNumber || '',
            customerAddress: inv.customerAddress || inv.address || '',
            customerGst: inv.customerGst || inv.customerGstin || ''
          };
        });
        setInvoices(formattedData);
      }
    } catch (error) {
      console.error("Error loading sales report data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Date/Month Filtering Logic
  const filteredData = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv.date) return false;
      const parts = inv.date.split('/'); 
      if (parts.length !== 3) return false;
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      const invFormattedDate = `${year}-${month}-${day}`;
      const invFormattedMonth = `${year}-${month}`;

      if (filterType === 'daily') {
        return invFormattedDate === selectedDate;
      } else if (filterType === 'monthly') {
        return invFormattedMonth === selectedMonth;
      } else if (filterType === 'custom') {
        if (!startDate || !endDate) return true;
        return invFormattedDate >= startDate && invFormattedDate <= endDate;
      }
      return true;
    });
  }, [invoices, filterType, selectedDate, selectedMonth, startDate, endDate]);

  const finalFilteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return filteredData;

    return filteredData.filter(inv => {
      const billMatch = inv.billNo?.toString().toLowerCase().includes(term);
      const modeMatch = inv.paymentMode?.toLowerCase().includes(term);
      const itemsMatch = inv.items?.toString().toLowerCase().includes(term);
      const nameMatch = inv.customerName?.toLowerCase().includes(term);
      const phoneMatch = inv.customerPhone?.toString().toLowerCase().includes(term);
      const addressMatch = inv.customerAddress?.toLowerCase().includes(term);
      const gstMatch = inv.customerGst?.toLowerCase().includes(term);

      return billMatch || modeMatch || itemsMatch || nameMatch || phoneMatch || addressMatch || gstMatch;
    });
  }, [filteredData, searchTerm]);

  // Total Summary Calculations
  const stats = useMemo(() => {
    const total = finalFilteredData.reduce((s, i) => s + Number(i.finalTotal || 0), 0);
    const uniqueCustomers = new Set(
      finalFilteredData
        .map(i => i.customerPhone || i.customerName)
        .filter(c => c && c !== 'Walk-in')
    ).size;

    return { 
      total, 
      count: finalFilteredData.length,
      customers: uniqueCustomers || finalFilteredData.length
    };
  }, [finalFilteredData]);

  // Item-wise Breakdown Summary
  const itemSummary = useMemo(() => {
    const itemsMap: Record<string, { qty: number; amount: number }> = {};

    finalFilteredData.forEach(inv => {
      const itemsStr = inv.items?.toString() || "";
      // Parses strings like "Number 1(100x2), Number 2(50x1)" or "Item Name(Rate x Qty)"
      const itemEntries = itemsStr.split(",");

      itemEntries.forEach(entry => {
        const match = entry.trim().match(/^(.*?)\(([\d.]+)\times([\d.]+)\)$/);
        if (match) {
          const name = match[1].trim();
          const rate = parseFloat(match[2]);
          const qty = parseFloat(match[3]);
          const totalAmt = rate * qty;

          if (!itemsMap[name]) {
            itemsMap[name] = { qty: 0, amount: 0 };
          }
          itemsMap[name].qty += qty;
          itemsMap[name].amount += totalAmt;
        } else if (entry.trim()) {
          const name = entry.trim();
          if (!itemsMap[name]) {
            itemsMap[name] = { qty: 1, amount: Number(inv.finalTotal || 0) };
          } else {
            itemsMap[name].qty += 1;
          }
        }
      });
    });

    return Object.keys(itemsMap).map(name => ({
      name,
      qty: itemsMap[name].qty,
      amount: itemsMap[name].amount
    })).sort((a, b) => b.amount - a.amount);
  }, [finalFilteredData]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const groups = finalFilteredData.reduce((acc: any, inv) => {
      acc[inv.date] = (acc[inv.date] || 0) + Number(inv.finalTotal);
      return acc;
    }, {});
    return Object.keys(groups).sort((a, b) => {
      const d1 = a.split('/').reverse().join('');
      const d2 = b.split('/').reverse().join('');
      return d1.localeCompare(d2);
    }).map(date => ({ date: date.split('/').slice(0, 2).join('/'), amount: groups[date] }));
  }, [finalFilteredData]);

  const categoryPieData = useMemo(() => {
    return itemSummary.slice(0, 5).map(item => ({
      name: item.name,
      value: item.amount
    }));
  }, [itemSummary]);

  const handleExport = (type: 'excel' | 'csv' | 'pdf') => {
    setAnchorEl(null);
    const dataToExport = finalFilteredData.map(inv => ({
      "Bill No": inv.billNo || 'N/A',
      "Date": inv.date || 'N/A',
      "Customer Name": inv.customerName || 'Walk-in',
      "Phone": inv.customerPhone || 'N/A',
      "Address": inv.customerAddress || 'N/A',
      "GSTIN": inv.customerGst || 'N/A',
      "Items": inv.items || 'N/A',
      "Payment Mode": inv.paymentMode || 'N/A',
      "Total (Rs)": inv.finalTotal
    }));

    if (type === 'excel') {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales Summary");
      XLSX.writeFile(wb, `Sales_Report_${filterType}.xlsx`);
    } else if (type === 'csv') {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const csvOutput = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Sales_Report_${filterType}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const doc = new jsPDF('landscape');
      doc.text(`SALES & ITEM SUMMARY REPORT (${filterType.toUpperCase()})`, 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [['Bill', 'Date', 'Customer', 'Phone', 'Address', 'GSTIN', 'Items', 'Mode', 'Total']],
        body: dataToExport.map(i => Object.values(i)),
        styles: { fontSize: 8 }
      });
      doc.save(`Sales_Report_${filterType}.pdf`);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#f4f7fe', minHeight: '100vh' }}>
      
      {/* Top Header & Date Selection Controls */}
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h4" fontWeight="800" color="#1B2559">Sales & Item Reports</Typography>
          <IconButton size="small" onClick={() => loadData()} disabled={refreshing}>
            <RefreshCcw size={16} className={refreshing ? 'spin-icon' : ''} />
          </IconButton>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Search bill, customer, phone..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ 
              startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment>,
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}><X size={14}/></IconButton>
                </InputAdornment>
              )
            }}
            sx={{ bgcolor: 'white', borderRadius: '8px', minWidth: '200px' }}
          />

          <ToggleButtonGroup 
            value={filterType} 
            exclusive 
            onChange={(_, v) => v && setFilterType(v)} 
            size="small" 
            sx={{ bgcolor: 'white' }}
          >
            <ToggleButton value="daily">Date-Wise</ToggleButton>
            <ToggleButton value="monthly">Month-Wise</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>

          {filterType === 'daily' && (
            <TextField 
              type="date" 
              size="small" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              sx={{ bgcolor: 'white' }} 
            />
          )}

          {filterType === 'monthly' && (
            <TextField 
              type="month" 
              size="small" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              sx={{ bgcolor: 'white' }} 
            />
          )}

          {filterType === 'custom' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField type="date" size="small" value={startDate} onChange={(e) => setStartDate(e.target.value)} sx={{ bgcolor: 'white' }} />
              <Typography variant="caption">to</Typography>
              <TextField type="date" size="small" value={endDate} onChange={(e) => setEndDate(e.target.value)} sx={{ bgcolor: 'white' }} />
            </Stack>
          )}

          <Button variant="contained" onClick={(e) => setAnchorEl(e.currentTarget)} startIcon={<Download size={18} />}>
            Export
          </Button>
        </Stack>
      </Stack>

      {/* Summary KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard label="Total Revenue Summary" value={`₹${stats.total.toLocaleString('en-IN')}`} icon={<DollarSign color="#fff" />} color="#4318FF" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard label="Total Bills Summary" value={stats.count} icon={<FileText color="#fff" />} color="#05CD99" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard label="Total Customer Summary" value={stats.customers} icon={<Users color="#fff" />} color="#FFB547" />
        </Grid>
      </Grid>

      {/* Visual Analytics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: '20px' }}>
             <Typography variant="h6" fontWeight="bold" mb={2}>Sales Trend Overview</Typography>
             <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="amount" stroke="#4318FF" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
             </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: '20px' }}>
            <Typography variant="h6" fontWeight="bold">Top Item Share</Typography>
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryPieData} innerRadius={50} outerRadius={70} dataKey="value">
                    {categoryPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Stack gap={0.5}>
              {categoryPieData.slice(0, 3).map((entry, i) => (
                <Typography key={i} variant="caption" display="flex" justifyContent="space-between">
                  <span>{entry.name}</span> <b>₹{entry.value}</b>
                </Typography>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Each Item Breakdown Summary Table */}
      <Paper sx={{ p: 3, borderRadius: '20px', mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
          <Package size={20} /> Each Item Summary (Quantity & Total Amount)
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#F4F7FE' }}>
              <TableRow>
                <TableCell>Item Name</TableCell>
                <TableCell align="center">Total Quantity Sold</TableCell>
                <TableCell align="right">Total Amount (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {itemSummary.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center">No item data found for selected filter</TableCell></TableRow>
              ) : (
                itemSummary.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell fontWeight="bold">{item.name}</TableCell>
                    <TableCell align="center">{item.qty}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>₹{item.amount.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Detailed Bills Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '20px' }}>
        <Typography variant="h6" fontWeight="bold" p={2}>Customer & Bill Detailed Report</Typography>
        <Divider />
        <Table>
          <TableHead sx={{ bgcolor: '#F4F7FE' }}>
            <TableRow>
              <TableCell>Bill No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Customer Details</TableCell>
              <TableCell>Items Summary</TableCell>
              <TableCell align="right">Total Amount (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {finalFilteredData.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No Bills Found</TableCell></TableRow>
            ) : (
              [...finalFilteredData]
                .reverse()
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((inv, idx) => (
                  <TableRow key={idx}>
                    <TableCell>#{inv.billNo}</TableCell>
                    <TableCell>{inv.date}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">{inv.customerName}</Typography>
                        {inv.customerPhone && <Typography variant="caption" display="block" color="textSecondary">Ph: {inv.customerPhone}</Typography>}
                        {inv.customerAddress && <Typography variant="caption" display="block" color="textSecondary">Addr: {inv.customerAddress}</Typography>}
                        {inv.customerGst && <Typography variant="caption" display="block" color="primary">GSTIN: {inv.customerGst}</Typography>}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {inv.items}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>₹{inv.finalTotal}</TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={finalFilteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Export Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleExport('excel')}>Excel (.xlsx)</MenuItem>
        <MenuItem onClick={() => handleExport('csv')}>CSV (.csv)</MenuItem>
        <MenuItem onClick={() => handleExport('pdf')}>PDF (.pdf)</MenuItem>
      </Menu>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 1s linear infinite; }
      `}</style>
    </Box>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <Card sx={{ borderRadius: '20px', boxShadow: 'none', border: '1px solid #e2e8f0', height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ bgcolor: color, p: 1.5, borderRadius: '12px', display: 'flex' }}>{icon}</Box>
        <Box>
          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>{label}</Typography>
          <Typography variant="h6" fontWeight="bold">{value}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}