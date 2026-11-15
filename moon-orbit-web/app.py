from datetime import date, datetime, timezone
from pathlib import Path

from flask import Flask, abort, render_template, request
from skyfield.api import Loader
from skyfield.elementslib import osculating_elements_of

app = Flask(__name__)
load = Loader(str(Path(__file__).resolve().parent))
ts = load.timescale()
ephemeris = load("de440.bsp")
earth_from_sun = ephemeris["earth"] - ephemeris["sun"]
moon_from_earth = ephemeris["moon"] - ephemeris["earth"]
moon_from_sun = ephemeris["moon"] - ephemeris["sun"]
first_day = date(1550, 1, 1)
last_day = date(2550, 12, 31)
end_time = ts.utc(last_day.year, last_day.month, last_day.day)


@app.get("/")
def home():
    today = datetime.now(timezone.utc).date()
    return render_template(
        "index.html", today=today.isoformat(),
        first_day=first_day.isoformat(), last_day=last_day.isoformat(),
    )


@app.get("/api/orbit")
def orbit():
    try:
        day = date.fromisoformat(request.args["date"])
        elapsed = int(request.args.get("seconds", "0"))
    except (KeyError, ValueError):
        abort(400)

    if not first_day <= day <= last_day or not 0 <= elapsed <= 32_000_000_000:
        abort(400)

    time = ts.utc(day.year, day.month, day.day) + elapsed / 86400
    finished = bool(time.tt >= end_time.tt)
    if finished:
        time = end_time

    earth = earth_from_sun.at(time)
    moon_offset = moon_from_earth.at(time)
    moon = moon_from_sun.at(time)
    return {
        "time": time.utc_strftime("%Y-%m-%d %H:%M UTC"),
        "earth": earth.xyz.au.tolist(),
        "moon": (earth.xyz.au + 30 * moon_offset.xyz.au).tolist(),
        "distances": [
            float(earth.distance().km),
            float(moon_offset.distance().km),
            float(moon.distance().km),
        ],
        "eccentricity": float(osculating_elements_of(moon).eccentricity),
        "finished": finished,
    }
