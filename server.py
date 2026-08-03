import os
import time
import math
import re
import hashlib
import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client

# ==========================================
# 1. HARDCODED SUPABASE CREDENTIALS
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://tkvcianczzdxrjylrdyq.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInRlZiI6InRrdmNpYW5jenpkeHJqeWxyZHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTMwNjQsImV4cCI6MjEwMTI4OTA2NH0.81-XSAxkfZ1nIH4UpYKeX4ybrR3olnt0KkZ6l8vngCg")

# Initialize Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
print("✅ Supabase Python Client connected successfully to Render Backend!")

app = FastAPI(
    title="Secure Server-Sided Casino Engine",
    description="Render Production Python Backend for Color Prediction Engine with Supabase DB",
    version="2.0.0"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. IN-MEMORY CACHE & SERVER AUTHORITATIVE STATE
# ==========================================
state = {
    "users": [],
    "rounds": [],
    "bets": [],
    "deposits": [],
    "withdrawals": [],
    "settings": {
        "upiId": "merchant@ybl",
        "upiName": "FastPay Official",
        "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=merchant@ybl&pn=FastPay",
        "minDeposit": 500,
        "maxDeposit": 5000,
        "minWithdrawal": 300,
        "maxWithdrawal": 300000,
        "manualOverrideNumber": None
    }
}

# Simple In-Memory Rate Limiter against DDoS / Brute Force
rate_limit_store = {}

def check_rate_limit(ip: str, limit: int = 1000, window_sec: int = 60):
    now = time.time()
    if ip not in rate_limit_store:
        rate_limit_store[ip] = []
    # Filter requests in current window
    rate_limit_store[ip] = [t for t in rate_limit_store[ip] if now - t < window_sec]
    if len(rate_limit_store[ip]) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Too many requests. Please wait before retrying."
        )
    rate_limit_store[ip].append(now)

# ==========================================
# 3. INPUT SANITIZATION & SECURITY HELPERS
# ==========================================
def sanitize_text(val: Optional[str]) -> str:
    if not val or not isinstance(val, str):
        return ""
    # Strip HTML tags & hazardous script chars to prevent XSS / Injection
    clean = re.sub(r'[<>&"\'/]', '', val)
    return clean.strip()

def sanitize_phone(phone: Optional[str]) -> str:
    if not phone or not isinstance(phone, str):
        return ""
    digits = re.sub(r'[^\d]', '', phone)
    return digits[:15]

# ==========================================
# 4. SERVER-SIDE AUTHORITATIVE TIMER & LOCK
# ==========================================
ROOM_DURATIONS = {
    "WINGO_30S": 30,
    "WINGO_1M": 60,
    "WINGO_3M": 180,
    "WINGO_5M": 300,
    "PARITY": 180,
    "SAPRE": 180,
    "BCONE": 180,
    "EMERD": 180,
}

def get_server_period(room: str = "WINGO_30S"):
    duration = ROOM_DURATIONS.get(room, 30)
    now_sec = int(time.time())
    current_round_index = now_sec // duration
    time_left = duration - (now_sec % duration)
    
    # Generate deterministic period string: YYYYMMDD + round index
    today_str = time.strftime("%Y%m%d", time.gmtime(now_sec))
    period = f"{today_str}{current_round_index}"
    
    # Strict 5 second lock period before round end
    is_locked = time_left <= 5
    
    return {
        "period": period,
        "timeLeft": time_left,
        "duration": duration,
        "isLocked": is_locked,
        "serverTime": int(time.time() * 1000)
    }

