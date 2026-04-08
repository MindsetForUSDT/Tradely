from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random
import sqlite3
import hashlib
from datetime import datetime, timedelta
from contextlib import contextmanager
import json
from typing import Optional, List

app = FastAPI(title="Tradeum Academy", description="Образовательная платформа по трейдингу")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ========== БАЗА ДАННЫХ ==========
@contextmanager
def get_db():
    conn = sqlite3.connect("tradeum_academy.db")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        # Пользователи
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                experience_points INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                total_correct INTEGER DEFAULT 0,
                total_wrong INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                best_streak INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Прогресс по карточкам
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                card_id INTEGER NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                correct BOOLEAN DEFAULT FALSE,
                user_choice TEXT,
                mistake_type TEXT,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, card_id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        # Достижения
        conn.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                achievement_type TEXT NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, achievement_type),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        conn.commit()


init_db()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ========== УЧЕБНЫЕ КАРТОЧКИ ==========
TRADING_CARDS = [
    {
        "id": 1,
        "title": "Пробой уровня сопротивления",
        "difficulty": "easy",
        "category": "technical",
        "description": "BTC/USDT тестирует уровень сопротивления $52,000 в третий раз за неделю. Объемы торгов растут.",
        "news": [
            "📊 Институциональные инвесторы увеличили позиции в BTC на 15%",
            "🏦 Крупный банк объявил о запуске крипто-кастодиального сервиса",
            "📈 Открытый интерес по фьючерсам BTC достиг месячного максимума"
        ],
        "chart_data": {
            "type": "resistance_breakout",
            "trend": "bullish",
            "current_price": 52300
        },
        "correct_answer": "up",
        "explanation": {
            "correct": "Отлично! Вы правильно определили пробой уровня сопротивления. Растущие объемы и позитивные новости подтверждают бычий тренд.",
            "wrong": {
                "down": "Вы выбрали падение, но пропустили ключевые сигналы: пробой сопротивления на растущих объемах и позитивный новостной фон.",
                "sideways": "Боковое движение маловероятно при пробое ключевого уровня с подтверждением объемами."
            }
        },
        "xp_reward": 50
    },
    {
        "id": 2,
        "title": "Медвежье поглощение",
        "difficulty": "medium",
        "category": "patterns",
        "description": "На дневном графике ETH/USDT сформировалась свечная модель 'медвежье поглощение' после длительного восходящего тренда.",
        "news": [
            "📉 Разработчики Ethereum отложили важное обновление сети",
            "🐋 Крупный держатель ETH переместил 50,000 монет на биржу",
            "💹 Индекс страха и жадности показывает 'экстремальную жадность'"
        ],
        "chart_data": {
            "type": "bearish_engulfing",
            "trend": "bearish",
            "current_price": 3100
        },
        "correct_answer": "down",
        "explanation": {
            "correct": "Верно! Медвежье поглощение на пике тренда - классический сигнал разворота. Новости о переносе обновления усиливают медвежий настрой.",
            "wrong": {
                "up": "Вы проигнорировали медвежью свечную модель. После длительного роста формирование поглощения часто предшествует коррекции.",
                "sideways": "Медвежье поглощение обычно приводит к движению вниз, а не к консолидации."
            }
        },
        "xp_reward": 75
    },
    {
        "id": 3,
        "title": "Ложный пробой",
        "difficulty": "hard",
        "category": "traps",
        "description": "Цена BTC ненадолго пробила поддержку $48,000, но быстро вернулась обратно. Объем на пробое был низким.",
        "news": [
            "📰 В СМИ появились неподтвержденные слухи о запрете криптовалют",
            "💎 Большинство долгосрочных держателей не продают монеты",
            "📊 Индекс доминирования BTC стабилен на уровне 52%"
        ],
        "chart_data": {
            "type": "false_breakdown",
            "trend": "bullish",
            "current_price": 48700
        },
        "correct_answer": "up",
        "explanation": {
            "correct": "Превосходно! Вы распознали ложный пробой. Низкие объемы и быстрый возврат - классические признаки ловушки для медведей.",
            "wrong": {
                "down": "Вы попались в медвежью ловушку! Низкие объемы на пробое указывали на слабость продавцов.",
                "sideways": "После ложного пробоя часто следует сильное движение в противоположную сторону."
            }
        },
        "xp_reward": 100
    },
    {
        "id": 4,
        "title": "Дивергенция RSI",
        "difficulty": "medium",
        "category": "indicators",
        "description": "На 4-часовом графике цена ETH показывает новый максимум, но RSI формирует более низкий пик.",
        "news": [
            "📈 Общая заблокированная стоимость в DeFi снижается третью неделю",
            "🏢 Корпорации продолжают накапливать ETH",
            "🌐 Активность в сети Ethereum снизилась на 12%"
        ],
        "chart_data": {
            "type": "rsi_divergence",
            "trend": "bearish",
            "current_price": 3350
        },
        "correct_answer": "down",
        "explanation": {
            "correct": "Отлично замечено! Медвежья дивергенция RSI - надежный сигнал ослабления тренда. Снижение активности в сети подтверждает анализ.",
            "wrong": {
                "up": "Вы проигнорировали дивергенцию RSI. Когда цена растет, а индикатор падает - это предупреждение о возможном развороте.",
                "sideways": "Дивергенция RSI обычно предвещает разворот тренда, а не консолидацию."
            }
        },
        "xp_reward": 75
    },
    {
        "id": 5,
        "title": "Сжатие полос Боллинджера",
        "difficulty": "easy",
        "category": "indicators",
        "description": "Полосы Боллинджера на дневном графике BTC максимально сузились за последние 2 недели. Волатильность на минимуме.",
        "news": [
            "⏳ До халвинга Bitcoin осталось 3 месяца",
            "📊 Рыночные объемы на минимальных значениях за месяц",
            "🏦 ФРС готовится к объявлению решения по ставке"
        ],
        "chart_data": {
            "type": "bollinger_squeeze",
            "trend": "neutral_volatile",
            "current_price": 49500
        },
        "correct_answer": "up",
        "explanation": {
            "correct": "Правильно! Сжатие полос Боллинджера часто предшествует сильному движению. Приближение халвинга - исторически бычий фактор.",
            "wrong": {
                "down": "Хотя движение вниз возможно, исторические данные показывают, что перед халвингом Bitcoin чаще растет.",
                "sideways": "Сжатие полос Боллинджера указывает на скорое окончание консолидации и начало тренда."
            }
        },
        "xp_reward": 50
    },
    {
        "id": 6,
        "title": "Золотой крест",
        "difficulty": "medium",
        "category": "indicators",
        "description": "50-дневная скользящая средняя пересекла 200-дневную снизу вверх на графике ETH/USDT.",
        "news": [
            "📈 Институциональные притоки в Ethereum-ETF растут",
            "🔧 Успешное тестирование обновления Dencun в тестовой сети",
            "🌍 Регуляторы ЕС одобрили новые правила для крипто-индустрии"
        ],
        "chart_data": {
            "type": "golden_cross",
            "trend": "bullish",
            "current_price": 3400
        },
        "correct_answer": "up",
        "explanation": {
            "correct": "Великолепно! Золотой крест - один из самых надежных бычьих сигналов в техническом анализе.",
            "wrong": {
                "down": "Золотой крест исторически является сильным бычьим сигналом. Продавать при таком паттерне рискованно.",
                "sideways": "После золотого креста обычно следует устойчивый восходящий тренд."
            }
        },
        "xp_reward": 75
    },
    {
        "id": 7,
        "title": "Голова и плечи",
        "difficulty": "hard",
        "category": "patterns",
        "description": "На недельном графике BTC формируется классическая модель 'голова и плечи' с четкой линией шеи.",
        "news": [
            "📉 Майнеры начали активно продавать накопленные резервы",
            "💱 Стейблкоины отток с бирж",
            "⚠️ Крупный маркетмейкер сокращает позиции в криптовалютах"
        ],
        "chart_data": {
            "type": "head_and_shoulders",
            "trend": "bearish",
            "current_price": 46200
        },
        "correct_answer": "down",
        "explanation": {
            "correct": "Блестяще! Голова и плечи на недельном графике - серьезный сигнал разворота тренда. Продажи майнеров усиливают медвежий сценарий.",
            "wrong": {
                "up": "Модель 'голова и плечи' - классический разворотный паттерн. Игнорировать его на недельном таймфрейме опасно.",
                "sideways": "Завершение модели 'голова и плечи' обычно приводит к сильному движению вниз."
            }
        },
        "xp_reward": 100
    },
    {
        "id": 8,
        "title": "Восходящий треугольник",
        "difficulty": "easy",
        "category": "patterns",
        "description": "Цена ETH формирует восходящий треугольник с горизонтальным сопротивлением на $3,500.",
        "news": [
            "📊 Количество активных адресов Ethereum достигло рекорда",
            "🔥 Сжигание ETH через EIP-1559 ускорилось",
            "🎮 Крупная игровая компания анонсировала запуск на Ethereum"
        ],
        "chart_data": {
            "type": "ascending_triangle",
            "trend": "bullish",
            "current_price": 3480
        },
        "correct_answer": "up",
        "explanation": {
            "correct": "Правильно! Восходящий треугольник с растущими минимумами - бычья фигура продолжения тренда.",
            "wrong": {
                "down": "Восходящий треугольник - бычий паттерн. Минимумы повышаются, что говорит о силе покупателей.",
                "sideways": "Треугольник близок к завершению, скоро произойдет пробой."
            }
        },
        "xp_reward": 50
    }
]


# ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ПРОГРЕССОМ ==========
def calculate_level(xp: int) -> int:
    """Рассчитывает уровень на основе опыта"""
    return int((xp / 100) ** 0.7) + 1


def get_xp_for_next_level(level: int) -> int:
    """Возвращает необходимое количество XP для следующего уровня"""
    return int(((level) / 1) ** (1 / 0.7) * 100)


def check_achievements(user_id: int):
    """Проверяет и выдает достижения"""
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        progress = conn.execute(
            "SELECT COUNT(*) as total, SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct FROM user_progress WHERE user_id = ?",
            (user_id,)).fetchone()

        achievements = []

        # Достижения за стрик
        if user["current_streak"] >= 3:
            try:
                conn.execute("INSERT INTO achievements (user_id, achievement_type) VALUES (?, 'streak_3')", (user_id,))
                achievements.append("🔥 Серия из 3 побед!")
            except:
                pass

        if user["current_streak"] >= 5:
            try:
                conn.execute("INSERT INTO achievements (user_id, achievement_type) VALUES (?, 'streak_5')", (user_id,))
                achievements.append("⚡ Серия из 5 побед!")
            except:
                pass

        # Достижения за количество правильных ответов
        if progress["correct"] >= 10:
            try:
                conn.execute("INSERT INTO achievements (user_id, achievement_type) VALUES (?, 'correct_10')",
                             (user_id,))
                achievements.append("📚 10 правильных прогнозов!")
            except:
                pass

        # Достижения за уровень
        if user["level"] >= 5:
            try:
                conn.execute("INSERT INTO achievements (user_id, achievement_type) VALUES (?, 'level_5')", (user_id,))
                achievements.append("🎯 Достигнут 5 уровень!")
            except:
                pass

        conn.commit()
        return achievements


