import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { ProductFunction } from '@/hooks/useFunctions';

interface FunctionPickerProps {
  functions: ProductFunction[];
  onSelect: (functionId: string) => void;
  placeholder?: string;
  className?: string;
}

export function FunctionPicker({ functions, onSelect, placeholder = '+ Adicionar função existente...', className }: FunctionPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-10 justify-between min-w-[260px]', className)}
        >
          <span className="flex items-center gap-2 text-sm font-normal">
            <Plus className="w-4 h-4" />
            {placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar função..." />
          <CommandList>
            <CommandEmpty>Nenhuma função encontrada.</CommandEmpty>
            <CommandGroup>
              {functions.map((f) => (
                <CommandItem
                  key={f.id}
                  value={`${f.name} ${f.category}`}
                  onSelect={() => {
                    onSelect(f.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <span
                    className="w-2 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: f.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.category}</div>
                  </div>
                  <Check className={cn('h-4 w-4 opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
