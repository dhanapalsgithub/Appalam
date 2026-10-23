import {  useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  X,
} from "lucide-react";

type View = "dashboard" | "pos" | "inventory" | "reports" | "invoice" | "partypayment";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
  // ஒருவேளை பிரிவியூ மோடு POS-ல் இருந்தால் அதை மூடுவதற்கு இது உதவும்
  isPreviewOpen?: boolean; 
  setIsPreviewOpen?: (val: boolean) => void;
}

const DRAWER_WIDTH = 260;

export function Sidebar({
  currentView,
  onViewChange,
  isOpen,
  onClose,
  isPreviewOpen,
  setIsPreviewOpen
}: SidebarProps) {
  
  // --- மொபைல் பேக் பட்டன் லாஜிக் ---
  useEffect(() => {
    // ஒரு போலி ஹிஸ்டரியை உருவாக்குகிறோம்
    window.history.pushState(null, "", window.location.pathname);

    const handleBackButton = (event: PopStateEvent) => {
      event.preventDefault();

      if (isPreviewOpen && setIsPreviewOpen) {
        // 1. பிரிவியூ டயலாக் திறந்திருந்தால் அதை மூடு
        setIsPreviewOpen(false);
        window.history.pushState(null, "", window.location.pathname);
      } else if (!isOpen) {
        // 2. சைட்பார் மூடப்பட்டிருந்தால் அதைத் திற (ஆப் வெளியேறாது)
        // கவனிக்க: 'isOpen' என்பது தந்தை (Parent) காம்போனென்ட்டில் இருந்து வருகிறது. 
        // எனவே தந்தை காம்போனென்ட்டில் 'onOpen' போன்ற பங்க்ஷன் இருந்தால் அதை அழைக்கவும்.
        // அல்லது நேரடியாக onViewChange போன்ற ஒன்றைப் பயன்படுத்தி ஸ்டேட்டை மாற்றவும்.
        // இங்கு நாம் ஒரு 'click' ஈவண்ட் போலச் செயல்பட வைக்கிறோம்.
        const menuBtn = document.getElementById('sidebar-toggle-btn');
        if (menuBtn) menuBtn.click();
        
        window.history.pushState(null, "", window.location.pathname);
      } else {
        // 3. சைட்பார் ஏற்கனவே திறந்திருந்தால் வெளியேற அனுமதி கேள்
        if (window.confirm("Do you want to exit the app?")) {
          window.history.back();
        } else {
          window.history.pushState(null, "", window.location.pathname);
        }
      }
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [isOpen, isPreviewOpen, setIsPreviewOpen]);

  const menuItems = [
    { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
    { id: "pos" as View, label: "Point of Sale", icon: ShoppingCart },
    { id: "invoice" as View, label: " Tax Invoice ", icon: FileText },
    { id: "inventory" as View, label: "Inventory", icon: Package },
    { id: "reports" as View, label: "Reports", icon: FileText },
     { id: "partypayment" as View, label: "PartyPayment", icon: FileText },
  ];

  const sidebarContent = (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#020516",
        color: "white",
        position: "relative",
      }}
    >
      {/* Close Button for Mobile */}
      <IconButton
        onClick={onClose}
        sx={{
          display: { lg: "none" },
          position: "absolute",
          top: 10,
          right: 10,
          color: "white",
          bgcolor: "rgba(236, 27, 27, 0.1)",
          "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
        }}
      >
        <X size={20} />
      </IconButton>

      {/* Header / Logo Section */}
      <Box sx={{ p: 3, mt: { xs: 2, lg: 0 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              p: 1,
              bgcolor: "#fff",
              borderRadius: '50%',
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ca6730",
              width: 100,
              height: 100,
            }}
          >
            <Box
              component="img"
              src="/icon-5121.png"
              alt="Logo"
              sx={{ 
                width: 84, 
                height: 84, 
                objectFit: 'contain',
                borderRadius : '50%' 
              }}
            />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
            Niranjana Enterprises
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, color:'orange' }}>
              R I Billing Pro
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "#ca6730", mb: 1 }} />

      {/* Navigation Menu */}
      <List sx={{ px: 2, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  onViewChange(item.id);
                  onClose();
                }}
                sx={{
                  borderRadius: 2,
                  transition: "all 0.2s",
                  bgcolor: isActive ? "white" : "transparent",
                  color: isActive ? "#242845" : "rgba(255,255,255,0.8)",
                  boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                  transform: isActive ? "scale(1.02)" : "none",
                  "&:hover": {
                    bgcolor: isActive ? "white" : "rgba(255,255,255,0.1)",
                    color: isActive ? "#242845" : "white",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: "#ca6730",
                  }}
                >
                  <Icon size={20} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer Section */}
      <Box
        sx={{
          m: 2,
          p: 2,
          bgcolor: "rgba(0,0,0,0.15)",
          borderRadius: 2,
        }}
      >
        <Typography variant="caption" display="block" sx={{ opacity: 0.6 }}>
          Version 1.0.0
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 , color: '#ca6730'}}>
          © 2025 RI Billing pro
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: { lg: 0 } }}>
      <Drawer
        variant="temporary"
        open={isOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, border: "none" },
        }}
      >
        {sidebarContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, border: "none", position: "relative" },
        }}
        open
      >
        {sidebarContent}
      </Drawer>
    </Box>
  );
}