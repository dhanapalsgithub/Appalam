import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, TextField, MenuItem, Button,
  Card, CardContent, Divider, CircularProgress, Chip, Paper, Stack, IconButton
} from '@mui/material';
import Grid from '@mui/material/Grid'; 
import { AddCard, AccountBalanceWallet, Person, Payments, History, Search, Delete } from '@mui/icons-material';

// Point of Sale & Google Apps Script-ல் பயன்படுத்தப்படும் அதே URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwO6j5rzaFkVUQyYeFWNTT1k-kdx6P4M61iPH1pSlQFXa04al99FyR982zoqJb3VdXl4g/exec";

const PartyPayment: React.FC = () => {
  const [parties, setParties] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [manualPartyName, setManualPartyName] = useState<string>('');
  const [isManualEntry, setIsManualEntry] = useState<boolean>(false);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const partyRes = await fetch(`${WEB_APP_URL}?action=getPartyData&t=${Date.now()}`);
      const partyJson = await partyRes.json();
      setParties(partyJson.partyList || []);
      const currentG2Balance = Number(partyJson.totalRevenue) || 0;
      setClosingBalance(currentG2Balance); 
      
      const ledgerRes = await fetch(`${WEB_APP_URL}?action=getLedgerData&t=${Date.now()}`);
      const ledgerJson = await ledgerRes.json();
      const sortedData = (Array.isArray(ledgerJson) ? ledgerJson : []).sort((a: any, b: any) => {
        const dateA = new Date(a.date ? a.date.split('/').reverse().join('-') : '').getTime();
        const dateB = new Date(b.date ? b.date.split('/').reverse().join('-') : '').getTime();
        return dateB - dateA;
      });
      setLedgerData(sortedData);

      const totalPaidInLedger = sortedData.reduce((sum: number, item: any) => sum + (Number(item.settledAmount) || 0), 0);
      setOpeningBalance(currentG2Balance + totalPaidInLedger);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Delete payment for ${item.partyName}? ₹${item.settledAmount} will be added back.`)) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        action: "deletePartyPayment",
        partyName: String(item.partyName).trim(),
        date: String(item.date).trim(),
        time: String(item.time).trim()
      }).toString();
      const response = await fetch(`${WEB_APP_URL}?${query}`);
      const textData = await response.text();
      const result = JSON.parse(textData);
      if (result.status === 'success') {
        alert("Deleted successfully!");
        await fetchData(); 
      } else {
        alert(result.message || "Delete failed");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Delete failed due to network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paid = parseFloat(amountPaid) || 0;
    if (paid <= 0) { alert("Enter a valid amount!"); return; }
    if (paid > closingBalance) { alert("Insufficient Balance!"); return; }
    setLoading(true);
    const paymentData = {
      action: "savePartyPayment",
      partyName: isManualEntry ? manualPartyName : selectedParty,
      settledAmount: paid,
      date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString('en-US', { hour12: true })
    };
    try {
      await fetch(WEB_APP_URL, { 
        method: "POST", 
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData) 
      });
      setAmountPaid(''); setSelectedParty(''); setManualPartyName(''); setIsManualEntry(false);
      setTimeout(async () => { await fetchData(); alert("Payment Saved Successfully!"); }, 1000);
    } catch (error) { alert("Error saving payment"); } finally { setLoading(false); }
  };

  // Filter Data
  const filteredLedger = ledgerData.filter(row => 
    row.partyName && row.partyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate Total Settled for the filtered view
  const totalSettledInLedger = filteredLedger.reduce((sum, item) => sum + (Number(item.settledAmount) || 0), 0);

  // Group filtered data by date
  const groupedData = filteredLedger.reduce((groups: any, item) => {
    const date = item.date || 'Unknown Date';
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
    return groups;
  }, {});

  return (
    <Container maxWidth="lg" sx={{ py: 4, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      
      {/* 1. TOP BALANCE CARDS */}
      <Box sx={{ mb: 4 }}>
        <Card elevation={6} sx={{ borderRadius: 4, bgcolor: '#242845', color: 'white' }}>
          <CardContent sx={{ p: 0 }}>
            <Grid container>
              <Grid size={{ xs: 12, sm: 6 }} sx={{ p: 3, borderRight: { sm: '1px solid rgba(255,255,255,0.1)' } }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <AccountBalanceWallet sx={{ fontSize: 40, color: '#90caf9' }} />
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 'bold' }}>Opening Balance</Typography>
                    <Typography variant="h4" fontWeight="bold">₹{openingBalance.toLocaleString()}</Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Payments sx={{ fontSize: 40, color: '#4caf50' }} />
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 'bold' }}>Closing Balance (G2)</Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#4caf50' }}>₹{closingBalance.toLocaleString()}</Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      <Grid container spacing={4}>
        {/* 2. ENTRY FORM */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={3} sx={{ borderRadius: 3, borderTop: '6px solid #242845' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddCard color="primary" /> New Payment
              </Typography>
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField select label="Select Party" value={selectedParty} fullWidth size="small"
                  onChange={(e) => { setSelectedParty(e.target.value); setIsManualEntry(e.target.value === "NEW"); }}>
                  <MenuItem value=""><em>-- Choose --</em></MenuItem>
                  {parties.map((p, i) => <MenuItem key={i} value={p.name}>{p.name}</MenuItem>)}
                  <MenuItem value="NEW">+ Add New Vendor</MenuItem>
                </TextField>
                {isManualEntry && <TextField label="Vendor Name" fullWidth size="small" value={manualPartyName} onChange={(e) => setManualPartyName(e.target.value)} />}
                <TextField label="Settled Amount (₹)" type="number" fullWidth size="small" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                <Button type="submit" variant="contained" disabled={loading} sx={{ py: 1.5, fontWeight: 'bold', bgcolor: '#242845' }}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : "Confirm Payment"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. LEDGER HISTORY WITH TOTAL SETTLED */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card elevation={3} sx={{ borderRadius: 3, borderTop: '6px solid #1976d2' }}>
            <CardContent sx={{ p: 3 }}>
              
              {/* Header & Search */}
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} mb={3}>
                <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <History color="primary" /> Payment Ledger
                </Typography>
                <TextField 
                  placeholder="Search..." size="small" value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{ input: { startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> } }}
                />
              </Stack>

              {/* Total Settled Summary Bar */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: '#f1f8fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Total Settled (Displayed):</Typography>
                <Typography variant="h6" fontWeight="bold" color="error.main">₹{totalSettledInLedger.toLocaleString()}</Typography>
              </Paper>

              {Object.keys(groupedData).length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>No transactions found.</Typography>
              ) : (
                Object.keys(groupedData).map((date) => (
                  <Box key={date} sx={{ mb: 3 }}>
                    <Divider textAlign="left">
                      <Chip label={date} size="small" sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd' }} />
                    </Divider>
                    {groupedData[date].map((item: any, idx: number) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 2, mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Person color="action" />
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">{item.partyName}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.time}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" color="error.main" fontWeight="bold">- ₹{Number(item.settledAmount).toLocaleString()}</Typography>
                          <IconButton onClick={() => handleDelete(item)} size="small" color="error">
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PartyPayment;