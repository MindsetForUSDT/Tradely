from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random
import sqlite3
import hashlib
import requests
from datetime import datetime, timedelta
from contextlib import contextmanager
import math
from typing import Optional

app = FastAPI(title="Tradeum", description="Трейдинг симулятор с реальными ценами")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ========== РЕАЛЬНЫЕ ЦЕНЫ ==========
def get_btc_price():
    try:
        response = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", timeout=5)
        return float(response.json()["price"])
    except:
        return 50000.0


def get_eth_price():
    try:
        response = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", timeout=5)
        return float(response.json()["price"])
    except:
        return 3000.0


# ========== БАЗА ДАННЫХ ==========
@contextmanager
def get_db():
    conn = sqlite3.connect("tradeum.db")
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
                balance REAL DEFAULT 10000.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                rating INTEGER DEFAULT 1200,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                current_win_streak INTEGER DEFAULT 0,
                current_loss_streak INTEGER DEFAULT 0,
                best_win_streak INTEGER DEFAULT 0,
                duels_total INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS open_positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                position_type TEXT NOT NULL,
                leverage INTEGER NOT NULL,
                entry_price REAL NOT NULL,
                amount REAL NOT NULL,
                margin REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                position_type TEXT NOT NULL,
                leverage INTEGER NOT NULL,
                entry_price REAL NOT NULL,
                exit_price REAL NOT NULL,
                amount REAL NOT NULL,
                pnl REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS duels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player1_id INTEGER NOT NULL,
                player2_id INTEGER,
                is_bot INTEGER DEFAULT 0,
                status TEXT DEFAULT 'waiting',
                start_price REAL,
                end_price REAL,
                direction TEXT,
                player1_prediction TEXT,
                player2_prediction TEXT,
                player1_score_change INTEGER,
                player2_score_change INTEGER,
                winner_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                ended_at TIMESTAMP,
                FOREIGN KEY (player1_id) REFERENCES users (id),
                FOREIGN KEY (player2_id) REFERENCES users (id)
            )
        """)
        conn.commit()


init_db()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ========== ИИ-БОТЫ ==========
class AIBot:
    def __init__(self, bot_id, name, rating=1200):
        self.id = bot_id
        self.name = name
        self.rating = rating
        self.wins = 0
        self.losses = 0

    def analyze_market(self, price_history):
        """Анализирует график и возвращает прогноз"""
        if len(price_history) < 10:
            return random.choice(["up", "down", "sideways"])

        # Технический анализ
        recent_prices = [p["close"] for p in price_history[-20:]]

        # Скользящие средние
        sma_5 = sum(recent_prices[-5:]) / 5
        sma_20 = sum(recent_prices) / len(recent_prices)

        # RSI упрощенный
        gains = sum(max(0, recent_prices[i] - recent_prices[i - 1]) for i in range(1, len(recent_prices)))
        losses = sum(max(0, recent_prices[i - 1] - recent_prices[i]) for i in range(1, len(recent_prices)))
        rsi = 100 - (100 / (1 + gains / losses)) if losses > 0 else 100

        # Волатильность
        volatility = math.sqrt(sum((p - sma_20) ** 2 for p in recent_prices) / len(recent_prices)) / sma_20

        # Принятие решения
        if volatility > 0.02:  # Высокая волатильность
            if rsi < 30 and sma_5 > sma_20:
                return "up"
            elif rsi > 70 and sma_5 < sma_20:
                return "down"
            else:
                return "sideways"
        else:  # Низкая волатильность
            if sma_5 > sma_20 * 1.01:
                return "up"
            elif sma_5 < sma_20 * 0.99:
                return "down"
            else:
                return "sideways"


# Создаем ботов
BOTS = {
    -1: AIBot(-1, "Quantum AI", 1450),
    -2: AIBot(-2, "Neural Trader", 1380),
    -3: AIBot(-3, "Deep Alpha", 1520),
    -4: AIBot(-4, "Sigma Bot", 1410),
    -5: AIBot(-5, "Tensor Flow", 1350)
}


# ========== ЭЛО РЕЙТИНГ ==========
def calculate_elo_change(rating_a, rating_b, is_winner_a, k=32):
    expected_a = 1 / (1 + 10 ** ((rating_b - rating_a) / 400))
    score_a = 1 if is_winner_a else 0
    return round(k * (score_a - expected_a))


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
            cursor = conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, hash_password(password))
            )
            user_id = cursor.lastrowid
            conn.execute(
                "INSERT INTO user_ratings (user_id, rating) VALUES (?, 1200)",
                (user_id,)
            )
            conn.commit()
        return RedirectResponse(url="/login?registered=1", status_code=303)
    except sqlite3.IntegrityError:
        return RedirectResponse(url="/login?error=exists", status_code=303)


@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    with get_db() as conn:
        user = conn.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            (username,)
        ).fetchone()

        if not user or user["password_hash"] != hash_password(password):
            return RedirectResponse(url="/login?error=1", status_code=303)

        response = RedirectResponse(url="/dashboard", status_code=303)
        response.set_cookie(key="user_id", value=str(user["id"]), httponly=True, max_age=86400 * 30)
        return response


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    user_id = request.cookies.get("user_id")
    if not user_id:
        return RedirectResponse(url="/login")

    with get_db() as conn:
        user = conn.execute(
            "SELECT id, username, balance FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        if not user:
            return RedirectResponse(url="/login")

        rating = conn.execute(
            "SELECT rating, wins, losses FROM user_ratings WHERE user_id = ?",
            (user_id,)
        ).fetchone()

        recent_trades = conn.execute(
            "SELECT symbol, position_type, leverage, pnl, created_at FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
            (user_id,)
        ).fetchall()

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": user,
        "rating": rating,
        "recent_trades": recent_trades,
        "btc_price": round(get_btc_price(), 2),
        "eth_price": round(get_eth_price(), 2)
    })


@app.get("/duel", response_class=HTMLResponse)
async def duel_page(request: Request):
    user_id = request.cookies.get("user_id")
    if not user_id:
        return RedirectResponse(url="/login")

    # Получаем список ботов для отображения
    bots_list = [{"id": bot_id, "name": bot.name, "rating": bot.rating} for bot_id, bot in BOTS.items()]

    return templates.TemplateResponse("duel.html", {
        "request": request,
        "user_id": user_id,
        "bots": bots_list
    })


@app.get("/leaderboard", response_class=HTMLResponse)
async def leaderboard_page(request: Request):
    return templates.TemplateResponse("leaderboard.html", {"request": request})


@app.get("/logout")
async def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("user_id")
    return response


# ========== API ОБЫЧНОЙ ТОРГОВЛИ ==========
@app.get("/api/price/{symbol}")
async def get_price(symbol: str):
    if symbol == "BTC":
        return {"price": get_btc_price()}
    else:
        return {"price": get_eth_price()}


@app.get("/api/positions/{user_id}")
async def get_positions(user_id: int):
    with get_db() as conn:
        positions = conn.execute(
            "SELECT id, symbol, position_type, leverage, entry_price, amount, margin FROM open_positions WHERE user_id = ?",
            (user_id,)
        ).fetchall()
        return [dict(p) for p in positions]


@app.post("/api/position/open")
async def open_position(request: Request):
    try:
        data = await request.json()
        user_id = data.get("user_id")
        symbol = data.get("symbol")
        position_type = data.get("position_type")
        leverage = data.get("leverage")
        amount = data.get("amount")

        with get_db() as conn:
            user = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
            if not user:
                return {"success": False, "error": "User not found"}

            margin = amount / leverage
            if margin > user["balance"]:
                return {"success": False, "error": f"Need ${margin:.2f} margin, have ${user['balance']:.2f}"}

            if symbol == "BTC":
                entry_price = get_btc_price()
            else:
                entry_price = get_eth_price()

            new_balance = user["balance"] - margin
            conn.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))

            conn.execute("""
                INSERT INTO open_positions (user_id, symbol, position_type, leverage, entry_price, amount, margin)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, symbol, position_type, leverage, entry_price, amount, margin))
            conn.commit()

            return {"success": True, "new_balance": new_balance, "entry_price": entry_price}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/position/close")
