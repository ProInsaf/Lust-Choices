import React, { useState, useEffect } from 'react';
import { Gift, CheckCircle2, Clock, Star } from 'lucide-react';
import WebApp from '@twa-dev/sdk';

export default function DailyBonus() {
    const [claimed, setClaimed] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const lastClaim = localStorage.getItem('last_claim_date');
        if (lastClaim) {
            const lastDate = new Date(lastClaim);
            const now = new Date();
            const diff = now.getTime() - lastDate.getTime();
            const hours24 = 24 * 60 * 60 * 1000;

            if (diff < hours24) {
                setClaimed(true);
                updateTimer(lastDate);
            }
        }
    }, []);

    const updateTimer = (lastDate: Date) => {
        const timer = setInterval(() => {
            const now = new Date();
            const nextClaim = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
            const diff = nextClaim.getTime() - now.getTime();

            if (diff <= 0) {
                setClaimed(false);
                clearInterval(timer);
            } else {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${h}ч ${m}м ${s}с`);
            }
        }, 1000);
        return () => clearInterval(timer);
    };

    const handleClaim = () => {
        WebApp.HapticFeedback.notificationOccurred('success');
        localStorage.setItem('last_claim_date', new Date().toISOString());
        setClaimed(true);
        WebApp.showPopup({ 
            title: 'Поздравляем!', 
            message: 'Вы получили ежедневный бонус: +1 Star! Заходите завтра за новой наградой.' 
        });
        updateTimer(new Date());
    };

    return (
        <div className="glass rounded-3xl p-5 mb-8 border border-white/5 relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-2xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-primary/20 transition-all" />
            
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${claimed ? 'bg-muted opacity-50' : 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-yellow-500/20 animate-bounce-slow'}`}>
                        {claimed ? <CheckCircle2 className="w-6 h-6 text-muted-foreground" /> : <Gift className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest leading-none mb-1">Ежедневный бонус</h3>
                        <p className="text-[10px] text-muted-foreground font-bold">
                            {claimed ? `След. бонус через: ${timeLeft}` : 'Заберите свою награду сегодня!'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleClaim}
                    disabled={claimed}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${claimed ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed' : 'btn-primary'}`}
                >
                    {claimed ? 'Получено' : 'Забрать'}
                </button>
            </div>

            {!claimed && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">+1 Star для новых сюжетов</span>
                </div>
            )}
        </div>
    );
}
