import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Post {
  id: string;
  title: string;
  description: string;
  slug: string;
  image: string;
  created_at: string;
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const formattedDate = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: tr,
  });

  return (
    <article className="flex flex-col flex-1 h-full group">
      <a href={`/posts/${post.slug}`} title={post.title} className="block">
        <div className="block w-full">
          <img
            src={
              post.image ||
              `https://the99.b-cdn.net/notes/${post.slug}/images/${post.slug}-cover.jpg`
            }
            alt={post.title}
            className="object-cover w-full h-full bg-center aspect-12/8 rounded-xl"
            onError={(e) => {
              // Resim yüklenemezse placeholder göster
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/600x400";
            }}
          />
        </div>
      </a>

      <div className="mt-5">
        <div className="flex items-center space-x-1 gap-2 text-xs text-base-500">
          {/* Profil sayfasında yazar bilgisi olmadığı için tarih gösteriyoruz */}
          <span className="font-medium">{formattedDate}</span>
        </div>

        <h3 className="mt-4 text-base text-base-900 text-balance">
          <a
            href={`/notes/${post.slug}`}
            className="group-hover:underline group-hover:decoration-1 group-hover:decoration-wavy"
          >
            {post.title}
          </a>
        </h3>

        <p className="mt-1 text-sm text-base-500 line-clamp-2">
          {post.description}
        </p>
      </div>
    </article>
  );
}