async def close_position(request: Request):
    try:
        data = await request.json()
        user_id = data.get("user_id")
        position_id = data.get("position_id")
        close_amount = data.get("close_amount")

        with get_db() as conn:
            pos = conn.execute("SELECT * FROM open_positions WHERE id = ? AND user_id = ?",
                               (position_id, user_id)).fetchone()
            if not pos:
                return {"success": False, "error": "Position not found"}

            if close_amount > pos["amount"]:
                close_amount = pos["amount"]

            if pos["symbol"] == "BTC":
                current_price = get_btc_price()
            else:
                current_price = get_eth_price()

            if pos["position_type"] == "long":
                pnl_per_unit = (current_price - pos["entry_price"]) / pos["entry_price"] * pos["leverage"]
            else:
                pnl_per_unit = (pos["entry_price"] - current_price) / pos["entry_price"] * pos["leverage"]

            pnl = pos["amount"] * pnl_per_unit * (close_amount / pos["amount"])
            margin_return = (pos["margin"] * (close_amount / pos["amount"]))
            total_return = margin_return + pnl

            user = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
            new_balance = user["balance"] + total_return
            conn.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))

            remaining_amount = pos["amount"] - close_amount
            if remaining_amount <= 0.01:
                conn.execute("DELETE FROM open_positions WHERE id = ?", (position_id,))
            else:
                conn.execute("UPDATE open_positions SET amount = ?, margin = ? WHERE id = ?",
                             (remaining_amount, pos["margin"] * (remaining_amount / pos["amount"]), position_id))

            conn.execute("""
                INSERT INTO trades (user_id, symbol, position_type, leverage, entry_price, exit_price, amount, pnl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, pos["symbol"], pos["position_type"], pos["leverage"],
                  pos["entry_price"], current_price, close_amount, pnl))
            conn.commit()

            return {"success": True, "new_balance": new_balance, "pnl": pnl, "received": total_return}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/history/{user_id}")
async def get_history(user_id: int):
    with get_db() as conn:
        trades = conn.execute("""
            SELECT symbol, position_type, leverage, pnl, created_at
            FROM trades
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        """, (user_id,)).fetchall()
        return [{"symbol": t["symbol"], "position_type": t["position_type"],
                 "leverage": t["leverage"], "pnl": t["pnl"],
                 "created_at": t["created_at"][:19]} for t in trades]


@app.get("/api/chart/{symbol}")
async def get_chart_history(symbol: str, limit: int = 100):
    """Генерирует реалистичные исторические данные для графика"""
    data = []
    if symbol == "BTC":
        base_price = get_btc_price()
    else:
        base_price = get_eth_price()

    current_price = base_price
    now = datetime.now()

    for i in range(limit, 0, -1):
        change = random.gauss(0, 0.008)
        open_price = current_price
        close_price = open_price * (1 + change)
        high_price = max(open_price, close_price) * (1 + abs(random.gauss(0, 0.002)))
        low_price = min(open_price, close_price) * (1 - abs(random.gauss(0, 0.002)))

        data.append({
            "time": int((now - timedelta(hours=i)).timestamp()),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2)
        })
        current_price = close_price

    return data


# ========== API ДУЭЛЕЙ ==========
@app.get("/api/duel/rating/{user_id}")
async def get_user_rating(user_id: int):
    # Проверяем, не бот ли это
    if user_id < 0 and user_id in BOTS:
        bot = BOTS[user_id]
        return {"rating": bot.rating, "wins": bot.wins, "losses": bot.losses, "streak": 0}

    with get_db() as conn:
        rating = conn.execute("SELECT * FROM user_ratings WHERE user_id = ?", (user_id,)).fetchone()
        if not rating:
            return {"rating": 1200, "wins": 0, "losses": 0, "streak": 0}
        return dict(rating)


@app.get("/api/duel/leaderboard")
async def get_leaderboard(limit: int = 100):
    with get_db() as conn:
        leaders = conn.execute("""
            SELECT u.username, r.rating, r.wins, r.losses, r.duels_total
            FROM user_ratings r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.rating DESC
            LIMIT ?
        """, (limit,)).fetchall()

        result = [dict(l) for l in leaders]

        # Добавляем ботов в таблицу лидеров
        for bot_id, bot in BOTS.items():
            result.append({
                "username": f"🤖 {bot.name}",
                "rating": bot.rating,
                "wins": bot.wins,
                "losses": bot.losses,
                "duels_total": bot.wins + bot.losses
            })

        # Сортируем по рейтингу
        result.sort(key=lambda x: x["rating"], reverse=True)
        return result[:limit]


@app.post("/api/duel/create")
async def create_duel(request: Request):
    try:
        data = await request.json()
        user_id = data.get("user_id")
        vs_bot = data.get("vs_bot", False)
        bot_id = data.get("bot_id")

        with get_db() as conn:
            if vs_bot and bot_id:
                # Создаем дуэль с ботом
                cursor = conn.execute(
                    "INSERT INTO duels (player1_id, player2_id, is_bot, status) VALUES (?, ?, 1, 'active')",
                    (user_id, bot_id)
                )
                duel_id = cursor.lastrowid
                start_price = get_btc_price()
                conn.execute("UPDATE duels SET start_price = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?",
                             (start_price, duel_id))
                conn.commit()
                return {"success": True, "duel_id": duel_id, "action": "vs_bot", "bot_id": bot_id}
            else:
                # Поиск реального соперника
                waiting = conn.execute(
                    "SELECT id FROM duels WHERE status = 'waiting' AND player1_id != ? AND is_bot = 0",
                    (user_id,)
                ).fetchone()

                if waiting:
                    duel_id = waiting["id"]
                    conn.execute(
                        "UPDATE duels SET player2_id = ?, status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = ?",
                        (user_id, duel_id)
                    )
                    start_price = get_btc_price()
                    conn.execute("UPDATE duels SET start_price = ? WHERE id = ?", (start_price, duel_id))
                    conn.commit()
                    return {"success": True, "duel_id": duel_id, "action": "joined"}
                else:
                    cursor = conn.execute(
                        "INSERT INTO duels (player1_id, status) VALUES (?, 'waiting')",
                        (user_id,)
                    )
                    duel_id = cursor.lastrowid
                    conn.commit()
                    return {"success": True, "duel_id": duel_id, "action": "created"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/duel/bot_prediction")
async def get_bot_prediction(request: Request):
    """Бот анализирует график и делает прогноз"""
    try:
        data = await request.json()
        bot_id = data.get("bot_id")
        duel_id = data.get("duel_id")

        # Получаем историю цен для анализа
        chart_data = await get_chart_history("BTC", 50)

        bot = BOTS.get(bot_id)
        if not bot:
            return {"success": False, "error": "Bot not found"}

        prediction = bot.analyze_market(chart_data)

        # Сохраняем прогноз бота в дуэли
        with get_db() as conn:
            conn.execute(
                "UPDATE duels SET player2_prediction = ? WHERE id = ?",
                (prediction, duel_id)
            )
            conn.commit()

        return {
            "success": True,
            "prediction": prediction,
            "analysis": {
                "bot_name": bot.name,
                "confidence": random.randint(65, 95)
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/duel/status/{duel_id}")
async def get_duel_status(duel_id: int):
    with get_db() as conn:
        duel = conn.execute("SELECT * FROM duels WHERE id = ?", (duel_id,)).fetchone()
        if not duel:
            return {"error": "Duel not found"}

        return {
            "status": duel["status"],
            "player1_id": duel["player1_id"],
            "player2_id": duel["player2_id"],
            "is_bot": bool(duel["is_bot"]),
            "start_price": duel["start_price"],
            "started_at": duel["started_at"]
        }


@app.post("/api/duel/submit_prediction")
async def submit_prediction(request: Request):
    try:
        data = await request.json()
        duel_id = data.get("duel_id")
        user_id = data.get("user_id")
        direction = data.get("direction")

        with get_db() as conn:
            duel = conn.execute("SELECT * FROM duels WHERE id = ?", (duel_id,)).fetchone()
            if not duel or duel["status"] != "active":
                return {"success": False, "error": "Duel not active"}

            if duel["player1_id"] == user_id:
                conn.execute("UPDATE duels SET player1_prediction = ? WHERE id = ?", (direction, duel_id))
            elif duel["player2_id"] == user_id:
                conn.execute("UPDATE duels SET player2_prediction = ? WHERE id = ?", (direction, duel_id))
            else:
                return {"success": False, "error": "Not a player in this duel"}

            conn.commit()

            # Если это дуэль с ботом, сразу запускаем прогноз бота
            if duel["is_bot"] and duel["player2_id"] and duel["player2_id"] < 0:
                chart_data = await get_chart_history("BTC", 50)
                bot = BOTS.get(duel["player2_id"])
                if bot:
                    bot_prediction = bot.analyze_market(chart_data)
                    conn.execute(
                        "UPDATE duels SET player2_prediction = ? WHERE id = ?",
                        (bot_prediction, duel_id)
                    )
                    conn.commit()

            return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/duel/check_predictions/{duel_id}")
async def check_predictions(duel_id: int):
    with get_db() as conn:
        duel = conn.execute("SELECT * FROM duels WHERE id = ?", (duel_id,)).fetchone()
        if not duel:
            return {"error": "Duel not found"}

        both_submitted = duel["player1_prediction"] is not None and duel["player2_prediction"] is not None

        return {
            "both_submitted": both_submitted,
            "player1_prediction": duel["player1_prediction"],
            "player2_prediction": duel["player2_prediction"]
        }


@app.post("/api/duel/resolve")
async def resolve_duel(request: Request):
    try:
        data = await request.json()
        duel_id = data.get("duel_id")

        with get_db() as conn:
            duel = conn.execute("SELECT * FROM duels WHERE id = ?", (duel_id,)).fetchone()
            if not duel or duel["status"] != "active":
                return {"success": False, "error": "Duel not active"}

            end_price = get_btc_price()
            price_change_pct = ((end_price - duel["start_price"]) / duel["start_price"]) * 100

            if price_change_pct > 0.3:
                real_direction = "up"
            elif price_change_pct < -0.3:
                real_direction = "down"
            else:
                real_direction = "sideways"

            p1_pred = duel["player1_prediction"] or "sideways"
            p2_pred = duel["player2_prediction"] or "sideways"

            # Получаем рейтинги
            p1_rating_data = await get_user_rating(duel["player1_id"])
            p2_rating_data = await get_user_rating(duel["player2_id"])

            p1_win = p1_pred == real_direction
            p2_win = p2_pred == real_direction

            if p1_win and not p2_win:
                winner_id = duel["player1_id"]
            elif p2_win and not p1_win:
                winner_id = duel["player2_id"]
            else:
                winner_id = None

            # Расчет изменения рейтинга
            if winner_id == duel["player1_id"]:
                p1_change = calculate_elo_change(p1_rating_data["rating"], p2_rating_data["rating"], True)
                p2_change = calculate_elo_change(p2_rating_data["rating"], p1_rating_data["rating"], False)
            elif winner_id == duel["player2_id"]:
                p1_change = calculate_elo_change(p1_rating_data["rating"], p2_rating_data["rating"], False)
                p2_change = calculate_elo_change(p2_rating_data["rating"], p1_rating_data["rating"], True)
            else:
                p1_change = 0
                p2_change = 0

            # Обновляем рейтинги
            if duel["player1_id"] > 0:  # Реальный пользователь
                await update_user_rating(duel["player1_id"], p1_change, winner_id == duel["player1_id"])
            else:  # Бот
                bot = BOTS.get(duel["player1_id"])
                if bot:
                    bot.rating += p1_change
                    if winner_id == duel["player1_id"]:
                        bot.wins += 1
                    else:
                        bot.losses += 1

            if duel["player2_id"] > 0:  # Реальный пользователь
                await update_user_rating(duel["player2_id"], p2_change, winner_id == duel["player2_id"])
            else:  # Бот
                bot = BOTS.get(duel["player2_id"])
                if bot:
                    bot.rating += p2_change
                    if winner_id == duel["player2_id"]:
                        bot.wins += 1
                    else:
                        bot.losses += 1

            conn.execute("""
                UPDATE duels SET 
                    status = 'completed', 
                    end_price = ?, 
                    direction = ?,
                    winner_id = ?,
                    player1_score_change = ?,
                    player2_score_change = ?,
                    ended_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (end_price, real_direction, winner_id, p1_change, p2_change, duel_id))

            conn.commit()

            return {
                "success": True,
                "real_direction": real_direction,
                "price_change_pct": round(price_change_pct, 2),
                "winner_id": winner_id,
                "player1_change": p1_change,
                "player2_change": p2_change
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def update_user_rating(user_id: int, rating_change: int, is_win: bool):
    with get_db() as conn:
        rating = conn.execute("SELECT * FROM user_ratings WHERE user_id = ?", (user_id,)).fetchone()
        if rating:
            new_rating = rating["rating"] + rating_change
            new_wins = rating["wins"] + (1 if is_win else 0)
            new_losses = rating["losses"] + (0 if is_win else 1)

            conn.execute("""
                UPDATE user_ratings SET 
                    rating = ?, 
                    wins = ?, 
                    losses = ?,
                    duels_total = duels_total + 1
                WHERE user_id = ?
            """, (new_rating, new_wins, new_losses, user_id))
            conn.commit()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)