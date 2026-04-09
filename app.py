from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random
import sqlite3
import hashlib
from datetime import datetime
from contextlib import contextmanager

app = FastAPI(title="Tradeum Academy", description="Образовательная платформа по трейдингу")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ========== БАЗА УЧЕБНЫХ КАРТОЧЕК ==========
TRADING_CARDS = [
    {
        "id": 1, "title": "Пробой уровня сопротивления", "difficulty": "easy", "category": "technical",
        "description": "BTC/USDT тестирует уровень сопротивления $52,000 в третий раз за неделю. Объемы торгов растут.",
        "news": ["📊 Институциональные инвесторы увеличили позиции в BTC на 15%", "🏦 Крупный банк объявил о запуске крипто-кастодиального сервиса", "📈 Открытый интерес по фьючерсам BTC достиг месячного максимума"],
        "chart_type": "resistance_breakout", "trend": "bullish", "current_price": 52300,
        "correct_answer": "up", "xp_reward": 50,
        "explanation": {"correct": "Отлично! Пробой сопротивления на растущих объемах — сильный бычий сигнал.", "wrong_down": "Вы пропустили пробой сопротивления на объемах.", "wrong_sideways": "Боковое движение маловероятно при пробое ключевого уровня."}
    },
    {
        "id": 2, "title": "Медвежье поглощение", "difficulty": "medium", "category": "patterns",
        "description": "На дневном графике ETH/USDT сформировалась свечная модель 'медвежье поглощение' после длительного восходящего тренда.",
        "news": ["📉 Разработчики Ethereum отложили важное обновление сети", "🐋 Крупный держатель ETH переместил 50,000 монет на биржу", "💹 Индекс страха и жадности показывает 'экстремальную жадность'"],
        "chart_type": "bearish_engulfing", "trend": "bearish", "current_price": 3100,
        "correct_answer": "down", "xp_reward": 75,
        "explanation": {"correct": "Верно! Медвежье поглощение на пике тренда — сигнал разворота.", "wrong_up": "Вы проигнорировали медвежью свечную модель.", "wrong_sideways": "Медвежье поглощение обычно приводит к движению вниз."}
    },
    {
        "id": 3, "title": "Ложный пробой", "difficulty": "hard", "category": "traps",
        "description": "Цена BTC ненадолго пробила поддержку $48,000, но быстро вернулась обратно. Объем на пробое был низким.",
        "news": ["📰 В СМИ появились неподтвержденные слухи о запрете криптовалют", "💎 Большинство долгосрочных держателей не продают монеты", "📊 Индекс доминирования BTC стабилен на уровне 52%"],
        "chart_type": "false_breakdown", "trend": "bullish", "current_price": 48700,
        "correct_answer": "up", "xp_reward": 100,
        "explanation": {"correct": "Превосходно! Ложный пробой с низкими объемами — классическая ловушка.", "wrong_down": "Вы попали в ловушку! Низкие объемы указывали на слабость продавцов.", "wrong_sideways": "После ложного пробоя часто следует сильное движение вверх."}
    },
    {
        "id": 4, "title": "Дивергенция RSI", "difficulty": "medium", "category": "indicators",
        "description": "На 4-часовом графике цена ETH показывает новый максимум, но RSI формирует более низкий пик.",
        "news": ["📈 Общая заблокированная стоимость в DeFi снижается третью неделю", "🏢 Корпорации продолжают накапливать ETH", "🌐 Активность в сети Ethereum снизилась на 12%"],
        "chart_type": "rsi_divergence", "trend": "bearish", "current_price": 3350,
        "correct_answer": "down", "xp_reward": 75,
        "explanation": {"correct": "Отлично! Медвежья дивергенция RSI — надежный сигнал разворота.", "wrong_up": "Вы проигнорировали дивергенцию RSI.", "wrong_sideways": "Дивергенция RSI обычно предвещает разворот тренда."}
    },
    {
        "id": 5, "title": "Сжатие полос Боллинджера", "difficulty": "easy", "category": "indicators",
        "description": "Полосы Боллинджера на дневном графике BTC максимально сузились. Волатильность на минимуме.",
        "news": ["⏳ До халвинга Bitcoin осталось 3 месяца", "📊 Рыночные объемы на минимальных значениях", "🏦 ФРС готовится к объявлению решения по ставке"],
        "chart_type": "bollinger_squeeze", "trend": "neutral_volatile", "current_price": 49500,
        "correct_answer": "up", "xp_reward": 50,
        "explanation": {"correct": "Правильно! Сжатие полос Боллинджера предшествует сильному движению.", "wrong_down": "Исторически перед халвингом Bitcoin чаще растет.", "wrong_sideways": "Сжатие указывает на скорое окончание консолидации."}
    },
    {
        "id": 6, "title": "Золотой крест", "difficulty": "medium", "category": "indicators",
        "description": "50-дневная скользящая средняя пересекла 200-дневную снизу вверх на графике ETH.",
        "news": ["📈 Институциональные притоки в Ethereum-ETF растут", "🔧 Успешное тестирование обновления Dencun", "🌍 Регуляторы ЕС одобрили новые правила для крипто-индустрии"],
        "chart_type": "golden_cross", "trend": "bullish", "current_price": 3400,
        "correct_answer": "up", "xp_reward": 75,
        "explanation": {"correct": "Великолепно! Золотой крест — один из надежных бычьих сигналов.", "wrong_down": "Золотой крест исторически является сильным бычьим сигналом.", "wrong_sideways": "После золотого креста обычно следует устойчивый рост."}
    },
    {
        "id": 7, "title": "Голова и плечи", "difficulty": "hard", "category": "patterns",
        "description": "На недельном графике BTC формируется классическая модель 'голова и плечи' с четкой линией шеи.",
        "news": ["📉 Майнеры начали активно продавать накопленные резервы", "💱 Стейблкоины отток с бирж", "⚠️ Крупный маркетмейкер сокращает позиции"],
        "chart_type": "head_and_shoulders", "trend": "bearish", "current_price": 46200,
        "correct_answer": "down", "xp_reward": 100,
        "explanation": {"correct": "Блестяще! Голова и плечи на недельном графике — серьезный сигнал разворота.", "wrong_up": "Модель 'голова и плечи' — классический разворотный паттерн.", "wrong_sideways": "Завершение модели обычно приводит к сильному движению вниз."}
    },
    {
        "id": 8, "title": "Восходящий треугольник", "difficulty": "easy", "category": "patterns",
        "description": "Цена ETH формирует восходящий треугольник с горизонтальным сопротивлением на $3,500.",
        "news": ["📊 Количество активных адресов Ethereum достигло рекорда", "🔥 Сжигание ETH через EIP-1559 ускорилось", "🎮 Крупная игровая компания анонсировала запуск на Ethereum"],
        "chart_type": "ascending_triangle", "trend": "bullish", "current_price": 3480,
        "correct_answer": "up", "xp_reward": 50,
        "explanation": {"correct": "Правильно! Восходящий треугольник — бычья фигура продолжения тренда.", "wrong_down": "Восходящий треугольник — бычий паттерн.", "wrong_sideways": "Треугольник близок к завершению, скоро произойдет пробой."}
    }
]

