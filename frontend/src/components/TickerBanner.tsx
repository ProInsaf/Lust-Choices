import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

const MOCK_EVENTS = [
    "Пользователь Alex только что завершил 'Тайная встреча' 🔥",
    "Новый сюжет 'Полуночный драйв' уже в топе! 🚀",
    "Kira получила секретную концовку в 'Искушении' ✨",
    "У нас уже более 10,000 прочтений сегодня! 📈",
    "Автор Max загрузил новый эпизод 'Летний бриз' 🌊",
];

export default function TickerBanner() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % MOCK_EVENTS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mx-4 mb-4 glass rounded-2xl overflow-hidden h-9 flex items-center border border-white/5 relative group">
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-primary/20 to-transparent flex items-center justify-center z-10">
                <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            
            <div className="flex-1 overflow-hidden relative h-full">
                <div 
                    className="absolute inset-0 flex items-center px-12 transition-all duration-700 ease-in-out"
                    key={index}
                    style={{ animation: 'fade-in-right 0.7s ease-out' }}
                >
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-80">
                        {MOCK_EVENTS[index]}
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes fade-in-right {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
