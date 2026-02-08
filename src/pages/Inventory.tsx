import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInventory, setInventory, getProducts, setProducts, getCategories, setCategories, getCurrentUser } from '@/lib/store';
import { InventoryItem, Product, Category } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Inventory = () => {
  const user = getCurrentUser();
  const [inventory, setInv] = useState(getInventory());
  const [productsList, setProductsList] = useState(getProducts());
  const [cats, setCats] = useState(getCategories());
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const [newItem, setNewItem] = useState({ name: '', unit: '', quantity: 0, costPerUnit: 0 });
  const [newProduct, setNewProduct] = useState({ name: '', categoryId: '', sellPrice: 0, costPrice: 0 });
  const [newCategory, setNewCategory] = useState({ name: '', icon: 'Coffee', color: 'cafe-warm' });

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground text-lg">ليس لديك صلاحية للوصول لهذه الصفحة</p>
      </div>
    );
  }

  const saveItem = () => {
    if (!newItem.name) return;
    const item: InventoryItem = { id: Date.now().toString(), ...newItem };
    const updated = [...inventory, item];
    setInv(updated);
    setInventory(updated);
    setNewItem({ name: '', unit: '', quantity: 0, costPerUnit: 0 });
    setShowAddItem(false);
    toast.success('تمت إضافة العنصر');
  };

  const updateItem = () => {
    if (!editItem) return;
    const updated = inventory.map(i => i.id === editItem.id ? editItem : i);
    setInv(updated);
    setInventory(updated);
    setEditItem(null);
    toast.success('تم التحديث');
  };

  const deleteItem = (id: string) => {
    const updated = inventory.filter(i => i.id !== id);
    setInv(updated);
    setInventory(updated);
    toast.success('تم الحذف');
  };

  const saveProduct = () => {
    if (!newProduct.name || !newProduct.categoryId) return;
    const product: Product = { id: Date.now().toString(), ...newProduct };
    const updated = [...productsList, product];
    setProductsList(updated);
    setProducts(updated);
    setNewProduct({ name: '', categoryId: '', sellPrice: 0, costPrice: 0 });
    setShowAddProduct(false);
    toast.success('تمت إضافة المنتج');
  };

  const deleteProduct = (id: string) => {
    const updated = productsList.filter(p => p.id !== id);
    setProductsList(updated);
    setProducts(updated);
    toast.success('تم حذف المنتج');
  };

  const saveCategory = () => {
    if (!newCategory.name) return;
    const cat: Category = { id: Date.now().toString(), ...newCategory };
    const updated = [...cats, cat];
    setCats(updated);
    setCategories(updated);
    setNewCategory({ name: '', icon: 'Coffee', color: 'cafe-warm' });
    setShowAddCategory(false);
    toast.success('تمت إضافة القسم');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">إدارة المخزون</h1>

      <Tabs defaultValue="inventory" className="w-full" dir="rtl">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="inventory">المخزن</TabsTrigger>
          <TabsTrigger value="products">المنتجات</TabsTrigger>
          <TabsTrigger value="categories">الأقسام</TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddItem(true)} className="cafe-gradient text-primary-foreground">
              <Plus size={18} className="ml-2" />
              إضافة عنصر
            </Button>
          </div>

          <div className="grid gap-3">
            {inventory.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Package size={20} className="text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.quantity} {item.unit} • {item.costPerUnit} ج.م/{item.unit}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-destructive">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddProduct(true)} className="cafe-gradient text-primary-foreground">
              <Plus size={18} className="ml-2" />
              إضافة منتج
            </Button>
          </div>

          <div className="grid gap-3">
            {productsList.map((product, i) => {
              const cat = cats.find(c => c.id === product.categoryId);
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {cat?.name} • بيع: {product.sellPrice} ج.م • تكلفة: {product.costPrice} ج.م •
                      <span className="text-success font-medium"> ربح: {product.sellPrice - product.costPrice} ج.م</span>
                    </p>
                    {product.ingredients && (
                      <p className="text-xs text-muted-foreground mt-1">
                        المكونات: {product.ingredients.map(ing => `${ing.name} (${ing.cost} ج.م)`).join(' + ')}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} className="text-destructive">
                    <Trash2 size={16} />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddCategory(true)} className="cafe-gradient text-primary-foreground">
              <Plus size={18} className="ml-2" />
              إضافة قسم
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cats.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-4 text-center"
              >
                <p className="font-semibold text-foreground">{cat.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {productsList.filter(p => p.categoryId === cat.id).length} منتج
                </p>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Inventory Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة عنصر للمخزن</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="اسم العنصر" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
            <Input placeholder="الوحدة (كجم/لتر/علبة)" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
            <Input type="number" placeholder="الكمية" value={newItem.quantity || ''} onChange={e => setNewItem({ ...newItem, quantity: +e.target.value })} />
            <Input type="number" placeholder="سعر الوحدة" value={newItem.costPerUnit || ''} onChange={e => setNewItem({ ...newItem, costPerUnit: +e.target.value })} />
            <Button onClick={saveItem} className="w-full cafe-gradient text-primary-foreground">
              <Save size={16} className="ml-2" />
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Inventory Item Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل عنصر</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} />
              <Input value={editItem.unit} onChange={e => setEditItem({ ...editItem, unit: e.target.value })} />
              <Input type="number" value={editItem.quantity} onChange={e => setEditItem({ ...editItem, quantity: +e.target.value })} />
              <Input type="number" value={editItem.costPerUnit} onChange={e => setEditItem({ ...editItem, costPerUnit: +e.target.value })} />
              <Button onClick={updateItem} className="w-full cafe-gradient text-primary-foreground">
                <Save size={16} className="ml-2" />
                تحديث
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة منتج</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="اسم المنتج" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
            <select
              value={newProduct.categoryId}
              onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">اختر القسم</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input type="number" placeholder="سعر البيع" value={newProduct.sellPrice || ''} onChange={e => setNewProduct({ ...newProduct, sellPrice: +e.target.value })} />
            <Input type="number" placeholder="سعر التكلفة" value={newProduct.costPrice || ''} onChange={e => setNewProduct({ ...newProduct, costPrice: +e.target.value })} />
            <Button onClick={saveProduct} className="w-full cafe-gradient text-primary-foreground">
              <Save size={16} className="ml-2" />
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة قسم جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="اسم القسم" value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} />
            <Button onClick={saveCategory} className="w-full cafe-gradient text-primary-foreground">
              <Save size={16} className="ml-2" />
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
