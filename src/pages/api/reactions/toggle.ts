import type { APIRoute } from 'astro';
import { supabase } from '@/db/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { postId, reactionType, userEmail } = await request.json();

    // Validasiya
    if (!postId || !reactionType || !userEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Post ID, reaction type və user email tələb olunur',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Reaction type yoxlaması
    const validReactions = ['like', 'love', 'celebrate', 'insightful', 'curious'];
    if (!validReactions.includes(reactionType)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Etibarsız reaction type',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Artıq mövcud reaction-u yoxla
    const { data: existingReaction } = await supabase
      .from('post_reactions')
      .select('*')
      .eq('post_id', postId)
      .eq('user_email', userEmail)
      .eq('reaction_type', reactionType)
      .single();

    if (existingReaction) {
      // Əgər varsa, sil (toggle off)
      const { error: deleteError } = await supabase
        .from('post_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'removed',
          message: 'Reaction silindi',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Əgər yoxsa, əlavə et (toggle on)
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

      const { error: insertError } = await supabase
        .from('post_reactions')
        .insert({
          post_id: postId,
          user_id: user?.id || null,
          user_email: userEmail,
          reaction_type: reactionType,
        });

      if (insertError) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'added',
          message: 'Reaction əlavə edildi',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Reaction toggle xətası:', error);
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
