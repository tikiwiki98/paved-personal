import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Category } from '@/types/budget';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ManageCategoriesModalProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id' | 'spent'>) => void;
  onUpdateCategory: (category: Partial<Category> & { id: string }) => void;
  onDeleteCategory: (id: string) => void;
}

const iconOptions = ['📦', '🏠', '🛒', '🎬', '💡', '🍽️', '🚗', '💊', '🎮', '✈️', '📚', '👕', '💳', '🎁', '🏋️', '🎵'];
const colorOptions = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export function ManageCategoriesModal({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: ManageCategoriesModalProps) {
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // New category form state
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [newBudget, setNewBudget] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAddCategory = () => {
    if (!newName || !newBudget) return;
    
    onAddCategory({
      name: newName,
      icon: newIcon,
      budget: parseFloat(newBudget),
      color: newColor,
    });
    
    setNewName('');
    setNewIcon('📦');
    setNewBudget('');
    setNewColor('#6366f1');
    setShowAddForm(false);
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditIcon(category.icon);
    setEditBudget(category.budget.toString());
    setEditColor(category.color);
  };

  const handleUpdateCategory = () => {
    if (!editingId || !editName || !editBudget) return;
    
    onUpdateCategory({
      id: editingId,
      name: editName,
      icon: editIcon,
      budget: parseFloat(editBudget),
      color: editColor,
    });
    
    setEditingId(null);
  };

  const handleDeleteCategory = () => {
    if (deleteConfirmId) {
      onDeleteCategory(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            <Settings className="w-4 h-4" />
            Manage
          </button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Manage Categories</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Category List */}
            {categories.map((category) => (
              <div
                key={category.id}
                className="p-4 rounded-xl bg-secondary/50 border border-border/50"
              >
                {editingId === category.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-background border-border"
                        placeholder="Category name"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground min-w-16">Icon:</Label>
                      <div className="flex flex-wrap gap-1">
                        {iconOptions.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setEditIcon(icon)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              editIcon === icon ? 'bg-primary ring-2 ring-primary' : 'bg-background hover:bg-secondary'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground min-w-16">Budget:</Label>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={editBudget}
                          onChange={(e) => setEditBudget(e.target.value)}
                          className="pl-7 bg-background border-border"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground min-w-16">Color:</Label>
                      <div className="flex flex-wrap gap-1">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            className={`w-6 h-6 rounded-full transition-all ${
                              editColor === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpdateCategory}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <p className="font-medium text-foreground">{category.name}</p>
                        <p className="text-sm text-muted-foreground">${category.budget}/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing(category)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(category.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Add New Category Form */}
            {showAddForm ? (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                <Label className="text-foreground font-medium">New Category</Label>
                
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-background border-border"
                  placeholder="Category name"
                />
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground min-w-16">Icon:</Label>
                  <div className="flex flex-wrap gap-1">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewIcon(icon)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          newIcon === icon ? 'bg-primary ring-2 ring-primary' : 'bg-background hover:bg-secondary'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground min-w-16">Budget:</Label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                      className="pl-7 bg-background border-border"
                      placeholder="Monthly budget"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground min-w-16">Color:</Label>
                  <div className="flex flex-wrap gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className={`w-6 h-6 rounded-full transition-all ${
                          newColor === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddCategory}
                  >
                    Add Category
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed border-border"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Category
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? Existing transactions will keep their category label.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
