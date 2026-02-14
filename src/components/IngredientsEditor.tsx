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

// Conversion map: from → to → factor
// quantityUsed is always stored in the inventory item's base unit
const UNIT_CONVERSIONS: Record<string, { label: string; toBase: number }[]> = {
  'لتر': [
    { label: 'لتر', toBase: 1 },
    { label: 'ملي', toBase: 0.001 },
  ],
  'كجم': [
    { label: 'كجم', toBase: 1 },
    { label: 'جرام', toBase: 0.001 },
  ],
  'جرام': [
    { label: 'جرام', toBase: 1 },
  ],
  'ملي': [
    { label: 'ملي', toBase: 1 },
  ],
};

const getSubUnits = (baseUnit: string) => {
  return UNIT_CONVERSIONS[baseUnit] || [{ label: baseUnit, toBase: 1 }];
};

const IngredientsEditor = ({ ingredients, onChange }: Props) => {
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newInventoryId, setNewInventoryId] = useState('');
  const [newQtyUsed, setNewQtyUsed] = useState('');
  const [newQtyUnit, setNewQtyUnit] = useState('');

  // Track display units per ingredient index
  const [displayUnits, setDisplayUnits] = useState<Record<number, string>>({});

  const inventoryItems = getInventory();

  const addIngredient = () => {
    if (!newName && !newInventoryId) return;

    const invItem = inventoryItems.find(i => i.id === newInventoryId);
    const subUnits = invItem ? getSubUnits(invItem.unit) : [];
    const selectedUnit = subUnits.find(u => u.label === newQtyUnit);
    const conversionFactor = selectedUnit?.toBase || 1;
    const baseQty = (+newQtyUsed || 0) * conversionFactor;

    const ingredient: Ingredient = {
      name: invItem ? invItem.name : newName,
      cost: +newCost || (invItem ? invItem.costPerUnit * baseQty : 0),
      inventoryItemId: newInventoryId || undefined,
      quantityUsed: baseQty || undefined,
    };

    onChange([...ingredients, ingredient]);
    setNewName('');
    setNewCost('');
    setNewInventoryId('');
    setNewQtyUsed('');
    setNewQtyUnit('');
  };

  const removeIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
    // Clean up display units
    setDisplayUnits(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
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
      // Reset display unit to base
      setDisplayUnits(prev => ({ ...prev, [index]: invItem.unit }));
    } else {
      updateIngredient(index, { inventoryItemId: undefined });
    }
  };

  const handleQtyUsedChange = (index: number, displayQty: number, unitLabel?: string) => {
    const ing = ingredients[index];
    const invItem = ing.inventoryItemId
      ? inventoryItems.find(i => i.id === ing.inventoryItemId)
      : null;

    const currentUnit = unitLabel || displayUnits[index] || invItem?.unit || '';
    const subUnits = invItem ? getSubUnits(invItem.unit) : [];
    const selectedUnit = subUnits.find(u => u.label === currentUnit);
    const conversionFactor = selectedUnit?.toBase || 1;
    const baseQty = displayQty * conversionFactor;

    updateIngredient(index, {
      quantityUsed: baseQty,
      cost: invItem ? invItem.costPerUnit * baseQty : ing.cost,
    });
  };

  const handleUnitChange = (index: number, newUnit: string) => {
    setDisplayUnits(prev => ({ ...prev, [index]: newUnit }));
    const ing = ingredients[index];
    const invItem = ing.inventoryItemId
      ? inventoryItems.find(i => i.id === ing.inventoryItemId)
      : null;
    if (!invItem || !ing.quantityUsed) return;

    // Convert current base qty to new display value (don't change the stored base qty)
    // Just recalculate cost with current base qty (no change needed)
  };

  const getDisplayQty = (index: number, ing: Ingredient) => {
    const invItem = ing.inventoryItemId
      ? inventoryItems.find(i => i.id === ing.inventoryItemId)
      : null;
    if (!invItem || !ing.quantityUsed) return ing.quantityUsed || '';
    
    const currentUnit = displayUnits[index] || invItem.unit;
    const subUnits = getSubUnits(invItem.unit);
    const selectedUnit = subUnits.find(u => u.label === currentUnit);
    const conversionFactor = selectedUnit?.toBase || 1;
    
    // Convert base qty to display unit
    const displayVal = ing.quantityUsed / conversionFactor;
    return Math.round(displayVal * 1000) / 1000;
  };

  const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">المكونات والتكلفة</p>

      {ingredients.map((ing, i) => {
        const linkedItem = ing.inventoryItemId
          ? inventoryItems.find(inv => inv.id === ing.inventoryItemId)
          : null;
        const subUnits = linkedItem ? getSubUnits(linkedItem.unit) : [];
        const currentDisplayUnit = displayUnits[i] || linkedItem?.unit || '';
        
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
                <>
                  <Input
                    inputMode="decimal"
                    value={getDisplayQty(i, ing)}
                    onChange={e => {
                      const val = +e.target.value.replace(/[^0-9.]/g, '');
                      handleQtyUsedChange(i, val);
                    }}
                    placeholder="الكمية"
                    className="w-20"
                  />
                  {subUnits.length > 1 ? (
                    <select
                      value={currentDisplayUnit}
                      onChange={e => handleUnitChange(i, e.target.value)}
                      className="w-20 rounded-lg border border-input bg-background px-1.5 py-1.5 text-xs text-foreground"
                    >
                      {subUnits.map(u => (
                        <option key={u.label} value={u.label}>{u.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground w-16 text-center">{linkedItem?.unit}</span>
                  )}
                </>
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
              if (inv) {
                setNewName(inv.name);
                setNewQtyUnit(inv.unit); // default to base unit
              }
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
          {newInventoryId && (() => {
            const inv = inventoryItems.find(i => i.id === newInventoryId);
            const subUnits = inv ? getSubUnits(inv.unit) : [];
            return (
              <>
                <Input
                  inputMode="decimal"
                  value={newQtyUsed}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setNewQtyUsed(val);
                    if (inv) {
                      const selectedUnit = subUnits.find(u => u.label === newQtyUnit);
                      const factor = selectedUnit?.toBase || 1;
                      setNewCost(String(inv.costPerUnit * +val * factor));
                    }
                  }}
                  placeholder="الكمية"
                  className="w-20"
                />
                {subUnits.length > 1 ? (
                  <select
                    value={newQtyUnit || inv?.unit}
                    onChange={e => {
                      setNewQtyUnit(e.target.value);
                      if (inv && newQtyUsed) {
                        const selectedUnit = subUnits.find(u => u.label === e.target.value);
                        const factor = selectedUnit?.toBase || 1;
                        setNewCost(String(inv.costPerUnit * +newQtyUsed * factor));
                      }
                    }}
                    className="w-20 rounded-lg border border-input bg-background px-1.5 py-1.5 text-xs text-foreground"
                  >
                    {subUnits.map(u => (
                      <option key={u.label} value={u.label}>{u.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-muted-foreground w-16 text-center">{inv?.unit}</span>
                )}
              </>
            );
          })()}
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
