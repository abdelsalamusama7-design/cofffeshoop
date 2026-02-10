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
import IngredientsEditor from '@/components/IngredientsEditor';
import { Ingredient } from '@/lib/types';

const Inventory = () => {
  const user = getCurrentUser();
  const [inventory, setInv] = useState(getInventory());
  const [productsList, setProductsList] = useState(getProducts());
  const [cats, setCats] = useState(getCategories());
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [newItem, setNewItem] = useState({ name: '', unit: '', quantity: 0, costPerUnit: 0 });
  const [newProduct, setNewProduct] = useState<{ name: string; categoryId: string; sellPrice: number; costPrice: number; ingredients: Ingredient[] }>({ name: '', categoryId: '', sellPrice: 0, costPrice: 0, ingredients: [] });
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
    const costFromIngredients = newProduct.ingredients.reduce((s, i) => s + i.cost, 0);
    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      categoryId: newProduct.categoryId,
      sellPrice: newProduct.sellPrice,
      costPrice: costFromIngredients || newProduct.costPrice,
      ingredients: newProduct.ingredients.length > 0 ? newProduct.ingredients : undefined,
    };
    const updated = [...productsList, product];
    setProductsList(updated);
    setProducts(updated);
    setNewProduct({ name: '', categoryId: '', sellPrice: 0, costPrice: 0, ingredients: [] });
    setShowAddProduct(false);
    toast.success('تمت إضافة المنتج');
  };

  const deleteProduct = (id: string) => {
    const updated = productsList.filter(p => p.id !== id);
    setProductsList(updated);
    setProducts(updated);
    toast.success('تم حذف المنتج');
  };

  const updateProduct = () => {
    if (!editProduct) return;
    const costFromIngredients = (editProduct.ingredients || []).reduce((s, i) => s + i.cost, 0);
    const finalProduct = {
      ...editProduct,
      costPrice: costFromIngredients || editProduct.costPrice,
    };
    const updated = productsList.map(p => p.id === finalProduct.id ? finalProduct : p);
    setProductsList(updated);
    setProducts(updated);
    setEditProduct(null);
    toast.success('تم تعديل المنتج');
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

  const updateCategory = () => {
    if (!editCategory) return;
    const updated = cats.map(c => c.id === editCategory.id ? editCategory : c);
    setCats(updated);
    setCategories(updated);
    setEditCategory(null);
    toast.success('تم تعديل القسم');
  };

  const deleteCategory = (id: string) => {
    const hasProducts = productsList.some(p => p.categoryId === id);
    if (hasProducts) {
      toast.error('لا يمكن حذف قسم يحتوي على منتجات');
      return;
    }
    const updated = cats.filter(c => c.id !== id);
    setCats(updated);
    setCategories(updated);
    toast.success('تم حذف القسم');
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
          {/* Inventory Value Summary */}
          {(() => {
            const totalCostValue = inventory.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0);
            const productsSellValue = productsList.reduce((sum, p) => {
              // Calculate potential sell value based on inventory items linked via ingredients
              return sum + p.sellPrice;
            }, 0);
            const totalProductsCost = productsList.reduce((sum, p) => sum + p.costPrice, 0);
            const totalProfit = productsSellValue - totalProductsCost;
            return (
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">قيمة المخزون بالتكلفة</p>
                  <p className="text-xl font-bold text-foreground">{totalCostValue.toFixed(0)} ج.م</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">الربح المتوقع من المنتجات</p>
                  <p className="text-xl font-bold text-primary">{totalProfit.toFixed(0)} ج.م</p>
                </div>
              </div>
            );
          })()}

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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditProduct(product)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} className="text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
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

          <div className="grid gap-3">
            {cats.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-foreground">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {productsList.filter(p => p.categoryId === cat.id).length} منتج
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditCategory(cat)}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)} className="text-destructive">
                    <Trash2 size={16} />
                  </Button>
                </div>
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
            <select
              value={newItem.unit}
              onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">اختر الوحدة</option>
              <option value="كيلو">كيلو</option>
              <option value="لتر">لتر</option>
              <option value="علبة">علبة</option>
              <option value="كنز">كنز</option>
              <option value="كوباية">كوباية</option>
            </select>
            <Input inputMode="numeric" pattern="[0-9]*" placeholder="الكمية" value={newItem.quantity || ''} onChange={e => setNewItem({ ...newItem, quantity: +e.target.value.replace(/[^0-9.]/g, '') })} />
            <Input inputMode="numeric" pattern="[0-9]*" placeholder="سعر الوحدة" value={newItem.costPerUnit || ''} onChange={e => setNewItem({ ...newItem, costPerUnit: +e.target.value.replace(/[^0-9.]/g, '') })} />
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
              <select
                value={editItem.unit}
                onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">اختر الوحدة</option>
                <option value="كيلو">كيلو</option>
                <option value="لتر">لتر</option>
                <option value="علبة">علبة</option>
                <option value="كنز">كنز</option>
                <option value="كوباية">كوباية</option>
              </select>
              <Input inputMode="numeric" pattern="[0-9]*" value={editItem.quantity} onChange={e => setEditItem({ ...editItem, quantity: +e.target.value.replace(/[^0-9.]/g, '') })} />
              <Input inputMode="numeric" pattern="[0-9]*" value={editItem.costPerUnit} onChange={e => setEditItem({ ...editItem, costPerUnit: +e.target.value.replace(/[^0-9.]/g, '') })} />
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
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

            <IngredientsEditor
              ingredients={newProduct.ingredients}
              onChange={ingredients => setNewProduct({ ...newProduct, ingredients, costPrice: ingredients.reduce((s, i) => s + i.cost, 0) })}
            />

            <Input inputMode="numeric" pattern="[0-9]*" placeholder="سعر البيع" value={newProduct.sellPrice || ''} onChange={e => setNewProduct({ ...newProduct, sellPrice: +e.target.value.replace(/[^0-9.]/g, '') })} />

            {newProduct.ingredients.length > 0 && newProduct.sellPrice > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">التكلفة الإجمالية:</span>
                  <span className="font-bold text-foreground">{newProduct.ingredients.reduce((s, i) => s + i.cost, 0)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الربح:</span>
                  <span className="font-bold text-primary">{(newProduct.sellPrice - newProduct.ingredients.reduce((s, i) => s + i.cost, 0)).toFixed(1)} ج.م</span>
                </div>
              </div>
            )}

            {newProduct.ingredients.length === 0 && (
              <Input inputMode="numeric" pattern="[0-9]*" placeholder="سعر التكلفة (يدوي)" value={newProduct.costPrice || ''} onChange={e => setNewProduct({ ...newProduct, costPrice: +e.target.value.replace(/[^0-9.]/g, '') })} />
            )}

            <Button onClick={saveProduct} className="w-full cafe-gradient text-primary-foreground">
              <Save size={16} className="ml-2" />
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل المنتج</DialogTitle></DialogHeader>
          {editProduct && (() => {
            const ings = editProduct.ingredients || [];
            const costFromIngs = ings.reduce((s, i) => s + i.cost, 0);
            const profit = editProduct.sellPrice - (costFromIngs || editProduct.costPrice);
            return (
              <div className="space-y-3">
                <Input value={editProduct.name} onChange={e => setEditProduct({ ...editProduct, name: e.target.value })} placeholder="اسم المنتج" />
                <select
                  value={editProduct.categoryId}
                  onChange={e => setEditProduct({ ...editProduct, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <IngredientsEditor
                  ingredients={ings}
                  onChange={ingredients => setEditProduct({ ...editProduct, ingredients, costPrice: ingredients.reduce((s, i) => s + i.cost, 0) })}
                />

                <Input inputMode="numeric" pattern="[0-9]*" value={editProduct.sellPrice} onChange={e => setEditProduct({ ...editProduct, sellPrice: +e.target.value.replace(/[^0-9.]/g, '') })} placeholder="سعر البيع" />

                {ings.length === 0 && (
                  <Input inputMode="numeric" pattern="[0-9]*" value={editProduct.costPrice} onChange={e => setEditProduct({ ...editProduct, costPrice: +e.target.value.replace(/[^0-9.]/g, '') })} placeholder="سعر التكلفة (يدوي)" />
                )}

                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التكلفة الإجمالية:</span>
                    <span className="font-bold text-foreground">{costFromIngs || editProduct.costPrice} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الربح:</span>
                    <span className={`font-bold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>{profit.toFixed(1)} ج.م</span>
                  </div>
                </div>

                <Button onClick={updateProduct} className="w-full cafe-gradient text-primary-foreground">
                  <Save size={16} className="ml-2" />
                  تحديث
                </Button>
              </div>
            );
          })()}
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

      {/* Edit Category Dialog */}
      <Dialog open={!!editCategory} onOpenChange={() => setEditCategory(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل القسم</DialogTitle></DialogHeader>
          {editCategory && (
            <div className="space-y-3">
              <Input value={editCategory.name} onChange={e => setEditCategory({ ...editCategory, name: e.target.value })} placeholder="اسم القسم" />
              <Button onClick={updateCategory} className="w-full cafe-gradient text-primary-foreground">
                <Save size={16} className="ml-2" />
                تحديث
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
