
import { sql } from '@/lib/db';

export async function addReaction(articleId: number, userId: string, type: 'like' | 'dislike') {
  return await sql`
    INSERT INTO reactions (article_id, user_id, type)
    VALUES (${articleId}, ${userId}, ${type})
    ON CONFLICT (article_id, user_id)
    DO UPDATE SET type = ${type}
    RETURNING *
  `;
}

export async function getArticleReactions(articleId: number) {
  const counts = await sql`
    SELECT type, COUNT(*) as count
    FROM reactions
    WHERE article_id = ${articleId}
    GROUP BY type
  `;

  return {
    likes: parseInt(counts.find(c => c.type === 'like')?.count || '0'),
    dislikes: parseInt(counts.find(c => c.type === 'dislike')?.count || '0')
  };
}

export async function getUserReaction(articleId: number, userId: string) {
  const reaction = await sql`
    SELECT type FROM reactions
    WHERE article_id = ${articleId} AND user_id = ${userId}
  `;
  return reaction[0]?.type || null;
}

export async function addComment(articleId: number, userId: string, userName: string, userImage: string, content: string) {
  return await sql`
    INSERT INTO comments (article_id, user_id, user_name, user_image, content)
    VALUES (${articleId}, ${userId}, ${userName}, ${userImage}, ${content})
    RETURNING *
  `;
}

export async function getComments(articleId: number) {
  return await sql`
    SELECT * FROM comments
    WHERE article_id = ${articleId}
    ORDER BY created_at DESC
  `;
}

export async function deleteComment(commentId: number, userId: string) {
  return await sql`
    DELETE FROM comments
    WHERE id = ${commentId} AND user_id = ${userId}
  `;
}
