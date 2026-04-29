import { Eye } from 'lucide-react';

export function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      <Eye className="h-4 w-4 shrink-0" />
      <span>
        <strong className="text-foreground">Modo somente leitura</strong> — semestre encerrado. Você
        pode visualizar todo o conteúdo, mas não pode mais criar ou modificar.
      </span>
    </div>
  );
}
