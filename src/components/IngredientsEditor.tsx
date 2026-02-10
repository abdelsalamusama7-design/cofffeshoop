import { useState } from 'react';
import { Plus, Trash2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ingredient, InventoryItem } from '@/lib/types';
import { getInventory } from '@/lib/store';

interface Props {
  ingredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
}

const IngredientsEditor = ({ ingredients, onChange }: Props) => {
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newInventoryId, setNewInventoryId] = useState('');
  const [newQtyUsed, setNewQtyUsed] = useState('');

  const inventoryItems = getInventory();

  const addIngredient = () => {
    if (!newName && !newInventoryId) return;

    const invItem = inventoryItems.find(i => i.id === newInventoryId);
    const ingredient: Ingredient = {
      name: invItem ? invItem.name : newName,
      cost: +newCost || (invItem ? invItem.costPerUnit * (+newQtyUsed || 0) : 0),
      inventoryItemId: newInventoryId || undefined,
      quantityUsed: +newQtyUsed || undefined,
    };

    onChange([...ingredients, ingredient]);
    setNewName('');
    setNewCost('');
    setNewInventoryId('');
    setNewQtyUsed('');
  };

  const removeIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, updates: Partial<Ingredient>) => {
    const updated = ingredients.map((ing, i) =>
      i === index ? { ...ing, ...updates } : ing
    );
    onChange(updated);
  };

  const handleInventorySelect = (index: number, invId: string) => {
    const invItem = inventoryItems.find(i => i.id === invId);
    if (invItem) {
      const qtyUsed = ingredients[index].quantityUsed || 0;
      updateIngredient(index, {
        inventoryItemId: invId,
        name: invItem.name,
        cost: invItem.costPerUnit * qtyUsed,
      });
    } else {
      updateIngredient(index, { inventoryItemId: undefined });
    }
  };

  const handleQtyUsedChange = (index: number, qty: number) => {
    const ing = ingredients[index];
    const invItem = ing.inventoryItemId
      ? inventoryItems.find(i => i.id === ing.inventoryItemId)
      : null;
    updateIngredient(index, {
      quantityUsed: qty,
      cost: invItem ? invItem.costPerUnit * qty : ing.cost,
    });
  };

  const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">المكونات والتكلفة</p>

      {ingredients.map((ing, i) => {
        const linkedItem = ing.inventoryItemId
          ? inventoryItems.find(inv => inv.id === ing.inventoryItemId)
          : null;
        return (
          <div key={i} className="space-y-1 bg-muted/30 rounded-lg p-2">
            <div className="flex gap-2 items-center">
              <select
                value={ing.inventoryItemId || ''}
                onChange={e => handleInventorySelect(i, e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              >
                <option value="">اختر من المخزن (اختياري)</option>
                {inventoryItems.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} ({inv.quantity} {inv.unit})
                  </option>
                ))}
              </select>
              <Button variant="ghost" size="icon" onClick={() => removeIngredient(i)} className="text-destructive shrink-0">
                <Trash2 size={14} />
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                value={ing.name}
                onChange={e => updateIngredient(i, { name: e.target.value })}
                placeholder="اسم المكون"
                className="flex-1"
                disabled={!!ing.inventoryItemId}
              />
              {ing.inventoryItemId && (
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={ing.quantityUsed || ''}
                  onChange={e => handleQtyUsedChange(i, +e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder={`الكمية (${linkedItem?.unit || ''})`}
                  className="w-28"
                />
              )}
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={ing.cost || ''}
                onChange={e => updateIngredient(i, { cost: +e.target.value.replace(/[^0-9.]/g, '') })}
                placeholder="التكلفة"
                className="w-24"
                disabled={!!ing.inventoryItemId}
              />
            </div>
            {linkedItem && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Link size={10} />
                مرتبط بـ {linkedItem.name} • المتاح: {linkedItem.quantity} {linkedItem.unit} • {linkedItem.costPerUnit} ج.م/{linkedItem.unit}
              </p>
            )}
          </div>
        );
      })}

      {/* Add new ingredient */}
      <div className="space-y-1 border border-dashed border-border rounded-lg p-2">
        <div className="flex gap-2 items-center">
          <select
            value={newInventoryId}
            onChange={e => {
              setNewInventoryId(e.target.value);
              const inv = inventoryItems.find(i => i.id === e.target.value);
              if (inv) setNewName(inv.name);
            }}
            className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="">اختر من المخزن (اختياري)</option>
            {inventoryItems.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.name} ({inv.quantity} {inv.unit})
              </option>
            ))}
          </select>
          <Button variant="ghost" size="icon" onClick={addIngredient} className="text-primary shrink-0">
            <Plus size={14} />
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="اسم المكون"
            className="flex-1"
            disabled={!!newInventoryId}
          />
          {newInventoryId && (
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              value={newQtyUsed}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setNewQtyUsed(val);
                const inv = inventoryItems.find(i => i.id === newInventoryId);
                if (inv) setNewCost(String(inv.costPerUnit * +val));
              }}
              placeholder="الكمية المستخدمة"
              className="w-28"
            />
          )}
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={newCost}
            onChange={e => setNewCost(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="التكلفة"
            className="w-24"
            disabled={!!newInventoryId}
          />
        </div>
      </div>

      {ingredients.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-2 text-center text-sm">
          <span className="text-muted-foreground">إجمالي التكلفة: </span>
          <span className="font-bold text-foreground">{totalCost.toFixed(1)} ج.م</span>
        </div>
      )}
    </div>
  );
};

export default IngredientsEditor;
