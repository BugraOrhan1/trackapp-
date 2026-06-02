#!/opt/tetra-scanner/venv/bin/python3
"""TrackApp Web Interface - Verbeterde versie"""
from flask import Flask, jsonify, render_template_string, Response
import subprocess, socket, os, json, glob

app = Flask(__name__)

PAGE = """<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="3">
<title>TrackApp - {{s.scanner}}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,Arial,sans-serif;background:#0a0a0a;color:#eee;padding:12px;line-height:1.5}
h1{font-size:24px;margin-bottom:16px;color:#8be9fd}
h2{font-size:18px;margin:20px 0 10px;color:#50fa7b;border-bottom:1px solid #333;padding-bottom:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:12px}
.card{background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:12px}
.label{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
.value{font-size:18px;font-weight:bold;margin-top:4px;word-break:break-word}
.ok{color:#50fa7b}
.bad{color:#ff5555}
.warn{color:#f1fa8c}
.info{color:#8be9fd}
pre{background:#0d0d0d;border:1px solid #333;border-radius:10px;padding:10px;overflow:auto;max-height:350px;font-size:11px;white-space:pre-wrap;font-family:'Courier New',monospace}
.btn{display:inline-block;background:#2a2a2a;color:#8be9fd;border:1px solid #444;border-radius:6px;padding:8px 14px;text-decoration:none;font-size:13px;margin:3px}
.btn:hover{background:#3a3a3a}
.btn-red{border-color:#ff5555;color:#ff5555}
.btn-green{border-color:#50fa7b;color:#50fa7b}
.led-box{display:flex;gap:6px;margin-top:8px}
.led{width:24px;height:24px;border-radius:50%;border:2px solid #333;display:inline-block}
.led.green-on{background:#50fa7b;box-shadow:0 0 10px #50fa7b}
.led.yellow-on{background:#f1fa8c;box-shadow:0 0 10px #f1fa8c}
.led.orange-on{background:#ffb86c;box-shadow:0 0 10px #ffb86c}
.led.red-on{background:#ff5555;box-shadow:0 0 10px #ff5555}
.signal-bar{background:#1a1a1a;border-radius:4px;height:24px;position:relative;margin:4px 0;overflow:hidden}
.signal-fill{height:100%;background:linear-gradient(90deg,#50fa7b,#f1fa8c,#ffb86c,#ff5555);border-radius:4px;transition:width 0.3s}
.signal-text{position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:bold;text-shadow:1px 1px 2px rgba(0,0,0,0.8);white-space:nowrap}
.freq-table{width:100%;border-collapse:collapse;font-size:12px}
.freq-table th{background:#1a1a1a;padding:6px 8px;text-align:left;color:#888;font-weight:normal;border-bottom:1px solid #333}
.freq-table td{padding:6px 8px;border-bottom:1px solid #222}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold}
.tag-mast{background:#3a3a5a;color:#8be9fd}
.tag-mobiel{background:#5a3a3a;color:#ff5555}
.tag-nieuw{background:#3a5a3a;color:#50fa7b}
.refresh-info{color:#666;font-size:11px;text-align:right;margin-top:10px}
</style>
</head>
<body>

<h1>📡 TrackApp Scanner</h1>

<h2>Status</h2>
<div class="grid">
  <div class="card">
    <div class="label">Scanner</div>
    <div class="value {% if s.scanner=='active' %}ok{% else %}bad{% endif %}">{{s.scanner}}</div>
  </div>
  <div class="card">
    <div class="label">Modus</div>
    <div class="value {% if s.smart_mode=='ACTIEF' %}ok{% else %}warn{% endif %}">{{s.smart_mode}}</div>
  </div>
  <div class="card">
    <div class="label">LED Niveau</div>
    <div class="value">{{s.level_name}}</div>
    <div class="led-box">
      <div class="led {% if s.level >= 1 %}green-on{% endif %}"></div>
      <div class="led {% if s.level >= 2 %}yellow-on{% endif %}"></div>
      <div class="led {% if s.level >= 3 %}orange-on{% endif %}"></div>
      <div class="led {% if s.level >= 4 %}red-on{% endif %}"></div>
    </div>
  </div>
  <div class="card">
    <div class="label">Vaste Masten</div>
    <div class="value info">{{s.mast_count}}</div>
  </div>
  <div class="card">
    <div class="label">Mobiele Signalen</div>
    <div class="value {% if s.mobile_count > 0 %}warn{% endif %}">{{s.mobile_count}}</div>
  </div>
  <div class="card">
    <div class="label">Piek Frequentie</div>
    <div class="value">{{s.peak_freq}}</div>
  </div>
</div>

<h2>System</h2>
<div class="grid">
  <div class="card">
    <div class="label">WiFi</div>
    <div class="value" style="font-size:14px">{{s.wifi}}</div>
  </div>
  <div class="card">
    <div class="label">Uptime</div>
    <div class="value" style="font-size:14px">{{s.uptime}}</div>
  </div>
  <div class="card">
    <div class="label">CPU Temp</div>
    <div class="value {% if s.temp_warn %}warn{% endif %}" style="font-size:14px">{{s.temp}}</div>
  </div>
  <div class="card">
    <div class="label">Opslag</div>
    <div class="value" style="font-size:14px">{{s.disk}}</div>
  </div>
  <div class="card">
    <div class="label">Scans Totaal</div>
    <div class="value info" style="font-size:14px">{{s.total_scans}}</div>
  </div>
  <div class="card">
    <div class="label">Ruisvloer</div>
    <div class="value" style="font-size:14px">{{s.noise_floor}}</div>
  </div>
</div>

{% if s.frequencies %}
<h2>🎯 Actieve Frequenties</h2>
<table class="freq-table">
  <tr><th>Frequentie</th><th>Sterkte</th><th>Type</th><th>Visualisatie</th></tr>
  {% for f in s.frequencies %}
  <tr>
    <td><b>{{f.freq}}</b> MHz</td>
    <td>{{f.power}} dB</td>
    <td><span class="tag tag-{{f.type|lower}}">{{f.type}}</span></td>
    <td>
      <div class="signal-bar">
        <div class="signal-fill" style="width:{{f.bar_pct}}%"></div>
        <div class="signal-text">{{f.power}} dB</div>
      </div>
    </td>
  </tr>
  {% endfor %}
</table>
{% endif %}

<h2>📥 Downloads</h2>
<a class="btn btn-green" href="/dl/log/30">Logs 30min</a>
<a class="btn" href="/dl/log/60">Logs 60min</a>
<a class="btn" href="/dl/log/today">Logs vandaag</a>
<a class="btn" href="/dl/csv">CSV data</a>
<a class="btn" href="/dl/config">Config</a>
<a class="btn" href="/dl/all">Backup ALLES (zip)</a>

<h2>⚙️ Acties</h2>
<a class="btn btn-red" href="/act/restart" onclick="return confirm('Scanner herstarten?')">🔄 Herstart Scanner</a>
<a class="btn btn-red" href="/act/restart-web" onclick="return confirm('Webserver herstarten?')">🔄 Herstart Web</a>
<a class="btn btn-red" href="/act/reboot" onclick="return confirm('Pi rebooten?')">⚡ Reboot Pi</a>
<a class="btn" href="/act/calibrate-info">📊 Kalibratie info</a>

<h2>📋 Live Scanner Logs</h2>
<pre>{{s.logs}}</pre>

<h2>📊 Recent Scan Data</h2>
<pre>{{s.csv_tail}}</pre>

<h2>🔌 Hotspot Info</h2>
<div class="grid">
  <div class="card">
    <div class="label">SSID</div>
    <div class="value">TrackApp</div>
  </div>
  <div class="card">
    <div class="label">Wachtwoord</div>
    <div class="value">TrackApp2026</div>
  </div>
  <div class="card">
    <div class="label">URL</div>
    <div class="value" style="font-size:14px">http://192.168.50.1:8080</div>
  </div>
  <div class="card">
    <div class="label">IPs</div>
    <div class="value" style="font-size:11px">{{s.ips|join('<br>')|safe}}</div>
  </div>
</div>

<div class="refresh-info">🔄 Auto-refresh elke 3 seconden</div>

</body>
</html>"""

