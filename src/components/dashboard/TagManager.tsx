import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const PRESET_TAGS = ['Стратегия', 'Эмоция', 'FOMO', 'По плану', 'Ошибка', 'Удача'];

interface TagManagerProps {
  tradeId: string;
  existingTags: string[];
  onTagsChange: () => void;
}

export function TagManager({ tradeId, existingTags, onTagsChange }: TagManagerProps) {
  const [tags, setTags] = useState<string[]>(existingTags || []);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  const addTag = async (tagName: string) => {
    if (!tagName.trim()) return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('trade_tags').insert({
      user_id: user.id,
      trade_id: tradeId,
      tag_name: tagName.trim(),
    });

    setTags([...tags, tagName.trim()]);
    setNewTag('');
    toast.success('Тег добавлен');
    setLoading(false);
    onTagsChange();
  };

  const removeTag = async (tagName: string) => {
    setLoading(true);
    await supabase.from('trade_tags').delete().eq('trade_id', tradeId).eq('tag_name', tagName);
    setTags(tags.filter((t) => t !== tagName));
    toast.success('Тег удалён');
    setLoading(false);
    onTagsChange();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-accent-green/10 text-accent-green cursor-pointer hover:bg-accent-red/10 hover:text-accent-red transition-colors"
            onClick={() => removeTag(tag)}
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
        <Button variant="outline" size="sm" onClick={() => addTag(newTag)}>
          Добавить
        </Button>
      </div>
    </div>
  );
}
