/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Milk, 
  Truck, 
  Users, 
  History, 
  Settings as SettingsIcon, 
  Plus, 
  Check, 
  X, 
  LogOut, 
  ChevronRight, 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown,
  Trash2,
  Edit2,
  Save,
  Calendar as CalendarIcon,
  Home,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfToday, addDays, subDays, parseISO, isSameDay } from 'date-fns';
import { 
  db, 
  auth, 
  signInWithGoogle, 
  loginWithEmail,
  registerWithEmail,
  logout, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { Consumer, Delivery, Inventory, Settings } from './types';
import { cn } from './lib/utils';

// --- Constants & Translations ---

const DEFAULT_MILK_TYPES = ['Full Cream', 'Toned', 'Cow', 'Buffalo', 'Other'];

const TRANSLATIONS = {
  en: {
    app_name: 'MilkShop Tracker',
    tagline: 'Simple records for your milk business.',
    start_now: 'Start Now',
    safe_secure: 'Safe & Secure',
    delivery: 'Delivery',
    stock: 'Stock',
    stats: 'Stats',
    clients: 'Clients',
    setup: 'Setup',
    today: 'Today',
    total_milk: 'Total Milk',
    total_cash: 'Total Cash',
    delivery_list: 'Delivery List',
    no_clients: 'No clients added yet.',
    doorstep: 'Doorstep',
    stock_records: 'Stock Records',
    add_record: 'Add Record',
    cancel: 'Cancel',
    bought: 'Bought',
    sold_extra: 'Sold Extra',
    quantity_litres: 'Quantity (Litres)',
    total_money: 'Total Money (₹)',
    source_notes: 'Source / Notes',
    save_record: 'Save Record',
    purchased: 'Purchased',
    sold: 'Sold',
    general: 'General',
    new_client: 'New Client',
    client_name: 'Client Name',
    address_house: 'Address / House No.',
    daily_quantity: 'Daily Quantity (Litres)',
    add_to_list: 'Add to List',
    no_address: 'No address',
    daily: 'Daily',
    paused: 'Paused',
    delete_client_confirm: 'Delete this client?',
    business_summary: 'Business Summary',
    total_profit: 'Total Profit',
    total_in: 'Total In',
    total_out: 'Total Out',
    deliveries: 'Deliveries',
    extra_sales: 'Extra Sales',
    recent_activity: 'Recent Activity',
    unknown: 'Unknown',
    skipped: 'Skipped',
    milk_price: 'Milk Price',
    set_selling_price: 'Set your current selling price per litre.',
    per_litre: 'Per Litre',
    save_settings: 'Save Settings',
    settings_saved: 'Settings saved!',
    app_version: 'App Version 1.0',
    designed_for: 'Designed for simple milk business management.',
    language: 'Language',
    select_language: 'Select your preferred language.',
    stock_left: 'Stock Left',
    milk_type: 'Milk Type',
    custom_price: 'Custom Price (Optional)',
    default_milk_type: 'Default Milk Type',
    default_price: 'Default Price',
    edit_client: 'Edit Client',
    update_client: 'Update Client',
    milk_types: 'Milk Types',
    add_type: 'Add Type',
    type_name: 'Type Name (e.g. Gold)',
    delete_type_confirm: 'Delete this milk type?',
    save_changes: 'Save Changes',
    login: 'Login',
    signup: 'Sign Up',
    email_phone: 'Email or Phone',
    password: 'Password',
    no_account: "Don't have an account?",
    have_account: 'Already have an account?',
    invalid_credentials: 'Invalid email or password.',
    account_created: 'Account created successfully!',
  },
  hi: {
    app_name: 'मिल्कशॉप ट्रैकर',
    tagline: 'आपके दूध व्यवसाय के लिए सरल रिकॉर्ड।',
    start_now: 'अभी शुरू करें',
    safe_secure: 'सुरक्षित और विश्वसनीय',
    delivery: 'वितरण',
    stock: 'स्टॉक',
    stats: 'आंकड़े',
    clients: 'ग्राहक',
    setup: 'सेटअप',
    today: 'आज',
    total_milk: 'कुल दूध',
    total_cash: 'कुल नकद',
    delivery_list: 'वितरण सूची',
    no_clients: 'अभी तक कोई ग्राहक नहीं जोड़ा गया।',
    doorstep: 'दरवाजे पर',
    stock_records: 'स्टॉक रिकॉर्ड',
    add_record: 'रिकॉर्ड जोड़ें',
    cancel: 'रद्द करें',
    bought: 'खरीदा',
    sold_extra: 'अतिरिक्त बेचा',
    quantity_litres: 'मात्रा (लीटर)',
    total_money: 'कुल पैसा (₹)',
    source_notes: 'स्रोत / नोट्स',
    save_record: 'रिकॉर्ड सहेजें',
    purchased: 'खरीदा गया',
    sold: 'बेचा गया',
    general: 'सामान्य',
    new_client: 'नया ग्राहक',
    client_name: 'ग्राहक का नाम',
    address_house: 'पता / मकान नंबर',
    daily_quantity: 'दैनिक मात्रा (लीटर)',
    add_to_list: 'सूची में जोड़ें',
    no_address: 'कोई पता नहीं',
    daily: 'दैनिक',
    paused: 'रुका हुआ',
    delete_client_confirm: 'क्या आप इस ग्राहक को हटाना चाहते हैं?',
    business_summary: 'व्यवसाय सारांश',
    total_profit: 'कुल लाभ',
    total_in: 'कुल आय',
    total_out: 'कुल खर्च',
    deliveries: 'वितरण',
    extra_sales: 'अतिरिक्त बिक्री',
    recent_activity: 'हाल की गतिविधि',
    unknown: 'अज्ञात',
    skipped: 'छोड़ दिया',
    milk_price: 'दूध की कीमत',
    set_selling_price: 'प्रति लीटर अपनी वर्तमान बिक्री मूल्य निर्धारित करें।',
    per_litre: 'प्रति लीटर',
    save_settings: 'सेटिंग्स सहेजें',
    settings_saved: 'सेटिंग्स सहेजी गईं!',
    app_version: 'ऐप संस्करण 1.0',
    designed_for: 'सरल दूध व्यवसाय प्रबंधन के लिए डिज़ाइन किया गया।',
    language: 'भाषा',
    select_language: 'अपनी पसंदीदा भाषा चुनें।',
    stock_left: 'स्टॉक बचा है',
    milk_type: 'दूध का प्रकार',
    custom_price: 'कस्टम मूल्य (वैकल्पिक)',
    default_milk_type: 'डिफ़ॉल्ट दूध का प्रकार',
    default_price: 'डिफ़ॉल्ट मूल्य',
    edit_client: 'ग्राहक संपादित करें',
    update_client: 'ग्राहक अपडेट करें',
    milk_types: 'दूध के प्रकार',
    add_type: 'प्रकार जोड़ें',
    type_name: 'प्रकार का नाम (जैसे गोल्ड)',
    delete_type_confirm: 'क्या आप इस दूध के प्रकार को हटाना चाहते हैं?',
    save_changes: 'परिवर्तन सहेजें',
    login: 'लॉगिन',
    signup: 'साइन अप',
    email_phone: 'ईमेल या फोन',
    password: 'पासवर्ड',
    no_account: "खाता नहीं है?",
    have_account: 'पहले से ही एक खाता है?',
    invalid_credentials: 'अमान्य ईमेल या पासवर्ड।',
    account_created: 'खाता सफलतापूर्वक बनाया गया!',
  }
};

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg font-medium',
    xl: 'px-8 py-4 text-xl font-bold'
  };

  return (
    <button 
      className={cn(
        'rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white rounded-2xl shadow-sm border border-gray-100 p-4', className)}>
    {children}
  </div>
);

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>}
    <input 
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[] }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-medium text-gray-700 ml-1">{label}</label>}
    <select 
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 appearance-none"
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'delivery' | 'inventory' | 'consumers' | 'summary' | 'settings'>('delivery');
  
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));

  const lang = settings?.language || 'en';
  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    const section = TRANSLATIONS[lang as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
    return (section as any)[key] || (TRANSLATIONS.en as any)[key] || key;
  };

  // Auth Listener
  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const qConsumers = query(collection(db, 'consumers'), where('uid', '==', user.uid));
    const unsubConsumers = onSnapshot(qConsumers, (snapshot) => {
      setConsumers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Consumer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'consumers'));

    const qDeliveries = query(collection(db, 'deliveries'), where('uid', '==', user.uid));
    const unsubDeliveries = onSnapshot(qDeliveries, (snapshot) => {
      setDeliveries(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Delivery)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'deliveries'));

    const qInventory = query(collection(db, 'inventory'), where('uid', '==', user.uid));
    const unsubInventory = onSnapshot(qInventory, (snapshot) => {
      setInventory(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Inventory)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));

    const unsubSettings = onSnapshot(doc(db, 'settings', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings({
          pricePerLitre: data.pricePerLitre ?? 60,
          language: data.language || 'en',
          milkTypes: data.milkTypes || DEFAULT_MILK_TYPES,
          uid: user.uid
        } as Settings);
      } else {
        // Initialize settings if not exists
        const initialSettings = { 
          pricePerLitre: 60, 
          language: 'en',
          milkTypes: DEFAULT_MILK_TYPES,
          uid: user.uid 
        };
        setDoc(doc(db, 'settings', user.uid), initialSettings);
        setSettings(initialSettings as Settings);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings'));

    return () => {
      unsubConsumers();
      unsubDeliveries();
      unsubInventory();
      unsubSettings();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Milk className="w-16 h-16 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <AuthView t={t} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Milk className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-black text-xl tracking-tight text-gray-900">{t('app_name')}</h1>
        </div>
        <button 
          onClick={logout}
          className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'delivery' && (
            <DeliveryView 
              consumers={consumers} 
              deliveries={deliveries} 
              inventory={inventory}
              selectedDate={selectedDate} 
              setSelectedDate={setSelectedDate}
              pricePerLitre={settings?.pricePerLitre || 60}
              milkTypes={settings?.milkTypes || DEFAULT_MILK_TYPES}
              uid={user.uid}
              t={t}
            />
          )}
          {activeTab === 'inventory' && (
            <InventoryView 
              inventory={inventory} 
              uid={user.uid}
              t={t}
            />
          )}
          {activeTab === 'consumers' && (
            <ConsumerView 
              consumers={consumers} 
              milkTypes={settings?.milkTypes || DEFAULT_MILK_TYPES}
              uid={user.uid}
              t={t}
            />
          )}
          {activeTab === 'summary' && (
            <SummaryView 
              deliveries={deliveries} 
              inventory={inventory} 
              consumers={consumers}
              t={t}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView 
              settings={settings} 
              uid={user.uid}
              t={t}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-3 flex justify-around items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <NavButton 
          active={activeTab === 'delivery'} 
          onClick={() => setActiveTab('delivery')} 
          icon={<Truck />} 
          label={t('delivery')} 
        />
        <NavButton 
          active={activeTab === 'inventory'} 
          onClick={() => setActiveTab('inventory')} 
          icon={<Milk />} 
          label={t('stock')} 
        />
        <NavButton 
          active={activeTab === 'summary'} 
          onClick={() => setActiveTab('summary')} 
          icon={<TrendingUp />} 
          label={t('stats')} 
        />
        <NavButton 
          active={activeTab === 'consumers'} 
          onClick={() => setActiveTab('consumers')} 
          icon={<Users />} 
          label={t('clients')} 
        />
        <NavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
          icon={<SettingsIcon />} 
          label={t('setup')} 
        />
      </nav>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300',
      active ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'
    )}
  >
    {React.cloneElement(icon as React.ReactElement, { className: cn('w-6 h-6', active && 'fill-current') })}
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

// --- Auth View ---

const AuthView = ({ t }: { t: (key: any) => string }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatEmail = (input: string) => {
    if (input.includes('@')) return input;
    // If it's just numbers, assume it's a phone and make it an email
    const clean = input.replace(/\+/g, '').replace(/\s/g, '');
    if (/^\d+$/.test(clean)) {
      return `${clean}@milkshop.com`;
    }
    return input;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const finalEmail = formatEmail(email);

    try {
      if (isSignUp) {
        await registerWithEmail(finalEmail, password);
      } else {
        await loginWithEmail(finalEmail, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled in the Firebase Console. Please enable it or use Google sign-in.');
      } else {
        setError(err.message || t('invalid_credentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-200/50 max-w-md w-full space-y-8">
        <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <Milk className="w-10 h-10 text-blue-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('app_name')}</h1>
          <p className="text-gray-500">{t('tagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <Input 
            label={t('email_phone')} 
            placeholder="e.g. 9876543210"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input 
            label={t('password')} 
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <Button 
            size="lg" 
            className="w-full py-4 rounded-2xl font-bold" 
            type="submit"
            disabled={loading}
          >
            {loading ? '...' : (isSignUp ? t('signup') : t('login'))}
          </Button>
        </form>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400 font-bold">Or</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full py-4 rounded-2xl font-bold" 
            onClick={signInWithGoogle}
            type="button"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-2" alt="Google" />
            Google
          </Button>

          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 font-bold text-sm hover:underline"
          >
            {isSignUp ? t('have_account') : t('no_account')}
          </button>
        </div>

        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{t('safe_secure')}</p>
      </div>
    </div>
  );
};

// --- Views ---

const DeliveryView = ({ 
  consumers, 
  deliveries, 
  inventory,
  selectedDate, 
  setSelectedDate,
  pricePerLitre,
  milkTypes,
  uid,
  t
}: { 
  consumers: Consumer[]; 
  deliveries: Delivery[]; 
  inventory: Inventory[];
  selectedDate: string; 
  setSelectedDate: (d: string) => void;
  pricePerLitre: number;
  milkTypes: string[];
  uid: string;
  t: (key: any) => string;
}) => {
  const activeConsumers = consumers.filter(c => c.active);
  const todaysDeliveries = deliveries.filter(d => d.date === selectedDate);

  const handleToggleDelivery = async (consumer: Consumer) => {
    const existing = todaysDeliveries.find(d => d.consumerId === consumer.id);
    
    if (existing) {
      const newStatus = existing.status === 'delivered' ? 'skipped' : 'delivered';
      try {
        await updateDoc(doc(db, 'deliveries', existing.id!), { status: newStatus });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'deliveries');
      }
    } else {
      try {
        await addDoc(collection(db, 'deliveries'), {
          consumerId: consumer.id,
          date: selectedDate,
          quantity: consumer.defaultQuantity,
          status: 'delivered',
          milkType: consumer.defaultMilkType || 'Full Cream',
          pricePerUnit: consumer.defaultPrice || pricePerLitre,
          uid
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'deliveries');
      }
    }
  };

  const handleUpdateQuantity = async (deliveryId: string, newQty: number) => {
    if (newQty < 0) return;
    try {
      await updateDoc(doc(db, 'deliveries', deliveryId), { quantity: newQty });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'deliveries');
    }
  };

  const handleUpdateMilkType = async (deliveryId: string, newType: string) => {
    try {
      await updateDoc(doc(db, 'deliveries', deliveryId), { milkType: newType });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'deliveries');
    }
  };

  const stats = useMemo(() => {
    const delivered = todaysDeliveries.filter(d => d.status === 'delivered');
    const totalQty = delivered.reduce((sum, d) => sum + d.quantity, 0);
    const totalAmount = delivered.reduce((sum, d) => sum + (d.quantity * d.pricePerUnit), 0);
    return { count: delivered.length, totalQty, totalAmount };
  }, [todaysDeliveries]);

  const stockLeft = useMemo(() => {
    const totalBought = inventory.filter(i => i.type === 'buy').reduce((sum, i) => sum + i.quantity, 0);
    const totalSoldExtra = inventory.filter(i => i.type === 'sell').reduce((sum, i) => sum + i.quantity, 0);
    const totalDelivered = deliveries.filter(d => d.status === 'delivered').reduce((sum, d) => sum + d.quantity, 0);
    return totalBought - totalSoldExtra - totalDelivered;
  }, [inventory, deliveries]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Date Selector */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">
            {isSameDay(parseISO(selectedDate), startOfToday()) ? t('today') : format(parseISO(selectedDate), 'EEEE')}
          </span>
          <span className="text-lg font-black">{format(parseISO(selectedDate), 'dd MMM yyyy')}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}>
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-blue-600 text-white border-none p-3">
          <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">{t('total_milk')}</p>
          <p className="text-xl font-black">{stats.totalQty.toFixed(1)}L</p>
        </Card>
        <Card className="bg-green-600 text-white border-none p-3">
          <p className="text-green-100 text-[10px] font-bold uppercase tracking-wider">{t('total_cash')}</p>
          <p className="text-xl font-black">₹{stats.totalAmount.toFixed(0)}</p>
        </Card>
        <Card className="bg-amber-500 text-white border-none p-3">
          <p className="text-amber-100 text-[10px] font-bold uppercase tracking-wider">{t('stock_left')}</p>
          <p className="text-xl font-black">{stockLeft.toFixed(1)}L</p>
        </Card>
      </div>

      {/* Consumer List */}
      <div className="space-y-3">
        <h2 className="text-lg font-black flex items-center gap-2 px-1">
          <Users className="w-5 h-5 text-blue-600" />
          {t('delivery_list')} ({stats.count}/{activeConsumers.length})
        </h2>
        
        {activeConsumers.length === 0 ? (
          <Card className="text-center py-12 space-y-4">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500">{t('no_clients')}</p>
          </Card>
        ) : (
          activeConsumers.map(consumer => {
            const delivery = todaysDeliveries.find(d => d.consumerId === consumer.id);
            const isDelivered = delivery?.status === 'delivered';
            const isSkipped = delivery?.status === 'skipped';

            return (
              <div key={consumer.id}>
                <Card className={cn(
                  'transition-all duration-300',
                  isDelivered ? 'bg-blue-50/50 border-blue-100' : isSkipped ? 'opacity-50 grayscale' : ''
                )}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{consumer.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{consumer.address || t('doorstep')}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isDelivered && (
                          <div className="flex items-center bg-white rounded-xl border border-blue-100 overflow-hidden">
                            <button 
                              onClick={() => handleUpdateQuantity(delivery.id!, delivery.quantity - 0.5)}
                              className="p-2 hover:bg-gray-50 text-blue-600"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-2 font-black text-blue-600 min-w-[3rem] text-center">
                              {delivery.quantity}L
                            </span>
                            <button 
                              onClick={() => handleUpdateQuantity(delivery.id!, delivery.quantity + 0.5)}
                              className="p-2 hover:bg-gray-50 text-blue-600"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <button 
                          onClick={() => handleToggleDelivery(consumer)}
                          className={cn(
                            'w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90',
                            isDelivered ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 
                            isSkipped ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-400'
                          )}
                        >
                          {isDelivered ? <Check className="w-7 h-7" /> : <Plus className="w-7 h-7" />}
                        </button>
                      </div>
                    </div>

                    {isDelivered && (
                      <div className="flex items-center gap-2 pt-2 border-t border-blue-100/50">
                        <div className="flex-1">
                          <select 
                            value={delivery.milkType}
                            onChange={(e) => handleUpdateMilkType(delivery.id!, e.target.value)}
                            className="w-full bg-white border border-blue-100 rounded-lg px-2 py-1 text-xs font-bold text-blue-700 focus:outline-none"
                          >
                            {milkTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div className="bg-blue-100 px-3 py-1 rounded-lg">
                          <span className="text-xs font-black text-blue-700">₹{delivery.pricePerUnit * delivery.quantity}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

const InventoryView = ({ inventory, uid, t }: { inventory: Inventory[]; uid: string; t: (key: any) => string }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState<Partial<Inventory>>({
    type: 'buy',
    quantity: 0,
    totalAmount: 0,
    source: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleAdd = async () => {
    if (!formData.quantity || !formData.totalAmount) return;
    try {
      await addDoc(collection(db, 'inventory'), {
        ...formData,
        uid
      });
      setShowAdd(false);
      setFormData({ type: 'buy', quantity: 0, totalAmount: 0, source: '', date: format(new Date(), 'yyyy-MM-dd') });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inventory');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'inventory');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black">{t('stock_records')}</h2>
        <Button onClick={() => setShowAdd(!showAdd)} variant={showAdd ? 'secondary' : 'primary'}>
          {showAdd ? <X /> : <Plus />} {showAdd ? t('cancel') : t('add_record')}
        </Button>
      </div>

      {showAdd && (
        <Card className="space-y-4 border-2 border-blue-500">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant={formData.type === 'buy' ? 'primary' : 'outline'} 
              onClick={() => setFormData({ ...formData, type: 'buy' })}
              className="rounded-xl"
            >
              <TrendingDown className="w-4 h-4" /> {t('bought')}
            </Button>
            <Button 
              variant={formData.type === 'sell' ? 'primary' : 'outline'} 
              onClick={() => setFormData({ ...formData, type: 'sell' })}
              className="rounded-xl"
            >
              <TrendingUp className="w-4 h-4" /> {t('sold_extra')}
            </Button>
          </div>
          <Input 
            label={t('quantity_litres')} 
            type="number" 
            step="0.5"
            value={formData.quantity || ''} 
            onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })} 
          />
          <Input 
            label={t('total_money')} 
            type="number" 
            value={formData.totalAmount || ''} 
            onChange={e => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) })} 
          />
          <Input 
            label={t('source_notes')} 
            placeholder="e.g. Dairy Farm, Shop Sale"
            value={formData.source || ''} 
            onChange={e => setFormData({ ...formData, source: e.target.value })} 
          />
          <Button className="w-full py-4 text-lg" onClick={handleAdd}>{t('save_record')}</Button>
        </Card>
      )}

      <div className="space-y-3">
        {inventory.sort((a, b) => b.date.localeCompare(a.date)).map(item => (
          <div key={item.id}>
            <Card className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-3 rounded-xl',
                  item.type === 'buy' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                )}>
                  {item.type === 'buy' ? <TrendingDown /> : <TrendingUp />}
                </div>
                <div>
                  <p className="font-bold text-lg">{item.quantity}L {item.type === 'buy' ? t('purchased') : t('sold')}</p>
                  <p className="text-sm text-gray-500">{format(parseISO(item.date), 'dd MMM')} • {item.source || t('general')}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className={cn('font-black text-lg', item.type === 'buy' ? 'text-red-600' : 'text-green-600')}>
                    {item.type === 'buy' ? '-' : '+'}₹{item.totalAmount}
                  </p>
                </div>
                <button onClick={() => handleDelete(item.id!)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const ConsumerView = ({ consumers, milkTypes, uid, t }: { consumers: Consumer[]; milkTypes: string[]; uid: string; t: (key: any) => string }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Consumer>>({
    name: '',
    address: '',
    defaultQuantity: 1,
    defaultMilkType: milkTypes[0] || 'Full Cream',
    active: true
  });

  const handleAdd = async () => {
    if (!formData.name || !formData.defaultQuantity) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'consumers', editingId), {
          ...formData,
          uid
        });
      } else {
        await addDoc(collection(db, 'consumers'), {
          ...formData,
          uid
        });
      }
      setShowAdd(false);
      setEditingId(null);
      setFormData({ name: '', address: '', defaultQuantity: 1, defaultMilkType: milkTypes[0] || 'Full Cream', active: true });
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'consumers');
    }
  };

  const handleEdit = (consumer: Consumer) => {
    setEditingId(consumer.id!);
    setFormData({
      name: consumer.name,
      address: consumer.address,
      defaultQuantity: consumer.defaultQuantity,
      defaultMilkType: consumer.defaultMilkType,
      defaultPrice: consumer.defaultPrice,
      active: consumer.active
    });
    setShowAdd(true);
  };

  const handleCancel = () => {
    setShowAdd(false);
    setEditingId(null);
    setFormData({ name: '', address: '', defaultQuantity: 1, defaultMilkType: milkTypes[0] || 'Full Cream', active: true });
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'consumers', id), { active: !current });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'consumers');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete_client_confirm'))) return;
    try {
      await deleteDoc(doc(db, 'consumers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'consumers');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black">{t('clients')}</h2>
        <Button onClick={() => showAdd ? handleCancel() : setShowAdd(true)} variant={showAdd ? 'secondary' : 'primary'}>
          {showAdd ? <X /> : <UserPlus />} {showAdd ? t('cancel') : t('new_client')}
        </Button>
      </div>

      {showAdd && (
        <Card className="space-y-4 border-2 border-blue-500">
          <h3 className="font-bold text-lg">{editingId ? t('edit_client') : t('new_client')}</h3>
          <Input 
            label={t('client_name')} 
            placeholder="e.g. Rahul Sharma"
            value={formData.name || ''} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
          />
          <Input 
            label={t('address_house')} 
            placeholder="e.g. Flat 402, Block B"
            value={formData.address || ''} 
            onChange={e => setFormData({ ...formData, address: e.target.value })} 
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label={t('daily_quantity')} 
              type="number" 
              step="0.5"
              value={formData.defaultQuantity || ''} 
              onChange={e => setFormData({ ...formData, defaultQuantity: parseFloat(e.target.value) })} 
            />
            <Input 
              label={t('custom_price')} 
              type="number" 
              placeholder="Optional"
              value={formData.defaultPrice || ''} 
              onChange={e => setFormData({ ...formData, defaultPrice: parseFloat(e.target.value) })} 
            />
          </div>
          <Select 
            label={t('default_milk_type')}
            value={formData.defaultMilkType || milkTypes[0] || 'Full Cream'}
            onChange={e => setFormData({ ...formData, defaultMilkType: e.target.value })}
            options={milkTypes.map(type => ({ value: type, label: type }))}
          />
          <Button className="w-full py-4 text-lg" onClick={handleAdd}>
            {editingId ? t('update_client') : t('add_to_list')}
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        {consumers.map(consumer => (
          <div key={consumer.id}>
            <Card className={cn('flex items-center justify-between', !consumer.active && 'opacity-60 bg-gray-50')}>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{consumer.name}</h3>
                <p className="text-sm text-gray-500 truncate">{consumer.address || t('no_address')}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {consumer.defaultQuantity}L {t('daily')}
                  </span>
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {consumer.defaultMilkType || 'Full Cream'}
                  </span>
                  {consumer.defaultPrice && (
                    <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      ₹{consumer.defaultPrice}/L
                    </span>
                  )}
                  {!consumer.active && (
                    <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {t('paused')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleEdit(consumer)}
                  className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleToggleActive(consumer.id!, consumer.active)}
                  className={cn(
                    'p-2 rounded-xl transition-colors',
                    consumer.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                  )}
                >
                  {consumer.active ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
                <button onClick={() => handleDelete(consumer.id!)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const SummaryView = ({ deliveries, inventory, consumers, t }: { deliveries: Delivery[]; inventory: Inventory[]; consumers: Consumer[]; t: (key: any) => string }) => {
  const stats = useMemo(() => {
    const delivered = deliveries.filter(d => d.status === 'delivered');
    const deliveryIncome = delivered.reduce((sum, d) => sum + (d.quantity * d.pricePerUnit), 0);
    const extraSales = inventory.filter(i => i.type === 'sell').reduce((sum, i) => sum + i.totalAmount, 0);
    const purchases = inventory.filter(i => i.type === 'buy').reduce((sum, i) => sum + i.totalAmount, 0);
    
    const totalIncome = deliveryIncome + extraSales;
    const profit = totalIncome - purchases;

    return { deliveryIncome, extraSales, totalIncome, purchases, profit };
  }, [deliveries, inventory]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-black px-1">{t('business_summary')}</h2>

      <div className="grid grid-cols-1 gap-4">
        <Card className="bg-blue-600 text-white p-8 text-center border-none shadow-xl shadow-blue-200">
          <p className="text-blue-100 font-bold uppercase tracking-widest text-sm mb-2">{t('total_profit')}</p>
          <p className="text-5xl font-black">₹{stats.profit.toFixed(0)}</p>
          <div className="mt-6 pt-6 border-t border-blue-500/50 grid grid-cols-2 gap-4">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase">{t('total_in')}</p>
              <p className="text-xl font-bold">₹{stats.totalIncome.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase">{t('total_out')}</p>
              <p className="text-xl font-bold">₹{stats.purchases.toFixed(0)}</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Truck className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">{t('deliveries')}</span>
            </div>
            <p className="text-2xl font-black">₹{stats.deliveryIncome.toFixed(0)}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">{t('extra_sales')}</span>
            </div>
            <p className="text-2xl font-black">₹{stats.extraSales.toFixed(0)}</p>
          </Card>
        </div>
      </div>

      <Card className="space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          {t('recent_activity')}
        </h3>
        <div className="space-y-3">
          {deliveries.slice(0, 5).sort((a, b) => b.date.localeCompare(a.date)).map(d => {
            const consumer = consumers.find(c => c.id === d.consumerId);
            return (
              <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-bold">{consumer?.name || t('unknown')}</p>
                  <p className="text-gray-500 text-xs">{format(parseISO(d.date), 'dd MMM')} • {d.status === 'delivered' ? t('delivery') : t('skipped')}</p>
                </div>
                <p className={cn('font-bold', d.status === 'delivered' ? 'text-blue-600' : 'text-gray-400')}>
                  {d.status === 'delivered' ? `+${d.quantity}L` : t('skipped')}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
};

const SettingsView = ({ settings, uid, t }: { settings: Settings | null; uid: string; t: (key: any) => string }) => {
  const [price, setPrice] = useState(settings?.pricePerLitre || 60);
  const [language, setLanguage] = useState<'en' | 'hi'>(settings?.language || 'en');
  const [milkTypes, setMilkTypes] = useState<string[]>(settings?.milkTypes || DEFAULT_MILK_TYPES);
  const [newType, setNewType] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !saving) {
      setPrice(settings.pricePerLitre);
      setLanguage(settings.language || 'en');
      if (settings.milkTypes) setMilkTypes(settings.milkTypes);
    }
  }, [settings, saving]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', uid), { 
        pricePerLitre: price, 
        language, 
        milkTypes,
        uid 
      });
      alert(t('settings_saved'));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddType = () => {
    if (!newType.trim()) return;
    if (milkTypes.includes(newType.trim())) return;
    setMilkTypes([...milkTypes, newType.trim()]);
    setNewType('');
  };

  const handleRemoveType = (type: string) => {
    if (!confirm(t('delete_type_confirm'))) return;
    setMilkTypes(milkTypes.filter(t => t !== type));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-black px-1">{t('setup')}</h2>
      
      <Card className="space-y-6">
        <div className="bg-blue-50 p-6 rounded-2xl text-center space-y-2">
          <Milk className="w-12 h-12 text-blue-600 mx-auto" />
          <h3 className="font-black text-xl">{t('milk_price')}</h3>
          <p className="text-sm text-gray-500">{t('set_selling_price')}</p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button 
            onClick={() => setPrice(p => Math.max(0, p - 1))}
            className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-bold active:scale-90 transition-all"
          >
            -
          </button>
          <div className="text-center">
            <span className="text-5xl font-black text-blue-600">₹{price}</span>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{t('per_litre')}</p>
          </div>
          <button 
            onClick={() => setPrice(p => p + 1)}
            className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-bold active:scale-90 transition-all"
          >
            +
          </button>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold">{t('language')}</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">{t('select_language')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant={language === 'en' ? 'primary' : 'outline'} 
              onClick={() => setLanguage('en')}
              className="rounded-xl"
            >
              English
            </Button>
            <Button 
              variant={language === 'hi' ? 'primary' : 'outline'} 
              onClick={() => setLanguage('hi')}
              className="rounded-xl font-hindi"
            >
              हिंदी
            </Button>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Milk className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold">{t('milk_types')}</h3>
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder={t('type_name')}
              value={newType}
              onChange={e => setNewType(e.target.value)}
            />
            <Button onClick={handleAddType} variant="outline" className="px-3">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {milkTypes.map(type => (
              <span key={type} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2">
                {type}
                <button onClick={() => handleRemoveType(type)} className="text-blue-300 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <Button className="w-full py-5 text-xl rounded-2xl" onClick={handleSave} disabled={saving}>
          {saving ? '...' : t('save_settings')}
        </Button>
      </Card>

      <div className="p-4 text-center space-y-2">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('app_version')}</p>
        <p className="text-[10px] text-gray-300">{t('designed_for')}</p>
      </div>
    </motion.div>
  );
};