def sh(c, timeout=5):
    try:
        return subprocess.run(c, shell=True, capture_output=True, text=True, timeout=timeout).stdout.strip()
    except:
        return ""

def state(n):
    return sh(f"systemctl is-active {n}") or "unknown"

def temp():
    try:
        with open("/sys/class/thermal/thermal_zone0/temp") as f:
            t = float(f.read())/1000
        return f"{t:.1f}°C", t > 70
    except:
        return "n/a", False

def upt():
    try:
        with open("/proc/uptime") as f:
            s = int(float(f.read().split()[0]))
        d, r = divmod(s, 86400)
        h, r = divmod(r, 3600)
        m, _ = divmod(r, 60)
        return f"{d}d {h}u {m}m" if d else f"{h}u {m}m"
    except:
        return "n/a"

def disk():
    try:
        st = os.statvfs("/")
        t = st.f_blocks * st.f_frsize
        f = st.f_bavail * st.f_frsize
        return f"{(t-f)/1024**3:.1f}G/{t/1024**3:.1f}G"
    except:
        return "n/a"

def ips():
    o = sh("ip -4 -br addr show scope global")
    if not o:
        return ["geen"]
    r = []
    for l in o.splitlines():
        p = l.split()
        if len(p) >= 3:
            r.append(f"{p[0]}: {p[2]}")
    return r or ["geen"]

