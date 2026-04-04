from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random
import sqlite3
import hashlib
from datetime import datetime
from contextlib import contextmanager

app = FastAPI(title="Tradeum", description="Стань мастером рынка — играй, торгуй, побеждай")

# Подключение статики и шаблонов
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# Инициализация базы данных
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
                level INTEGER DEFAULT 1,
                balance REAL DEFAULT 1000.0,
                experience INTEGER DEFAULT 0,
                total_trades INTEGER DEFAULT 0,
                winning_trades INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                price_change REAL NOT NULL,
                balance_change REAL NOT NULL,
                new_balance REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        conn.commit()


init_db()

# Миссии для каждого уровня
MISSIONS = {
    1: {"goal": 5, "text": "🌟 Первый шаг к величию — заработай +5% за одну сделку", "reward": 50},
    2: {"goal": 10, "text": "⚡ Входишь во вкус — заработай +10% за одну сделку", "reward": 100},
    3: {"goal": 15, "text": "🔥 Ты в зоне — заработай +15% за одну сделку", "reward": 150},
    4: {"goal": 20, "text": "🏆 Мастерский удар — заработай +20% за одну сделку", "reward": 200},
    5: {"goal": 25, "text": "👑 Легенда рынка — заработай +25% и войди в историю", "reward": 500},
}


# Симуляция рынка
def simulate_market():
    r = random.random()
    if r < 0.4:
        return round(random.uniform(-1, 1.5), 2)
    elif r < 0.7:
        return round(random.uniform(-3, 4), 2)
    elif r < 0.9:
        return round(random.uniform(-6, 7), 2)
    else:
        return round(random.uniform(-10, 12), 2)


def check_level_up(level, balance_change):
    if level in MISSIONS:
        if balance_change >= MISSIONS[level]["goal"]:
            return True
    return False


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ========== РОУТЫ ==========

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


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
        raise HTTPException(status_code=400, detail="Username already exists")


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, registered: str = None, error: str = None):
    return templates.TemplateResponse("login.html", {
        "request": request,
        "registered": registered,
        "error": error
    })


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
            "SELECT id, username, level, balance, experience, total_trades, winning_trades FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        recent_trades = conn.execute(
            "SELECT price_change, balance_change, new_balance, created_at FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
            (user_id,)
        ).fetchall()

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": user,
        "missions": MISSIONS,
        "current_mission": MISSIONS.get(user["level"], MISSIONS[1]),
        "recent_trades": recent_trades
    })


@app.post("/trade")
async def make_trade(user_id: int = Form(...)):
    with get_db() as conn:
        user = conn.execute(
            "SELECT id, level, balance FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        price_change = simulate_market()
        old_balance = user["balance"]
        new_balance = round(old_balance * (1 + price_change / 100), 2)
        balance_change = round(((new_balance - old_balance) / old_balance) * 100, 2)

        level_up = check_level_up(user["level"], balance_change)
        new_level = user["level"] + 1 if level_up else user["level"]

        is_winning = balance_change > 0
        conn.execute(
            """UPDATE users SET 
                balance = ?, 
                level = ?,
                total_trades = total_trades + 1,
                winning_trades = winning_trades + ?
            WHERE id = ?""",
            (new_balance, new_level, 1 if is_winning else 0, user_id)
        )

        conn.execute(
            "INSERT INTO trades (user_id, price_change, balance_change, new_balance) VALUES (?, ?, ?, ?)",
            (user_id, price_change, balance_change, new_balance)
        )
        conn.commit()

        current_mission = MISSIONS.get(new_level, MISSIONS[1])
        next_mission = MISSIONS.get(new_level + 1)

    return {
        "success": True,
        "old_balance": round(old_balance, 2),
        "new_balance": new_balance,
        "price_change": price_change,
        "balance_change": balance_change,
        "level_up": level_up,
        "new_level": new_level,
        "mission_completed": level_up,
        "mission_text": current_mission["text"],
        "next_mission_text": next_mission["text"] if next_mission else "🎉 Ты достиг вершин! Ты — легенда Tradeum!",
        "next_mission_goal": next_mission["goal"] if next_mission else None
    }


@app.get("/api/user/{user_id}")
async def get_user(user_id: int):
    with get_db() as conn:
        user = conn.execute(
            "SELECT id, username, level, balance, total_trades, winning_trades FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        recent_trades = conn.execute(
            "SELECT price_change, balance_change, created_at FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
            (user_id,)
        ).fetchall()

        win_rate = round((user["winning_trades"] / user["total_trades"] * 100), 1) if user["total_trades"] > 0 else 0

        return {
            "username": user["username"],
            "level": user["level"],
            "balance": user["balance"],
            "total_trades": user["total_trades"],
            "win_rate": win_rate,
            "recent_trades": [dict(trade) for trade in recent_trades]
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)