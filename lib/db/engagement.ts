
import { sql } from '@/lib/db';

export async function addReaction(articleId: string, userId: string, type: 'like' | 'dislike') {
  try {
    return await sql`
      INSERT INTO reactions (article_id, user_id, type)
      VALUES (${articleId}, ${userId}, ${type})
      ON CONFLICT (article_id, user_id)
      DO UPDATE SET type = ${type}
      RETURNING *
    `;
  } catch (error) {
    console.error('Error in addReaction:', error);
    return [];
  }
}

export async function getArticleReactions(articleId: string) {
  try {
    const counts = await sql`
      SELECT type, COUNT(*) as count
      FROM reactions
      WHERE article_id = ${articleId}
      GROUP BY type
    `;

    const countsArr = Array.isArray(counts) ? counts : [];

    return {
      likes: parseInt(countsArr.find(c => c?.type === 'like')?.count || '0'),
      dislikes: parseInt(countsArr.find(c => c?.type === 'dislike')?.count || '0')
    };
  } catch (error) {
    console.error('Error in getArticleReactions:', error);
    return { likes: 0, dislikes: 0 };
  }
}

export async function getUserReaction(articleId: string, userId: string) {
  try {
    const reaction = await sql`
      SELECT type FROM reactions
      WHERE article_id = ${articleId} AND user_id = ${userId}
    `;
    return reaction?.[0]?.type || null;
  } catch (error) {
    console.error('Error in getUserReaction:', error);
    return null;
  }
}

export async function addComment(articleId: string, userId: string, userName: string, userImage: string, content: string) {
  try {
    return await sql`
      INSERT INTO comments (article_id, user_id, user_name, user_image, content)
      VALUES (${articleId}, ${userId}, ${userName}, ${userImage}, ${content})
      RETURNING *
    `;
  } catch (error) {
    console.error('Error in addComment:', error);
    return [];
  }
}

export async function getComments(articleId: string) {
  try {
    const comments = await sql`
      SELECT * FROM comments
      WHERE article_id = ${articleId}
      ORDER BY created_at DESC
    `;
    return Array.isArray(comments) ? comments : [];
  } catch (error) {
    console.error('Error in getComments:', error);
    return [];
  }
}

export async function deleteComment(commentId: number, userId: string) {
  try {
    return await sql`
      DELETE FROM comments
      WHERE id = ${commentId} AND user_id = ${userId}
    `;
  } catch (error) {
    console.error('Error in deleteComment:', error);
    return [];
  }
}
