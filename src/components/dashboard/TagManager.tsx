import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const PRESET_TAGS = ['Стратегия', 'Эмоция', 'FOMO', 'По плану', 'Ошибка', 'Удача'];

interface TagManagerProps {
  tradeId: string;
}

export function TagManager({ tradeId }: TagManagerProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTags();
  }, [tradeId]);

  const loadTags = async () => {
    const { data } = await supabase.from('trade_tags').select('tag_name').eq('trade_id', tradeId);
    setTags((data || []).map((t: any) => t.tag_name));
  };

  const addTag = async (tagName: string) => {
    const clean = tagName.trim().slice(0, 50).replace(/['"]/g, '');
    if (!clean) return;

    setTags((prev) => [...prev, clean]);
    setNewTag('');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('trade_tags').insert({
      user_id: user.id,
      trade_id: tradeId,
      tag_name: clean,
    });
    toast.success('Тег добавлен');
  };

  const removeTag = async (tagName: string) => {
    setTags((prev) => prev.filter((t) => t !== tagName));
    await supabase.from('trade_tags').delete().eq('trade_id', tradeId).eq('tag_name', tagName);
    toast.success('Тег удалён');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            onClick={() => removeTag(tag)}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-accent-green/10 text-accent-green cursor-pointer hover:bg-accent-red/10 hover:text-accent-red transition-colors"
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
            className="px-2 py-0.5 text-[11px] rounded-full bg-surface-overlay text-text-muted hover:bg-accent-green/10 hover:text-accent-green transition-colors"
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