# ========== API ДЛЯ КАРТОЧЕК ==========
@app.get("/api/cards/random")
async def get_random_card(user_id: int):
    """Возвращает случайную непройденную карточку"""
    with get_db() as conn:
        # Получаем ID пройденных карточек
        completed = conn.execute(
            "SELECT card_id FROM user_progress WHERE user_id = ? AND completed = TRUE",
            (user_id,)
        ).fetchall()
        completed_ids = [c["card_id"] for c in completed]

        # Выбираем непройденные карточки
        available_cards = [c for c in TRADING_CARDS if c["id"] not in completed_ids]

        if not available_cards:
            # Если все карточки пройдены, сбрасываем прогресс для некоторых
            return {"completed_all": True}

        card = random.choice(available_cards).copy()

        # Генерируем данные графика
        chart_points = generate_chart_data(card["chart_data"]["type"], card["chart_data"]["trend"])
        card["chart_points"] = chart_points

        return card


def generate_chart_data(pattern_type: str, trend: str):
    """Генерирует данные для отрисовки графика"""
    points = []
    base_price = 50000 if "BTC" in pattern_type or trend else 3000

    if pattern_type == "resistance_breakout":
        for i in range(30):
            if i < 20:
                price = base_price + 1000 * (1 - i / 25) + random.randint(-200, 200)
            else:
                price = base_price + 1500 + (i - 20) * 100 + random.randint(-100, 300)
            points.append({"x": i, "y": price})

    elif pattern_type == "bearish_engulfing":
        for i in range(30):
            if i < 25:
                price = base_price + i * 50 + random.randint(-100, 100)
            else:
                price = base_price + 1250 - (i - 25) * 100 + random.randint(-150, 50)
            points.append({"x": i, "y": price})

    elif pattern_type == "false_breakdown":
        for i in range(30):
            if i < 15:
                price = base_price - i * 30 + random.randint(-100, 100)
            elif i < 18:
                price = base_price - 600 + random.randint(-50, 50)
            else:
                price = base_price - 600 + (i - 18) * 80 + random.randint(-100, 200)
            points.append({"x": i, "y": price})

    elif pattern_type == "head_and_shoulders":
        for i in range(40):
            if i < 10:
                price = base_price + i * 30
            elif i < 15:
                price = base_price + 300 + (i - 10) * 60
            elif i < 20:
                price = base_price + 600 - (i - 15) * 60
            elif i < 30:
                price = base_price + 300 + (i - 20) * 20
            else:
                price = base_price + 500 - (i - 30) * 40
            points.append({"x": i, "y": price + random.randint(-50, 50)})

    else:
        # Паттерн по умолчанию
        for i in range(30):
            if trend == "bullish":
                price = base_price + i * 30 + random.randint(-150, 150)
            else:
                price = base_price - i * 30 + random.randint(-150, 150)
            points.append({"x": i, "y": price})

    return points


