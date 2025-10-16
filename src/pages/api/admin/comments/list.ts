import type { APIRoute } from 'astro';
import { isAdmin } from '@/utils/auth';
import { supabase } from '@/db/supabase';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  // Admin kontrolü
  const adminCheck = await isAdmin(cookies);
  if (!adminCheck) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Yetkiniz yoxdur' 
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Tüm yorumları getir
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id (
          avatar,
          fullname
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Şərhlər yüklənərkən xəta:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Şərhlər yüklənərkən xəta baş verdi' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Her yorum için cevap sayısını hesapla
    const commentsWithCounts = await Promise.all(
      (comments || []).map(async (comment) => {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', comment.id);

        return {
          ...comment,
          user_avatar: comment.users?.avatar || null,
          user_fullname: comment.users?.fullname || comment.user_name,
          reply_count: count || 0
        };
      })
    );

    return new Response(JSON.stringify({ 
      success: true, 
      comments: commentsWithCounts 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Şərhlər yüklənərkən xəta:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Server xətası' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
