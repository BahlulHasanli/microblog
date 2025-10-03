import * as React from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';

export const YoutubeNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const { src } = node.attrs;

  // Extract video ID from src
  let videoId = '';
  if (src) {
    if (src.includes('youtube.com/embed/')) {
      videoId = src.split('youtube.com/embed/')[1].split('?')[0];
    } else if (src.includes('youtube.com/watch')) {
      const url = new URL(src);
      videoId = url.searchParams.get('v') || '';
    } else if (src.includes('youtu.be/')) {
      videoId = src.split('youtu.be/')[1].split('?')[0];
    }
  }

  return (
    <NodeViewWrapper className="youtube-embed">
      <div className="aspect-video rounded-xl overflow-hidden" data-youtube-video={videoId}>
        <iframe
          width="100%"
          height="100%"
          src={src}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </NodeViewWrapper>
  );
};
