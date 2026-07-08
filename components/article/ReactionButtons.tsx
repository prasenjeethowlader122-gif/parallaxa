
'use client';

import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from '@phosphor-icons/react/ssr';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface ReactionButtonsProps {
  articleId: number;
}

export default function ReactionButtons({ articleId }: ReactionButtonsProps) {
  const { data: session } = useSession();
  const [data, setData] = useState({ likes: 0, dislikes: 0, userReaction: null as string | null });

  useEffect(() => {
    fetch(`/api/articles/reactions?articleId=${articleId}`)
      .then(res => res.json())
      .then(setData);
  }, [articleId]);

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!session) {
      toast.error('Please sign in to react');
      return;
    }

    try {
      const res = await fetch('/api/articles/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, type })
      });

      if (res.ok) {
        const updated = await res.json();
        setData({ ...updated, userReaction: type });
      }
    } catch (error) {
      toast.error('Failed to update reaction');
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => handleReaction('like')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
          data.userReaction === 'like'
            ? 'bg-blue-50 border-blue-200 text-blue-600'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <ThumbsUp size={20} weight={data.userReaction === 'like' ? 'fill' : 'regular'} />
        <span className="font-medium">{data.likes}</span>
      </button>

      <button
        onClick={() => handleReaction('dislike')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
          data.userReaction === 'dislike'
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <ThumbsDown size={20} weight={data.userReaction === 'dislike' ? 'fill' : 'regular'} />
        <span className="font-medium">{data.dislikes}</span>
      </button>
    </div>
  );
}
