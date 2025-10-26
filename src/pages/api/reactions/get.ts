import type { APIRoute } from 'astro';
import { supabase } from '@/db/supabase';

export const GET: APIRoute = async ({ url }) => {
  try {
    const postId = url.searchParams.get('postId');
    const userEmail = url.searchParams.get('userEmail');

    if (!postId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Post ID tələb olunur',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Post üçün bütün reaction-ları al
    const { data: reactions, error } = await supabase
      .from('post_reactions')
      .select('*')
      .eq('post_id', postId);

    if (error) {
      throw error;
    }

    // Reaction-ları növə görə qruplaşdır və say
    const reactionCounts = {
      like: 0,
      love: 0,
      celebrate: 0,
      insightful: 0,
      curious: 0,
    };

    const userReactions: string[] = [];

    reactions?.forEach((reaction) => {
      if (reaction.reaction_type in reactionCounts) {
        reactionCounts[reaction.reaction_type as keyof typeof reactionCounts]++;
      }

      // İstifadəçinin verdiyi reaction-ları qeyd et
      if (userEmail && reaction.user_email === userEmail) {
        userReactions.push(reaction.reaction_type);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        counts: reactionCounts,
        userReactions,
        total: reactions?.length || 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Reaction əldə etmə xətası:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Xəta baş verdi',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
