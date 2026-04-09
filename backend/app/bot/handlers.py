import asyncio
import json
import logging
import random
import aiohttp
from typing import Dict, List, Optional
from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, MenuButtonWebApp
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from app.core.database import SessionLocal
from app.models.story import Story, User
import os

router = Router()
logger = logging.getLogger(__name__)

# Caching stories JSONs to avoid repeated network requests
# format: {story_id: {scene_data}}
SCENES_CACHE: Dict[str, Dict] = {}
# Simple progress storage {user_id: {"story_id": str, "current_scene": str}}
user_progress: Dict[int, Dict] = {}

WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-domain.com")


async def get_story_json(story_id: str, json_url: str) -> Optional[Dict]:
    """Fetch story JSON from cache or URL"""
    if story_id in SCENES_CACHE:
        return SCENES_CACHE[story_id]
    
    headers = {"User-Agent": "LustChoicesBot/1.0"}
    try:
        async with aiohttp.ClientSession(headers=headers) as session:
            logger.info(f"Fetching JSON for {story_id} from {json_url}")
            async with session.get(json_url, timeout=10) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    try:
                        data = json.loads(text)
                        # Determine scenes block
                        scenes = data.get("scenes", data)
                        SCENES_CACHE[story_id] = scenes
                        return scenes
                    except Exception as je:
                        logger.error(f"JSON parse error for {story_id}: {je}")
                else:
                    logger.error(f"Fetch failed for {story_id}. Status: {resp.status}, URL: {json_url}")
    except Exception as e:
        logger.error(f"Network error fetching JSON for {story_id}: {e}")
    return None


def get_scene(scenes: Dict, scene_id: str) -> Optional[Dict]:
    # Depending on how the json is structured (list vs dict)
    if isinstance(scenes, dict):
        return scenes.get(scene_id)
    elif isinstance(scenes, list):
        for s in scenes:
            if s.get("id") == scene_id:
                return s
    return None


def build_keyboard(buttons: List[Dict], story_id: str) -> InlineKeyboardMarkup:
    keyboard = []
    for btn in buttons:
        next_id = btn.get("next") or btn.get("next_scene")
        if next_id:
            keyboard.append([
                InlineKeyboardButton(
                    text=btn.get("text", "Продолжить"),
                    callback_data=f"go_{story_id}_{next_id}"
                )
            ])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)


async def set_main_menu_button(bot: Bot):
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Lust Choices 🔥",
                web_app=WebAppInfo(url=WEBAPP_URL)
            )
        )
    except Exception as e:
        logger.error(f"Menu button error: {e}")


async def play_scene_sequence(user_id: int, story_id: str, start_scene_id: str, bot: Bot,
                              current_message: Optional[Message] = None):
    # Fetch from DB
    db = SessionLocal()
    try:
        story = db.query(Story).filter(Story.id == story_id).first()
        if not story:
            if current_message:
                await current_message.answer("❌ Сюжет не найден.")
            return
        json_url = story.json_url
    finally:
        db.close()

    scenes = await get_story_json(story_id, json_url)
    if not scenes:
        if current_message:
            await current_message.answer("❌ Ошибка загрузки данных сюжета.")
        return

    current_id = start_scene_id

    if current_message:
        try:
            await current_message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass

    while current_id:
        scene = get_scene(scenes, current_id)
        if not scene:
            break

        user_progress[user_id] = {"story_id": story_id, "current_scene": current_id}
        
        text = scene.get("text") or "..."
        photo_url = scene.get("photo_url") or scene.get("media_url")
        is_delay = scene.get("type") == "delay"
        buttons = [] if is_delay else scene.get("buttons", [])

        if current_message is not None or current_id != start_scene_id:
            delay_sec = random.randint(3, 7)
            for i in range(delay_sec):
                if i % 4 == 0:
                    try:
                        action = "upload_photo" if photo_url else "typing"
                        await bot.send_chat_action(chat_id=user_id, action=action)
                    except Exception:
                        pass
                await asyncio.sleep(1)

        try:
            markup = build_keyboard(buttons, story_id)
            if photo_url:
                try:
                    await bot.send_photo(
                        chat_id=user_id,
                        photo=photo_url,
                        caption=text,
                        reply_markup=markup
                    )
                except Exception:
                    await bot.send_message(chat_id=user_id, text=text, reply_markup=markup)
            else:
                await bot.send_message(chat_id=user_id, text=text, reply_markup=markup)
        except Exception as e:
            logger.error(f"Error sending scene: {e}")
            break

        if is_delay:
            delay_sec = float(scene.get("delay", 2.0))
            await bot.send_chat_action(chat_id=user_id, action="typing")
            await asyncio.sleep(delay_sec)
            nav_buttons = scene.get("buttons", [])
            current_id = nav_buttons[0].get("next_scene") or nav_buttons[0].get("next") if nav_buttons else None
        else:
            break


@router.message(Command("start"))
async def cmd_start(message: Message, bot: Bot):
    user_id = message.from_user.id
    username = message.from_user.username
    first_name = message.from_user.first_name

    # Create/Update user in DB
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.tg_id == user_id).first()
        if not user:
            user = User(tg_id=user_id, username=username, first_name=first_name)
            db.add(user)
        else:
            user.username = username
            user.first_name = first_name
        db.commit()
    finally:
        db.close()

    args = message.text.split(maxsplit=1)[1] if len(message.text.split()) > 1 else None
    
    if args and args.startswith("play_"):
        story_id = args.replace("play_", "")
        # Play the story
        await message.answer("🎬 **Запускаю сюжет...**")
        # Try to find first scene
        db = SessionLocal()
        try:
            story = db.query(Story).filter(Story.id == story_id).first()
            if not story:
                await message.answer("Сюжет не найден.")
                return
            scenes = await get_story_json(story_id, story.json_url)
            if scenes:
                # Find first scene
                if isinstance(scenes, dict):
                    start_scene = list(scenes.keys())[0]
                elif isinstance(scenes, list):
                    start_scene = scenes[0].get("id")
                await play_scene_sequence(user_id, story_id, start_scene, bot, None)
            else:
                await message.answer("❌ Ошибка загрузки сюжета. Пожалуйста, убедитесь, что файлы доступны.")
        except Exception as e:
            logger.error(f"Play command error: {e}")
            await message.answer(f"❌ Системная ошибка: {str(e)}")
        finally:
            db.close()
    else:
        text = (
            "Привет! Я **Lust Choices** бот.\n\n"
            "Нажми кнопку ниже, чтобы открыть маркетплейс визуальных новелл, или запусти сюжет по ссылке."
        )
        markup = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="Открыть App 🔥", web_app=WebAppInfo(url=WEBAPP_URL))
        ]])
        await message.answer(text, reply_markup=markup)


@router.callback_query(F.data.startswith("go_"))
async def process_scene_transition(callback: CallbackQuery, bot: Bot):
    parts = callback.data.split("_", 2)
    if len(parts) < 3:
        await callback.answer()
        return

    story_id, next_scene_id = parts[1], parts[2]
    user_id = callback.from_user.id

    if next_scene_id == "end" or not next_scene_id:
        try:
            await callback.message.edit_reply_markup(reply_markup=None)
        except Exception:
            pass
        await callback.message.answer("🎬 **Конец истории.**\nОткройте Mini App, чтобы найти новые сюжеты!")
        await callback.answer()
        return

    await play_scene_sequence(user_id, story_id, next_scene_id, bot, callback.message)
    await callback.answer()
