export type ViewState =
  | 'market-home'
  | 'buyer-marketplace'
  | 'checkout'
  | 'buyer-account'
  | 'seller-account'
  | 'delivery-account'
  | 'farmer-dashboard'
  | 'farmer-inventory'
  | 'delivery-dashboard'
  | 'delivery-route'
  | 'investment-dashboard'
  | 'login'
  | 'registration-onboarding';

export interface LoggedInUser {
  id: string;
  name: string;
  email: string;
  emailOrPhone: string;
  phone?: string;
  role: 'customer' | 'seller' | 'delivery';
  authMethod: 'email';
  avatar?: string;
  banner?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  farm: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  qty: number; // master stock amount
  unit: string;
  category: string;
  image: string;
  farm: string;
  farmer: string;
  desc: string;
  organic: boolean;
  boosted: boolean;
  origin?: string;
}

export interface Farmer {
  id: string;
  name: string;
  avatar: string;
  banner: string;
  verified: boolean;
  type: string;
  drop: string;
}
