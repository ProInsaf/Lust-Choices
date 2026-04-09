# Lust Choices — 18+ Interactive Story Marketplace

**Lust Choices** — это премиальное Telegram Mini App приложение, представляющее собой маркетплейс для интерактивных визуальных новелл и секс-ботов.

## 🚀 Основные возможности

-   **Галерея сюжетов:** Красивая сетка карточек с фильтрацией (Новые, Популярные, Топ лайков, Бесплатные, Платные).
-   **Детальный просмотр:** Полная информация о сюжете: описание, количество сцен, уровень жёсткости (Soft/Medium/Hard/Extreme), лайки и автор.
-   **Загрузка контента:** Пользователи могут загружать свои сценарии в формате JSON и обложки через удобную форму.
-   **Монетизация:** Поддержка оплаты через **Telegram Stars**.
-   **Система модерации:** Мощная админ-панель для проверки, одобрения или отклонения (с указанием причины) новых сюжетов.
-   **Интеграция с Telegram:** Полная поддержка Telegram WebApp SDK, включая BackButton, MainButton, управление темами и авторизацию.
-   **Премиальный дизайн:** Тёмная 18+ тематика с акцентами (Red/Purple), эффектами Glassmorphism и плавными анимациями.

## 🛠 Технологический стек

-   **Frontend:** React (TypeScript) + Vite
-   **Styling:** Tailwind CSS + Custom Design System
-   **State Management:** Zustand
-   **Backend:** FastAPI (Python 3.10+)
-   **Database:** PostgreSQL (Supabase)
-   **File Storage:** Supabase Storage (для обложек и JSON-сценариев)
-   **SDK:** @twa-dev/sdk

## 📂 Структура проекта

```
lust-choices/
├── backend/                # FastAPI сервер
│   ├── app/
│   │   ├── api/            # Эндпоинты (stories, admin, users)
│   │   ├── core/           # Конфигурация БД, Storage, Telegram
│   │   ├── models/         # SQLAlchemy модели
│   │   └── schemas/        # Pydantic схемы
│   ├── init_db.py         # Скрипт инициализации БД
│   └── requirements.txt    # Зависимости Python
├── frontend/               # React приложение
│   ├── src/
│   │   ├── components/     # UI компоненты (StoryCard и др.)
│   │   ├── pages/          # Страницы (Gallery, Upload, Profile, Admin)
│   │   ├── store.ts        # Состояние приложения
│   │   └── api.ts          # API клиент (Axios)
│   └── tailwind.config.js  # Конфигурация стилей
├── run_backend.bat         # Скрипт запуска сервера
└── run_frontend.bat        # Скрипт запуска фронтенда
```

## ⚙️ Настройка

### 1. Backend
Отредактируйте `backend/.env`:
-   `DATABASE_URL`: Строка подключения к PostgreSQL.
-   `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: Для работы с облачным хранилищем.
-   `TELEGRAM_BOT_TOKEN`: Токен вашего бота.
-   `ADMIN_USERNAME`: Ваш Telegram username (без @).

### 2. Frontend
Отредактируйте `frontend/.env`:
-   `VITE_API_URL`: URL вашего backend (по умолчанию `http://localhost:8000`).
-   `VITE_BOT_USERNAME`: Username вашего бота.

## 🏃‍♂️ Запуск

1.  Запустите **`run_backend.bat`** — он автоматически создаст venv, установит зависимости и инициализирует базу данных.
2.  Запустите **`run_frontend.bat`** — он установит npm-пакеты и запустит Vite dev-сервер.

## 🛡 Админ-панель
Чтобы получить доступ к админ-панели:
1.  Укажите свой username в `backend/.env` (переменная `ADMIN_USERNAME`).
2.  Приложение автоматически определит вас как администратора, и в профиле появится кнопка доступа к модерации.

---
Разработано с ❤️ командой Antigravity.
