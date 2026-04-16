import React from 'react';
import { Shuffles, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { fetchStories } from '../api';
import WebApp from '@twa-dev/sdk';

export default function Randomizer() {
    const navigate = useNavigate();

    const handleRandom = async () => {
        WebApp.HapticFeedback.impactOccurred('medium');
        try {
            // Fetch popular stories and pick one
            const stories = await fetchStories('popular', '', '', 0);
            if (stories.length > 0) {
                const random = stories[Math.floor(Math.random() * stories.length)];
                navigate(`/story/${random.id}`);
            }
        } catch {
            WebApp.showPopup({ title: 'Ой!', message: 'Не удалось найти случайный сюжет. Попробуйте позже.' });
        }
    };

    return (
        <button
            onClick={handleRandom}
            className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-tr from-primary to-secondary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 z-[40] animate-bounce-slow active:scale-90 transition-all border border-white/20"
        >
            <Sparkles className="w-6 h-6 text-white" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-background">
                <div className="w-1.5 h-1.5 bg-black rounded-full" />
            </div>

            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 4s ease-in-out infinite;
                }
            `}</style>
        </button>
    );
}
