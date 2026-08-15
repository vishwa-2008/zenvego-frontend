import React, { useState, useEffect, useRef } from 'react';
import { ViewState, CartItem, LoggedInUser, Product } from './types';
import { Currency } from './utils/currency';
import FarmersMarketHome from './components/FarmersMarketHome';
import BuyerMarketplace from './components/BuyerMarketplace';
import CheckoutView from './components/CheckoutView';
import MyAccountView from './components/MyAccountView';
import FarmerDashboard from './components/FarmerDashboard';
import FarmerInventory from './components/FarmerInventory';
import DeliveryDashboard from './components/DeliveryDashboard';
import DeliveryActiveRoute from './components/DeliveryActiveRoute';
import LoginView from './components/LoginView';
import RegistrationOnboarding from './components/RegistrationOnboarding';
import SellerAccountView from './components/SellerAccountView';
import DeliveryAccountView from './components/DeliveryAccountView';
import { Globe } from 'lucide-react';
import { authApi, BackendUser } from './lib/api';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', system: 'US', currency: 'USD' },
  { code: 'IN', name: 'India', flag: '🇮🇳', system: 'IND', currency: 'INR' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', system: 'IND', currency: 'GBP' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', system: 'IND', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', system: 'IND', currency: 'EUR' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', system: 'IND', currency: 'CAD' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', system: 'IND', currency: 'AUD' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', system: 'IND', currency: 'JPY' },
] as const;