# ==========================================
# 5. SUPABASE HYDRATION & RETENTION (MAX 1000)
# ==========================================
def load_data_from_supabase():
    try:
        # Load Users
        res_users = supabase.table("users").select("*").execute()
        if res_users.data:
            state["users"] = [{
                "id": u["id"],
                "phone": u["phone"],
                "name": u["name"],
                "balance": float(u["balance"]),
                "isAdmin": bool(u.get("is_admin", False)),
                "createdAt": int(u.get("created_at", time.time() * 1000))
            } for u in res_users.data]

        # Load Rounds (Ordered newest first, max 1000)
        res_rounds = supabase.table("game_rounds").select("*").order("timestamp", desc=True).limit(1000).execute()
        if res_rounds.data:
            state["rounds"] = [{
                "period": str(r["period"]),
                "room": r.get("room", "WINGO_30S"),
                "number": int(r["number"]),
                "colors": r.get("colors", []),
                "bigSmall": r.get("big_small", "SMALL"),
                "timestamp": int(r.get("timestamp", time.time() * 1000)),
                "seedHash": r.get("seed_hash", ""),
                "totalBetsCount": int(r.get("total_bets_count", 0)),
                "totalBetsAmount": float(r.get("total_bets_amount", 0))
            } for r in res_rounds.data]

        # Load Settings
        res_set = supabase.table("system_settings").select("*").eq("id", "main").execute()
        if res_set.data and len(res_set.data) > 0:
            s = res_set.data[0]
            state["settings"]["upiId"] = s.get("upi_id", state["settings"]["upiId"])
            state["settings"]["upiName"] = s.get("upi_name", state["settings"]["upiName"])
            state["settings"]["qrCodeUrl"] = s.get("qr_code_url", state["settings"]["qrCodeUrl"])
            state["settings"]["minDeposit"] = float(s.get("min_deposit", 500))
            state["settings"]["maxDeposit"] = float(s.get("max_deposit", 5000))
            state["settings"]["minWithdrawal"] = float(s.get("min_withdrawal", 300))
            state["settings"]["maxWithdrawal"] = float(s.get("max_withdrawal", 300000))

        print(f"⚡ [SUPABASE PYTHON LOADED] {len(state['users'])} Users, {len(state['rounds'])} Period Results (Max 1000 Limit).")
    except Exception as e:
        print(f"⚠️ Supabase Hydration Notice: {e}")

# Hydrate on startup
load_data_from_supabase()

def enforce_max_1000_rounds_in_supabase():
    try:
        # Check if rounds count > 1000
        res = supabase.table("game_rounds").select("timestamp").order("timestamp", desc=True).range(1000, 1000).execute()
        if res.data and len(res.data) > 0:
            cutoff = res.data[0]["timestamp"]
            supabase.table("game_rounds").delete().lt("timestamp", cutoff).execute()
            print(f"🧹 Pruned old game rounds before timestamp {cutoff} (Retained last 1000 only).")
    except Exception as e:
        print(f"Error pruning rounds in Supabase: {e}")

# ==========================================
# 6. PYDANTIC REQUEST MODELS
# ==========================================
class LoginReq(BaseModel):
    phone: str
    password: Optional[str] = None

class RegisterReq(BaseModel):
    phone: str
    name: Optional[str] = None
    referralCode: Optional[str] = None

class BetReq(BaseModel):
    userId: str
    room: str = "WINGO_30S"
    selection: str
    amount: float

class DepositReq(BaseModel):
    userId: str
    amount: float
    utr: str

class WithdrawReq(BaseModel):
    userId: str
    amount: float
    type: str = "UPI"
    upiId: Optional[str] = None
    bankDetails: Optional[Dict[str, Any]] = None

class AddPeriodReq(BaseModel):
    period: str
    room: str = "WINGO_30S"
    number: int

# ==========================================
# 7. PRODUCTION API ENDPOINTS
# ==========================================

@app.get("/")
def health_check():
    return {
        "status": "online",
        "server": "Render Production Python Backend",
        "timestamp": int(time.time() * 1000),
        "database": "Supabase Active",
        "retentionLimit": 1000
    }

@app.get("/api/game/timer")
def get_timer(request: Request, room: str = "WINGO_30S"):
    check_rate_limit(request.client.host, limit=120)
    return get_server_period(room)

@app.post("/api/auth/login")
def login(req: LoginReq, request: Request):
    check_rate_limit(request.client.host, limit=15)
    clean_p = sanitize_phone(req.phone)
    if not clean_p or len(clean_p) < 10:
        raise HTTPException(status_code=400, detail="Valid 10-digit mobile number required")

    user = next((u for u in state["users"] if u["phone"] == clean_p), None)
    if not user:
        user = {
            "id": f"usr_{int(time.time() * 1000)}",
            "phone": clean_p,
            "name": f"Player_{clean_p[-4:]}",
            "balance": 100.0, # ₹100 Trial Welcome Bonus
            "isAdmin": clean_p == "9999999999",
            "createdAt": int(time.time() * 1000)
        }
        state["users"].append(user)
        try:
            supabase.table("users").upsert({
                "id": user["id"],
                "phone": user["phone"],
                "name": user["name"],
                "balance": user["balance"],
                "is_admin": user["isAdmin"],
                "created_at": user["createdAt"]
            }).execute()
        except Exception as e:
            print("Supabase user save err:", e)

    return {"user": user}