@app.post("/api/cards/submit")
async def submit_card_answer(request: Request):
    """Обрабатывает ответ пользователя"""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        card_id = data.get("card_id")
        answer = data.get("answer")

        card = next((c for c in TRADING_CARDS if c["id"] == card_id), None)
        if not card:
            return {"success": False, "error": "Card not found"}

        is_correct = (answer == card["correct_answer"])
        xp_earned = card["xp_reward"] if is_correct else 0

        with get_db() as conn:
            user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

            if is_correct:
                new_streak = user["current_streak"] + 1
                new_best_streak = max(user["best_streak"], new_streak)
                total_correct = user["total_correct"] + 1
                total_wrong = user["total_wrong"]
            else:
                new_streak = 0
                new_best_streak = user["best_streak"]
                total_correct = user["total_correct"]
                total_wrong = user["total_wrong"] + 1

            new_xp = user["experience_points"] + xp_earned
            new_level = calculate_level(new_xp)

            # Обновляем пользователя
            conn.execute("""
                UPDATE users SET 
                    experience_points = ?,
                    level = ?,
                    total_correct = ?,
                    total_wrong = ?,
                    current_streak = ?,
                    best_streak = ?
                WHERE id = ?
            """, (new_xp, new_level, total_correct, total_wrong, new_streak, new_best_streak, user_id))

            # Сохраняем прогресс
            mistake_type = None if is_correct else f"wrong_{answer}"
            conn.execute("""
                INSERT INTO user_progress (user_id, card_id, completed, correct, user_choice, mistake_type)
                VALUES (?, ?, TRUE, ?, ?, ?)
                ON CONFLICT(user_id, card_id) DO UPDATE SET
                    completed = TRUE,
                    correct = ?,
                    user_choice = ?,
                    mistake_type = ?,
                    completed_at = CURRENT_TIMESTAMP
            """, (user_id, card_id, is_correct, answer, mistake_type, is_correct, answer, mistake_type))

            conn.commit()

        # Проверяем достижения
        achievements = check_achievements(user_id)

        # Формируем объяснение
        if is_correct:
            explanation = card["explanation"]["correct"]
        else:
            explanation = card["explanation"]["wrong"].get(answer, "Проанализируйте график внимательнее.")

        return {
            "success": True,
            "is_correct": is_correct,
            "xp_earned": xp_earned,
            "new_level": new_level,
            "new_xp": new_xp,
            "streak": new_streak,
            "explanation": explanation,
            "achievements": achievements,
            "correct_answer": card["correct_answer"]
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/user/stats/{user_id}")
async def get_user_stats(user_id: int):
    """Возвращает статистику пользователя"""
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return {"error": "User not found"}

        progress = conn.execute("""
            SELECT COUNT(*) as total_completed,
                   SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct_answers
            FROM user_progress WHERE user_id = ?
        """, (user_id,)).fetchone()

        achievements = conn.execute(
            "SELECT achievement_type FROM achievements WHERE user_id = ?",
            (user_id,)
        ).fetchall()

        xp_for_next = get_xp_for_next_level(user["level"] + 1)
        current_level_xp = get_xp_for_next_level(user["level"])
        progress_to_next = ((user["experience_points"] - current_level_xp) / (xp_for_next - current_level_xp)) * 100

        return {
            "username": user["username"],
            "level": user["level"],
            "experience": user["experience_points"],
            "xp_for_next": xp_for_next,
            "progress_percent": min(100, max(0, progress_to_next)),
            "total_correct": user["total_correct"],
            "total_wrong": user["total_wrong"],
            "current_streak": user["current_streak"],
            "best_streak": user["best_streak"],
            "cards_completed": progress["total_completed"] or 0,
            "accuracy": (user["total_correct"] / (user["total_correct"] + user["total_wrong"]) * 100) if (user[
                                                                                                              "total_correct"] +
                                                                                                          user[
                                                                                                              "total_wrong"]) > 0 else 0,
            "achievements": [a["achievement_type"] for a in achievements]
        }


# ========== СТРАНИЦЫ ==========
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, registered: str = None, error: str = None):
    return templates.TemplateResponse("login.html", {
        "request": request,
        "registered": registered,
        "error": error
    })


