import React, { useState } from 'react';
import { Sparkles, User, Check, AlertCircle } from 'lucide-react';
import { updateUserNickname } from '../api';
import WebApp from '@twa-dev/sdk';

interface OnboardingProps {
    tgId: number;
    onComplete: (nickname: string) => void;
}

export default function Onboarding({ tgId, onComplete }: OnboardingProps) {
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nickname.trim();
        if (trimmed.length < 3) {
            setError('Никнейм должен быть не короче 3 символов');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await updateUserNickname(tgId, trimmed);
            WebApp.HapticFeedback.notificationOccurred('success');
            onComplete(res.nickname);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Этот ник уже занят или произошла ошибка');
            WebApp.HapticFeedback.notificationOccurred('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in p-6">
            {/* Background Orbs */}
            <div className="absolute top-1/4 -left-10 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-float" />
            <div className="absolute bottom-1/4 -right-10 w-64 h-64 bg-secondary/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '-2s' }} />

            <div className="relative w-full max-w-md glass-thick rounded-3xl p-8 border border-white/10 shadow-2xl">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black gradient-text mb-2">Добро пожаловать!</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Придумайте свой уникальный псевдоним автора, под которым вас будут знать в Lust Choices.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => {
                                setNickname(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="Ваш никнейм..."
                            className={`input-base pl-12 ${error ? 'border-destructive ring-destructive/20' : ''}`}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-xs font-bold animate-fade-in px-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || nickname.trim().length < 3}
                        className="btn-primary group"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Начать приключение
                                <Check className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold opacity-50">
                    Lust Choices • Premium Edition
                </p>
            </div>
        </div>
    );
}
