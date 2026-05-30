import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const PRESET_TAGS = ['Стратегия', 'Эмоция', 'FOMO', 'По плану', 'Ошибка', 'Удача'];

interface TagManagerProps {
  tradeId: string;
}

export function TagManager({ tradeId }: TagManagerProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadTags();
  }, [tradeId]);

  const loadTags = async () => {
    try {
      const response: any = await fetch(`http://localhost:3001/api/trades/${tradeId}/tags`);
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('[TagManager] Error loading tags:', error);
    }
  };

  const addTag = async (tagName: string) => {
    const clean = tagName.trim().slice(0, 50).replace(/['"]/g, '');
    if (!clean) return;
    const prev = [...tags];
    setTags((prev) => [...prev, clean]);
    setNewTag('');
    try {
      await fetch(`http://localhost:3001/api/trades/${tradeId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_name: clean }),
      });
      toast.success('Тег добавлен');
    } catch (_error) {
      setTags(prev);
      toast.error('Ошибка');
    }
  };

  const removeTag = async (tagName: string) => {
    const prev = [...tags];
    setTags((prev) => prev.filter((t) => t !== tagName));
    try {
      await fetch(`http://localhost:3001/api/trades/${tradeId}/tags?tag=${tagName}`, {
        method: 'DELETE',
      });
      toast.success('Тег удалён');
    } catch (_error) {
      setTags(prev);
      toast.error('Ошибка');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            onClick={() => removeTag(tag)}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-accent-green/10 text-accent-green cursor-pointer hover:bg-accent-red/10 hover:text-accent-red"
          >
            {tag} ×
          </span>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
          <button
            key={tag}
            onClick={() => addTag(tag)}
            className="px-2 py-0.5 text-[11px] rounded-full bg-surface-overlay text-text-muted hover:bg-accent-green/10 hover:text-accent-green"
          >
            + {tag}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Свой тег..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTag(newTag)}
          className="flex-1 px-3 py-1.5 text-xs bg-surface-elevated border border-surface-border rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-green/30"
        />
        <button
          onClick={() => addTag(newTag)}
          className="px-3 py-1.5 text-xs bg-accent-green text-surface rounded-lg font-medium"
        >
          Добавить
        </button>
      </div>
    </div>
  );
}
