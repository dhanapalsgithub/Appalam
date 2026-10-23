import { useState } from 'react';
import {
  Box,
  CssBaseline,
  IconButton,
  useMediaQuery,
  useTheme,
  Container
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// Components
import { Sidebar } from './Componets/Billing/Sidebar';
import { Dashboard } from './Componets/Billing/Dashboard';
import { PointOfSale } from './Componets/Billing/PointOfSale';
import { InventoryManagement } from './Componets/Billing/InventoryManagement';
import { Reports } from './Componets/Billing/Reports';
import { InvoiceBill } from './Componets/InvoiceBill';
import PartyPayment from './Componets/Billing/PartyPayment';


// --- Shared Types & Interfaces ---
export type Category = 'fancy-items' | 'cosmetics' | 'stationery' | 'tailoring' | 'toys' | 'gift' | 'soft-toys' | 'plastic' | 'other' | 'steels';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  barcode: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

// திருத்தப்பட்ட Invoice Interface
export interface Invoice {
  id: string;
  billNo: string | number;         // Reports-க்காக சேர்க்கப்பட்டது
  invoiceNumber: string;
  date: string;
  time: string;                   // Reports-க்காக சேர்க்கப்பட்டது
  paymentMode: 'CASH' | 'SCANNER'; // Reports-க்காக சேர்க்கப்பட்டது
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
}

type View = 'dashboard' | 'pos' | 'inventory' | 'reports' | 'invoice' | 'partypayment';

function App() {
  const [currentView, setCurrentView] = useState<View>('pos');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <PointOfSale />;
      case 'invoice':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, bgcolor: '#f5f5f5' }}>
            <InvoiceBill />
          </Box>
        );
      case 'inventory': return <InventoryManagement />;
      case 'reports': return <Reports />;
      case 'partypayment': return <PartyPayment />;
      default: return <PointOfSale />;
    }
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F7FE' }}>
      <CssBaseline />

      {isMobile && (
        <IconButton
          id="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1200,
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
            color: 'white',
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.39)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 50%, #db2777 100%)',
            }
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          p: { xs: 2, sm: 3, md: 4 },
          width: '100%'
        }}
      >
        <Container maxWidth="xl" disableGutters>
          {renderView()}
        </Container>
      </Box>
    </Box>
  );
}

export default App;