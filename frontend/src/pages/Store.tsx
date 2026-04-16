import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { createPremiumInvoice, verifyPremium } from '../api';
import { Crown, Zap, Shield, Sparkles, Gem, Check, ChevronLeft, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

export default function Store() {
  const { user, setUser } = useAppStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isPremium = user?.subscription_tier === 'premium';

  useEffect(() => {
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(() => navigate(-1));
    return () => WebApp.BackButton.hide();
  }, [navigate]);

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // For Demo/Testing: If user is admin and clicks with a specific pattern or we just provide a debug path
      // In real MVP we use real stars. But let's add a debug popup if needed.
      
      const { invoice_link } = await createPremiumInvoice(user.tg_id);
      
      WebApp.openInvoice(invoice_link, async (status) => {
        if (status === 'paid') {
          try {
            const updatedUser = await verifyPremium(user.tg_id, 'STAR_PAYMENT_PROCESSED');
            WebApp.HapticFeedback.notificationOccurred('success');
            setUser(updatedUser);
            WebApp.showPopup({
              title: '👑 Premium Активирован!',
              message: 'Добро пожаловать в клуб! Все ограничения сняты.'
            });
          } catch (e) {
            WebApp.showPopup({ title: 'Ошибка', message: 'Не удалось подтвердить оплату.' });
          }
        }
        setLoading(false);
      });
    } catch (err) {
      WebApp.showPopup({ title: 'Ошибка', message: 'Не удалось создать счет.' });
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-12 animate-fade-in">
      {/* Header */}
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-background z-0" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        
        <div className="relative z-10 pt-12 px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Lust Choices Shop</span>
            </div>
            <h1 className="text-4xl font-black mb-2 tracking-tighter">МАГАЗИН</h1>
            <p className="text-muted-foreground text-sm max-w-[240px] mx-auto opacity-80">
                Разблокируйте все возможности платформы и поддержите авторов
            </p>
        </div>
      </div>

      <div className="px-6 -mt-12 relative z-20 space-y-6">
        {/* Main Offer */}
        <div className={`relative rounded-3xl p-6 border transition-all overflow-hidden ${
          isPremium 
            ? 'border-yellow-500/40 bg-yellow-500/5 shadow-[0_0_40px_rgba(234,179,8,0.1)]' 
            : 'border-white/10 bg-[#1A1A1A] shadow-2xl'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
          
          <div className="flex items-start justify-between mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                 style={{ background: 'linear-gradient(135deg, #EAB308, #F59E0B)' }}>
                 <Crown className="w-8 h-8 text-black" />
            </div>
            {isPremium ? (
               <div className="px-3 py-1 rounded-full bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest">
                 Активно
               </div>
            ) : (
               <div className="text-right">
                 <p className="text-2xl font-black text-yellow-400">149 ⭐</p>
                 <p className="text-[10px] text-muted-foreground uppercase font-bold">в месяц</p>
               </div>
            )}
          </div>

          <h2 className="text-xl font-black mb-4">PREMIUM ПОДПИСКА</h2>
          
          <div className="grid grid-cols-1 gap-4 mb-8">
            <FeatureItem icon={<Zap className="text-yellow-400" />} title="Безлимит" desc="Создавайте неограниченное кол-во сюжетов" />
            <FeatureItem icon={<CreditCard className="text-green-400" />} title="Комиссия 10%" desc="Зарабатывайте больше на своих историях" />
            <FeatureItem icon={<Check className="text-blue-400" />} title="💎 Бейдж" desc="Особый статус автора в ленте" />
            <FeatureItem icon={<Sparkles className="text-purple-400" />} title="Приоритет" desc="Ваши сюжеты чаще видят пользователи" />
          </div>

          {!isPremium ? (
            <button 
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-yellow-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #EAB308, #F59E0B)' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                "Купить за 149 Звезд"
              )}
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-center text-xs font-bold text-muted-foreground">
              Продление доступно через 30 дней
            </div>
          )}
        </div>

        {/* Other Items Placeholder */}
        <div className="pt-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-2">Скоро в продаже</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-2xl p-4 opacity-40 grayscale pointer-events-none">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                        <Gem className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Донаты</p>
                    <p className="text-[8px] text-muted-foreground">Поддержка авторов напрямую</p>
                </div>
                <div className="glass rounded-2xl p-4 opacity-40 grayscale pointer-events-none">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Бусты</p>
                    <p className="text-[8px] text-muted-foreground">Разовое продвижение сюжета</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest">{title}</p>
        <p className="text-[9px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
