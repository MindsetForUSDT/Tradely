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

app = FastAPI(title="Tradeum")

# Подключение
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ========== РЕАЛЬНЫЕ ЦЕНЫ (проверено) ==========
def get_btc_price():
    try:
        r = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", timeout=5)
        return float(r.json()["price"])
    except:
        return 50000.0


def get_eth_price():
    try:
        r = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", timeout=5)
        return float(r.json()["price"])
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        conn.commit()


init_db()


# ========== УПРАВЛЕНИЕ ПОЗИЦИЯМИ ==========

@app.get("/api/positions/{user_id}")
async def get_positions(user_id: int):
    with get_db() as conn:
        positions = conn.execute("""
            SELECT id, symbol, position_type, leverage, entry_price, amount, created_at
            FROM open_positions
            WHERE user_id = ? AND status = 'open'
            ORDER BY created_at DESC
        """, (user_id,)).fetchall()
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
                return {"success": False, "error": f"Need ${margin} margin, have ${user['balance']}"}

            if symbol == "BTC":
                entry_price = get_btc_price()
            else:
                entry_price = get_eth_price()

            # Списываем маржу
            new_balance = user["balance"] - margin
            conn.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))

            # Сохраняем позицию
            conn.execute("""
                INSERT INTO open_positions (user_id, symbol, position_type, leverage, entry_price, amount)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, symbol, position_type, leverage, entry_price, amount))
            conn.commit()

            return {"success": True, "new_balance": new_balance}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/position/close")
async def close_position(request: Request):
    try:
        data = await request.json()
        user_id = data.get("user_id")
        position_id = data.get("position_id")
        close_percent = data.get("close_percent")  # 0-100
        close_amount = data.get("close_amount")  # альтернатива

        with get_db() as conn:
            # Получаем позицию
            pos = conn.execute("SELECT * FROM open_positions WHERE id = ? AND user_id = ?",
                               (position_id, user_id)).fetchone()
            if not pos:
                return {"success": False, "error": "Position not found"}

            # Текущая цена
            if pos["symbol"] == "BTC":
                current_price = get_btc_price()
            else:
                current_price = get_eth_price()

            # Расчёт PnL
            if pos["position_type"] == "long":
                price_change = (current_price - pos["entry_price"]) / pos["entry_price"]
            else:
                price_change = (pos["entry_price"] - current_price) / pos["entry_price"]

            # Определяем закрываемую сумму
            if close_percent:
                close_ratio = close_percent / 100
                close_amount = pos["amount"] * close_ratio
            else:
                close_ratio = close_amount / pos["amount"]
                close_amount = min(close_amount, pos["amount"])

            pnl = pos["amount"] * price_change * pos["leverage"] * close_ratio

            # Возвращаем маржу + PnL
            margin_return = (pos["amount"] / pos["leverage"]) * close_ratio
            total_return = margin_return + pnl

            # Обновляем баланс пользователя
            user = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
            new_balance = user["balance"] + total_return
            conn.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))

            # Обновляем или удаляем позицию
            remaining_amount = pos["amount"] - close_amount
            if remaining_amount <= 0.01:
                conn.execute("DELETE FROM open_positions WHERE id = ?", (position_id,))
            else:
                conn.execute("UPDATE open_positions SET amount = ? WHERE id = ?", (remaining_amount, position_id))

            # Записываем в историю
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
        return [dict(t) for t in trades]

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


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

    btc = round(get_btc_price(), 2)
    eth = round(get_eth_price(), 2)

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": user,
        "recent_trades": recent_trades,
        "btc_price": btc,
        "eth_price": eth
    })


# ========== API ДЛЯ ТОРГОВЛИ ==========
@app.post("/api/trade")
async def api_trade(request: Request):
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

            # Проверка маржи
            margin = amount / leverage
            if margin > user["balance"]:
                return {"success": False, "error": f"Need ${margin} margin, have ${user['balance']}"}

            # Цена входа
            if symbol == "BTC":
                entry_price = get_btc_price()
            else:
                entry_price = get_eth_price()

            # Симуляция движения (через 1 секунду)
            import time
            time.sleep(1)

            if symbol == "BTC":
                exit_price = get_btc_price()
            else:
                exit_price = get_eth_price()

            # Расчёт PnL
            if position_type == "long":
                price_change_pct = (exit_price - entry_price) / entry_price
            else:
                price_change_pct = (entry_price - exit_price) / entry_price

            pnl_percent = price_change_pct * leverage * 100
            pnl_amount = margin * (pnl_percent / 100)
            new_balance = user["balance"] + pnl_amount

            # Обновляем
            is_winning = pnl_amount > 0
            conn.execute(
                "UPDATE users SET balance = ?, total_trades = total_trades + 1, winning_trades = winning_trades + ? WHERE id = ?",
                (new_balance, 1 if is_winning else 0, user_id)
            )
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
        return {"price": get_btc_price()}
    else:
        return {"price": get_eth_price()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)