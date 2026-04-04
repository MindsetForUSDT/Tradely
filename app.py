from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random
import sqlite3
import hashlib
import requests
from datetime import datetime
from contextlib import contextmanager

app = FastAPI(title="Tradeum", description="Трейдинг симулятор с реальными ценами")

# Подключение
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ========== РЕАЛЬНЫЕ ЦЕНЫ ==========
def get_btc_price():
    """Реальная цена BTC с Binance"""
    try:
        response = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
        return float(response.json()["price"])
    except:
        return 50000.0


def get_eth_price():
    """Реальная цена ETH с Binance"""
    try:
        response = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT")
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
                total_trades INTEGER DEFAULT 0,
                winning_trades INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        conn.commit()


init_db()


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
            "SELECT id, username, balance, total_trades, winning_trades FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        recent_trades = conn.execute(
            "SELECT symbol, position_type, leverage, pnl, created_at FROM trades WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
            (user_id,)
        ).fetchall()

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": user,
        "recent_trades": recent_trades,
        "btc_price": round(get_btc_price(), 2),
        "eth_price": round(get_eth_price(), 2)
    })


@app.post("/api/trade")
async def api_trade(request: Request):
    try:
        data = await request.json()
        user_id = data.get("user_id")
        symbol = data.get("symbol")
        position_type = data.get("position_type")  # "long" или "short"
        leverage = data.get("leverage")
        amount = data.get("amount")

        with get_db() as conn:
            user = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
            if not user:
                return {"success": False, "error": "User not found"}

            # Проверка маржи
            margin = amount / leverage
            if margin > user["balance"]:
                return {"success": False, "error": f"Need ${margin} margin, but you have ${user['balance']}"}

            # Получаем цену входа
            if symbol == "BTC":
                entry_price = get_btc_price()
            else:
                entry_price = get_eth_price()

            # Симуляция движения цены (через 1 секунду)
            import time
            time.sleep(1)

            if symbol == "BTC":
                exit_price = get_btc_price()
            else:
                exit_price = get_eth_price()

            # Расчёт PnL
            if position_type == "long":
                price_change_pct = (exit_price - entry_price) / entry_price
            else:  # short
                price_change_pct = (entry_price - exit_price) / entry_price

            pnl_percent = price_change_pct * leverage * 100
            pnl_amount = margin * (pnl_percent / 100)
            new_balance = user["balance"] + pnl_amount

            # Обновляем баланс
            is_winning = pnl_amount > 0
            conn.execute(
                "UPDATE users SET balance = ?, total_trades = total_trades + 1, winning_trades = winning_trades + ? WHERE id = ?",
                (new_balance, 1 if is_winning else 0, user_id)
            )

            # Записываем сделку
            conn.execute("""
                INSERT INTO trades (user_id, symbol, position_type, leverage, entry_price, exit_price, amount, pnl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, symbol, position_type, leverage, entry_price, exit_price, amount, round(pnl_amount, 2)))
            conn.commit()

            return {
                "success": True,
                "entry_price": round(entry_price, 2),
                "exit_price": round(exit_price, 2),
                "price_change_pct": round(price_change_pct * 100, 2),
                "pnl_percent": round(pnl_percent, 2),
                "pnl_amount": round(pnl_amount, 2),
                "new_balance": round(new_balance, 2)
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/price/{symbol}")
async def get_price(symbol: str):
    if symbol == "BTC":
        price = get_btc_price()
    else:
        price = get_eth_price()
    return {"price": round(price, 2)}


@app.get("/api/history/{symbol}")
async def get_history(symbol: str):
    """Генерирует исторические данные для графика"""
    data = []
    if symbol == "BTC":
        price = 50000
    else:
        price = 3000

    now = datetime.now()
    for i in range(100, 0, -1):
        # Добавляем реалистичное случайное блуждание
        price *= (1 + (random.random() - 0.48) * 0.01)
        timestamp = int((now.timestamp() - i * 3600) * 1000)
        data.append({"time": timestamp, "value": round(price, 2)})
    return data


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)