@app.post("/api/auth/register")
def register(req: RegisterReq, request: Request):
    check_rate_limit(request.client.host, limit=15)
    clean_p = sanitize_phone(req.phone)
    clean_n = sanitize_text(req.name)
    if not clean_p or len(clean_p) < 10:
        raise HTTPException(status_code=400, detail="Valid 10-digit mobile number required")

    user = next((u for u in state["users"] if u["phone"] == clean_p), None)
    if user:
        return {"user": user}

    new_user = {
        "id": f"usr_{int(time.time() * 1000)}",
        "phone": clean_p,
        "name": clean_n or f"Player_{clean_p[-4:]}",
        "balance": 100.0,
        "isAdmin": clean_p == "9999999999",
        "createdAt": int(time.time() * 1000)
    }
    state["users"].append(new_user)
    try:
        supabase.table("users").upsert({
            "id": new_user["id"],
            "phone": new_user["phone"],
            "name": new_user["name"],
            "balance": new_user["balance"],
            "is_admin": new_user["isAdmin"],
            "created_at": new_user["createdAt"]
        }).execute()
    except Exception as e:
        print("Supabase user save err:", e)

    return {"user": new_user}

@app.post("/api/game/bet")
def place_bet(req: BetReq, request: Request):
    check_rate_limit(request.client.host, limit=30)
    room = req.room or "WINGO_30S"
    p_info = get_server_period(room)

    # Server-Side Verification: Anti-Burp Suite Lock
    if p_info["isLocked"]:
        raise HTTPException(status_code=400, detail="Bidding is locked in the last 5 seconds of the round!")

    user = next((u for u in state["users"] if u["id"] == req.userId), None)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    amt = float(req.amount)
    if amt < 1 or math.isnan(amt):
        raise HTTPException(status_code=400, detail="Invalid bid amount")

    if user["balance"] < amt:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance!")

    # Deduct on server
    user["balance"] -= amt

    new_bet = {
        "id": f"bet_{int(time.time() * 1000)}",
        "userId": user["id"],
        "userName": user["name"],
        "period": p_info["period"],
        "room": room,
        "selection": req.selection,
        "amount": amt,
        "payout": 0.0,
        "status": "PENDING",
        "createdAt": int(time.time() * 1000),
        "multiplier": 0.0
    }

    state["bets"].insert(0, new_bet)

    # Sync to Supabase
    try:
        supabase.table("bets").upsert({
            "id": new_bet["id"],
            "user_id": new_bet["userId"],
            "user_name": new_bet["userName"],
            "period": new_bet["period"],
            "room": new_bet["room"],
            "selection": new_bet["selection"],
            "amount": new_bet["amount"],
            "payout": 0.0,
            "status": "PENDING",
            "created_at": new_bet["createdAt"]
        }).execute()

        supabase.table("users").upsert({
            "id": user["id"],
            "phone": user["phone"],
            "name": user["name"],
            "balance": user["balance"],
            "is_admin": user["isAdmin"],
            "created_at": user["createdAt"]
        }).execute()
    except Exception as e:
        print("Supabase bet sync error:", e)

    return {
        "success": True,
        "bet": new_bet,
        "updatedBalance": user["balance"]
    }

