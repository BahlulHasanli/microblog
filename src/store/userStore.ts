import { atom } from 'nanostores';

// User avatar store to share avatar updates across components
export const userAvatar = atom<string | null>(null);

// Function to update the avatar across components
export function updateUserAvatar(avatarUrl: string) {
  userAvatar.set(avatarUrl);
}