def wifi():
    h = "Hotspot AAN" if state("hostapd") == "active" else ""
    s = sh("iwgetid -r")
    if s and h: return f"{h} + {s}"
    if s: return s
    if h: return h
    return "geen"

def get_latest_csv_data():
    """Lees laatste regels uit nieuwste CSV"""
    try:
        files = sorted(glob.glob("/opt/tetra-scanner/data/signal_data_*.csv"), reverse=True)
        if not files:
            return "geen data", {}
        with open(files[0]) as f:
            lines = f.readlines()
        
        # Header + laatste 15 regels
        header = lines[0] if lines else ""
        recent = lines[-15:] if len(lines) > 15 else lines[1:]
        
        # Parse laatste regel voor live data
        last_data = {}
        if len(lines) > 1:
            last_line = lines[-1].strip().split(',')
            try:
                last_data = {
                    'peak_freq': f"{float(last_line[2]):.3f} MHz",
                    'level': int(last_line[6]) if len(last_line) > 6 else 0,
                    'noise_floor': f"{float(last_line[5]):.1f} dB" if len(last_line) > 5 else "n/a",
                    'total_scans': last_line[1]
                }
            except:
                pass
        
        return header + ''.join(recent), last_data
    except Exception as e:
        return f"fout: {e}", {}

def parse_recent_frequencies():
    """Parse de laatste log voor actieve frequenties"""
    try:
        logs = sh("journalctl -u tetra-scanner -n 100 --no-pager")
        freqs = {}
        for line in logs.split('\n'):
            # Zoek MHz waardes met sterkte
            import re
            m = re.search(r'(\d+\.\d+)\s*MHz\s+(\d+\.\d+)dB\s+\[(\w+)\s*\]', line)
            if m:
                freq = float(m.group(1))
                power = float(m.group(2))
                ftype = m.group(3).strip()
                freqs[freq] = {'power': power, 'type': ftype}
        
        # Sorteer op sterkte
        result = []
        for freq, data in sorted(freqs.items(), key=lambda x: x[1]['power'], reverse=True)[:8]:
            bar_pct = min(100, max(5, int((data['power'] / 80) * 100)))
            result.append({
                'freq': f"{freq:.3f}",
                'power': f"{data['power']:.1f}",
                'type': data['type'],
                'bar_pct': bar_pct
            })
        return result
    except:
        return []

@app.route("/")
def index():
    csv_data, last_csv = get_latest_csv_data()
    frequencies = parse_recent_frequencies()
    temp_str, temp_warn = temp()
    
    # Bepaal level naam
    level = last_csv.get('level', 0)
    level_names = {0: "GEEN", 1: "GROEN", 2: "GEEL", 3: "ORANJE", 4: "ROOD"}
    
    # Bepaal smart modus
    logs = sh("journalctl -u tetra-scanner -n 50 --no-pager")
    if "LEREN" in logs:
        smart_mode = "LEREN"
    elif "ACTIEF" in logs or state("tetra-scanner") == "active":
        smart_mode = "ACTIEF"
    else:
        smart_mode = "OFFLINE"
    
    # Tellingen uit logs
    import re
    mast_match = re.search(r'Vaste masten:\s*(\d+)', logs[::-1][:5000][::-1])
    mobile_match = re.search(r'MOBIEL[^\n]*?(\d+)', logs[::-1][:5000][::-1])
    
    s = {
        'scanner': state("tetra-scanner"),
        'smart_mode': smart_mode,
        'level': level,
        'level_name': level_names.get(level, "?"),
        'mast_count': mast_match.group(1) if mast_match else "0",
        'mobile_count': last_csv.get('total_scans', 0) and len(frequencies) or 0,
        'peak_freq': last_csv.get('peak_freq', 'n/a'),
        'noise_floor': last_csv.get('noise_floor', 'n/a'),
        'total_scans': last_csv.get('total_scans', '0'),
        'wifi': wifi(),
        'uptime': upt(),
        'temp': temp_str,
        'temp_warn': temp_warn,
        'disk': disk(),
        'ips': ips(),
        'logs': sh("journalctl -u tetra-scanner -n 40 --no-pager")[-6000:],
        'csv_tail': csv_data[-3000:],
        'frequencies': frequencies
    }
    return render_template_string(PAGE, s=s)

