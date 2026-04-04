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
import plotly.graph_objs as go
import plotly.utils
import json
import pandas as pd
import random
from datetime import datetime, timedelta


# ========== ГЕНЕРАЦИЯ ДАННЫХ ДЛЯ ГРАФИКА ==========
def generate_candle_data(symbol="BTC", interval="1h", limit=100):
    """Генерирует реалистичные свечные данные для графика"""
    if symbol == "BTC":
        base_price = 50000
    else:
        base_price = 3000

    data = []
    current_time = datetime.now()

    for i in range(limit, 0, -1):
        # Случайное блуждание с трендом
        change = random.uniform(-0.02, 0.025)
        base_price *= (1 + change)

        open_price = base_price
        close_price = base_price * (1 + random.uniform(-0.01, 0.01))
        high_price = max(open_price, close_price) * (1 + random.uniform(0, 0.005))
        low_price = min(open_price, close_price) * (1 - random.uniform(0, 0.005))

        data.append({
            "time": current_time - timedelta(hours=i),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2)
        })

    return data


@app.get("/api/chart_data/{symbol}")
async def get_chart_data(symbol: str, interval: str = "1h", limit: int = 100):
    """Возвращает данные для графика в формате JSON"""
    data = generate_candle_data(symbol, interval, limit)

    # Форматируем для Plotly
    df = pd.DataFrame(data)

    fig = go.Figure(data=[go.Candlestick(
        x=df['time'],
        open=df['open'],
        high=df['high'],
        low=df['low'],
        close=df['close'],
        name='Price'
    )])

    # Настройки графика
    fig.update_layout(
        template='plotly_dark',
        title=f'{symbol}/USDT - Реальный рынок',
        xaxis_title='Время',
        yaxis_title='Цена (USDT)',
        height=500,
        margin=dict(l=0, r=0, t=40, b=0),
        paper_bgcolor='#121624',
        plot_bgcolor='#0F1320',
        font=dict(color='#E8EDF2')
    )

    # Добавляем скользящие средние
    df['MA7'] = df['close'].rolling(window=7).mean()
    df['MA25'] = df['close'].rolling(window=25).mean()

    fig.add_trace(go.Scatter(
        x=df['time'],
        y=df['MA7'],
        name='MA 7',
        line=dict(color='#FF9800', width=1)
    ))

    fig.add_trace(go.Scatter(
        x=df['time'],
        y=df['MA25'],
        name='MA 25',
        line=dict(color='#E91E63', width=1)
    ))

    # Добавляем RSI как субграфик
    # Рассчитываем RSI
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))

    fig.add_trace(go.Scatter(
        x=df['time'],
        y=df['RSI'],
        name='RSI (14)',
        line=dict(color='#9C27B0', width=1),
        yaxis='y2'
    ))

    # Настройка второй оси для RSI
    fig.update_layout(
        yaxis2=dict(
            title='RSI',
            overlaying='y',
            side='right',
            range=[0, 100],
            showgrid=False
        )
    )

    # Конвертируем в JSON для передачи в HTML
    chart_json = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)

    return {"chart_json": chart_json}


app = FastAPI(title="Tradeum")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ========== ЦЕНЫ ==========
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
        # Таблица пользователей
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

        # Таблица открытых позиций
        conn.execute("""
            CREATE TABLE IF NOT EXISTS open_positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                position_type TEXT NOT NULL,
                leverage INTEGER NOT NULL,
                entry_price REAL NOT NULL,
                amount REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        # Таблица истории
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


# ========== СТРАНИЦЫ ==========
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, registered: str = None, error: str = None):
    return templates.TemplateResponse("login.html", {"request": request, "registered": registered, "error": error})


@app.post("/register")
async def register(username: str = Form(...), password: str = Form(...)):
    try:
        with get_db() as conn:
            conn.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                         (username, hash_password(password)))
            conn.commit()
        return RedirectResponse(url="/login?registered=1", status_code=303)
    except:
        return RedirectResponse(url="/login?error=exists", status_code=303)


@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    with get_db() as conn:
        user = conn.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,)).fetchone()
        if not user or user["password_hash"] != hash_password(password):
            return RedirectResponse(url="/login?error=1", status_code=303)
        return RedirectResponse(url=f"/dashboard?user_id={user['id']}", status_code=303)


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, user_id: int):
    with get_db() as conn:
        user = conn.execute("SELECT id, username, balance, total_trades, winning_trades FROM users WHERE id = ?",
                            (user_id,)).fetchone()
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


# ========== API ДЛЯ ТОРГОВЛИ ==========
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
            "SELECT id, symbol, position_type, leverage, entry_price, amount, created_at FROM open_positions WHERE user_id = ?",
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

            # Получаем цену входа
            if symbol == "BTC":
                entry_price = get_btc_price()
            else:
                entry_price = get_eth_price()

            # Списываем маржу
            new_balance = user["balance"] - margin
            conn.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))

            # Открываем позицию
            conn.execute("""
                INSERT INTO open_positions (user_id, symbol, position_type, leverage, entry_price, amount)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, symbol, position_type, leverage, entry_price, amount))
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
            # Получаем позицию
            pos = conn.execute("SELECT * FROM open_positions WHERE id = ? AND user_id = ?",
                               (position_id, user_id)).fetchone()
            if not pos:
                return {"success": False, "error": "Position not found"}

            # Проверяем сумму закрытия
            if close_amount > pos["amount"]:
                close_amount = pos["amount"]

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

            close_ratio = close_amount / pos["amount"]
            pnl = pos["amount"] * price_change * pos["leverage"] * close_ratio
            margin_return = (pos["amount"] / pos["leverage"]) * close_ratio
            total_return = margin_return + pnl

            # Обновляем баланс
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
        return [{"symbol": t["symbol"], "position_type": t["position_type"],
                 "leverage": t["leverage"], "pnl": t["pnl"],
                 "created_at": t["created_at"][:19]} for t in trades]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)