@app.post("/register")
async def register(username: str = Form(...), password: str = Form(...)):
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, hash_password(password))
            )
            conn.commit()
        return RedirectResponse(url="/login?registered=1", status_code=303)
    except sqlite3.IntegrityError:
        return RedirectResponse(url="/login?error=exists", status_code=303)


@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    with get_db() as conn:
        user = conn.execute(
            "SELECT id FROM users WHERE username = ? AND password_hash = ?",
            (username, hash_password(password))
        ).fetchone()

        if not user:
            return RedirectResponse(url="/login?error=1", status_code=303)

        response = RedirectResponse(url="/learn", status_code=303)
        response.set_cookie(key="user_id", value=str(user["id"]), httponly=True, max_age=86400 * 30)
        return response


@app.get("/learn", response_class=HTMLResponse)
async def learn_page(request: Request):
    user_id = request.cookies.get("user_id")
    if not user_id:
        return RedirectResponse(url="/login")

    return templates.TemplateResponse("learn.html", {"request": request, "user_id": user_id})


@app.get("/profile", response_class=HTMLResponse)
async def profile_page(request: Request):
    user_id = request.cookies.get("user_id")
    if not user_id:
        return RedirectResponse(url="/login")

    return templates.TemplateResponse("profile.html", {"request": request, "user_id": user_id})


@app.get("/leaderboard", response_class=HTMLResponse)
async def leaderboard_page(request: Request):
    return templates.TemplateResponse("leaderboard.html", {"request": request})


@app.get("/logout")
async def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("user_id")
    return response


@app.get("/api/leaderboard")
async def get_leaderboard():
    with get_db() as conn:
        leaders = conn.execute("""
            SELECT username, level, experience_points, total_correct, current_streak
            FROM users
            ORDER BY experience_points DESC
            LIMIT 50
        """).fetchall()
        return [dict(l) for l in leaders]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)