@app.route("/dl/log/<period>")
def dl_log(period):
    if period == "30":
        data = sh("journalctl -u tetra-scanner --since '30 min ago' --no-pager", timeout=15)
        fn = "log_30min.txt"
    elif period == "60":
        data = sh("journalctl -u tetra-scanner --since '60 min ago' --no-pager", timeout=15)
        fn = "log_60min.txt"
    elif period == "today":
        data = sh("journalctl -u tetra-scanner --since today --no-pager", timeout=30)
        fn = "log_today.txt"
    else:
        data, fn = "?", "log.txt"
    return Response(data, mimetype='text/plain',
                    headers={'Content-Disposition': f'attachment;filename={fn}'})

@app.route("/dl/csv")
def dl_csv():
    try:
        files = sorted(glob.glob("/opt/tetra-scanner/data/signal_data_*.csv"), reverse=True)
        if files:
            with open(files[0]) as f:
                data = f.read()
            fn = os.path.basename(files[0])
        else:
            data, fn = "geen data", "empty.csv"
    except:
        data, fn = "fout", "error.csv"
    return Response(data, mimetype='text/csv',
                    headers={'Content-Disposition': f'attachment;filename={fn}'})

@app.route("/dl/config")
def dl_config():
    try:
        with open("/opt/tetra-scanner/config.py") as f:
            data = f.read()
    except:
        data = "fout"
    return Response(data, mimetype='text/plain',
                    headers={'Content-Disposition': 'attachment;filename=config.py'})

@app.route("/dl/all")
def dl_all():
    import tempfile, zipfile
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
    with zipfile.ZipFile(tmp.name, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Python files
        for f in glob.glob("/opt/tetra-scanner/*.py"):
            zf.write(f, os.path.basename(f))
        # Config
        zf.write("/opt/tetra-scanner/config.py", "config.py")
        # CSVs
        for f in glob.glob("/opt/tetra-scanner/data/*.csv"):
            zf.write(f, f"data/{os.path.basename(f)}")
        # Logs
        logs = sh("journalctl -u tetra-scanner --since today --no-pager", timeout=30)
        zf.writestr("logs_today.txt", logs)
    
    with open(tmp.name, 'rb') as f:
        data = f.read()
    os.unlink(tmp.name)
    return Response(data, mimetype='application/zip',
                    headers={'Content-Disposition': 'attachment;filename=trackapp_backup.zip'})

@app.route("/act/restart")
def act_restart():
    sh("systemctl restart tetra-scanner")
    return "<html><body style='background:#111;color:#eee;font-family:Arial;padding:40px;text-align:center'><h1 style='color:#50fa7b'>Scanner herstart...</h1><p>Wacht 5 sec, dan terug.</p><script>setTimeout(()=>location.href='/',5000)</script></body></html>"

@app.route("/act/restart-web")
def act_restart_web():
    sh("nohup sh -c 'sleep 2 && systemctl restart trackapp-web' &")
    return "<html><body style='background:#111;color:#eee;font-family:Arial;padding:40px;text-align:center'><h1 style='color:#50fa7b'>Web herstart...</h1><p>Wacht 8 sec.</p><script>setTimeout(()=>location.href='/',8000)</script></body></html>"

@app.route("/act/reboot")
def act_reboot():
    sh("nohup sh -c 'sleep 2 && reboot' &")
    return "<html><body style='background:#111;color:#eee;font-family:Arial;padding:40px;text-align:center'><h1 style='color:#ff5555'>Pi reboot...</h1><p>Wacht 2-3 minuten.</p></body></html>"

@app.route("/act/calibrate-info")
def calibrate_info():
    return """<html><body style='background:#111;color:#eee;font-family:Arial;padding:40px'>
    <h1>Kalibratie info</h1>
    <p>Kalibreer via SSH:</p>
    <pre style='background:#000;padding:20px;border-radius:8px'>
sudo systemctl stop tetra-scanner
cd /opt/tetra-scanner
sudo venv/bin/python3 calibrate.py
sudo systemctl start tetra-scanner</pre>
    <a href='/' style='color:#8be9fd'>← Terug</a>
    </body></html>"""

@app.route("/api/status")
def api():
    csv_data, last_csv = get_latest_csv_data()
    return jsonify({
        'scanner': state("tetra-scanner"),
        'level': last_csv.get('level', 0),
        'peak_freq': last_csv.get('peak_freq', ''),
        'temp': temp()[0],
        'uptime': upt()
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, threaded=True)