# ИИ-Боты для дуэлей
AI_BOTS = [
    {"id": 1, "name": "Трендовый Аналитик", "description": "Специализируется на определении трендов", "rating": 580, "strategy": "trend_follower", "accuracy": 0.65},
    {"id": 2, "name": "Контрарный Торговец", "description": "Ищет развороты на перекупленности", "rating": 520, "strategy": "contrarian", "accuracy": 0.55},
    {"id": 3, "name": "Волатильный Мастер", "description": "Идеален для нестабильного рынка", "rating": 610, "strategy": "volatility", "accuracy": 0.70},
    {"id": 4, "name": "Скальпер", "description": "Быстрые решения на малых таймфреймах", "rating": 490, "strategy": "scalper", "accuracy": 0.50},
    {"id": 5, "name": "Фундаментальный Бот", "description": "Анализирует новости и события", "rating": 550, "strategy": "fundamental", "accuracy": 0.60}
]

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
                duel_rating INTEGER DEFAULT 400,
                duel_wins INTEGER DEFAULT 0,
                duel_losses INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS duels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player1_id INTEGER NOT NULL,
                player2_id INTEGER,
                bot_id INTEGER,
                status TEXT DEFAULT 'waiting',
                player1_prediction TEXT,
                player2_prediction TEXT,
                bot_prediction TEXT,
                winner_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player1_id) REFERENCES users (id),
                FOREIGN KEY (player2_id) REFERENCES users (id)
            )
        """)
        conn.commit()

init_db()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def calculate_level(xp: int) -> int:
    return int((xp / 100) ** 0.7) + 1

def get_xp_for_next_level(level: int) -> int:
    return int(((level) / 1) ** (1 / 0.7) * 100)

def check_achievements(user_id: int):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        progress = conn.execute("SELECT COUNT(*) as total, SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct FROM user_progress WHERE user_id = ?", (user_id,)).fetchone()
        achievements = []
        if user["current_streak"] >= 3:
            try: conn.execute("INSERT INTO achievements (user_id, achievement_type) VALUES (?, 'streak_3')", (user_id,)); achievements.append("🔥 Серия из 3 побед!")
            except: pass
        if user["current_streak"] >= 5:
            try: conn.execute("INSERT INTO achievements (user_id, achievement_type) VALUES (?, 'streak_5')", (user_id,)); achievements.append("⚡ Серия из 5 побед!")
            except: pass
        if progress["correct"] >= 10:
            try: conn.execute("INSERT INTO achievements (user_id, achievement_type) VALUES (?, 'correct_10')", (user_id,)); achievements.append("📚 10 правильных прогнозов!")
            except: pass
        if user["level"] >= 5:
            try: conn.execute("INSERT INTO achievements (user_id, achievement_type) VALUES (?, 'level_5')", (user_id,)); achievements.append("🎯 Достигнут 5 уровень!")
            except: pass
        conn.commit()
        return achievements

def generate_chart_data(chart_type: str, trend: str):
    points = []
    base_price = 50000
    if chart_type == "resistance_breakout":
        for i in range(30):
            if i < 20: price = base_price + 1000 * (1 - i / 25) + random.randint(-200, 200)
            else: price = base_price + 1500 + (i - 20) * 100 + random.randint(-100, 300)
            points.append({"x": i, "y": price})
    elif chart_type == "bearish_engulfing":
        for i in range(30):
            if i < 25: price = base_price + i * 50 + random.randint(-100, 100)
            else: price = base_price + 1250 - (i - 25) * 100 + random.randint(-150, 50)
            points.append({"x": i, "y": price})
    elif chart_type == "false_breakdown":
        for i in range(30):
            if i < 15: price = base_price - i * 30 + random.randint(-100, 100)
            elif i < 18: price = base_price - 600 + random.randint(-50, 50)
            else: price = base_price - 600 + (i - 18) * 80 + random.randint(-100, 200)
            points.append({"x": i, "y": price})
    elif chart_type == "head_and_shoulders":
        for i in range(40):
            if i < 10: price = base_price + i * 30
            elif i < 15: price = base_price + 300 + (i - 10) * 60
            elif i < 20: price = base_price + 600 - (i - 15) * 60
            elif i < 30: price = base_price + 300 + (i - 20) * 20
            else: price = base_price + 500 - (i - 30) * 40
            points.append({"x": i, "y": price + random.randint(-50, 50)})
    else:
        for i in range(30):
            if trend == "bullish": price = base_price + i * 30 + random.randint(-150, 150)
            else: price = base_price - i * 30 + random.randint(-150, 150)
            points.append({"x": i, "y": price})
    return points

# ========== API ==========
@app.get("/api/user/stats/{user_id}")
async def get_user_stats(user_id: int):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user: return {"error": "User not found"}
        progress = conn.execute("SELECT COUNT(*) as total_completed, SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct_answers FROM user_progress WHERE user_id = ?", (user_id,)).fetchone()
        achievements = conn.execute("SELECT achievement_type FROM achievements WHERE user_id = ?", (user_id,)).fetchall()
        xp_for_next = get_xp_for_next_level(user["level"] + 1)
        current_level_xp = get_xp_for_next_level(user["level"])
        progress_to_next = ((user["experience_points"] - current_level_xp) / (xp_for_next - current_level_xp)) * 100 if xp_for_next > current_level_xp else 0
        return {
            "username": user["username"], "level": user["level"], "experience": user["experience_points"],
            "xp_for_next": xp_for_next, "progress_percent": min(100, max(0, progress_to_next)),
            "total_correct": user["total_correct"], "total_wrong": user["total_wrong"],
            "current_streak": user["current_streak"], "best_streak": user["best_streak"],
            "duel_rating": user["duel_rating"], "duel_wins": user["duel_wins"], "duel_losses": user["duel_losses"],
            "cards_completed": progress["total_completed"] or 0, "total_cards": len(TRADING_CARDS),
            "accuracy": (user["total_correct"] / (user["total_correct"] + user["total_wrong"]) * 100) if (user["total_correct"] + user["total_wrong"]) > 0 else 0,
            "achievements": [a["achievement_type"] for a in achievements]
        }
@app.get("/faq", response_class=HTMLResponse)
async def faq_page(request: Request):
    return templates.TemplateResponse("faq.html", {"request": request})

@app.get("/features", response_class=HTMLResponse)
async def features_page(request: Request):
    return templates.TemplateResponse("features.html", {"request": request})
@app.get("/api/cards/random")
async def get_random_card(user_id: int):
    with get_db() as conn:
        completed = conn.execute("SELECT card_id FROM user_progress WHERE user_id = ? AND completed = TRUE", (user_id,)).fetchall()
        completed_ids = [c["card_id"] for c in completed]
        available_cards = [c for c in TRADING_CARDS if c["id"] not in completed_ids]
        if not available_cards: return {"completed_all": True}
        card = random.choice(available_cards).copy()
        card["chart_points"] = generate_chart_data(card["chart_type"], card["trend"])
        return card

@app.post("/api/cards/submit")
async def submit_card_answer(request: Request):
    try:
        data = await request.json()
        user_id, card_id, answer = data.get("user_id"), data.get("card_id"), data.get("answer")
        card = next((c for c in TRADING_CARDS if c["id"] == card_id), None)
        if not card: return {"success": False, "error": "Card not found"}
        is_correct = (answer == card["correct_answer"])
        xp_earned = card["xp_reward"] if is_correct else 0
        with get_db() as conn:
            user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if is_correct:
                new_streak, new_best_streak = user["current_streak"] + 1, max(user["best_streak"], user["current_streak"] + 1)
                total_correct, total_wrong = user["total_correct"] + 1, user["total_wrong"]
                mistake_type = None
            else:
                new_streak, new_best_streak = 0, user["best_streak"]
                total_correct, total_wrong = user["total_correct"], user["total_wrong"] + 1
                mistake_type = f"wrong_{answer}"
            new_xp, new_level = user["experience_points"] + xp_earned, calculate_level(user["experience_points"] + xp_earned)
            conn.execute("UPDATE users SET experience_points=?, level=?, total_correct=?, total_wrong=?, current_streak=?, best_streak=? WHERE id=?", (new_xp, new_level, total_correct, total_wrong, new_streak, new_best_streak, user_id))
            conn.execute("INSERT INTO user_progress (user_id, card_id, completed, correct, user_choice, mistake_type) VALUES (?, ?, TRUE, ?, ?, ?) ON CONFLICT(user_id, card_id) DO UPDATE SET completed=TRUE, correct=?, user_choice=?, mistake_type=?, completed_at=CURRENT_TIMESTAMP", (user_id, card_id, is_correct, answer, mistake_type, is_correct, answer, mistake_type))
            conn.commit()
        achievements = check_achievements(user_id)
        explanation = card["explanation"]["correct"] if is_correct else card["explanation"].get(f"wrong_{answer}", "Проанализируйте график внимательнее.")
        return {"success": True, "is_correct": is_correct, "xp_earned": xp_earned, "new_level": new_level, "new_xp": new_xp, "streak": new_streak, "explanation": explanation, "achievements": achievements, "correct_answer": card["correct_answer"]}
    except Exception as e: return {"success": False, "error": str(e)}

@app.get("/api/leaderboard")
async def get_leaderboard():
    with get_db() as conn:
        leaders = conn.execute("SELECT username, level, experience_points, total_correct, current_streak FROM users ORDER BY experience_points DESC LIMIT 50").fetchall()
        return [dict(l) for l in leaders]

@app.get("/api/bots")
async def get_bots():
    return AI_BOTS

@app.post("/api/duel/create")
async def create_duel(request: Request):
    try:
        data = await request.json()
        user_id = data.get("user_id")
        bot_id = data.get("bot_id")
        with get_db() as conn:
            if bot_id:
                bot = next((b for b in AI_BOTS if b["id"] == bot_id), None)
                if bot:
                    duel_id = random.randint(1000, 9999)
                    conn.execute("INSERT INTO duels (player1_id, bot_id, status, player2_id) VALUES (?, ?, 'active', ?)", (user_id, bot_id, -bot_id))
                    conn.commit()
                    return {"success": True, "duel_id": duel_id, "action": "vs_bot", "bot": bot}
            else:
                waiting = conn.execute("SELECT id FROM duels WHERE status = 'waiting' AND player1_id != ?", (user_id,)).fetchone()
                if waiting:
                    duel_id = waiting["id"]
                    conn.execute("UPDATE duels SET player2_id = ?, status = 'active' WHERE id = ?", (user_id, duel_id))
                    conn.commit()
                    return {"success": True, "duel_id": duel_id, "action": "joined"}
                else:
                    cursor = conn.execute("INSERT INTO duels (player1_id, status) VALUES (?, 'waiting')", (user_id,))
                    duel_id = cursor.lastrowid
                    conn.commit()
                    return {"success": True, "duel_id": duel_id, "action": "created"}
    except Exception as e: return {"success": False, "error": str(e)}

@app.post("/api/duel/submit_prediction")
async def submit_duel_prediction(request: Request):
    try:
        data = await request.json()
        duel_id, user_id, direction = data.get("duel_id"), data.get("user_id"), data.get("direction")
        with get_db() as conn:
            duel = conn.execute("SELECT * FROM duels WHERE id = ?", (duel_id,)).fetchone()
            if not duel or duel["status"] != "active": return {"success": False, "error": "Duel not active"}
            if duel["player1_id"] == user_id: conn.execute("UPDATE duels SET player1_prediction = ? WHERE id = ?", (direction, duel_id))
            elif duel["player2_id"] == user_id: conn.execute("UPDATE duels SET player2_prediction = ? WHERE id = ?", (direction, duel_id))
            else: return {"success": False, "error": "Not a player"}
            conn.commit()
            return {"success": True}
    except Exception as e: return {"success": False, "error": str(e)}

@app.post("/api/duel/bot_predict")
async def bot_predict(request: Request):
    try:
        data = await request.json()
        bot_id = data.get("bot_id")
        bot = next((b for b in AI_BOTS if b["id"] == bot_id), None)
        if not bot: return {"success": False, "error": "Bot not found"}
        import random
        prediction = random.choices(["up", "down"], weights=[bot["accuracy"]*100, (1-bot["accuracy"])*100])[0]
        return {"success": True, "prediction": prediction, "bot": bot}
    except Exception as e: return {"success": False, "error": str(e)}

@app.post("/api/duel/resolve")
async def resolve_duel(request: Request):
    try:
        data = await request.json()
        duel_id = data.get("duel_id")
        with get_db() as conn:
            duel = conn.execute("SELECT * FROM duels WHERE id = ?", (duel_id,)).fetchone()
            if not duel or duel["status"] != "active": return {"success": False, "error": "Duel not active"}
            real_direction = random.choice(["up", "down"])
            p1_pred, p2_pred = duel["player1_prediction"], duel["player2_prediction"]
            if duel["bot_id"]:
                bot = next((b for b in AI_BOTS if b["id"] == duel["bot_id"]), None)
                bot_pred = random.choices(["up", "down"], weights=[bot["accuracy"]*100, (1-bot["accuracy"])*100])[0] if bot else random.choice(["up", "down"])
                winner_id = None
                if p1_pred == real_direction and bot_pred != real_direction: winner_id = duel["player1_id"]
                elif bot_pred == real_direction and p1_pred != real_direction: winner_id = -duel["bot_id"]
                change = 25
                if winner_id == duel["player1_id"]:
                    conn.execute("UPDATE users SET duel_rating = duel_rating + ?, duel_wins = duel_wins + 1 WHERE id = ?", (change, duel["player1_id"]))
                elif winner_id and winner_id < 0:
                    conn.execute("UPDATE users SET duel_rating = duel_rating - ?, duel_losses = duel_losses + 1 WHERE id = ?", (change, duel["player1_id"]))
            else:
                winner_id = None
                if p1_pred == real_direction and p2_pred != real_direction: winner_id = duel["player1_id"]
                elif p2_pred == real_direction and p1_pred != real_direction: winner_id = duel["player2_id"]
                if winner_id:
                    change = 25
                    conn.execute("UPDATE users SET duel_rating = duel_rating + ?, duel_wins = duel_wins + 1 WHERE id = ?", (change, winner_id))
                    loser_id = duel["player1_id"] if winner_id == duel["player2_id"] else duel["player2_id"]
                    conn.execute("UPDATE users SET duel_rating = duel_rating - ?, duel_losses = duel_losses + 1 WHERE id = ?", (change, loser_id))
            conn.execute("UPDATE duels SET status = 'completed', winner_id = ? WHERE id = ?", (winner_id, duel_id))
            conn.commit()
            return {"success": True, "winner_id": winner_id, "real_direction": real_direction}
    except Exception as e: return {"success": False, "error": str(e)}

@app.get("/api/duel/check/{duel_id}")
async def check_duel(duel_id: int):
    with get_db() as conn:
        duel = conn.execute("SELECT * FROM duels WHERE id = ?", (duel_id,)).fetchone()
        if not duel: return {"error": "Duel not found"}
        both_submitted = duel["player1_prediction"] is not None and (duel["player2_prediction"] is not None or duel["bot_id"] is not None)
        return {"both_submitted": both_submitted, "player1_prediction": duel["player1_prediction"], "player2_prediction": duel["player2_prediction"]}

@app.get("/api/duel/status/{duel_id}")
async def get_duel_status(duel_id: int):
    with get_db() as conn:
        duel = conn.execute("SELECT * FROM duels WHERE id = ?", (duel_id,)).fetchone()
        if not duel: return {"error": "Duel not found"}
        return {"status": duel["status"], "player1_id": duel["player1_id"], "player2_id": duel["player2_id"], "bot_id": duel["bot_id"]}

# ========== СТРАНИЦЫ ==========
@app.get("/", response_class=HTMLResponse)
async def home(request: Request): return templates.TemplateResponse("index.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, registered: str = None, error: str = None): return templates.TemplateResponse("login.html", {"request": request, "registered": registered, "error": error})

@app.post("/register")
async def register(username: str = Form(...), password: str = Form(...)):
    try:
        with get_db() as conn:
            conn.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, hash_password(password)))
            conn.commit()
        return RedirectResponse(url="/login?registered=1", status_code=303)
    except sqlite3.IntegrityError: return RedirectResponse(url="/login?error=exists", status_code=303)

@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    with get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE username = ? AND password_hash = ?", (username, hash_password(password))).fetchone()
        if not user: return RedirectResponse(url="/login?error=1", status_code=303)
        response = RedirectResponse(url=f"/dashboard?user_id={user['id']}", status_code=303)
        response.set_cookie(key="user_id", value=str(user["id"]), httponly=True)
        return response

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, user_id: int = None):
    if not user_id: user_id = request.cookies.get("user_id")
    if not user_id: return RedirectResponse(url="/login")
    return templates.TemplateResponse("dashboard.html", {"request": request, "user_id": int(user_id)})

@app.get("/learn", response_class=HTMLResponse)
async def learn_page(request: Request): return templates.TemplateResponse("learn.html", {"request": request})

@app.get("/duel", response_class=HTMLResponse)
async def duel_page(request: Request): return templates.TemplateResponse("duel.html", {"request": request})

@app.get("/library", response_class=HTMLResponse)
async def library_page(request: Request): return templates.TemplateResponse("library.html", {"request": request})

@app.get("/simulator", response_class=HTMLResponse)
async def simulator_page(request: Request): return templates.TemplateResponse("simulator.html", {"request": request})

@app.get("/leaderboard", response_class=HTMLResponse)
async def leaderboard_page(request: Request): return templates.TemplateResponse("leaderboard.html", {"request": request})

@app.get("/logout")
async def logout(): response = RedirectResponse(url="/"); response.delete_cookie("user_id"); return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)