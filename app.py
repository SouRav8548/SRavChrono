from flask import Flask, request, jsonify  # type: ignore[import]
from flask_cors import CORS  # type: ignore[import]
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
import math

app = Flask(__name__)
CORS(app)

# ─── UNIT CONVERSIONS ─────────────────────────────────────────────────────────

@app.route('/api/convert', methods=['POST'])
def convert():
    data = request.get_json()
    calc_type = data.get('calculation_type')
    value = float(data.get('value', 0))

    conversions = {
        'hours_to_minutes':      ('hours',        'minutes',      value * 60),
        'hours_to_seconds':      ('hours',        'seconds',      value * 3600),
        'hours_to_ms':           ('hours',        'milliseconds', value * 3_600_000),
        'minutes_to_hours':      ('minutes',      'hours',        value / 60),
        'minutes_to_seconds':    ('minutes',      'seconds',      value * 60),
        'minutes_to_ms':         ('minutes',      'milliseconds', value * 60_000),
        'seconds_to_hours':      ('seconds',      'hours',        value / 3600),
        'seconds_to_minutes':    ('seconds',      'minutes',      value / 60),
        'seconds_to_ms':         ('seconds',      'milliseconds', value * 1000),
        'ms_to_hours':           ('milliseconds', 'hours',        value / 3_600_000),
        'ms_to_minutes':         ('milliseconds', 'minutes',      value / 60_000),
        'ms_to_seconds':         ('milliseconds', 'seconds',      value / 1000),
    }

    if calc_type not in conversions:
        return jsonify({'error': 'Unknown conversion type'}), 400

    orig_unit, conv_unit, result = conversions[calc_type]
    return jsonify({
        'original_value': value,
        'original_unit': orig_unit,
        'converted_value': round(result, 6),
        'converted_unit': conv_unit,
    })


# ─── TIME ARITHMETIC ──────────────────────────────────────────────────────────

def parse_duration(h, m, s, ms):
    """Return total milliseconds."""
    return (int(h) * 3_600_000 + int(m) * 60_000 +
            int(s) * 1_000 + int(ms))

def ms_to_hmsms(total_ms):
    sign = -1 if total_ms < 0 else 1
    total_ms = abs(int(total_ms))
    ms = total_ms % 1000
    total_s = total_ms // 1000
    s = total_s % 60
    total_m = total_s // 60
    m = total_m % 60
    h = total_m // 60
    return sign, h, m, s, ms

@app.route('/api/arithmetic', methods=['POST'])
def arithmetic():
    data = request.get_json()
    op = data.get('operation')  # 'add' or 'subtract'

    ms1 = parse_duration(data.get('h1', 0), data.get('m1', 0),
                         data.get('s1', 0), data.get('ms1', 0))
    ms2 = parse_duration(data.get('h2', 0), data.get('m2', 0),
                         data.get('s2', 0), data.get('ms2', 0))

    total = ms1 + ms2 if op == 'add' else ms1 - ms2
    sign, h, m, s, ms = ms_to_hmsms(total)

    return jsonify({
        'operation': op,
        'result_negative': sign < 0,
        'hours': h,
        'minutes': m,
        'seconds': s,
        'milliseconds': ms,
        'total_seconds': round(abs(total) / 1000, 3),
        'total_minutes': round(abs(total) / 60_000, 6),
        'total_hours':   round(abs(total) / 3_600_000, 6),
    })


# ─── DATE DIFFERENCE ─────────────────────────────────────────────────────────

@app.route('/api/date-difference', methods=['POST'])
def date_difference():
    data = request.get_json()
    d1 = datetime.strptime(data['date1'], '%Y-%m-%d').date()
    d2 = datetime.strptime(data['date2'], '%Y-%m-%d').date()

    delta = d2 - d1
    days = delta.days
    rd = relativedelta(d2, d1)

    return jsonify({
        'date1': data['date1'],
        'date2': data['date2'],
        'difference_in_days': abs(days),
        'difference_in_weeks': round(abs(days) / 7, 2),
        'difference_in_months': round(abs(days) / 30.4375, 2),
        'difference_in_years': round(abs(days) / 365.25, 4),
        'years': abs(rd.years),
        'months': abs(rd.months),
        'remaining_days': abs(rd.days),
        'earlier_date': data['date1'] if days >= 0 else data['date2'],
        'later_date':   data['date2'] if days >= 0 else data['date1'],
    })


# ─── DATE ADD / SUBTRACT ──────────────────────────────────────────────────────

@app.route('/api/date-adjust', methods=['POST'])
def date_adjust():
    data = request.get_json()
    start = datetime.strptime(data['date'], '%Y-%m-%d').date()
    years  = int(data.get('years',  0))
    months = int(data.get('months', 0))
    days   = int(data.get('days',   0))
    op     = data.get('operation', 'add')

    if op == 'subtract':
        years, months, days = -years, -months, -days

    result = start + relativedelta(years=years, months=months, days=days)

    delta = result - start
    return jsonify({
        'start_date': data['date'],
        'result_date': result.strftime('%Y-%m-%d'),
        'operation': op,
        'years_adjusted': abs(years),
        'months_adjusted': abs(months),
        'days_adjusted': abs(days),
        'total_days_changed': abs(delta.days),
        'day_of_week': result.strftime('%A'),
    })


# ─── BIRTHDAY CALCULATIONS ────────────────────────────────────────────────────

@app.route('/api/birthday', methods=['POST'])
def birthday():
    data = request.get_json()
    bday = datetime.strptime(data['birthdate'], '%Y-%m-%d').date()
    today = date.today()

    rd = relativedelta(today, bday)
    age_years   = rd.years
    age_months  = rd.months
    age_days    = rd.days
    total_days  = (today - bday).days
    total_weeks = total_days // 7

    # Next birthday
    next_bday = bday.replace(year=today.year)
    if next_bday <= today:
        next_bday = bday.replace(year=today.year + 1)

    days_until = (next_bday - today).days
    next_rd = relativedelta(next_bday, today)

    return jsonify({
        'birthdate': data['birthdate'],
        'today': today.strftime('%Y-%m-%d'),
        'age_years': age_years,
        'age_months': age_months,
        'age_days': age_days,
        'total_days_lived': total_days,
        'total_weeks_lived': total_weeks,
        'next_birthday': next_bday.strftime('%Y-%m-%d'),
        'days_until_birthday': days_until,
        'months_until_birthday': next_rd.months,
        'is_birthday_today': today == next_bday - relativedelta(years=1)
                             if age_years > 0 else today == bday,
        'next_age': age_years + 1,
        'day_of_week_born': bday.strftime('%A'),
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
