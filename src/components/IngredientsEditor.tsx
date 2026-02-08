import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Ingredient } from '@/lib/types';

interface Props {
  ingredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
}

const IngredientsEditor = ({ ingredients, onChange }: Props) => {
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');

  const addIngredient = () => {
    if (!newName || !newCost) return;
    onChange([...ingredients, { name: newName, cost: +newCost }]);
    setNewName('');
    setNewCost('');
  };

  const removeIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = ingredients.map((ing, i) =>
      i === index ? { ...ing, [field]: field === 'cost' ? +value : value } : ing
    );
    onChange(updated);
  };

  const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">المكونات والتكلفة</p>

      {ingredients.map((ing, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={ing.name}
            onChange={e => updateIngredient(i, 'name', e.target.value)}
            placeholder="المكون"
            className="flex-1"
          />
          <Input
            type="number"
            value={ing.cost}
            onChange={e => updateIngredient(i, 'cost', e.target.value)}
            placeholder="التكلفة"
            className="w-24"
          />
          <Button variant="ghost" size="icon" onClick={() => removeIngredient(i)} className="text-destructive shrink-0">
            <Trash2 size={14} />
          </Button>
        </div>
      ))}

      <div className="flex gap-2 items-center">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="اسم المكون (مثل: كوب ورق)"
          className="flex-1"
        />
        <Input
          type="number"
          value={newCost}
          onChange={e => setNewCost(e.target.value)}
          placeholder="التكلفة"
          className="w-24"
        />
        <Button variant="ghost" size="icon" onClick={addIngredient} className="text-primary shrink-0">
          <Plus size={14} />
        </Button>
      </div>

      {ingredients.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-2 text-center text-sm">
          <span className="text-muted-foreground">إجمالي التكلفة: </span>
          <span className="font-bold text-foreground">{totalCost} ج.م</span>
        </div>
      )}
    </div>
  );
};

export default IngredientsEditor;
