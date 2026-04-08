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

        return RedirectResponse(url=f"/dashboard?user_id={user['id']}", status_code=303)


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, user_id: int):
    with get_db() as conn:
        user = conn.execute(
            "SELECT id, username, balance FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

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
    return templates.TemplateResponse("duel.html", {"request": request})


@app.get("/leaderboard", response_class=HTMLResponse)
async def leaderboard_page(request: Request):
    return templates.TemplateResponse("leaderboard.html", {"request": request})


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
    """Генерирует реалистичные исторические данные для графика на основе текущей цены"""
    data = []
    if symbol == "BTC":
        base_price = get_btc_price()
    else:
        base_price = get_eth_price()

    # Идем от прошлого к настоящему
    current_price = base_price
    now = datetime.now()

    for i in range(limit, 0, -1):
        # Генерируем реалистичный шум (волатильность)
        change = random.gauss(0, 0.008)  # 0.8% стандартное отклонение
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
        return [dict(l) for l in leaders]


@app.post("/api/duel/create")
async def create_duel(request: Request):
    try:
        data = await request.json()
        user_id = data.get("user_id")

        with get_db() as conn:
            waiting = conn.execute(
                "SELECT id FROM duels WHERE status = 'waiting' AND player1_id != ?",
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

            p1_rating = conn.execute("SELECT * FROM user_ratings WHERE user_id = ?", (duel["player1_id"],)).fetchone()
            p2_rating = conn.execute("SELECT * FROM user_ratings WHERE user_id = ?", (duel["player2_id"],)).fetchone()

            p1_win = (p1_pred == real_direction and p2_pred != real_direction) or (
                        p1_pred == "up" and real_direction == "up") or (p1_pred == "down" and real_direction == "down")
            p2_win = (p2_pred == real_direction and p1_pred != real_direction) or (
                        p2_pred == "up" and real_direction == "up") or (p2_pred == "down" and real_direction == "down")

            if (p1_win and p2_win) or (not p1_win and not p2_win):
                p1_change = 0
                p2_change = 0
                winner_id = None
                new_p1_streak = 0
                new_p2_streak = 0
                new_p1_loss = p1_rating["current_loss_streak"] + 1
                new_p2_loss = p2_rating["current_loss_streak"] + 1
            elif p1_win:
                winner_id = duel["player1_id"]
                p1_change = calculate_elo_change(p1_rating["rating"], p2_rating["rating"], True)
                p2_change = calculate_elo_change(p2_rating["rating"], p1_rating["rating"], False)
                new_p1_streak = p1_rating["current_win_streak"] + 1
                new_p2_streak = 0
                new_p1_loss = 0
                new_p2_loss = p2_rating["current_loss_streak"] + 1
            else:
                winner_id = duel["player2_id"]
                p1_change = calculate_elo_change(p1_rating["rating"], p2_rating["rating"], False)
                p2_change = calculate_elo_change(p2_rating["rating"], p1_rating["rating"], True)
                new_p1_streak = 0
                new_p2_streak = p2_rating["current_win_streak"] + 1
                new_p1_loss = p1_rating["current_loss_streak"] + 1
                new_p2_loss = 0

            new_p1_rating = p1_rating["rating"] + p1_change
            new_p2_rating = p2_rating["rating"] + p2_change

            conn.execute("""
                UPDATE user_ratings SET 
                    rating = ?, 
                    wins = wins + ?, 
                    losses = losses + ?,
                    current_win_streak = ?,
                    current_loss_streak = ?,
                    best_win_streak = MAX(best_win_streak, ?),
                    duels_total = duels_total + 1
                WHERE user_id = ?
            """, (new_p1_rating, 1 if winner_id == duel["player1_id"] else 0,
                  1 if winner_id == duel["player2_id"] else 0,
                  new_p1_streak, new_p1_loss, new_p1_streak, duel["player1_id"]))

            conn.execute("""
                UPDATE user_ratings SET 
                    rating = ?, 
                    wins = wins + ?, 
                    losses = losses + ?,
                    current_win_streak = ?,
                    current_loss_streak = ?,
                    best_win_streak = MAX(best_win_streak, ?),
                    duels_total = duels_total + 1
                WHERE user_id = ?
            """, (new_p2_rating, 1 if winner_id == duel["player2_id"] else 0,
                  1 if winner_id == duel["player1_id"] else 0,
                  new_p2_streak, new_p2_loss, new_p2_streak, duel["player2_id"]))

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)