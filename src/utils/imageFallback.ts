import React from 'react';

export const FALLBACK_PRODUCE = 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=600';
export const FALLBACK_BREAD = 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=600';
export const FALLBACK_HONEY = 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=600';
export const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
export const FALLBACK_LOGO = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200';
export const FALLBACK_HERO = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800';

export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  type: 'produce' | 'bread' | 'honey' | 'avatar' | 'logo' | 'hero' = 'produce'
) {
  event.currentTarget.onerror = null; // Prevent infinite fallback loops
  
  switch (type) {
    case 'bread':
      event.currentTarget.src = FALLBACK_BREAD;
      break;
    case 'honey':
      event.currentTarget.src = FALLBACK_HONEY;
      break;
    case 'avatar':
      event.currentTarget.src = FALLBACK_AVATAR;
      break;
    case 'logo':
      event.currentTarget.src = FALLBACK_LOGO;
      break;
    case 'hero':
      event.currentTarget.src = FALLBACK_HERO;
      break;
    default:
      event.currentTarget.src = FALLBACK_PRODUCE;
  }
}
