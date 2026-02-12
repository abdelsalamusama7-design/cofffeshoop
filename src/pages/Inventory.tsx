import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Pencil, Trash2, Save, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getInventory, setInventory, getProducts, setProducts, getCurrentUser } from '@/lib/store';
import { InventoryItem, Product, ItemCategory, ITEM_CATEGORIES, SELLABLE_CATEGORIES } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IngredientsEditor from '@/components/IngredientsEditor';
import { Ingredient } from '@/lib/types';

const Inventory = () => {
  const user = getCurrentUser();
  const [inventory, setInv] = useState(getInventory());
  const [productsList, setProductsList] = useState(getProducts());
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [newItem, setNewItem] = useState({ name: '', unit: '', quantity: 0, costPerUnit: 0, sellPrice: '' as string | number, category: '' as string });
  const [newProduct, setNewProduct] = useState<{ name: string; sellPrice: number; costPrice: number; category: string; ingredients: Ingredient[] }>({ name: '', sellPrice: 0, costPrice: 0, category: '', ingredients: [] });

  const isAdmin = user?.role === 'admin';

  const saveItem = () => {
    if (!newItem.name) return;
    const sellPriceNum = typeof newItem.sellPrice === 'string' ? parseFloat(newItem.sellPrice) : newItem.sellPrice;
    const item: InventoryItem = {
      id: Date.now().toString(),
      name: newItem.name,
      unit: newItem.unit,
      quantity: newItem.quantity,
      costPerUnit: newItem.costPerUnit,
      ...(newItem.category ? { category: newItem.category as ItemCategory } : {}),
      ...(sellPriceNum > 0 ? { sellPrice: sellPriceNum } : {}),
    };
    const updated = [...inventory, item];
    setInv(updated);
    setInventory(updated);
    setNewItem({ name: '', unit: '', quantity: 0, costPerUnit: 0, sellPrice: '', category: '' });
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
    if (!newProduct.name) return;
    const costFromIngredients = newProduct.ingredients.reduce((s, i) => s + i.cost, 0);
    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      sellPrice: newProduct.sellPrice,
      costPrice: costFromIngredients || newProduct.costPrice,
      ...(newProduct.category ? { category: newProduct.category as ItemCategory } : {}),
      ingredients: newProduct.ingredients.length > 0 ? newProduct.ingredients : undefined,
    };
    const updated = [...productsList, product];
    setProductsList(updated);
    setProducts(updated);
    setNewProduct({ name: '', sellPrice: 0, costPrice: 0, category: '', ingredients: [] });
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{isAdmin ? 'إدارة المخزون' : 'المخزون'}</h1>

      {isAdmin ? (
      <Tabs defaultValue="inventory" className="w-full" dir="rtl">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="inventory">المخزن</TabsTrigger>
          <TabsTrigger value="products">المنتجات (تحضير)</TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Inventory Value Summary - Admin Only */}
          {isAdmin && (() => {
            const totalCostValue = inventory.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0);
            const sellableItems = inventory.filter(i => i.sellPrice);
            const totalSellValue = sellableItems.reduce((sum, i) => sum + i.quantity * (i.sellPrice || 0), 0);
            const totalSellCost = sellableItems.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0);
            const totalProfit = totalSellValue - totalSellCost;
            const totalWithProfit = totalCostValue + totalProfit;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">قيمة المخزون بالتكلفة</p>
                  <p className="text-lg font-bold text-foreground">{totalCostValue.toFixed(0)} ج.م</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">صافي الربح المتوقع</p>
                  <p className="text-lg font-bold text-primary">{totalProfit.toFixed(0)} ج.م</p>
                </div>
                <div className="glass-card rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي السيولة المتوقعة</p>
                  <p className="text-lg font-bold text-accent">{totalWithProfit.toFixed(0)} ج.م</p>
                </div>
              </div>
            );
          })()}

          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => setShowAddItem(true)} className="cafe-gradient text-primary-foreground">
                <Plus size={18} className="ml-2" />
                إضافة عنصر
              </Button>
            </div>
          )}

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
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.sellPrice ? 'bg-primary/20' : 'bg-accent/20'}`}>
                    {item.sellPrice ? <Package size={20} className="text-primary" /> : <Package size={20} className="text-accent" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      {item.category && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{item.category}</span>
                      )}
                      {item.sellPrice && (
                        <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">قابل للبيع</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit}
                      {isAdmin && <> • {item.costPerUnit} ج.م/{item.unit}</>}
                      {isAdmin && item.sellPrice ? ` • بيع: ${item.sellPrice} ج.م` : ''}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} className="text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <p className="text-sm text-muted-foreground">المنتجات هي الأصناف اللي بتحتاج تحضير من أكتر من صنف في المخزن</p>
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => setShowAddProduct(true)} className="cafe-gradient text-primary-foreground">
                <Plus size={18} className="ml-2" />
                إضافة منتج
              </Button>
            </div>
          )}

          <div className="grid gap-3">
            {productsList.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Coffee size={16} className="text-primary" />
                    <p className="font-semibold text-foreground">{product.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    بيع: {product.sellPrice} ج.م
                    {isAdmin && <> • تكلفة: {product.costPrice} ج.م •
                    <span className="text-success font-medium"> ربح: {product.sellPrice - product.costPrice} ج.م</span></>}
                  </p>
                  {isAdmin && product.ingredients && (
                    <p className="text-xs text-muted-foreground mt-1">
                      المكونات: {product.ingredients.map(ing => `${ing.name} (${ing.cost} ج.م)`).join(' + ')}
                    </p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditProduct(product)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} className="text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      ) : (
        <div className="grid gap-3">
          {inventory.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-4 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.sellPrice ? 'bg-primary/20' : 'bg-accent/20'}`}>
                <Package size={20} className={item.sellPrice ? 'text-primary' : 'text-accent'} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  {item.category && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{item.category}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{item.quantity} {item.unit}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Inventory Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة عنصر للمخزن</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="اسم العنصر" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
            <select
              value={newItem.category}
              onChange={e => setNewItem({ ...newItem, category: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">اختر القسم</option>
              {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={newItem.unit}
              onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">اختر الوحدة</option>
              <option value="جرام">جرام</option>
              <option value="كجم">كجم</option>
              <option value="لتر">لتر</option>
              <option value="علبة">علبة</option>
              <option value="كنز">كنز</option>
              <option value="كوباية">كوباية</option>
              <option value="قطعة واحدة">قطعة واحدة</option>
              <option value="كيس واحد">كيس واحد</option>
              <option value="فتلة واحدة">فتلة واحدة</option>
              <option value="لتر ونص">لتر ونص</option>
              <option value="2 لتر">2 لتر</option>
              <option value="2 لتر ونص">2 لتر ونص</option>
              <option value="علبة 200 ملي">علبة 200 ملي</option>
              <option value="علبة 600 ملي">علبة 600 ملي</option>
            </select>
            <Input inputMode="numeric" pattern="[0-9]*" placeholder="الكمية" value={newItem.quantity || ''} onChange={e => setNewItem({ ...newItem, quantity: +e.target.value.replace(/[^0-9.]/g, '') })} />
            <Input inputMode="numeric" pattern="[0-9]*" placeholder="سعر الوحدة (التكلفة)" value={newItem.costPerUnit || ''} onChange={e => setNewItem({ ...newItem, costPerUnit: +e.target.value.replace(/[^0-9.]/g, '') })} />
            <Input inputMode="numeric" pattern="[0-9]*" placeholder="سعر البيع (اتركه فارغ لو مش قابل للبيع المباشر)" value={newItem.sellPrice || ''} onChange={e => setNewItem({ ...newItem, sellPrice: e.target.value.replace(/[^0-9.]/g, '') })} />
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
                value={editItem.category || ''}
                onChange={e => setEditItem({ ...editItem, category: e.target.value as ItemCategory || undefined })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">اختر القسم</option>
                {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={editItem.unit}
                onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">اختر الوحدة</option>
                <option value="جرام">جرام</option>
                <option value="كجم">كجم</option>
                <option value="لتر">لتر</option>
                <option value="علبة">علبة</option>
                <option value="كنز">كنز</option>
                <option value="كوباية">كوباية</option>
                <option value="قطعة واحدة">قطعة واحدة</option>
                <option value="كيس واحد">كيس واحد</option>
                <option value="فتلة واحدة">فتلة واحدة</option>
                <option value="لتر ونص">لتر ونص</option>
                <option value="2 لتر">2 لتر</option>
                <option value="2 لتر ونص">2 لتر ونص</option>
                <option value="علبة 200 ملي">علبة 200 ملي</option>
                <option value="علبة 600 ملي">علبة 600 ملي</option>
              </select>
              <Input inputMode="numeric" pattern="[0-9]*" value={editItem.quantity} onChange={e => setEditItem({ ...editItem, quantity: +e.target.value.replace(/[^0-9.]/g, '') })} />
              <Input inputMode="numeric" pattern="[0-9]*" value={editItem.costPerUnit} onChange={e => setEditItem({ ...editItem, costPerUnit: +e.target.value.replace(/[^0-9.]/g, '') })} />
              <Input inputMode="numeric" pattern="[0-9]*" placeholder="سعر البيع (اتركه فارغ لو مش قابل للبيع)" value={editItem.sellPrice || ''} onChange={e => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setEditItem({ ...editItem, sellPrice: val ? parseFloat(val) : undefined });
              }} />
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
              value={newProduct.category}
              onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">اختر القسم</option>
              {SELLABLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                  value={editProduct.category || ''}
                  onChange={e => setEditProduct({ ...editProduct, category: e.target.value as ItemCategory || undefined })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">اختر القسم</option>
                  {SELLABLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
    </div>
  );
};

export default Inventory;