import { toast } from 'sonner';

export async function downloadImage(url: string, filename = 'imagem') {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('Falha ao baixar imagem');
    const blob = await res.blob();
    const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const safe = filename.replace(/[^\w\-]+/g, '_').slice(0, 60) || 'imagem';
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${safe}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Erro ao baixar imagem');
  }
}