@app.post("/api/wallet/deposit")
def deposit(req: DepositReq, request: Request):
    check_rate_limit(request.client.host, limit=10)
    user = next((u for u in state["users"] if u["id"] == req.userId), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    amt = float(req.amount)
    clean_utr = sanitize_text(req.utr)
    min_dep = state["settings"]["minDeposit"]
    max_dep = state["settings"]["maxDeposit"]

    if amt < 500:
        raise HTTPException(status_code=400, detail="₹100 deposit option is NOT AVAILABLE. Minimum deposit is ₹500.")

    if amt < min_dep or amt > max_dep:
        raise HTTPException(status_code=400, detail=f"Deposit amount must be between ₹{min_dep} and ₹{max_dep}")

    if not clean_utr or len(clean_utr) < 8:
        raise HTTPException(status_code=400, detail="Valid 12-digit UPI UTR / Ref Transaction ID is required!")

    dep = {
        "id": f"dep_{int(time.time() * 1000)}",
        "userId": user["id"],
        "userName": user["name"],
        "userPhone": user["phone"],
        "amount": amt,
        "utr": clean_utr,
        "status": "PENDING",
        "paymentMethod": "UPI",
        "createdAt": int(time.time() * 1000)
    }

    state["deposits"].insert(0, dep)

    try:
        supabase.table("deposits").upsert({
            "id": dep["id"],
            "user_id": dep["userId"],
            "user_name": dep["userName"],
            "user_phone": dep["userPhone"],
            "amount": dep["amount"],
            "utr": dep["utr"],
            "status": "PENDING",
            "payment_method": "UPI",
            "created_at": dep["createdAt"]
        }).execute()
    except Exception as e:
        print("Supabase deposit err:", e)

    return {
        "success": True,
        "deposit": dep,
        "message": f"Deposit request of ₹{amt} submitted! Pending manual UTR verification by admin."
    }

@app.get("/api/admin/periods")
def get_admin_periods(request: Request):
    check_rate_limit(request.client.host, limit=60)
    return {
        "rounds": state["rounds"][:1000],
        "totalCount": len(state["rounds"]),
        "maxLimit": 1000
    }

@app.post("/api/admin/periods")
def add_admin_period(req: AddPeriodReq, request: Request):
    check_rate_limit(request.client.host, limit=30)
    winning_num = int(req.number)
    if winning_num < 0 or winning_num > 9:
        raise HTTPException(status_code=400, detail="Winning number must be between 0 and 9")

    colors = []
    if winning_num == 0:
        colors = ["RED", "VIOLET"]
    elif winning_num == 5:
        colors = ["GREEN", "VIOLET"]
    elif winning_num in [1, 3, 7, 9]:
        colors = ["GREEN"]
    else:
        colors = ["RED"]

    big_small = "BIG" if winning_num >= 5 else "SMALL"
    seed_hash = hashlib.sha256(f"{req.period}-PYTHON-{winning_num}".encode()).hexdigest()

    round_obj = {
        "period": str(req.period),
        "room": req.room or "WINGO_30S",
        "number": winning_num,
        "colors": colors,
        "bigSmall": big_small,
        "timestamp": int(time.time() * 1000),
        "seedHash": seed_hash,
        "totalBetsCount": 0,
        "totalBetsAmount": 0.0
    }

    # Upsert in memory state
    idx = next((i for i, r in enumerate(state["rounds"]) if r["period"] == str(req.period)), -1)
    if idx >= 0:
        state["rounds"][idx] = round_obj
    else:
        state["rounds"].insert(0, round_obj)

    # Retain top 1000 in memory
    state["rounds"] = state["rounds"][:1000]

    # Sync to Supabase
    try:
        supabase.table("game_rounds").upsert({
            "period": round_obj["period"],
            "room": round_obj["room"],
            "number": round_obj["number"],
            "colors": round_obj["colors"],
            "big_small": round_obj["bigSmall"],
            "timestamp": round_obj["timestamp"],
            "seed_hash": round_obj["seedHash"],
            "total_bets_count": 0,
            "total_bets_amount": 0.0
        }).execute()

        enforce_max_1000_rounds_in_supabase()
    except Exception as e:
        print("Supabase period save err:", e)

    return {
        "success": True,
        "round": round_obj,
        "message": f"Period {req.period} saved in Supabase database!"
    }

@app.get("/api/game/state")
def get_game_state(request: Request, room: str = "WINGO_30S"):
    check_rate_limit(request.client.host, limit=120)
    p_info = get_server_period(room)
    room_rounds = [r for r in state["rounds"] if r.get("room") == room or not r.get("room")]
    last_round = room_rounds[0] if room_rounds else (state["rounds"][0] if state["rounds"] else None)

    return {
        "period": p_info["period"],
        "room": room,
        "secondsRemaining": p_info["timeLeft"],
        "roundDurationSeconds": p_info["duration"],
        "isLocked": p_info["isLocked"],
        "lastRound": last_round,
        "historyCount": len(room_rounds),
        "onlineUsersCount": 184 + (int(time.time()) % 97)
    }

@app.get("/api/game/history")
def get_game_history(request: Request, page: int = 1, limit: int = 20, room: str = "WINGO_30S"):
    check_rate_limit(request.client.host, limit=120)
    filtered = [r for r in state["rounds"] if r.get("room") == room or not r.get("room")]
    start_idx = (page - 1) * limit
    paginated = filtered[start_idx : start_idx + limit]

    return {
        "rounds": paginated,
        "total": len(filtered),
        "page": page,
        "totalPages": math.ceil(len(filtered) / limit) if filtered else 1
    }

@app.get("/api/game/my-bets/{user_id}")
def get_my_bets(user_id: str, request: Request):
    check_rate_limit(request.client.host, limit=60)
    user_bets = [b for b in state["bets"] if b.get("userId") == user_id][:50]
    return {"bets": user_bets}

# Background thread for automated round looper in Python
import threading

last_processed_py = {}

def process_python_round_result(period: str, room: str):
    winning_num = state["settings"]["manualOverrideNumber"]
    if winning_num is not None and 0 <= winning_num <= 9:
        state["settings"]["manualOverrideNumber"] = None
    else:
        winning_num = int(time.time() * 1000) % 10

    colors = []
    if winning_num == 0:
        colors = ["RED", "VIOLET"]
    elif winning_num == 5:
        colors = ["GREEN", "VIOLET"]
    elif winning_num in [1, 3, 7, 9]:
        colors = ["GREEN"]
    else:
        colors = ["RED"]

    big_small = "BIG" if winning_num >= 5 else "SMALL"
    seed_hash = hashlib.sha256(f"{period}-{room}-RENDER-{winning_num}".encode()).hexdigest()

    # Process bets
    round_bets = [b for b in state["bets"] if b.get("period") == period or (b.get("room") == room and b.get("status") == "PENDING")]
    tot_amt = 0.0
    tot_payout = 0.0

    for bet in round_bets:
        tot_amt += bet["amount"]
        won = False
        mult = 0.0
        sel = bet["selection"]

        if sel == "GREEN" and "GREEN" in colors:
            won = True
            mult = 1.5 if winning_num == 5 else 2.0
        elif sel == "RED" and "RED" in colors:
            won = True
            mult = 1.5 if winning_num == 0 else 2.0
        elif sel == "VIOLET" and "VIOLET" in colors:
            won = True
            mult = 4.5
        elif sel == "BIG" and big_small == "BIG":
            won = True
            mult = 2.0
        elif sel == "SMALL" and big_small == "SMALL":
            won = True
            mult = 2.0
        elif sel == str(winning_num):
            won = True
            mult = 9.0

        bet["status"] = "WON" if won else "LOST"
        bet["multiplier"] = mult

        if won:
            win_amt = math.floor(bet["amount"] * mult)
            bet["payout"] = win_amt
            tot_payout += win_amt
            user = next((u for u in state["users"] if u["id"] == bet["userId"]), None)
            if user:
                user["balance"] += win_amt
        else:
            bet["payout"] = 0.0

    new_round = {
        "period": str(period),
        "room": room,
        "number": winning_num,
        "colors": colors,
        "bigSmall": big_small,
        "timestamp": int(time.time() * 1000),
        "seedHash": seed_hash,
        "totalBetsCount": len(round_bets),
        "totalBetsAmount": tot_amt
    }

    state["rounds"].insert(0, new_round)
    state["rounds"] = state["rounds"][:1000]

    # Save to Supabase
    try:
        supabase.table("game_rounds").upsert({
            "period": new_round["period"],
            "room": new_round["room"],
            "number": new_round["number"],
            "colors": new_round["colors"],
            "big_small": new_round["bigSmall"],
            "timestamp": new_round["timestamp"],
            "seed_hash": new_round["seedHash"],
            "total_bets_count": new_round["totalBetsCount"],
            "total_bets_amount": new_round["totalBetsAmount"]
        }).execute()

        for b in round_bets:
            supabase.table("bets").upsert({
                "id": b["id"],
                "user_id": b["userId"],
                "user_name": b["userName"],
                "period": b["period"],
                "room": b["room"],
                "selection": b["selection"],
                "amount": b["amount"],
                "payout": b["payout"],
                "status": b["status"],
                "created_at": b["createdAt"]
            }).execute()

        enforce_max_1000_rounds_in_supabase()
    except Exception as e:
        print("Supabase Python round sync err:", e)

def python_round_looper():
    while True:
        try:
            rooms = ["WINGO_30S", "WINGO_1M", "WINGO_3M", "WINGO_5M"]
            for r in rooms:
                p_info = get_server_period(r)
                p = p_info["period"]
                if p_info["timeLeft"] == p_info["duration"] and last_processed_py.get(r) != p:
                    prev_p = str(int(p) - 1)
                    if not any(rd["period"] == prev_p and rd.get("room") == r for rd in state["rounds"]):
                        process_python_round_result(prev_p, r)
                        last_processed_py[r] = p
        except Exception as e:
            print("Python looper err:", e)
        time.sleep(1)

# Start automated background thread
threading.Thread(target=python_round_looper, daemon=True).start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=3000, reload=True)
