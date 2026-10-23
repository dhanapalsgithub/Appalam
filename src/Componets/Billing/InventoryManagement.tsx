import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  MenuItem,
  Grid, // MUI v6 Grid
} from '@mui/material';

import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { getProducts, addProduct, updateProduct, deleteProduct } from './utils/storage';
import type { Product } from '../../App';

type Category = 'fancy-items' | 'cosmetics' | 'stationary' | 'tailoring' | 'toys' | 'gift' | 'soft-toys' | 'plastic' | 'steels' | 'other';

const categories: Category[] = [
  'fancy-items', 'cosmetics', 'stationary', 'tailoring', 'toys', 
  'gift', 'soft-toys', 'plastic', 'steels', 'other'
];

export const InventoryManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'fancy-items' as Category,
    price: '',
    stock: '',
    barcode: '', 
    unit: 'piece'
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    setProducts(getProducts());
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category as Category,
        price: product.price.toString(),
        stock: product.stock.toString(),
        barcode: product.barcode, 
        unit: product.unit,
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: 'fancy-items', price: '', stock: '', barcode: '', unit: 'piece' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const productData: Product = {
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
      barcode: formData.barcode, 
      unit: formData.unit,
    };

    if (editingProduct) {
      updateProduct(productData);
    } else {
      addProduct(productData);
    }
    
    setIsDialogOpen(false);
    loadProducts();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">Inventory Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<Plus size={20} />} 
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2, bgcolor: '#9333ea', '&:hover': { bgcolor: '#7e22ce' } }}
        >
          Add Product
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search by name or barcode..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3, bgcolor: 'white' }}
        InputProps={{
          startAdornment: <Search size={20} style={{ marginRight: 8, opacity: 0.5 }} />,
        }}
      />

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell>Product Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Barcode</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{product.name}</TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>{product.category}</TableCell>
                <TableCell>{product.barcode}</TableCell>
                <TableCell align="right">₹{product.price.toFixed(2)}</TableCell>
                <TableCell align="right">
                  <Typography color={product.stock < 10 ? 'error' : 'inherit'} sx={{ fontWeight: 'bold' }}>
                    {product.stock} {product.unit}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleOpenDialog(product)} color="primary"><Pencil size={18} /></IconButton>
                  <IconButton onClick={() => { deleteProduct(product.id); loadProducts(); }} color="error"><Trash2 size={18} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent dividers>
          {/* FIXED FOR MUI v6: 
              1. Removed 'item' prop (not needed in v6).
              2. Used size={{ xs: value }} object instead of top-level xs={value}.
          */}
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Product Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as Category})}>
                {categories.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Barcode" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Price" type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Stock" type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsDialogOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ bgcolor: '#9333ea' }}>
            {editingProduct ? 'Update Product' : 'Save Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};