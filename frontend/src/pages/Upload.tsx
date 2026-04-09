import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, FileJson, ImageIcon, X, Check } from 'lucide-react';
import { uploadStory } from '../api';
import { useAppStore } from '../store';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const HARDNESS_OPTIONS = [
  { value: 1, label: '🌸 Soft', desc: 'Романтика, мягкие сцены' },
  { value: 2, label: '🌶️ Medium', desc: 'Умеренно откровенный контент' },
  { value: 3, label: '🔥 Hard', desc: 'Откровенные взрослые сцены' },
  { value: 4, label: '💀 Extreme', desc: 'Жёсткий взрослый контент' },
];

const SUGGEST_TAGS = ['Романтика','BDSM','Аниме','Фэнтези','Офис','Доминирование','Покорность','Гарем','Яой','Юри'];

export default function Upload() {
  const { user } = useAppStore();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [hardness, setHardness] = useState(1);
  const [priceStars, setPriceStars] = useState(0);
  const [isFree, setIsFree] = useState(true);

  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewPreview, setPreviewPreview] = useState<string | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const previewRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const handlePreviewSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewPreview(URL.createObjectURL(file));
  };

  const handleJsonSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonFile(file);
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async () => {
    if (!title || !description || !previewFile || !jsonFile) {
      setError('Заполни все обязательные поля');
      return;
    }
    if (!user) {
      setError('Нет данных пользователя');
      return;
    }

    setSubmitting(true);
    setError('');

    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('tags', tags.join(','));
    fd.append('hardness_level', String(hardness));
    fd.append('price_stars', isFree ? '0' : String(priceStars));
    fd.append('author_tg_id', String(user.tg_id));
    fd.append('author_username', user.username || '');
    fd.append('author_first_name', user.first_name || '');
    fd.append('preview_file', previewFile);
    fd.append('json_file', jsonFile);

    try {
      await uploadStory(fd);
      setSuccess(true);
      WebApp.HapticFeedback.notificationOccurred('success');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Ошибка загрузки. Попробуй снова.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-900/40 border-2 border-green-500 flex items-center justify-center text-4xl mb-6">
          ✅
        </div>
        <h2 className="text-2xl font-black mb-2">Отправлено!</h2>
        <p className="text-muted-foreground text-sm mb-8">
          Твой сюжет отправлен на модерацию. Обычно это занимает до 24 часов.
        </p>
        <button onClick={() => navigate('/profile')} className="btn-primary max-w-xs">
          Мои сюжеты
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black">Загрузить сюжет</h1>
        <p className="text-muted-foreground text-sm mt-1">Поделись своей историей с сообществом</p>
      </div>

      <div className="px-4 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Название <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-base"
            placeholder="Моя невероятная история..."
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{title.length}/100</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Описание <span className="text-primary">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-base h-28 resize-none"
            placeholder="О чём этот сюжет? Что ждёт читателя..."
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/500</p>
        </div>

        {/* Files */}
        <div className="grid grid-cols-2 gap-3">
          {/* Preview image */}
          <div
            onClick={() => previewRef.current?.click()}
            className="relative border-2 border-dashed border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            style={{ minHeight: 120 }}
          >
            {previewPreview ? (
              <>
                <img src={previewPreview} alt="preview" className="w-full h-full object-cover absolute inset-0" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">Изменить</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs font-medium text-muted-foreground">Превью</span>
                <span className="text-[10px] text-muted-foreground">JPG / PNG</span>
              </div>
            )}
            <input ref={previewRef} type="file" accept="image/*" className="hidden" onChange={handlePreviewSelect} />
          </div>

          {/* JSON file */}
          <div
            onClick={() => jsonRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl cursor-pointer hover:border-primary/50 transition-colors flex flex-col items-center justify-center p-4 text-center ${
              jsonFile ? 'border-green-500/50 bg-green-900/20' : 'border-border'
            }`}
          >
            {jsonFile ? (
              <>
                <Check className="w-8 h-8 text-green-400 mb-2" />
                <span className="text-xs font-medium text-green-400 break-all">{jsonFile.name.slice(0, 20)}</span>
              </>
            ) : (
              <>
                <FileJson className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs font-medium text-muted-foreground">Файл сюжета</span>
                <span className="text-[10px] text-muted-foreground">.json</span>
              </>
            )}
            <input ref={jsonRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJsonSelect} />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Теги</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => removeTag(tag)}
                className="tag-badge flex items-center gap-1"
              >
                {tag} <X className="w-3 h-3" />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag(tagInput)}
              className="input-base flex-1 py-2"
              placeholder="+ добавить тег"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SUGGEST_TAGS.filter((t) => !tags.includes(t)).slice(0, 6).map((t) => (
              <button
                key={t}
                onClick={() => addTag(t)}
                className="text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-0.5 hover:border-primary/50 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Hardness level */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Уровень жёсткости</label>
          <div className="grid grid-cols-2 gap-2">
            {HARDNESS_OPTIONS.map((h) => (
              <button
                key={h.value}
                onClick={() => setHardness(h.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  hardness === h.value
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                <div className="font-semibold text-sm">{h.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{h.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Монетизация</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setIsFree(true)}
              className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                isFree ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
              }`}
            >
              Бесплатно
            </button>
            <button
              onClick={() => setIsFree(false)}
              className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                !isFree ? 'border-yellow-400/60 bg-yellow-900/20 text-yellow-300' : 'border-border bg-card text-muted-foreground'
              }`}
            >
              ⭐ Платно
            </button>
          </div>

          {!isFree && (
            <div className="animate-slide-up">
              <label className="block text-xs text-muted-foreground mb-1">Цена в Telegram Stars</label>
              <input
                type="number"
                min={10}
                max={10000}
                value={priceStars}
                onChange={(e) => setPriceStars(Number(e.target.value))}
                className="input-base"
                placeholder="Например: 50"
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-xl p-3">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !title || !description || !previewFile || !jsonFile}
          className="btn-primary"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
              Загружаем...
            </span>
          ) : (
            <>
              <UploadIcon className="w-4 h-4" />
              Отправить на модерацию
            </>
          )}
        </button>
      </div>
    </div>
  );
}