interface Toast {
  id: string;
  message: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('market-home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // ─── ZenBot AI Setup ─────────────────────────────────────────────────────
  // Supports: OAuth Bearer tokens (AQ.*) AND API keys (AIza*) from Google AI Studio
  // Get a free API key at: https://aistudio.google.com/apikey
  const GEMINI_TOKEN = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GEMINI_API_KEY : undefined) || '';
  const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  // Master Customer Care support center states
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportRole, setSupportRole] = useState<'none' | 'customer' | 'seller' | 'delivery'>('none');
  const [activeSupportIssue, setActiveSupportIssue] = useState<string | null>(null);
  const [supportChatMsg, setSupportChatMsg] = useState('');
  const [supportChatMessages, setSupportChatMessages] = useState<{ sender: 'agent' | 'user', text: string, time: string }[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [supportChatMessages, isAiTyping]);

  // Build a context-aware system prompt for Gemini based on the user's role
  const buildSystemPrompt = (role: string) => {
    const base = `You are ZenBot, the friendly and highly knowledgeable AI support assistant for Zenvego — an innovative zero-waste, farm-to-table marketplace that directly connects local organic farmers with customers, eliminating middlemen. Zenvego supports:
- Customers: Browse & buy fresh organic produce, track deliveries in real-time on a live map, pay securely via QR code or Razorpay gateway.
- Farmers/Sellers: List products, manage inventory, assign orders to delivery partners via QR scan handoff, receive payouts.
- Delivery Partners: Accept delivery jobs, navigate using live GPS maps, confirm pickups/drop-offs via QR code or PIN.

Always be warm, concise, and solution-focused. If you do not know something specific, say so honestly. Never make up order numbers or account details. Keep responses under 4 sentences unless the user needs detailed help. Do NOT include markdown asterisks or bullet symbols in your response — use plain readable text only.`;
    const roleContext: Record<string, string> = {
      customer: `\n\nYou are currently helping a CUSTOMER. Focus on: order tracking, delivery issues, product quality, payment refunds, account settings, and how to use the marketplace.`,
      seller: `\n\nYou are currently helping a FARMER/SELLER. Focus on: listing products, inventory management, order fulfillment, QR scan handoffs to delivery partners, earnings & payout questions, and account settings.`,
      delivery: `\n\nYou are currently helping a DELIVERY PARTNER. Focus on: accepting/rejecting delivery jobs, live map navigation, QR/PIN pickup & drop-off confirmation, earnings, GPS issues, and account settings.`,
    };
    return base + (roleContext[role] || '');
  };

  // Smart rule-based fallback — gives real, helpful answers when AI is offline
  const getSmartFallback = (message: string, role: string): string => {
    const msg = message.toLowerCase();
    if (msg.includes('track') || msg.includes('where') || msg.includes('delivery') || msg.includes('order')) {
      if (role === 'customer') return 'To track your order, go to My Account and tap the Live Map icon on your active order. You will see your delivery partner moving in real-time on the map!';
      if (role === 'delivery') return 'Your active delivery route is available in the Delivery Dashboard under Active Route. The map will show your pickup and drop-off locations with turn-by-turn guidance.';
    }
    if (msg.includes('pay') || msg.includes('payment') || msg.includes('refund') || msg.includes('money')) {
      if (role === 'customer') return 'Payments on Zenvego are secured by Razorpay. If you need a refund, please raise a ticket and our team will process it within 3-5 business days.';
      if (role === 'seller') return 'Your earnings are settled automatically. Go to your Seller Account to view your payout history and pending balance.';
      if (role === 'delivery') return 'Your delivery earnings are credited to your account after each completed delivery. You can view and withdraw from your Delivery Account page.';
    }
    if (msg.includes('qr') || msg.includes('scan') || msg.includes('pin')) {
      if (role === 'seller') return 'To hand off an order: open the Farmer Dashboard, find the order, click Assign Driver, and scan the delivery partner QR code. If scanning fails, use the 4-digit PIN shown on screen.';
      if (role === 'delivery') return 'Show your QR code to the farmer for pickup confirmation. For customer delivery, ask the customer to scan your QR or enter the PIN. Both are valid confirmation methods.';
      if (role === 'customer') return 'When your delivery arrives, the delivery partner will show a QR code or provide a PIN. Scanning it confirms your package has arrived safely.';
    }
    if (msg.includes('map') || msg.includes('gps') || msg.includes('location') || msg.includes('route')) {
      return 'For map issues, please ensure you have allowed location permissions in your browser. Click the location icon in your browser address bar and select Allow. Then refresh the page.';
    }
    if (msg.includes('login') || msg.includes('sign') || msg.includes('account') || msg.includes('password') || msg.includes('otp')) {
      return 'Zenvego uses secure OTP-based login — no passwords needed! Enter your email or phone number and we will send you a one-time login link. Check your spam folder if you do not receive it within 2 minutes.';
    }
    if (msg.includes('product') || msg.includes('list') || msg.includes('stock') || msg.includes('inventory')) {
      if (role === 'seller') return 'To add or update products, go to Farmer Inventory in your dashboard. You can set the name, price, quantity, and category. Changes appear live in the marketplace immediately.';
      return 'All products on Zenvego are fresh, local, and organic. You can filter by category, search by name, or browse by farm directly in the marketplace.';
    }
    if (msg.includes('damage') || msg.includes('rotten') || msg.includes('quality') || msg.includes('wrong')) {
      return 'We are sorry about this! Please take a photo of the item and raise a quality complaint from your account page. Our team reviews all complaints within 24 hours and will issue a replacement or full refund.';
    }
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('help')) {
      const roleLabel = role === 'seller' ? 'farmer' : role;
      return `Hello! I am ZenBot, your Zenvego AI assistant. I am here to help you as a ${roleLabel}. You can ask me about orders, payments, maps, QR codes, account settings, or anything else about Zenvego!`;
    }
    return `Great question! For the most accurate help with "${message}", our support team is available at support@zenvego.com. In the meantime, I am here to help with orders, payments, maps, QR codes, and account issues!`;
  };

  // Core AI call — tries Bearer token, then API key, then smart fallback
  const callGeminiAI = async (userMessage: string, currentRole: string, history: { sender: string; text: string }[]) => {
    // Build message contents for REST API
    const contents = [
      ...history
        .filter(m => m.sender === 'user' || m.sender === 'agent')
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: buildSystemPrompt(currentRole) }] },
      contents,
      generationConfig: { maxOutputTokens: 250, temperature: 0.75 },
    });

    // Attempt 1: Bearer token auth (works with OAuth AQ.* tokens)
    try {
      const res = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GEMINI_TOKEN}` },
        body,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (_) {}

    // Attempt 2: API key auth (works with AIza* keys from AI Studio)
    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (_) {}

    // Attempt 3: Smart rule-based fallback (always works, no key needed)
    return getSmartFallback(userMessage, currentRole);
  };

  const getTimestamp = () => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSelectSupportRole = (role: 'customer' | 'seller' | 'delivery') => {
    setSupportRole(role);
    setActiveSupportIssue(null);
    const welcomeMsg = role === 'customer'
      ? 'Hi there! 👋 I am ZenBot, your Zenvego AI assistant. I can help you with orders, deliveries, payments, and more. What can I help you with today?'
      : role === 'seller'
      ? 'Hello, Farmer! 🌿 I am ZenBot. I can help you with inventory, order handoffs, QR scans, payouts, and more. What do you need help with?'
      : 'Hey there, Delivery Partner! 🛵 I am ZenBot. I can assist with routes, QR pickup confirmations, earnings, GPS issues, and more. What can I help with?';
    setSupportChatMessages([{ sender: 'agent', text: welcomeMsg, time: getTimestamp() }]);
  };

  const handleSelectSupportIssue = async (issue: string) => {
    setActiveSupportIssue(issue);
    const userMsg = { sender: 'user', text: `I need help with: ${issue}`, time: getTimestamp() };
    setSupportChatMessages(prev => [...prev, userMsg]);
    setIsAiTyping(true);

    const updatedHistory = [...supportChatMessages, userMsg];
    const reply = await callGeminiAI(`I need help with: ${issue}`, supportRole, updatedHistory);

    setIsAiTyping(false);
    setSupportChatMessages(prev => [...prev, { sender: 'agent', text: reply, time: getTimestamp() }]);
  };

  const handleSendSupportChat = async () => {
    if (!supportChatMsg.trim() || isAiTyping) return;
    const msgText = supportChatMsg.trim();
    const userMsg = { sender: 'user', text: msgText, time: getTimestamp() };
    setSupportChatMessages(prev => [...prev, userMsg]);
    setSupportChatMsg('');
    setIsAiTyping(true);

    const updatedHistory = [...supportChatMessages, userMsg];
    const reply = await callGeminiAI(msgText, supportRole, updatedHistory);

    setIsAiTyping(false);
    setSupportChatMessages(prev => [...prev, { sender: 'agent', text: reply, time: getTimestamp() }]);
  };

  // Master community inventory ledger, initialized from local storage or defaults
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('zenvego_master_products2');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        // Fallback
      }
    }
    
    return [
      {
        id: 'prod-tomato',
        name: 'Organic Vine Heirloom Tomatoes',
        price: 4.80,
        unit: 'lb',
        category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400',
        farm: "Sunny Hills Organic",
        farmer: "John Miller",
        qty: 24,
        origin: 'Field Block A',
        organic: true,
        boosted: true,
        desc: 'Crimson, succulent vine heirloom tomatoes harvested at dawn. Unmatched sweetness and premium complexity.'
      },
      {
        id: 'prod-carrot',
        name: 'Rainbow Heirloom Carrots Bunch',
        price: 3.50,
        unit: 'bunch',
        category: 'Roots',
        image: 'https://images.unsplash.com/photo-1444312645910-ffa973656eba?auto=format&fit=crop&q=80&w=400',
        farm: 'Sunny Hills Organic',
        farmer: "John Miller",
        qty: 15,
        origin: 'Greenhouse B',
        organic: true,
        boosted: false,
        desc: 'Beautiful hues of purple, orange, and pale yellow roots with earthy notes. Clean and crunchy.'
      },
      {
        id: 'prod-kale',
        name: 'Earthy Mountain Dinosaur Kale',
        price: 2.90,
        unit: 'bunch',
        category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1524179091875-bf99a9a6af57?auto=format&fit=crop&q=80&w=400',
        farm: 'Green Peak Growers',
        farmer: "Sarah's Favorites",
        qty: 18,
        origin: 'Highland Ridge',
        organic: true,
        boosted: false,
        desc: 'Rich dark green textured Tuscan cavolo nero kale. Packed with iron, freshly harvested under organic principles.'
      },
      {
        id: 'prod-sourdough',
        name: 'Crusty Artisan Rye Sourdough Loup',
        price: 6.20,
        unit: 'loaf',
        category: 'Bakery',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400',
        farm: 'Windmill Sourdough Bakery',
        farmer: "Bake Master David",
        qty: 8,
        origin: 'Artisan Oven A',
        organic: true,
        boosted: false,
        desc: 'Naturally fermented over 36 hours. Dense crumb, crisp crust, beautiful aroma.'
      },
      {
        id: 'prod-eggplant',
        name: 'Glossy Farmer Purple Brinjals',
        price: 3.90,
        unit: 'lb',
        category: 'Vegetables',
        image: 'https://images.unsplash.com/photo-1528137871618-79d2761e38c2?auto=format&fit=crop&q=80&w=400',
        farm: 'Sunny Hills Organic',
        farmer: "John Miller",
        qty: 12,
        origin: 'Field Block F',
        organic: true,
        boosted: false,
        desc: 'Firm, premium dark skins, mild internal flesh, and minimal seed counts. Baked wonders.'
      },
      {
        id: 'prod-honey',
        name: 'Wildflower Pure Raw Comb Honey',
        price: 8.50,
        unit: 'jar',
        category: 'Sweets & Honey',
        image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=400',
        farm: 'Wildflower Honey Farm',
        farmer: "Robert Beekeeper",
        qty: 20,
        origin: 'Forest Nest Beta',
        organic: true,
        boosted: false,
        desc: 'Raw nectar sourced straight from forest wildflower canopies. Naturally sweet and therapeutic.'
      }
    ];
  });

  // Sync products state to local storage when changed
  useEffect(() => {
    localStorage.setItem('zenvego_master_products2', JSON.stringify(products));
  }, [products]);
  
  // Dynamic user session configuration
  const [sessionUser, setSessionUser] = useState<LoggedInUser | null>(() => {
    const cached = localStorage.getItem('zenvego_session_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        return null;
      }
    }
    return null;
  });

  const [preselectedRole, setPreselectedRole] = useState<'customer' | 'seller' | 'delivery' | null>(null);

  useEffect(() => {
    if (!sessionUser?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const health = await authApi.health();
        if (cancelled || !health || health.status !== 'success') {
          return;
        }
        const res = await authApi.getUser(sessionUser.email);
        if (cancelled) return;
        const remote: BackendUser | undefined = res.user;
        if (!remote) return;
        const merged: LoggedInUser = {
          ...sessionUser,
          email: remote.email || sessionUser.email,
          emailOrPhone: remote.email || sessionUser.emailOrPhone,
          name: remote.fullName || sessionUser.name,
          phone: remote.phone || sessionUser.phone,
          role: (remote.role as LoggedInUser['role']) || sessionUser.role,
          avatar: remote.avatar || sessionUser.avatar,
          banner: remote.banner || sessionUser.banner,
          address: remote.address || sessionUser.address,
          id: remote.id || sessionUser.id,
          authMethod: 'email',
        };
        if (JSON.stringify(merged) !== JSON.stringify(sessionUser)) {
          localStorage.setItem('zenvego_session_user', JSON.stringify(merged));
          setSessionUser(merged);
        }
      } catch (_) {
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const [measurementSystem, setMeasurementSystemState] = useState<'US' | 'IND'>(() => {
    const cached = localStorage.getItem('zenvego_measurement_system');
    return (cached === 'IND' || cached === 'US') ? cached as 'US' | 'IND' : 'US';
  });

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const cached = localStorage.getItem('zenvego_currency');
    if (cached === 'INR' || cached === 'USD') return cached as Currency;
    return measurementSystem === 'IND' ? 'INR' : 'USD';
  });

  const setMeasurementSystem = (system: 'US' | 'IND') => {
    setMeasurementSystemState(system);
    localStorage.setItem('zenvego_measurement_system', system);
    // Link default currency dynamically to offer cohesive Indian or US experience.
    if (system === 'IND') {
      setCurrencyState('INR');
      localStorage.setItem('zenvego_currency', 'INR');
    } else {
      setCurrencyState('USD');
      localStorage.setItem('zenvego_currency', 'USD');
    }
    addToast(`🌍 Region mode: measuring units updated to ${system === 'IND' ? 'Metric System (kg, km, Celsius)' : 'U.S. Customary (lbs, miles, Fahrenheit)'}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('zenvego_session_user');
    setSessionUser(null);
    setCurrentView('market-home');
    addToast("🚪 Logged out. Thank you for supporting local growers!");
  };

  const handleLoginSuccess = (user: LoggedInUser) => {
    localStorage.setItem('zenvego_session_user', JSON.stringify(user));
    setSessionUser(user);
    setPreselectedRole(null);
    if (user.email) {
      authApi.getUser(user.email).catch(() => {});
    }
    addToast(`👋 Authorized! Proceeding to Ecosystem registration on-boarding...`);
    setCurrentView('registration-onboarding');
  };

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('zenvego_currency', newCurrency);
    addToast(`Price reference preferred in ${newCurrency === 'INR' ? 'Indian Rupee (INR)' : 'U.S. Dollar (USD)'}`);
  };

  // Helper to trigger floating toast banner
  const addToast = (message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Add to shopping cart helpers
  const addToCart = (product: any) => {
    const masterProd = products.find((p) => p.id === product.id);
    if (!masterProd) {
      addToast("Error: Item not found in live harvest database.");
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.id === product.id);
      if (idx !== -1) {
        const currentQtyInCart = prev[idx].quantity;
        if (currentQtyInCart >= masterProd.qty) {
          addToast(`⚡ Out of stock! Cannot reserve more than ${masterProd.qty} ${product.unit} of ${product.name}.`);
          return prev;
        }
        const copy = [...prev];
        copy[idx].quantity += 1;
        addToast(`Incremented reserve: ${product.name} (Qty ${copy[idx].quantity})`);
        return copy;
      } else {
        if (masterProd.qty <= 0) {
          addToast(`⚡ ${product.name} is currently out of stock!`);
          return prev;
        }
        addToast(`Reserved: ${product.name} added to harvest list!`);
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            unit: product.unit,
            farm: product.farm,
            image: product.image,
          },
        ];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const item = prev.find((item) => item.id === itemId);
      if (!item) return prev;
      
      if (item.quantity > 1) {
        const copy = [...prev];
        const idx = copy.findIndex((i) => i.id === itemId);
        copy[idx].quantity -= 1;
        addToast(`Decremented reserve: ${item.name} (Qty ${copy[idx].quantity})`);
        return copy;
      } else {
        addToast(`Removed ${item.name} from your express delivery basket.`);
        return prev.filter((i) => i.id !== itemId);
      }
    });
  };

  const clearCart = () => {
    setCart([]);
    addToast("Express delivery basket emptied.");
  };

  const handleCheckoutSuccess = () => {
    setProducts((prev) => {
      return prev.map((p) => {
        const cartItem = cart.find((item) => item.id === p.id);
        if (cartItem) {
          const decrementedQty = Math.max(0, p.qty - cartItem.quantity);
          return { ...p, qty: decrementedQty };
        }
        return p;
      });
    });
  };

  // Guard routing logic: protect specific dashboard roles if sessionUser is empty
  useEffect(() => {
    const protectedViews: ViewState[] = [
      'buyer-marketplace',
      'checkout',
      'buyer-account',
      'farmer-dashboard',
      'farmer-inventory',
      'delivery-dashboard',
      'delivery-route',
      'registration-onboarding'
    ];
    if (protectedViews.includes(currentView) && !sessionUser) {
      addToast("🔒 Unauthorized access. Please log in or choose a profile to proceed.");
      setCurrentView('login');
    }
  }, [currentView, sessionUser]);

  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/25 selection:text-primary font-sans">
      {/* Root Layout Router Switcher */}
      <main className="transition-all duration-300">
        {currentView === 'market-home' && (
          <FarmersMarketHome 
            setView={setCurrentView} 
            currency={currency} 
            setCurrency={setCurrency} 
            sessionUser={sessionUser}
            handleLogout={handleLogout}
            setPreselectedRole={setPreselectedRole}
            globalSearchTerm={globalSearchTerm}
            setGlobalSearchTerm={setGlobalSearchTerm}
            measurementSystem={measurementSystem}
          />
        )}
        {currentView === 'buyer-marketplace' && (
          <BuyerMarketplace
            setView={setCurrentView}
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            currency={currency}
            setCurrency={setCurrency}
            sessionUser={sessionUser}
            handleLogout={handleLogout}
            globalSearchTerm={globalSearchTerm}
            setGlobalSearchTerm={setGlobalSearchTerm}
            products={products}
            measurementSystem={measurementSystem}
          />
        )}
        {currentView === 'checkout' && (
          <CheckoutView
            setView={setCurrentView}
            cart={cart}
            clearCart={clearCart}
            addToast={addToast}
            currency={currency}
            setCurrency={setCurrency}
            sessionUser={sessionUser}
            onCheckoutSuccess={handleCheckoutSuccess}
            measurementSystem={measurementSystem}
          />
        )}
        {currentView === 'buyer-account' && (
          <MyAccountView 
            setView={setCurrentView} 
            addToast={addToast} 
            currency={currency} 
            setCurrency={setCurrency} 
            sessionUser={sessionUser}
            setSessionUser={setSessionUser}
            handleLogout={handleLogout}
            measurementSystem={measurementSystem}
          />
        )}
        {currentView === 'seller-account' && (
          <SellerAccountView 
            setView={setCurrentView} 
            addToast={addToast} 
            currency={currency} 
            sessionUser={sessionUser}
            setSessionUser={setSessionUser}
            handleLogout={handleLogout}
          />
        )}
        {currentView === 'delivery-account' && (
          <DeliveryAccountView 
            setView={setCurrentView} 
            addToast={addToast} 
            currency={currency} 
            sessionUser={sessionUser}
            setSessionUser={setSessionUser}
            handleLogout={handleLogout}
          />
        )}
        {currentView === 'farmer-dashboard' && (
          <FarmerDashboard 
            setView={setCurrentView} 
            addToast={addToast} 
            currency={currency} 
            setCurrency={setCurrency} 
            sessionUser={sessionUser}
            setSessionUser={setSessionUser}
            handleLogout={handleLogout}
            measurementSystem={measurementSystem}
          />
        )}
        {currentView === 'farmer-inventory' && (
          <FarmerInventory 
            setView={setCurrentView} 
            addToast={addToast} 
            currency={currency} 
            setCurrency={setCurrency} 
            sessionUser={sessionUser}
            handleLogout={handleLogout}
            products={products}
            setProducts={setProducts}
            measurementSystem={measurementSystem}
          />
        )}
        {currentView === 'delivery-dashboard' && (
          <DeliveryDashboard 
            setView={setCurrentView} 
            addToast={addToast} 
            currency={currency} 
            setCurrency={setCurrency} 
            sessionUser={sessionUser}
            handleLogout={handleLogout}
            measurementSystem={measurementSystem}
          />
        )}
        {currentView === 'delivery-route' && (
          <DeliveryActiveRoute 
            setView={setCurrentView} 
            addToast={addToast} 
            currency={currency} 
            setCurrency={setCurrency} 
            sessionUser={sessionUser}
            handleLogout={handleLogout}
            measurementSystem={measurementSystem}
          />
        )}
        {currentView === 'login' && (
          <LoginView 
            setView={setCurrentView} 
            addToast={addToast} 
            preselectedRole={preselectedRole}
            setPreselectedRole={setPreselectedRole}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        {currentView === 'registration-onboarding' && (
          <RegistrationOnboarding
            setView={setCurrentView}
            sessionUser={sessionUser}
            setSessionUser={setSessionUser}
            addToast={addToast}
            measurementSystem={measurementSystem}
          />
        )}
      </main>

      {/* Dynamic Toast Portal Notification Banners */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="p-4 rounded-2xl bg-[#271810] text-[#fff8f6] text-xs font-semibold shadow-2xl flex items-center gap-2.5 border border-white/5 animate-fade-in pointer-events-auto"
          >
            <span className="material-symbols-outlined text-secondary fill-icon">notifications_active</span>
            <p>{toast.message}</p>
          </div>
        ))}
      </div>

      {/* PREMIUM PROTOTYPE INTERACTIVE SWITCH PANEL (Can be minimized) */}
      <div className="fixed top-20 right-4 z-[9999] pointer-events-none hidden md:block font-sans">
        {showConsole ? (
          <div className="w-72 bg-[#271810]/95 backdrop-blur-md rounded-2xl border border-white/10 p-4 space-y-3.5 shadow-2xl text-white pointer-events-auto transition-all duration-300">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[18px]">terminal</span>
                <span className="text-xs font-extrabold tracking-widest uppercase">Zenvego Mocks</span>
              </div>
              <button 
                onClick={() => setShowConsole(false)}
                className="text-white hover:text-secondary"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Currency Preference block in Prototype Switcher */}
            <div className="space-y-1.5 pb-2 border-b border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-wider text-outline-variant font-bold">Preferences & Units</p>
                <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-white font-mono font-bold">REGIONAL</span>
              </div>
              
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-2 relative shadow-inner">
                <div className="flex items-center gap-1.5">
                  <Globe size={14} className="text-white/60" />
                  <span className="text-[10px] text-white/80 font-bold flex-1">Country & Region Configuration</span>
                </div>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-black/20 border border-white/10 rounded-lg py-1.5 pl-2 pr-6 text-[11px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#ff5c3e] cursor-pointer transition-colors hover:bg-black/30"
                    value={COUNTRIES.find(c => c.currency === currency && c.system === measurementSystem)?.code || 'US'}
                    onChange={(e) => {
                      const country = COUNTRIES.find(c => c.code === e.target.value);
                      if (country) {
                        setMeasurementSystem(country.system as 'US' | 'IND');
                        setCurrency(country.currency as Currency);
                      }
                    }}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code} className="bg-[#271810] text-white font-sans py-1">
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="material-symbols-outlined text-[14px] text-white/50">unfold_more</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10">
                  <span className="text-[9px] text-white/50 font-semibold tracking-wide">ACTIVE ENGINE:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono font-bold bg-white/5 px-1.5 py-0.5 rounded text-white/80">{measurementSystem === 'US' ? 'Imperial' : 'Metric'}</span>
                    <span className="text-[9px] font-mono font-bold bg-[#ff5c3e]/20 text-[#ff5c3e] px-1.5 py-0.5 rounded">{currency}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] uppercase tracking-wider text-outline-variant font-bold">1. SOURCING VISUALLS</p>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  onClick={() => setCurrentView('market-home')}
                  className={`py-1.5 px-2 rounded-lg text-left transition-all font-bold ${
                    currentView === 'market-home' ? 'bg-[#ff5c3e] text-white' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Landing Page
                </button>
                <button
                  onClick={() => setCurrentView('buyer-marketplace')}
                  className={`py-1.5 px-2 rounded-lg text-left transition-all font-bold ${
                    currentView === 'buyer-marketplace' ? 'bg-[#ff5c3e] text-white' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Market Shop
                </button>
                <button
                  onClick={() => setCurrentView('checkout')}
                  className={`py-1.5 px-2 rounded-lg text-left transition-all font-bold ${
                    currentView === 'checkout' ? 'bg-[#ff5c3e] text-white' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Checkout Pag
                </button>
                <button
                  onClick={() => setCurrentView('buyer-account')}
                  className={`py-1.5 px-2 rounded-lg text-left transition-all font-bold ${
                    currentView === 'buyer-account' ? 'bg-[#ff5c3e] text-white' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Buyer Profile
                </button>
              </div>

              <p className="text-[9px] uppercase tracking-wider text-outline-variant font-bold pt-1.5">2. HARVEST PORTALS</p>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  onClick={() => setCurrentView('farmer-dashboard')}
                  className={`py-1.5 px-2 rounded-lg text-left transition-all font-bold ${
                    currentView === 'farmer-dashboard' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Farmer Metrics
                </button>
                <button
                  onClick={() => setCurrentView('farmer-inventory')}
                  className={`py-1.5 px-2 rounded-lg text-left transition-all font-bold ${
                    currentView === 'farmer-inventory' ? 'bg-primary text-white' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Harvest Stock
                </button>
              </div>

              <p className="text-[9px] uppercase tracking-wider text-outline-variant font-bold pt-1.5">3. COURIER DIRECT DISPATCH</p>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  onClick={() => setCurrentView('delivery-dashboard')}
                  className={`py-1.5 px-2 rounded-lg text-left transition-all font-bold ${
                    currentView === 'delivery-dashboard' ? 'bg-[#a24000] text-white' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Courier Portal
                </button>
                <button
                  onClick={() => setCurrentView('delivery-route')}
                  className={`py-1.5 px-2 rounded-lg text-left transition-all font-bold ${
                    currentView === 'delivery-route' ? 'bg-[#a24000] text-white' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Active Route
                </button>
              </div>

              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={() => setCurrentView('login')}
                  className={`w-full py-1.5 px-2 text-center rounded-lg transition-all text-[11px] font-bold ${
                    currentView === 'login' ? 'bg-white text-primary' : 'bg-white/15 hover:bg-white/20'
                  }`}
                >
                  Unified Auth Gate
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConsole(true)}
            className="p-3 bg-[#271810] text-[#fff8f6] rounded-full border border-white/10 shadow-2xl flex items-center justify-center cursor-pointer pointer-events-auto hover:scale-105 transition-all"
            title="Open Interactive View Switcher Console"
          >
            <span className="material-symbols-outlined text-[20px]">menu_open</span>
          </button>
        )}
      </div>

      {/* FLOATING UNIVERSAL CUSTOMER CARE SUPPORT CONTROLLER (Bottom Left) */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2.5 pointer-events-none">
        <button
          type="button"
          onClick={() => {
            setShowSupportModal(true);
            setSupportRole('none');
          }}
          className="p-3 bg-[#ff5c3e] text-white rounded-full border-2 border-white shadow-2xl flex items-center justify-center cursor-pointer pointer-events-auto hover:bg-orange-650 active:scale-95 transition-all gap-1.5 font-extrabold text-xs"
          title="Open Ecosystem Customer Care Desk"
        >
          <span className="material-symbols-outlined text-[18px]">support_agent</span>
          <span>☎ Support & Care</span>
        </button>
      </div>

      {/* ECOSYSTEM CUSTOMER CARE ASSISTANT MODAL GRID */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-[#271810]/75 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-fade-in text-[#271810]">
          <div className="bg-white rounded-[32px] p-6 max-w-2xl w-full border border-[#ff5c3e]/10 shadow-2xl space-y-6 relative flex flex-col">
            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black w-8 h-8 rounded-full flex items-center justify-center font-bold"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="bg-orange-100 text-[#ff5c3e] text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-orange-200/40">
                Zenvego Sourcing Support Unit
              </span>
              <h3 className="text-xl font-serif font-black text-[#271810] pt-1.5">Universal Customer Care Hub</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                We maintain separate regulatory help desks based on your active grid roles. Please select your sector:
              </p>
            </div>

            {/* Stage 1: Role Selection Portal */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSelectSupportRole('customer')}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${supportRole === 'customer' ? 'bg-[#eefcf4] border-emerald-500/40 text-emerald-800 font-extrabold shadow-sm' : 'bg-white border-gray-150 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-[22px] text-emerald-600">shopping_basket</span>
                <span className="text-[11px] block leading-none">Customer Care</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSupportRole('seller')}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${supportRole === 'seller' ? 'bg-amber-50 border-amber-500/40 text-amber-900 font-extrabold shadow-sm' : 'bg-white border-gray-150 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-[22px] text-amber-600">storefront</span>
                <span className="text-[11px] block leading-none">Seller / Grower</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSupportRole('delivery')}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${supportRole === 'delivery' ? 'bg-orange-50 border-[#ff5c3e]/40 text-[#a24000] font-extrabold shadow-sm' : 'bg-white border-gray-150 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-[22px] text-orange-600">motorcycle</span>
                <span className="text-[11px] block leading-none">Delivery Desk</span>
              </button>
            </div>

            {supportRole !== 'none' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
                
                {/* Left: Role Specific Common Issues Selectors */}
                <div className="md:col-span-5 space-y-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Frequent Sourcing Tickets:</span>
                  
                  {supportRole === 'customer' && (
                    <div className="space-y-1.5">
                      {[
                        "🍎 Rotten/Damaged Harvest item received",
                        "🗺 Alex Courier took wrong route",
                        "🏠 Change Fixed Address Presets on account"
                      ].map((issue, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSupportIssue(issue)}
                          className={`w-full text-left p-2.5 rounded-xl border text-[10.5px] leading-tight transition-colors ${activeSupportIssue === issue ? 'bg-[#ff5c3e] text-white border-none' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                        >
                          {issue}
                        </button>
                      ))}
                    </div>
                  )}

                  {supportRole === 'seller' && (
                    <div className="space-y-1.5">
                      {[
                        "📸 Scan hardware optical reader failed",
                        "💰 Pending organic payout settlement balance",
                        "🥦 Sourcing category registration tag mistake"
                      ].map((issue, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSupportIssue(issue)}
                          className={`w-full text-left p-2.5 rounded-xl border text-[10.5px] leading-tight transition-colors ${activeSupportIssue === issue ? 'bg-[#ff5c3e] text-white border-none' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                        >
                          {issue}
                        </button>
                      ))}
                    </div>
                  )}

                  {supportRole === 'delivery' && (
                    <div className="space-y-1.5">
                      {[
                        "🔑 Secure locker PIN code won't open door",
                        "🚴 Balance payout withdrawal failed",
                        "🗺 GPS router navigation offline error"
                      ].map((issue, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSupportIssue(issue)}
                          className={`w-full text-left p-2.5 rounded-xl border text-[10.5px] leading-tight transition-colors ${activeSupportIssue === issue ? 'bg-[#ff5c3e] text-white border-none' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                        >
                          {issue}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Live Gemini AI Support Chat */}
                <div className="md:col-span-7 bg-gray-50 rounded-2xl p-4 flex flex-col justify-between h-72 border border-gray-150">
                  {/* AI Badge */}
                  <div className="flex items-center gap-1.5 pb-2 border-b border-gray-200 mb-1 shrink-0">
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[#ff5c3e] to-[#ff9a3c] text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[10px]">smart_toy</span>
                      ZenBot AI • Powered by Gemini
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-[8px] text-emerald-600 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      Live
                    </span>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-grow overflow-y-auto space-y-2 pr-1 text-[11px]">
                    {supportChatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end text-right' : 'items-start text-left'}`}
                      >
                        {msg.sender === 'agent' && (
                          <span className="text-[8px] text-[#ff5c3e] font-extrabold mb-0.5 tracking-wide">🤖 ZenBot</span>
                        )}
                        <div
                          className={`p-2.5 rounded-2xl max-w-[92%] leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-[#271810] text-[#fff8f6] rounded-br-none'
                              : 'bg-white border border-[#ff5c3e]/15 text-[#271810] shadow-sm rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[8px] text-gray-400 font-mono mt-0.5">{msg.time}</span>
                      </div>
                    ))}

                    {/* AI Typing Indicator */}
                    {isAiTyping && (
                      <div className="flex flex-col items-start text-left">
                        <span className="text-[8px] text-[#ff5c3e] font-extrabold mb-0.5 tracking-wide">🤖 ZenBot</span>
                        <div className="p-2.5 rounded-2xl rounded-bl-none bg-white border border-[#ff5c3e]/15 shadow-sm flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c3e] animate-bounce" style={{animationDelay:'0ms'}}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c3e] animate-bounce" style={{animationDelay:'150ms'}}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c3e] animate-bounce" style={{animationDelay:'300ms'}}></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="mt-2.5 flex gap-1.5 pt-2 border-t border-gray-200 shrink-0">
                    <input
                      type="text"
                      placeholder={isAiTyping ? 'ZenBot is thinking...' : 'Ask ZenBot anything...'}
                      value={supportChatMsg}
                      disabled={isAiTyping}
                      onChange={(e) => setSupportChatMsg(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendSupportChat();
                      }}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#ff5c3e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleSendSupportChat}
                      disabled={isAiTyping || !supportChatMsg.trim()}
                      className="bg-gradient-to-br from-[#ff5c3e] to-[#ff9a3c] text-white text-xs px-3 rounded-xl font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">send</span>
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-200/80 text-gray-400 font-medium text-xs">
                <span className="material-symbols-outlined text-[32px] block text-gray-300 animate-pulse mb-1">domain_verification</span>
                Select your segment from options above to load a dedicated service agent.
              </div>
            )}

            <div className="text-[10px] text-gray-500 leading-normal text-center bg-gradient-to-r from-orange-50 to-amber-50 p-2.5 rounded-2xl font-mono border border-orange-100/60">
              🤖 <strong className="text-[#ff5c3e]">ZenBot</strong> is powered by Google Gemini AI • Responses are AI-generated and may not reflect real account data • For account-specific issues, our team is at <strong className="text-[#ff5c3e]">support@zenvego.com</strong>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
