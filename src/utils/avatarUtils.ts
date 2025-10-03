/**
 * Checks if the avatar URL is a default avatar from the noavatar folder
 * @param url The avatar URL to check
 * @returns True if the avatar is a default avatar, false otherwise
 */
export function isDefaultAvatar(url: string): boolean {
  if (!url) return false;
  
  // Check if the URL contains the noavatar path
  return url.includes('b-cdn.net/noavatar/') || url.includes('/noavatar/');
}

/**
 * Extracts the avatar filename from a BunnyCDN URL
 * @param url The full BunnyCDN URL of the avatar
 * @returns The relative path of the avatar in BunnyCDN storage
 */
export function extractAvatarPathFromUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    // Check if it's a default avatar (in noavatar folder)
    if (isDefaultAvatar(url)) {
      console.log('Default avatar detected, skipping extraction');
      return null;
    }
    
    // Check if it's a BunnyCDN URL in the avatar folder
    if (url.includes('b-cdn.net/avatar/')) {
      // Extract the path after 'avatar/'
      const match = url.match(/b-cdn\.net\/avatar\/(.+)$/);
      if (match && match[1]) {
        return `avatar/${match[1]}`;
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting avatar path:', error);
    return null;
  }
}
