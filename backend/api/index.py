import sys
import os

# Добавляем родительскую директорию (backend) в пути поиска Python, 
# чтобы импорты из app работали корректно в бессерверной среде Vercel
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
