import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Card, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack, 
  CardContent, CircularProgress, IconButton, 
  Menu, MenuItem,  TablePagination
} from '@mui/material';
import Grid from '@mui/material/Grid'; 

import {
  DollarSign, FileText, RefreshCcw,

} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Point of Sale பக்கத்தில் பயன்படுத்தப்படும் அதே Google Sheet URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwO6j5rzaFkVUQyYeFWNTT1k-kdx6P4M61iPH1pSlQFXa04al99FyR982zoqJb3VdXl4g/exec";
const COLORS = ['#4318FF', '#05CD99', '#FFB547', '#FF5B5B', '#6AD2FF', '#707EAE', '#8E44AD'];

const TARGET_CATEGORIES = [
  'TYPE 1', 'TYPE 2', 'TYPE 3', 'TYPE 4', 
  'TYPE 5', 'TYPE 6', 'FANCY', 'STATIONERY', 
  'COSMETIC', 'TAILORING', 'PLASTIC', 'GIFT'
];

export function Reports() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, ] = useState<'weekly' | 'monthly' | 'custom'>('monthly');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm,] = useState('');
  
  // Calendar Custom Date Range States
  const [startDate,] = useState('');
  const [endDate,] = useState('');

  // Pagination States
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [selectedMonth,] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  const filteredData = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv.date) return false;
      const parts = inv.date.split('/'); 
      if (parts.length !== 3) return false;
      const invDateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));

      if (filterType === 'monthly') {
        const invMonthYear = `${parts[2]}-${parts[1]}`;
        return invMonthYear === selectedMonth;
      } else if (filterType === 'weekly') {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        return invDateObj >= sevenDaysAgo && invDateObj <= today;
      } else if (filterType === 'custom') {
        if (!startDate || !endDate) return true;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return invDateObj >= start && invDateObj <= end;
      }
      return true;
    });
  }, [invoices, selectedMonth, filterType, startDate, endDate]);

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

  const stats = useMemo(() => {
    const total = finalFilteredData.reduce((s, i) => s + Number(i.finalTotal || 0), 0);
    return { total, count: finalFilteredData.length };
  }, [finalFilteredData]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    const monthTotalRevenue = filteredData.reduce((sum, inv) => sum + Number(inv.finalTotal || 0), 0);

    finalFilteredData.forEach(inv => {
      const itemsStr = inv.items?.toString().toUpperCase() || "";
      let matched = false;

      TARGET_CATEGORIES.forEach(cat => {
        if (itemsStr.includes(cat)) {
          cats[cat] = (cats[cat] || 0) + Number(inv.finalTotal);
          matched = true;
        }
      });

      if (!matched) {
        cats['OTHERS'] = (cats['OTHERS'] || 0) + Number(inv.finalTotal);
      }
    });

    return Object.keys(cats).map(name => ({
      name,
      value: cats[name],
      percentage: monthTotalRevenue > 0 ? ((cats[name] / monthTotalRevenue) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.value - a.value);
  }, [filteredData, finalFilteredData]);

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
      XLSX.utils.book_append_sheet(wb, ws, "Sales");
      XLSX.writeFile(wb, `Sales_Report.xlsx`);
    } else if (type === 'csv') {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const csvOutput = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Sales_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const doc = new jsPDF('landscape');
      doc.text(`SALES REPORT`, 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [['Bill', 'Date', 'Customer', 'Phone', 'Address', 'GSTIN', 'Items', 'Mode', 'Total']],
        body: dataToExport.map(i => Object.values(i)),
        styles: { fontSize: 8 }
      });
      doc.save(`Sales_Report.pdf`);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#f4f7fe', minHeight: '100vh' }}>
      
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="#1B2559">Sales Reports</Typography>
          <IconButton size="small" onClick={() => loadData()} disabled={refreshing}>
            <RefreshCcw size={14} className={refreshing ? 'spin-icon' : ''} />
          </IconButton>
        </Box>

        {/* <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search bill, customer, phone, GST..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ 
              startAdornment: <Search size={16} style={{ marginRight: 8 }} />,
              endAdornment: searchTerm && <IconButton onClick={() => setSearchTerm('')}><X size={14}/></IconButton>
            }}
            sx={{ bgcolor: 'white', borderRadius: '10px', width: { xs: '100%', md: '280px' } }}
          />

          {filterType === 'monthly' && (
            <TextField type="month" size="small" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} sx={{ bgcolor: 'white' }} />
          )}

          {filterType === 'custom' && (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField type="date" size="small" value={startDate} onChange={(e) => setStartDate(e.target.value)} sx={{ bgcolor: 'white' }} />
              <Typography variant="caption">to</Typography>
              <TextField type="date" size="small" value={endDate} onChange={(e) => setEndDate(e.target.value)} sx={{ bgcolor: 'white' }} />
            </Stack>
          )}
          
          <ToggleButtonGroup 
            value={filterType} 
            exclusive 
            onChange={(_, v) => v && setFilterType(v)} 
            size="small" 
            sx={{ bgcolor: 'white' }}
          >
            <ToggleButton value="weekly">Weekly</ToggleButton>
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>

          <Button variant="contained" onClick={(e) => setAnchorEl(e.currentTarget)} startIcon={<Download size={18} />}>Export</Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 3, overflowX: 'auto', py: 1 }}>
        {TARGET_CATEGORIES.map(cat => (
          <Chip 
            key={cat} 
            label={cat} 
            onClick={() => setSearchTerm(cat)}
            color={searchTerm.toUpperCase() === cat ? "primary" : "default"}
            variant="filled"
            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
          />
        ))} */}
      </Stack>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total Revenue" value={`₹${stats.total.toLocaleString('en-IN')}`} icon={<DollarSign color="#fff" />} color="#4318FF" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total Bills" value={stats.count} icon={<FileText color="#fff" />} color="#05CD99" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: '20px' }}>
             <Typography variant="h6" fontWeight="bold" mb={2}>Sales Trend</Typography>
             <Box sx={{ height: 300 }}>
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
            <Typography variant="h6" fontWeight="bold">Category Share</Typography>
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} innerRadius={60} outerRadius={80} dataKey="value">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Stack gap={1}>
              {categoryData.slice(0, 4).map((entry, i) => (
                <Typography key={i} variant="caption" display="flex" justifyContent="space-between">
                  <span>{entry.name}</span> <b>{entry.percentage}%</b>
                </Typography>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ mt: 4, borderRadius: '20px' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F4F7FE' }}>
            <TableRow>
              <TableCell>Bill No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Customer Details</TableCell>
              <TableCell>Items</TableCell>
              <TableCell align="right">Total (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {finalFilteredData.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No Data Found</TableCell></TableRow>
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