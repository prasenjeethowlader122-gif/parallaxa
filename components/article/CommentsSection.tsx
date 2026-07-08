
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PaperPlaneTilt, Trash, UserCircle } from '@phosphor-icons/react/ssr';
import { toast } from 'sonner';

interface Comment {
  id: number;
  user_id: string;
  user_name: string;
  user_image: string;
  content: string;
  created_at: string;
}

interface CommentsSectionProps {
  articleId: number;
}

export default function CommentsSection({ articleId }: CommentsSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/articles/comments?articleId=${articleId}`)
      .then(res => res.json())
      .then(setComments);
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast.error('Please sign in to comment');
      return;
    }
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/articles/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, content })
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments([newComment, ...comments]);
        setContent('');
        toast.success('Comment added');
      }
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/articles/comments?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== id));
        toast.success('Comment deleted');
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-bold">Comments ({comments.length})</h3>

      {session ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
              {session.user?.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={24} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write a comment..."
                className="w-full min-h-[100px] p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none bg-slate-50"
              />
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all ml-auto"
              >
                Post Comment
                <PaperPlaneTilt size={18} weight="bold" />
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-slate-50 p-6 rounded-2xl text-center">
          <p className="text-slate-600">Please sign in to join the conversation.</p>
        </div>
      )}

      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
              {comment.user_image ? (
                <img src={comment.user_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={24} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sm text-slate-900">{comment.user_name}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">{comment.content}</p>
              </div>
              {session?.user?.id === comment.user_id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="mt-1 text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2"
                >
                  <Trash size={12} />
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
