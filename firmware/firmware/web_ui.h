/*
 * web_ui.h  –  Gateway Diagnostic Web Interface  v4.0
 *
 * Single-page HTML/CSS/JS application stored in ESP32 PROGMEM flash.
 * Served at GET /  by the WebServer.
 *
 * Features
 *  • Ultra-premium PRISM transparent glassmorphism dashboard
 *  • Spectral rainbow gradient design tokens
 *  • FR Meter dedicated section with Modbus detail
 *  • Run All Tests button + per-module Run buttons
 *  • GPRS Speed Control section (AT+IPR=1000000;&W → 1 Mbps)
 *  • GPRS Modem Button Testing panel (Reset, Echo Off, Speed)
 *  • Expanded Button Testing section with all quick-actions
 *  • Live result cards with animated prism status rings
 *  • Scrollable diagnostic log console (polls /log)
 *  • Drag-and-drop OTA firmware upload with animated progress bar
 *  • Particle/prism ambient background animations
 */

#pragma once

const char index_html[] PROGMEM = R"HTMLEOF(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gateway Diagnostic · ESP32-S3</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
/* ═══════════════════════════════════════════════════════════
   PRISM DESIGN TOKENS
══════════════════════════════════════════════════════════════ */
:root{
  --bg:#020408;
  --bg2:#030610;
  --glass:rgba(8,14,30,0.72);
  --glass2:rgba(12,20,45,0.65);
  --glass3:rgba(255,255,255,0.03);
  --border:rgba(255,255,255,0.06);
  --border2:rgba(255,255,255,0.12);
  --text:#eef2ff;
  --text2:#94a3b8;
  --muted:#475569;
  --a-cyan:#38bdf8;
  --a-indigo:#818cf8;
  --a-violet:#a78bfa;
  --a-pink:#f472b6;
  --a-amber:#fbbf24;
  --a-emerald:#34d399;
  --a-rose:#fb7185;
  --pass:#34d399;
  --pass2:#10b981;
  --warn:#fbbf24;
  --warn2:#f59e0b;
  --fail:#f87171;
  --fail2:#ef4444;
  --pend:#475569;
  --r:18px;
  --r2:14px;
  --r3:10px;
  --shadow:0 8px 40px rgba(0,0,0,0.7);
  --glow-c:0 0 40px rgba(56,189,248,0.2);
  --glow-v:0 0 40px rgba(167,139,250,0.2);
  --glow-p:0 0 40px rgba(244,114,182,0.2);
  --glow-pass:0 0 30px rgba(52,211,153,0.25);
  --glow-fail:0 0 30px rgba(248,113,113,0.25);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;font-size:14px}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}

/* ═══════════════════════════════════════════════════════════
   PRISM AMBIENT BACKGROUND
══════════════════════════════════════════════════════════════ */
.prism-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.prism-bg .p1{position:absolute;width:900px;height:900px;top:-300px;left:-250px;border-radius:50%;background:conic-gradient(from 0deg,rgba(56,189,248,0.06) 0%,rgba(129,140,248,0.05) 15%,rgba(167,139,250,0.06) 30%,rgba(236,72,153,0.04) 45%,rgba(251,191,36,0.03) 60%,rgba(56,189,248,0.06) 100%);filter:blur(60px);animation:prismSpin 40s linear infinite}
.prism-bg .p2{position:absolute;width:700px;height:700px;bottom:-200px;right:-200px;border-radius:50%;background:conic-gradient(from 180deg,rgba(167,139,250,0.07) 0%,rgba(236,72,153,0.06) 20%,rgba(56,189,248,0.05) 40%,rgba(52,211,153,0.04) 60%,rgba(167,139,250,0.07) 100%);filter:blur(70px);animation:prismSpin 30s linear infinite reverse}
.prism-bg .p3{position:absolute;width:500px;height:500px;top:35%;left:40%;border-radius:50%;background:radial-gradient(circle,rgba(129,140,248,0.06) 0%,rgba(56,189,248,0.03) 50%,transparent 70%);filter:blur(50px);animation:drift 20s ease-in-out infinite}
.prism-bg .p4{position:absolute;width:350px;height:350px;top:10%;right:10%;border-radius:50%;background:radial-gradient(circle,rgba(52,211,153,0.05) 0%,transparent 70%);filter:blur(40px);animation:drift 15s ease-in-out infinite reverse;animation-delay:-5s}
@keyframes prismSpin{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(180deg) scale(1.08)}100%{transform:rotate(360deg) scale(1)}}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(25px,-18px) scale(1.04)}66%{transform:translate(-18px,22px) scale(0.97)}}

.streak{position:fixed;pointer-events:none;z-index:0;opacity:0;border-radius:2px;animation:streakFade 12s ease-in-out infinite}
.streak-1{width:1px;height:300px;top:20%;left:15%;background:linear-gradient(to bottom,transparent,rgba(56,189,248,0.15),transparent);animation-delay:0s}
.streak-2{width:1px;height:200px;top:40%;right:20%;background:linear-gradient(to bottom,transparent,rgba(167,139,250,0.12),transparent);animation-delay:-4s;animation-duration:15s}
.streak-3{width:1px;height:250px;bottom:20%;left:60%;background:linear-gradient(to bottom,transparent,rgba(244,114,182,0.10),transparent);animation-delay:-8s;animation-duration:18s}
@keyframes streakFade{0%,100%{opacity:0;transform:scaleY(0.3)}30%,70%{opacity:1;transform:scaleY(1)}}

.mote{position:fixed;border-radius:50%;pointer-events:none;z-index:0;animation:moteFloat 14s ease-in-out infinite}
.mote-1{width:4px;height:4px;background:rgba(56,189,248,0.7);top:25%;left:8%;box-shadow:0 0 10px rgba(56,189,248,1);animation-delay:0s}
.mote-2{width:3px;height:3px;background:rgba(167,139,250,0.8);top:55%;right:12%;box-shadow:0 0 8px rgba(167,139,250,1);animation-delay:-5s;animation-duration:18s}
.mote-3{width:5px;height:5px;background:rgba(244,114,182,0.6);bottom:25%;left:45%;box-shadow:0 0 10px rgba(244,114,182,0.9);animation-delay:-9s;animation-duration:16s}
.mote-4{width:3px;height:3px;background:rgba(52,211,153,0.7);top:75%;left:72%;box-shadow:0 0 8px rgba(52,211,153,1);animation-delay:-2s;animation-duration:11s}
.mote-5{width:2px;height:2px;background:rgba(251,191,36,0.8);top:15%;right:30%;box-shadow:0 0 6px rgba(251,191,36,1);animation-delay:-7s;animation-duration:13s}
@keyframes moteFloat{0%,100%{transform:translateY(0) translateX(0);opacity:0.5}25%{transform:translateY(-50px) translateX(15px);opacity:1}50%{transform:translateY(-25px) translateX(-12px);opacity:0.7}75%{transform:translateY(-70px) translateX(8px);opacity:0.9}}

/* ═══════════════════════════════════════════════════════════
   PRISM HEADER
══════════════════════════════════════════════════════════════ */
header{position:sticky;top:0;z-index:200;background:rgba(2,4,8,0.85);backdrop-filter:blur(32px) saturate(1.6);-webkit-backdrop-filter:blur(32px) saturate(1.6);border-bottom:1px solid rgba(255,255,255,0.05);padding:10px 28px;display:flex;align-items:center;justify-content:space-between}
header::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#38bdf8,#818cf8,#a78bfa,#f472b6,#fbbf24,#34d399,#38bdf8);background-size:300% 100%;animation:rainbowShift 6s linear infinite;box-shadow:0 0 15px rgba(129,140,248,0.4)}
@keyframes rainbowShift{0%{background-position:0% 0}100%{background-position:300% 0}}

.logo{display:flex;align-items:center;gap:14px}
.logo-icon{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,rgba(56,189,248,0.15),rgba(129,140,248,0.15),rgba(167,139,250,0.15));border:1px solid rgba(129,140,248,0.25);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;box-shadow:0 0 20px rgba(129,140,248,0.2),0 4px 16px rgba(0,0,0,0.5);animation:iconPulse 4s ease-in-out infinite;position:relative;overflow:hidden}
.logo-icon::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.12),transparent);border-radius:inherit}
@keyframes iconPulse{0%,100%{box-shadow:0 0 20px rgba(129,140,248,0.2),0 4px 16px rgba(0,0,0,0.5)}50%{box-shadow:0 0 40px rgba(129,140,248,0.4),0 4px 20px rgba(0,0,0,0.6)}}
.logo-name{font-size:15px;font-weight:800;letter-spacing:-.3px;background:linear-gradient(90deg,#e8edf5,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.logo-sub{font-size:11px;color:var(--muted);margin-top:2px;font-weight:400}
.header-right{display:flex;align-items:center;gap:10px}
.conn-pill{display:flex;align-items:center;gap:7px;padding:6px 14px;border-radius:24px;font-size:12px;font-weight:600;background:rgba(52,211,153,0.07);border:1px solid rgba(52,211,153,0.2);color:var(--pass);letter-spacing:.2px}
.conn-dot{width:7px;height:7px;border-radius:50%;background:var(--pass);box-shadow:0 0 6px var(--pass);animation:pulse-dot 2s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(0.65)}}
.fw-badge{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--muted);letter-spacing:.3px}

/* ═══════════════════════════════════════════════════════════
   MAIN LAYOUT + HERO
══════════════════════════════════════════════════════════════ */
main{max-width:1000px;margin:0 auto;padding:32px 16px;position:relative;z-index:1}
.hero{text-align:center;margin:20px 0 44px;position:relative}
.hero::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:200px;background:radial-gradient(ellipse,rgba(129,140,248,0.08) 0%,transparent 70%);pointer-events:none}
.hero h1{font-size:34px;font-weight:900;letter-spacing:-1.5px;margin-bottom:10px;background:linear-gradient(135deg,#e8edf5 0%,#38bdf8 25%,#818cf8 50%,#a78bfa 70%,#f472b6 90%,#fbbf24 100%);background-size:300% 300%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:prismText 6s ease-in-out infinite}
@keyframes prismText{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.hero p{color:var(--text2);font-size:13px;margin-bottom:32px;font-weight:400;letter-spacing:.2px}

.btn-all{padding:15px 56px;font-size:15px;font-weight:700;background:linear-gradient(135deg,#38bdf8,#818cf8,#a78bfa,#f472b6);background-size:300% 300%;color:#fff;border:none;border-radius:50px;cursor:pointer;letter-spacing:.4px;position:relative;overflow:hidden;box-shadow:0 0 50px rgba(129,140,248,0.3),0 6px 30px rgba(0,0,0,0.5);transition:all .35s cubic-bezier(.4,0,.2,1);animation:prismBtn 5s ease-in-out infinite}
@keyframes prismBtn{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.btn-all::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.2),transparent 60%);border-radius:inherit;pointer-events:none}
.btn-all:hover:not(:disabled){transform:translateY(-5px) scale(1.03);box-shadow:0 0 80px rgba(129,140,248,0.5),0 12px 40px rgba(0,0,0,0.6)}
.btn-all:active{transform:translateY(-1px) scale(0.99)}
.btn-all:disabled{opacity:.35;cursor:not-allowed;transform:none;animation:none}
.btn-all.busy{background:linear-gradient(135deg,#1e293b,#0f172a);animation:none}
.spin{display:inline-block;width:14px;height:14px;margin-right:8px;border:2px solid rgba(255,255,255,0.25);border-top-color:#fff;border-radius:50%;animation:rot .7s linear infinite;vertical-align:middle}
@keyframes rot{to{transform:rotate(360deg)}}

/* ═══════════════════════════════════════════════════════════
   SECTION TITLES + STATS BAR
══════════════════════════════════════════════════════════════ */
.sec-title{font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.sec-title .ico{margin-right:7px;font-size:13px}
.sec-title-accent{background:linear-gradient(90deg,var(--a-cyan),var(--a-violet));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

.stats-bar{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:30px}
.stat-chip{background:var(--glass);border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);display:flex;align-items:center;gap:12px;position:relative;overflow:hidden;transition:all .28s cubic-bezier(.4,0,.2,1)}
.stat-chip::before{content:'';position:absolute;inset:0;border-radius:inherit;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(255,255,255,0.04) 0%,transparent 70%);pointer-events:none}
.stat-chip:hover{border-color:var(--border2);transform:translateY(-3px);box-shadow:var(--glow-c)}
.stat-chip-icon{font-size:22px;flex-shrink:0;filter:drop-shadow(0 0 6px rgba(129,140,248,0.5))}
.stat-chip-val{font-size:16px;font-weight:700;color:var(--text);font-family:'JetBrains Mono',monospace}
.stat-chip-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-top:2px}

/* ═══════════════════════════════════════════════════════════
   TEST CARDS
══════════════════════════════════════════════════════════════ */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin-bottom:36px}
.card{background:var(--glass);border:1px solid var(--border);border-radius:var(--r);padding:20px 18px 16px;position:relative;overflow:hidden;backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);transition:border-color .35s,transform .3s cubic-bezier(.4,0,.2,1),box-shadow .3s;cursor:default}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--border);border-radius:var(--r) var(--r) 0 0;transition:background .4s,box-shadow .4s}
.card::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(160deg,rgba(255,255,255,0.05) 0%,transparent 50%);pointer-events:none}
.card.pass::before{background:linear-gradient(90deg,#34d399,#38bdf8);box-shadow:0 0 20px rgba(52,211,153,0.5)}
.card.warn::before{background:linear-gradient(90deg,#fbbf24,#fb923c);box-shadow:0 0 20px rgba(251,191,36,0.5)}
.card.fail::before{background:linear-gradient(90deg,#f87171,#f472b6);box-shadow:0 0 20px rgba(248,113,113,0.5)}
.card.pending::before{background:linear-gradient(90deg,rgba(71,85,105,0.4),rgba(100,116,139,0.6),rgba(71,85,105,0.4));background-size:200% 100%;animation:shimStripe 2.5s ease-in-out infinite}
@keyframes shimStripe{0%{background-position:100% 0}100%{background-position:-100% 0}}
.card:hover{border-color:rgba(129,140,248,0.3);transform:translateY(-6px);box-shadow:0 20px 50px rgba(0,0,0,0.5),var(--glow-v)}
.card.pass{background:rgba(16,185,129,0.04);border-color:rgba(52,211,153,0.15)}
.card.fail{background:rgba(239,68,68,0.04);border-color:rgba(248,113,113,0.15)}
.card.warn{background:rgba(245,158,11,0.04);border-color:rgba(251,191,36,0.15)}
.card.pass:hover{box-shadow:0 20px 50px rgba(0,0,0,0.4),var(--glow-pass)}
.card.fail:hover{box-shadow:0 20px 50px rgba(0,0,0,0.4),var(--glow-fail)}
.card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.card-label{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}

.badge{padding:3px 10px;border-radius:20px;font-size:9.5px;font-weight:700;letter-spacing:.8px;transition:all .3s}
.badge.PASS   {background:rgba(52,211,153,0.1);color:var(--pass);border:1px solid rgba(52,211,153,0.25);box-shadow:0 0 10px rgba(52,211,153,0.2)}
.badge.WARN   {background:rgba(251,191,36,0.1);color:var(--warn);border:1px solid rgba(251,191,36,0.25);box-shadow:0 0 10px rgba(251,191,36,0.2)}
.badge.FAIL   {background:rgba(248,113,113,0.1);color:var(--fail);border:1px solid rgba(248,113,113,0.25);box-shadow:0 0 10px rgba(248,113,113,0.2)}
.badge.PENDING{background:rgba(71,85,105,0.1);color:var(--pend);border:1px solid rgba(71,85,105,0.2);animation:badgePulse 2s ease-in-out infinite}
.badge.SKIP   {background:rgba(71,85,105,0.1);color:var(--muted);border:1px solid rgba(71,85,105,0.15)}
.badge.OK     {background:rgba(56,189,248,0.1);color:var(--a-cyan);border:1px solid rgba(56,189,248,0.25);box-shadow:0 0 10px rgba(56,189,248,0.2)}
@keyframes badgePulse{0%,100%{opacity:.6}50%{opacity:1}}

.card-icon{font-size:28px;margin-bottom:10px;display:block;line-height:1;filter:drop-shadow(0 0 8px rgba(129,140,248,0.4))}
.card-detail{font-size:11px;color:var(--text2);min-height:38px;line-height:1.65;margin-bottom:14px;word-break:break-all;font-family:'JetBrains Mono',monospace;font-weight:400}
.btn-run{width:100%;padding:9px;font-size:11.5px;font-weight:600;background:rgba(255,255,255,0.03);color:var(--muted);border:1px solid var(--border);border-radius:var(--r3);cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);letter-spacing:.4px;position:relative;overflow:hidden}
.btn-run:hover:not(:disabled){background:rgba(129,140,248,0.07);border-color:rgba(129,140,248,0.3);color:var(--a-indigo);transform:scale(1.02)}
.btn-run:active:not(:disabled){transform:scale(0.97)}
.btn-run:disabled{opacity:.3;cursor:not-allowed}

/* ═══════════════════════════════════════════════════════════
   PRISM GLASS CARD (shared)
══════════════════════════════════════════════════════════════ */
.glass-card{background:var(--glass);border:1px solid var(--border);border-radius:var(--r);padding:24px;backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);position:relative;overflow:hidden;transition:all .3s}
.glass-card::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(160deg,rgba(255,255,255,0.04) 0%,transparent 50%);pointer-events:none}
.stripe-cyan::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#38bdf8,#818cf8);box-shadow:0 0 24px rgba(56,189,248,0.4)}
.stripe-violet::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#a78bfa,#818cf8,#38bdf8);box-shadow:0 0 24px rgba(167,139,250,0.45)}
.stripe-pink::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#f472b6,#a78bfa,#818cf8);box-shadow:0 0 24px rgba(244,114,182,0.4)}
.stripe-amber::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#fbbf24,#fb7185,#f472b6);box-shadow:0 0 24px rgba(251,191,36,0.4)}
.stripe-prism::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#38bdf8,#818cf8,#a78bfa,#f472b6,#fbbf24,#34d399);background-size:300% 100%;animation:rainbowShift 5s linear infinite;box-shadow:0 0 20px rgba(129,140,248,0.35)}

/* ═══════════════════════════════════════════════════════════
   GPRS SPEED SECTION
══════════════════════════════════════════════════════════════ */
.gprs-section{margin-bottom:28px}
.gprs-inner{display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap}
.gprs-info{flex:1;min-width:200px}
.gprs-title{font-size:15px;font-weight:700;color:var(--text);margin-bottom:5px;display:flex;align-items:center;gap:8px}
.gprs-sub{font-size:11.5px;color:var(--text2);font-family:'JetBrains Mono',monospace;margin-bottom:12px;line-height:1.7}
.gprs-params{display:flex;gap:8px;flex-wrap:wrap}
.gprs-param{padding:4px 11px;border-radius:8px;font-size:10.5px;font-weight:600;background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.15);color:var(--a-cyan);font-family:'JetBrains Mono',monospace}
.gprs-actions{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0}
.gprs-status-text{font-size:11px;color:var(--text2);font-family:'JetBrains Mono',monospace;max-width:200px;text-align:right;min-height:14px}

.btn-speed{padding:12px 32px;font-size:13px;font-weight:700;background:linear-gradient(135deg,rgba(56,189,248,0.18),rgba(129,140,248,0.18),rgba(167,139,250,0.14));color:var(--a-cyan);border:1px solid rgba(56,189,248,0.35);border-radius:var(--r2);cursor:pointer;transition:all .28s cubic-bezier(.4,0,.2,1);letter-spacing:.3px;white-space:nowrap;position:relative;overflow:hidden}
.btn-speed::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.1),transparent);opacity:0;transition:opacity .3s;border-radius:inherit}
.btn-speed:hover:not(:disabled){background:linear-gradient(135deg,rgba(56,189,248,0.28),rgba(129,140,248,0.28),rgba(167,139,250,0.22));border-color:rgba(56,189,248,0.55);transform:translateY(-3px);box-shadow:0 8px 30px rgba(56,189,248,0.25);color:#fff}
.btn-speed:hover::before{opacity:1}
.btn-speed:active{transform:translateY(-1px)}
.btn-speed:disabled{opacity:.35;cursor:not-allowed;transform:none}

/* ═══════════════════════════════════════════════════════════
   BUTTON TESTING PANEL
══════════════════════════════════════════════════════════════ */
.btn-test-section{margin-bottom:28px}
.btn-test-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}

.btn-group-card{background:var(--glass2);border:1px solid var(--border);border-radius:var(--r);padding:20px;position:relative;overflow:hidden;backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);transition:all .28s}
.btn-group-card::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(150deg,rgba(255,255,255,0.04) 0%,transparent 60%);pointer-events:none}
.btn-group-card:hover{border-color:var(--border2);box-shadow:0 12px 40px rgba(0,0,0,0.4)}
.btn-group-title{font-size:12px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;margin-bottom:6px;display:flex;align-items:center;gap:8px}
.btn-group-sub{font-size:11px;color:var(--muted);margin-bottom:16px;line-height:1.5}
.btn-group-actions{display:flex;flex-direction:column;gap:9px}
.btn-group-status{font-size:10.5px;color:var(--text2);font-family:'JetBrains Mono',monospace;margin-top:10px;min-height:14px;padding:6px 10px;background:rgba(0,0,0,0.3);border-radius:7px;border:1px solid rgba(255,255,255,0.04);display:none}
.btn-group-status.visible{display:block}

.btn-action{width:100%;padding:10px 14px;font-size:12px;font-weight:600;border-radius:var(--r3);cursor:pointer;transition:all .22s cubic-bezier(.4,0,.2,1);letter-spacing:.3px;position:relative;overflow:hidden;display:flex;align-items:center;gap:8px;text-align:left}
.btn-action-icon{font-size:14px;flex-shrink:0}
.btn-action-text{flex:1}
.btn-action-badge{font-size:9px;font-weight:700;letter-spacing:.4px;padding:2px 6px;border-radius:6px;flex-shrink:0}
.btn-action:disabled{opacity:.35;cursor:not-allowed !important;transform:none !important;box-shadow:none !important}

.btn-cyan{background:rgba(56,189,248,0.07);color:var(--a-cyan);border:1px solid rgba(56,189,248,0.2)}
.btn-cyan:hover:not(:disabled){background:rgba(56,189,248,0.14);border-color:rgba(56,189,248,0.4);transform:translateX(4px);box-shadow:0 4px 16px rgba(56,189,248,0.2)}
.btn-violet{background:rgba(129,140,248,0.07);color:var(--a-indigo);border:1px solid rgba(129,140,248,0.2)}
.btn-violet:hover:not(:disabled){background:rgba(129,140,248,0.14);border-color:rgba(129,140,248,0.4);transform:translateX(4px);box-shadow:0 4px 16px rgba(129,140,248,0.2)}
.btn-pink{background:rgba(244,114,182,0.07);color:var(--a-pink);border:1px solid rgba(244,114,182,0.18)}
.btn-pink:hover:not(:disabled){background:rgba(244,114,182,0.13);border-color:rgba(244,114,182,0.38);transform:translateX(4px);box-shadow:0 4px 16px rgba(244,114,182,0.2)}
.btn-amber{background:rgba(251,191,36,0.07);color:var(--a-amber);border:1px solid rgba(251,191,36,0.18)}
.btn-amber:hover:not(:disabled){background:rgba(251,191,36,0.12);border-color:rgba(251,191,36,0.35);transform:translateX(4px);box-shadow:0 4px 16px rgba(251,191,36,0.18)}
.btn-emerald{background:rgba(52,211,153,0.07);color:var(--a-emerald);border:1px solid rgba(52,211,153,0.18)}
.btn-emerald:hover:not(:disabled){background:rgba(52,211,153,0.12);border-color:rgba(52,211,153,0.35);transform:translateX(4px);box-shadow:0 4px 16px rgba(52,211,153,0.18)}
.btn-rose{background:rgba(251,113,133,0.07);color:var(--a-rose);border:1px solid rgba(251,113,133,0.18)}
.btn-rose:hover:not(:disabled){background:rgba(251,113,133,0.12);border-color:rgba(251,113,133,0.35);transform:translateX(4px);box-shadow:0 4px 16px rgba(251,113,133,0.18)}

/* ═══════════════════════════════════════════════════════════
   FR METER + SWITCH PANEL
══════════════════════════════════════════════════════════════ */
.fr-section{margin-bottom:28px}
.fr-inner{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
.fr-info{}
.fr-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px}
.fr-sub{font-size:11.5px;color:var(--text2);font-family:'JetBrains Mono',monospace}
.fr-params{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.fr-param{padding:4px 11px;border-radius:8px;font-size:10.5px;font-weight:600;background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.16);color:var(--a-cyan);font-family:'JetBrains Mono',monospace}
.fr-actions{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.fr-badge-wrap{text-align:right}
.btn-fr{padding:10px 28px;font-size:13px;font-weight:700;background:linear-gradient(135deg,rgba(56,189,248,0.12),rgba(129,140,248,0.12));color:var(--a-cyan);border:1px solid rgba(56,189,248,0.28);border-radius:var(--r2);cursor:pointer;transition:all .25s;letter-spacing:.3px;white-space:nowrap}
.btn-fr:hover:not(:disabled){background:linear-gradient(135deg,rgba(56,189,248,0.22),rgba(129,140,248,0.22));border-color:rgba(56,189,248,0.5);transform:translateY(-2px);box-shadow:0 8px 28px rgba(56,189,248,0.22)}
.btn-fr:disabled{opacity:.35;cursor:not-allowed;transform:none}

.sw-section{margin-bottom:28px}
.sw-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.sw-header-left{display:flex;align-items:center;gap:14px}
.sw-icon-wrap{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(167,139,250,0.14),rgba(129,140,248,0.14));border:1px solid rgba(167,139,250,0.22);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.sw-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px}
.sw-sub{font-size:11px;color:var(--text2)}
.sw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:18px}
.sw-toggle{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px 14px;display:flex;flex-direction:column;align-items:center;gap:10px;position:relative;overflow:hidden;transition:all .35s cubic-bezier(.4,0,.2,1);cursor:default}
.sw-toggle::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:rgba(255,255,255,0.06);transition:background .4s,box-shadow .4s}
.sw-toggle.on{background:rgba(52,211,153,0.05);border-color:rgba(52,211,153,0.22);box-shadow:0 0 20px rgba(52,211,153,0.1)}
.sw-toggle.on::before{background:var(--pass);box-shadow:0 0 14px rgba(52,211,153,0.6)}
.sw-toggle.off{background:rgba(248,113,113,0.03);border-color:rgba(248,113,113,0.1)}
.sw-toggle.off::before{background:rgba(71,85,105,0.5)}
.sw-pill{width:52px;height:28px;border-radius:14px;position:relative;transition:all .35s;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);flex-shrink:0}
.sw-pill::after{content:'';position:absolute;width:20px;height:20px;border-radius:50%;top:3px;left:4px;background:#374151;transition:all .35s cubic-bezier(.4,0,.2,1);box-shadow:0 2px 6px rgba(0,0,0,0.4)}
.sw-toggle.on .sw-pill{background:rgba(52,211,153,0.22);border-color:rgba(52,211,153,0.38);box-shadow:0 0 10px rgba(52,211,153,0.35)}
.sw-toggle.on .sw-pill::after{left:28px;background:var(--pass);box-shadow:0 2px 8px rgba(52,211,153,0.6)}
.sw-toggle.off .sw-pill::after{background:#374151}
.sw-label{font-size:11px;font-weight:700;letter-spacing:.6px;color:var(--text2);text-transform:uppercase}
.sw-gpio{font-size:9.5px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-top:1px}
.sw-state{font-size:10px;font-weight:700;letter-spacing:.5px;padding:2px 8px;border-radius:8px;transition:all .3s}
.sw-toggle.on  .sw-state{color:var(--pass);background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.22)}
.sw-toggle.off .sw-state{color:var(--muted);background:rgba(71,85,105,0.07);border:1px solid rgba(71,85,105,0.14)}
.sw-ring{position:absolute;inset:0;border-radius:14px;border:1px solid transparent;transition:all .4s;pointer-events:none}
.sw-toggle.on .sw-ring{border-color:rgba(52,211,153,0.18);animation:swRingPulse 2.5s ease-in-out infinite}
@keyframes swRingPulse{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,0.12)}50%{box-shadow:0 0 0 7px rgba(52,211,153,0)}}
.btn-sw{padding:10px 28px;font-size:13px;font-weight:700;background:linear-gradient(135deg,rgba(167,139,250,0.13),rgba(129,140,248,0.13));color:var(--a-violet);border:1px solid rgba(167,139,250,0.28);border-radius:var(--r2);cursor:pointer;transition:all .25s;letter-spacing:.3px;white-space:nowrap}
.btn-sw:hover:not(:disabled){background:linear-gradient(135deg,rgba(167,139,250,0.25),rgba(129,140,248,0.25));border-color:rgba(167,139,250,0.5);transform:translateY(-2px);box-shadow:0 8px 28px rgba(167,139,250,0.22)}
.btn-sw:disabled{opacity:.35;cursor:not-allowed;transform:none}
.sw-live-dot{width:6px;height:6px;border-radius:50%;background:var(--a-violet);display:inline-block;box-shadow:0 0 6px var(--a-violet);animation:pulse-dot 1.5s ease-in-out infinite;margin-right:6px}

/* ═══════════════════════════════════════════════════════════
   LOG + OTA
══════════════════════════════════════════════════════════════ */
.log-wrap{margin-bottom:28px}
.log-box{background:rgba(2,4,8,0.92);border:1px solid var(--border);border-radius:var(--r2);padding:16px 18px;font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;line-height:1.85;height:240px;overflow-y:auto;color:#4a6070;white-space:pre-wrap;word-break:break-all;backdrop-filter:blur(16px);position:relative}
.log-box::before{content:'';position:absolute;top:0;left:0;right:0;height:28px;background:linear-gradient(rgba(2,4,8,0.92),transparent);pointer-events:none;z-index:1;border-radius:var(--r2) var(--r2) 0 0}
.log-box .lp{color:#34d399}.log-box .lw{color:#fbbf24}.log-box .lf{color:#f87171}.log-box .li{color:#38bdf8}
.log-box::-webkit-scrollbar{width:5px}
.log-box::-webkit-scrollbar-track{background:rgba(255,255,255,0.02)}
.log-box::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
.log-box::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.15)}
.btn-xs{padding:5px 12px;font-size:10.5px;font-weight:600;background:rgba(255,255,255,0.03);color:var(--muted);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all .2s;letter-spacing:.3px}
.btn-xs:hover{background:rgba(255,255,255,0.07);color:var(--text);border-color:var(--border2)}

.ota-section{margin-bottom:36px}
.ota-header{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.ota-icon-wrap{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(56,189,248,0.12),rgba(129,140,248,0.12));border:1px solid rgba(56,189,248,0.18);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.ota-header-text h3{font-size:15px;font-weight:700;color:var(--text);margin-bottom:3px}
.ota-header-text p{font-size:11.5px;color:var(--text2)}
.ota-drop{border:2px dashed rgba(255,255,255,0.09);border-radius:var(--r2);padding:40px 24px;text-align:center;cursor:pointer;transition:all .35s cubic-bezier(.4,0,.2,1);background:rgba(255,255,255,0.01);position:relative;overflow:hidden}
.ota-drop::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(56,189,248,0.04) 0%,transparent 70%);transition:opacity .3s;opacity:0}
.ota-drop:hover,.ota-drop.over{border-color:rgba(56,189,248,0.38);background:rgba(56,189,248,0.03)}
.ota-drop:hover::before,.ota-drop.over::before{opacity:1}
.ota-drop.over{border-color:var(--a-cyan);background:rgba(56,189,248,0.07);transform:scale(1.01)}
.ota-drop input[type=file]{display:none}
.drop-icon{font-size:40px;margin-bottom:10px;display:block;transition:transform .3s;filter:drop-shadow(0 0 8px rgba(56,189,248,0.3))}
.ota-drop:hover .drop-icon{transform:translateY(-5px) scale(1.06)}
.drop-text{color:var(--text2);font-size:13.5px;margin-bottom:4px;font-weight:500}
.drop-hint{color:var(--muted);font-size:11px}
.ota-file{color:var(--a-cyan);font-size:12.5px;font-weight:600;margin-top:12px;min-height:18px;font-family:'JetBrains Mono',monospace}
.prog-wrap{display:none;margin-top:20px}
.prog-track{background:rgba(255,255,255,0.04);border-radius:20px;height:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.04)}
.prog-fill{height:100%;border-radius:20px;width:0;background:linear-gradient(90deg,#38bdf8,#818cf8,#a78bfa,#f472b6);background-size:300% 100%;transition:width .35s cubic-bezier(.4,0,.2,1);animation:progShimmer 2s linear infinite;box-shadow:0 0 14px rgba(129,140,248,0.5)}
@keyframes progShimmer{0%{background-position:300% 0}100%{background-position:-300% 0}}
.prog-label{font-size:11.5px;color:var(--text2);margin-top:8px;font-family:'JetBrains Mono',monospace}
.btn-flash{display:none;margin-top:18px;padding:12px 36px;font-size:13.5px;font-weight:700;background:linear-gradient(135deg,#38bdf8,#818cf8,#a78bfa);color:#fff;border:none;border-radius:var(--r2);cursor:pointer;transition:all .25s;letter-spacing:.3px;box-shadow:0 0 30px rgba(129,140,248,0.25)}
.btn-flash:hover{transform:translateY(-3px);box-shadow:0 0 50px rgba(129,140,248,0.45),0 8px 28px rgba(0,0,0,0.4)}
.btn-flash:disabled{opacity:.4;cursor:not-allowed;transform:none}
.ota-status{display:none;margin-top:14px;font-size:13px;font-weight:600}
.ota-steps{display:flex;gap:0;margin-top:20px}
.ota-step{flex:1;text-align:center;padding:10px 8px;position:relative;font-size:10.5px;color:var(--muted);font-weight:600;letter-spacing:.3px}
.ota-step::after{content:'';position:absolute;bottom:0;left:10%;right:10%;height:2px;background:rgba(255,255,255,0.05);border-radius:2px;transition:background .4s}
.ota-step.active{color:var(--a-cyan)}
.ota-step.active::after{background:var(--a-cyan);box-shadow:0 0 8px rgba(56,189,248,0.4)}
.ota-step.done{color:var(--pass)}
.ota-step.done::after{background:var(--pass)}
.ota-step-icon{font-size:16px;display:block;margin-bottom:4px}

/* ═══════════════════════════════════════════════════════════
   TOAST + FOOTER
══════════════════════════════════════════════════════════════ */
.toast{position:fixed;bottom:24px;right:24px;z-index:999;padding:12px 20px;border-radius:var(--r2);font-size:12.5px;font-weight:600;letter-spacing:.2px;backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:8px;transform:translateY(80px);opacity:0;transition:all .35s cubic-bezier(.4,0,.2,1);pointer-events:none;max-width:360px}
.toast.show{transform:translateY(0);opacity:1}
.toast.ok{background:rgba(16,185,129,0.15);color:var(--pass);border-color:rgba(52,211,153,0.25);box-shadow:0 0 30px rgba(52,211,153,0.15)}
.toast.warn{background:rgba(245,158,11,0.15);color:var(--warn);border-color:rgba(251,191,36,0.25);box-shadow:0 0 30px rgba(251,191,36,0.15)}
.toast.err{background:rgba(239,68,68,0.15);color:var(--fail);border-color:rgba(248,113,113,0.25);box-shadow:0 0 30px rgba(248,113,113,0.15)}
.toast.info{background:rgba(56,189,248,0.12);color:var(--a-cyan);border-color:rgba(56,189,248,0.25);box-shadow:0 0 30px rgba(56,189,248,0.15)}

footer{text-align:center;padding:24px 16px;color:var(--muted);font-size:11px;border-top:1px solid var(--border);margin-top:8px;background:rgba(2,4,8,0.6)}
footer a{color:var(--a-cyan);text-decoration:none}
footer a:hover{text-decoration:underline}
.footer-grid{display:flex;justify-content:center;gap:24px;flex-wrap:wrap}
.footer-item{display:flex;align-items:center;gap:6px}
.footer-item .dot{width:3px;height:3px;border-radius:50%;background:var(--muted)}

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════════════════════ */
@media(max-width:560px){
  .hero h1{font-size:24px}
  .btn-all{padding:13px 36px;font-size:14px}
  main{padding:20px 12px}
  header{padding:10px 16px}
  .stats-bar{gap:8px}
  .fr-inner{flex-direction:column;align-items:flex-start}
  .fr-actions{align-items:flex-start;width:100%}
  .btn-fr{width:100%;text-align:center}
  .sw-grid{grid-template-columns:repeat(2,1fr)}
  .sw-header{flex-direction:column;align-items:flex-start}
  .btn-sw{width:100%}
  .gprs-inner{flex-direction:column;align-items:flex-start}
  .gprs-actions{align-items:flex-start;width:100%}
  .btn-speed{width:100%}
  .btn-test-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>

<div class="prism-bg"><div class="p1"></div><div class="p2"></div><div class="p3"></div><div class="p4"></div></div>
<div class="streak streak-1"></div><div class="streak streak-2"></div><div class="streak streak-3"></div>
<div class="mote mote-1"></div><div class="mote mote-2"></div><div class="mote mote-3"></div><div class="mote mote-4"></div><div class="mote mote-5"></div>

<div class="toast" id="toast"></div>

<!-- ══ HEADER ══════════════════════════════════════════════ -->
<header>
  <div class="logo">
    <div class="logo-icon">⚡</div>
    <div>
      <div class="logo-name">Gateway Diagnostic</div>
      <div class="logo-sub">ESP32-S3 &nbsp;·&nbsp; 192.168.4.1 &nbsp;·&nbsp; v4.0</div>
    </div>
  </div>
  <div class="header-right">
    <div class="fw-badge" id="fw-badge">FW 4.0</div>
    <div class="conn-pill"><span class="conn-dot"></span>Connected</div>
  </div>
</header>

<main>

  <!-- ══ HERO ══════════════════════════════════════════════ -->
  <div class="hero">
    <h1>Hardware Diagnostic Suite</h1>
    <p id="last-run">Tests not yet run — press the button to begin</p>
    <button class="btn-all" id="btn-all" onclick="runAll()">&#9654;&nbsp; Run All Tests</button>
  </div>

  <!-- ══ STATS BAR ════════════════════════════════════════ -->
  <div class="stats-bar">
    <div class="stat-chip">
      <div class="stat-chip-icon">🧠</div>
      <div><div class="stat-chip-val" id="stat-heap">—</div><div class="stat-chip-label">Free Heap</div></div>
    </div>
    <div class="stat-chip">
      <div class="stat-chip-icon">💾</div>
      <div><div class="stat-chip-val" id="stat-psram">—</div><div class="stat-chip-label">Free PSRAM</div></div>
    </div>
    <div class="stat-chip">
      <div class="stat-chip-icon">📡</div>
      <div><div class="stat-chip-val" id="stat-clients">—</div><div class="stat-chip-label">WiFi Clients</div></div>
    </div>
    <div class="stat-chip">
      <div class="stat-chip-icon">✅</div>
      <div><div class="stat-chip-val" id="stat-pass">0/0</div><div class="stat-chip-label">Tests Passed</div></div>
    </div>
    <div class="stat-chip">
      <div class="stat-chip-icon">📶</div>
      <div><div class="stat-chip-val" id="stat-gprs-baud">115200</div><div class="stat-chip-label">GPRS Baud</div></div>
    </div>
  </div>

  <!-- ══ TEST CARDS ════════════════════════════════════════ -->
  <div class="sec-title"><span><span class="ico">🔬</span>Module Tests</span><span id="test-count" style="font-size:11px;color:var(--muted)"></span></div>
  <div class="grid" id="grid"></div>

  <!-- ══ GPRS SPEED CONTROL ════════════════════════════════ -->
  <div class="gprs-section">
    <div class="sec-title">
      <span><span class="ico">📡</span><span class="sec-title-accent">GPRS Speed Control</span></span>
      <span style="font-size:10px;color:var(--muted)">AT+IPR command</span>
    </div>
    <div class="glass-card stripe-cyan">
      <div class="gprs-inner">
        <div class="gprs-info">
          <div class="gprs-title">📶 GPRS / LTE Baud Rate Control</div>
          <div class="gprs-sub">
            Send AT+IPR=1000000;&W to the modem to permanently set<br>
            the UART interface speed to <strong style="color:var(--a-cyan)">1 Mbps (1,000,000 baud)</strong>.<br>
            The &amp;W saves the setting to NVM — survives power cycle.
          </div>
          <div class="gprs-params">
            <span class="gprs-param">AT+IPR=1000000;&W</span>
            <span class="gprs-param">1 Mbps</span>
            <span class="gprs-param">Serial1</span>
            <span class="gprs-param">GPIO 1/2</span>
          </div>
        </div>
        <div class="gprs-actions">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge PENDING" id="badge-gprs-main">PENDING</span>
          </div>
          <div class="gprs-status-text" id="gprs-speed-status"></div>
          <button class="btn-speed" id="btn-gprs-speed" onclick="doGPRSSpeed()">
            ⚡ Set 1 Mbps Speed
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ BUTTON TESTING PANEL ═══════════════════════════════ -->
  <div class="btn-test-section">
    <div class="sec-title">
      <span><span class="ico">🎮</span><span class="sec-title-accent">Button Testing Panel</span></span>
      <span style="font-size:10px;color:var(--muted)">Quick-action controls</span>
    </div>
    <div class="btn-test-grid">

      <!-- GPRS Modem Controls -->
      <div class="btn-group-card stripe-cyan">
        <div class="btn-group-title" style="color:var(--a-cyan)">📡 GPRS Modem Controls</div>
        <div class="btn-group-sub">Direct AT command buttons for modem management</div>
        <div class="btn-group-actions">
          <button class="btn-action btn-cyan" id="btg-speed" onclick="doGPRSSpeed()">
            <span class="btn-action-icon">⚡</span>
            <span class="btn-action-text">Set 1 Mbps Speed</span>
            <span class="btn-action-badge" style="background:rgba(56,189,248,0.12);color:var(--a-cyan);border:1px solid rgba(56,189,248,0.25)">IPR=1M</span>
          </button>
          <button class="btn-action btn-violet" id="btg-reset" onclick="doGPRSReset()">
            <span class="btn-action-icon">🔄</span>
            <span class="btn-action-text">Reset Modem</span>
            <span class="btn-action-badge" style="background:rgba(129,140,248,0.12);color:var(--a-indigo);border:1px solid rgba(129,140,248,0.25)">ATZ</span>
          </button>
          <button class="btn-action btn-pink" id="btg-echo" onclick="doGPRSEchoOff()">
            <span class="btn-action-icon">🔕</span>
            <span class="btn-action-text">Disable Echo</span>
            <span class="btn-action-badge" style="background:rgba(244,114,182,0.12);color:var(--a-pink);border:1px solid rgba(244,114,182,0.25)">ATE0</span>
          </button>
          <button class="btn-action btn-emerald" onclick="runOne('gprs')">
            <span class="btn-action-icon">📋</span>
            <span class="btn-action-text">Run GPRS Test</span>
            <span class="btn-action-badge" style="background:rgba(52,211,153,0.12);color:var(--a-emerald);border:1px solid rgba(52,211,153,0.25)">AT+CSQ</span>
          </button>
        </div>
        <div class="btn-group-status" id="status-gprs-group"></div>
      </div>

      <!-- Serial Port Tests -->
      <div class="btn-group-card stripe-violet">
        <div class="btn-group-title" style="color:var(--a-indigo)">🔌 Serial Port Tests</div>
        <div class="btn-group-sub">Run individual serial interface diagnostics</div>
        <div class="btn-group-actions">
          <button class="btn-action btn-cyan" onclick="runOne('rs232')">
            <span class="btn-action-icon">🔌</span>
            <span class="btn-action-text">Test RS232</span>
            <span class="btn-action-badge" style="background:rgba(56,189,248,0.12);color:var(--a-cyan);border:1px solid rgba(56,189,248,0.25)">5s Loop</span>
          </button>
          <button class="btn-action btn-violet" onclick="runOne('rs485')">
            <span class="btn-action-icon">🔗</span>
            <span class="btn-action-text">Test RS485</span>
            <span class="btn-action-badge" style="background:rgba(129,140,248,0.12);color:var(--a-indigo);border:1px solid rgba(129,140,248,0.25)">5s Bus</span>
          </button>
          <button class="btn-action btn-emerald" onclick="runOne('fr')">
            <span class="btn-action-icon">⚡</span>
            <span class="btn-action-text">Test FR Meter</span>
            <span class="btn-action-badge" style="background:rgba(52,211,153,0.12);color:var(--a-emerald);border:1px solid rgba(52,211,153,0.25)">Modbus</span>
          </button>
        </div>
        <div class="btn-group-status" id="status-serial-group"></div>
      </div>

      <!-- Hardware Diagnostics -->
      <div class="btn-group-card stripe-pink">
        <div class="btn-group-title" style="color:var(--a-pink)">🖥️ Hardware Diagnostics</div>
        <div class="btn-group-sub">Test onboard hardware modules individually</div>
        <div class="btn-group-actions">
          <button class="btn-action btn-amber" onclick="runOne('psram')">
            <span class="btn-action-icon">💾</span>
            <span class="btn-action-text">Test PSRAM</span>
            <span class="btn-action-badge" style="background:rgba(251,191,36,0.12);color:var(--a-amber);border:1px solid rgba(251,191,36,0.25)">Alloc/R/W</span>
          </button>
          <button class="btn-action btn-cyan" onclick="runOne('rtc')">
            <span class="btn-action-icon">🕐</span>
            <span class="btn-action-text">Test RTC DS1307</span>
            <span class="btn-action-badge" style="background:rgba(56,189,248,0.12);color:var(--a-cyan);border:1px solid rgba(56,189,248,0.25)">I2C</span>
          </button>
          <button class="btn-action btn-violet" onclick="runOne('winbond')">
            <span class="btn-action-icon">🗂️</span>
            <span class="btn-action-text">Test Winbond Flash</span>
            <span class="btn-action-badge" style="background:rgba(129,140,248,0.12);color:var(--a-indigo);border:1px solid rgba(129,140,248,0.25)">JEDEC</span>
          </button>
          <button class="btn-action btn-emerald" onclick="runOne('di')">
            <span class="btn-action-icon">⚡</span>
            <span class="btn-action-text">Test Digital Inputs</span>
            <span class="btn-action-badge" style="background:rgba(52,211,153,0.12);color:var(--a-emerald);border:1px solid rgba(52,211,153,0.25)">G38-41</span>
          </button>
        </div>
        <div class="btn-group-status" id="status-hw-group"></div>
      </div>

      <!-- Switch Controls -->
      <div class="btn-group-card stripe-amber">
        <div class="btn-group-title" style="color:var(--a-amber)">🔀 Switch &amp; GPIO Testing</div>
        <div class="btn-group-sub">Physical switches and GPIO live monitoring</div>
        <div class="btn-group-actions">
          <button class="btn-action btn-amber" onclick="runOne('switch')">
            <span class="btn-action-icon">🔀</span>
            <span class="btn-action-text">Test All Switches</span>
            <span class="btn-action-badge" style="background:rgba(251,191,36,0.12);color:var(--a-amber);border:1px solid rgba(251,191,36,0.25)">SW1-4</span>
          </button>
          <button class="btn-action btn-emerald" onclick="fetchSwitchState()">
            <span class="btn-action-icon">🔄</span>
            <span class="btn-action-text">Refresh Switch States</span>
            <span class="btn-action-badge" style="background:rgba(52,211,153,0.12);color:var(--a-emerald);border:1px solid rgba(52,211,153,0.25)">Live</span>
          </button>
        </div>
        <div class="btn-group-status" id="status-sw-group"></div>
      </div>

      <!-- System Controls -->
      <div class="btn-group-card stripe-prism">
        <div class="btn-group-title" style="background:linear-gradient(90deg,var(--a-cyan),var(--a-violet));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">🌐 System Controls</div>
        <div class="btn-group-sub">Run all tests, refresh data, system actions</div>
        <div class="btn-group-actions">
          <button class="btn-action btn-cyan" onclick="runAll()">
            <span class="btn-action-icon">▶</span>
            <span class="btn-action-text">Run ALL Tests</span>
            <span class="btn-action-badge" style="background:rgba(56,189,248,0.12);color:var(--a-cyan);border:1px solid rgba(56,189,248,0.25)">Full Suite</span>
          </button>
          <button class="btn-action btn-violet" onclick="fetchResults()">
            <span class="btn-action-icon">↻</span>
            <span class="btn-action-text">Refresh Results</span>
            <span class="btn-action-badge" style="background:rgba(129,140,248,0.12);color:var(--a-indigo);border:1px solid rgba(129,140,248,0.25)">Poll</span>
          </button>
          <button class="btn-action btn-pink" onclick="fetchLog()">
            <span class="btn-action-icon">📋</span>
            <span class="btn-action-text">Refresh Log</span>
            <span class="btn-action-badge" style="background:rgba(244,114,182,0.12);color:var(--a-pink);border:1px solid rgba(244,114,182,0.25)">Console</span>
          </button>
          <button class="btn-action btn-rose" onclick="clearLog()">
            <span class="btn-action-icon">✕</span>
            <span class="btn-action-text">Clear Log</span>
            <span class="btn-action-badge" style="background:rgba(251,113,133,0.12);color:var(--a-rose);border:1px solid rgba(251,113,133,0.25)">Local</span>
          </button>
        </div>
        <div class="btn-group-status" id="status-sys-group"></div>
      </div>

    </div>
  </div>

  <!-- ══ SWITCH PANEL ══════════════════════════════════════ -->
  <div class="sw-section">
    <div class="sec-title">
      <span><span class="ico">🔀</span>Switch Inputs · Live Monitor</span>
      <span><span class="sw-live-dot"></span><span style="font-size:10px;color:var(--muted)">Live</span></span>
    </div>
    <div class="glass-card stripe-violet">
      <div class="sw-header">
        <div class="sw-header-left">
          <div class="sw-icon-wrap">🔀</div>
          <div>
            <div class="sw-title">Physical Switch Inputs</div>
            <div class="sw-sub">GPIO reads with INPUT_PULLUP · LOW = switch closed (ON)</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge PENDING" id="badge-switch">PENDING</span>
          <button class="btn-sw" id="btn-sw" onclick="runOne('switch')">🔀 Test Switches</button>
        </div>
      </div>
      <div class="sw-grid" id="sw-grid"></div>
      <div id="sw-detail" style="font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;min-height:16px"></div>
    </div>
  </div>

  <!-- ══ FR METER SECTION ══════════════════════════════════ -->
  <div class="fr-section">
    <div class="sec-title"><span><span class="ico">⚡</span>FR Meter · Modbus RTU</span></div>
    <div class="glass-card stripe-cyan">
      <div class="fr-inner">
        <div class="fr-info">
          <div class="fr-title">FR Meter — Frequency / Register Read</div>
          <div class="fr-sub" id="fr-detail">Reads Modbus holding registers from FR slave device via RS232</div>
          <div class="fr-params">
            <span class="fr-param">Slave ID: 1</span>
            <span class="fr-param">Reg: 0–1</span>
            <span class="fr-param">FC03</span>
            <span class="fr-param">9600 baud</span>
          </div>
        </div>
        <div class="fr-actions">
          <div class="fr-badge-wrap"><span class="badge PENDING" id="badge-fr">PENDING</span></div>
          <button class="btn-fr" id="btn-fr" onclick="runOne('fr')">⚡ Run FR Test</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ LOG CONSOLE ═══════════════════════════════════════ -->
  <div class="log-wrap">
    <div class="sec-title">
      <span><span class="ico">📋</span>Diagnostic Log</span>
      <span>
        <button class="btn-xs" onclick="fetchLog()">↻ Refresh</button>
        &nbsp;
        <button class="btn-xs" onclick="clearLog()">✕ Clear</button>
      </span>
    </div>
    <div class="log-box" id="log">Waiting for test output...</div>
  </div>

  <!-- ══ OTA FIRMWARE UPDATE ════════════════════════════════ -->
  <div class="ota-section">
    <div class="sec-title"><span><span class="ico">🔄</span>OTA Firmware Update</span></div>
    <div class="glass-card stripe-prism">
      <div class="ota-header">
        <div class="ota-icon-wrap">📦</div>
        <div class="ota-header-text">
          <h3>Over-the-Air Firmware Flash</h3>
          <p>Drop a compiled <code>.bin</code> file — device reboots automatically after flash</p>
        </div>
      </div>
      <div class="ota-steps" id="ota-steps">
        <div class="ota-step active" id="step-select"><span class="ota-step-icon">📁</span>Select File</div>
        <div class="ota-step" id="step-upload"><span class="ota-step-icon">⬆</span>Upload</div>
        <div class="ota-step" id="step-flash"><span class="ota-step-icon">⚡</span>Flash</div>
        <div class="ota-step" id="step-reboot"><span class="ota-step-icon">🔄</span>Reboot</div>
      </div>
      <div style="margin-top:20px">
        <div class="ota-drop" id="ota-drop"
             onclick="document.getElementById('ota-file').click()"
             ondragover="event.preventDefault();this.classList.add('over')"
             ondragleave="this.classList.remove('over')"
             ondrop="handleDrop(event)">
          <input type="file" id="ota-file" accept=".bin" onchange="onFilePick(this)">
          <span class="drop-icon">📥</span>
          <div class="drop-text">Drop <code>.bin</code> firmware here or <strong>click to browse</strong></div>
          <div class="drop-hint">Max size limited by ESP32 flash partition · Reboots after success</div>
          <div class="ota-file" id="ota-fname"></div>
        </div>
        <div class="prog-wrap" id="prog-wrap">
          <div class="prog-track"><div class="prog-fill" id="prog-fill"></div></div>
          <div class="prog-label" id="prog-label">Uploading…</div>
        </div>
        <button class="btn-flash" id="btn-flash" onclick="doFlash()">⬆ Flash Firmware Now</button>
        <div class="ota-status" id="ota-status"></div>
      </div>
    </div>
  </div>

</main>

<!-- ══ FOOTER ════════════════════════════════════════════ -->
<footer>
  <div class="footer-grid">
    <div class="footer-item">ESP32-S3 Gateway Diagnostic v4.0</div>
    <div class="footer-item"><div class="dot"></div>WiFi: <strong style="color:var(--text);margin-left:4px">Esp32_Channel_Network's</strong></div>
    <div class="footer-item"><div class="dot"></div>Pass: <strong style="color:var(--text);margin-left:4px">esp32</strong></div>
    <div class="footer-item"><div class="dot"></div>IP: <a href="http://192.168.4.1">192.168.4.1</a></div>
  </div>
</footer>

<script>
'use strict';

const MODS = [
  {id:'rs232',   name:'RS232',    icon:'🔌', desc:'Loopback + Modbus RTU · 5s test · Serial2'},
  {id:'rs485',   name:'RS485',    icon:'🔗', desc:'Modbus bus probe · 5s continuous · Serial2'},
  {id:'gprs',    name:'GPRS/LTE', icon:'📡', desc:'SIM modem · AT handshake · Serial1'},
  {id:'di',      name:'DI',       icon:'⚡', desc:'Digital inputs · GPIO 38-41'},
  {id:'psram',   name:'PSRAM',    icon:'💾', desc:'External PSRAM · alloc/write/read'},
  {id:'rtc',     name:'RTC',      icon:'🕐', desc:'DS1307 · I2C clock read'},
  {id:'winbond', name:'Winbond',  icon:'🗂️', desc:'SPI flash · JEDEC ID check'},
];

const SW_DEFS = [
  {label:'SW1', gpio:42},
  {label:'SW2', gpio:45},
  {label:'SW3', gpio:46},
  {label:'SW4', gpio:47},
];

let pollTimer    = null;
let selectedFile = null;
let swLiveTimer  = null;
let toastTimer   = null;

/* Toast */
function showToast(msg, type, dur) {
  if (!dur) dur = 3200;
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + (type || 'info');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, dur);
}

/* Build cards */
function buildCards() {
  var html = '';
  for (var i = 0; i < MODS.length; i++) {
    var m = MODS[i];
    html += '<div class="card pending" id="card-' + m.id + '">' +
      '<div class="card-head"><span class="card-label">' + m.name + '</span>' +
      '<span class="badge PENDING" id="badge-' + m.id + '">PENDING</span></div>' +
      '<span class="card-icon">' + m.icon + '</span>' +
      '<div class="card-detail" id="detail-' + m.id + '">' + m.desc + '</div>' +
      '<button class="btn-run" id="btn-' + m.id + '" onclick="runOne(\'' + m.id + '\')">&#9654; Run</button>' +
      '</div>';
  }
  document.getElementById('grid').innerHTML = html;
}

/* Build switches */
function buildSwitches() {
  var html = '';
  for (var i = 0; i < SW_DEFS.length; i++) {
    var s = SW_DEFS[i];
    html += '<div class="sw-toggle off" id="sw-' + s.label + '">' +
      '<div class="sw-ring"></div><div class="sw-pill"></div>' +
      '<div class="sw-label">' + s.label + '</div>' +
      '<div class="sw-gpio">GPIO ' + s.gpio + '</div>' +
      '<div class="sw-state" id="sw-state-' + s.label + '">OFF</div>' +
      '</div>';
  }
  document.getElementById('sw-grid').innerHTML = html;
}

/* Switch states */
function applySwitchStates(data) {
  for (var i = 0; i < data.switches.length; i++) {
    var s = data.switches[i];
    var tog  = document.getElementById('sw-' + s.label);
    var stEl = document.getElementById('sw-state-' + s.label);
    if (!tog) continue;
    tog.classList.toggle('on',  s.on);
    tog.classList.toggle('off', !s.on);
    if (stEl) stEl.textContent = s.on ? 'ON' : 'OFF';
  }
}

function fetchSwitchState() {
  fetch('/switch-state').then(function(r){ return r.json(); }).then(function(d){ applySwitchStates(d); }).catch(function(){});
}

function startSwLive() {
  if (swLiveTimer) return;
  fetchSwitchState();
  swLiveTimer = setInterval(fetchSwitchState, 1000);
}

/* Results */
function fetchResults() {
  fetch('/results').then(function(r){ return r.json(); }).then(function(d){ applyResults(d); }).catch(function(){});
}

function applyResults(data) {
  var busy   = data.running;
  var allBtn = document.getElementById('btn-all');
  if (busy) {
    allBtn.disabled = true;
    allBtn.innerHTML = '<span class="spin"></span>Running...';
    allBtn.classList.add('busy');
  } else {
    allBtn.disabled = false;
    allBtn.innerHTML = '&#9654;&nbsp; Run All Tests';
    allBtn.classList.remove('busy');
  }

  var passed = 0, total = 0;

  for (var i = 0; i < data.tests.length; i++) {
    var t      = data.tests[i];
    var key    = t.name.toLowerCase();
    var card   = document.getElementById('card-' + key);
    var badge  = document.getElementById('badge-' + key);
    var detail = document.getElementById('detail-' + key);
    var btn    = document.getElementById('btn-' + key);

    total++;
    if (t.status === 'PASS') passed++;

    if (key === 'fr') {
      var fb = document.getElementById('badge-fr');
      var fd = document.getElementById('fr-detail');
      var fb2 = document.getElementById('btn-fr');
      if (fb)  { fb.className = 'badge ' + t.status; fb.textContent = t.status; }
      if (fd)  fd.textContent = t.detail;
      if (fb2) fb2.disabled = busy;
      continue;
    }

    if (key === 'switch') {
      var sb = document.getElementById('badge-switch');
      var sd = document.getElementById('sw-detail');
      var sb2 = document.getElementById('btn-sw');
      if (sb)  { sb.className = 'badge ' + t.status; sb.textContent = t.status; }
      if (sd)  sd.textContent = t.detail;
      if (sb2) sb2.disabled = busy;
      continue;
    }

    if (!card) continue;
    var st = t.status.toLowerCase();
    card.className  = 'card ' + st;
    if (badge) { badge.className = 'badge ' + t.status; badge.textContent = t.status; }
    if (detail) detail.textContent = t.detail;
    if (btn) btn.disabled = busy;
  }

  document.getElementById('stat-pass').textContent = passed + '/' + total;
  document.getElementById('test-count').textContent = passed + ' passed, ' + (total - passed) + ' pending/failed';

  var btgIds = ['btg-speed','btg-reset','btg-echo'];
  for (var j = 0; j < btgIds.length; j++) {
    var el = document.getElementById(btgIds[j]);
    if (el) el.disabled = busy;
  }

  if (!busy && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    document.getElementById('last-run').textContent = 'Last run: ' + new Date().toLocaleTimeString();
  }
}

/* Info */
function fetchInfo() {
  fetch('/info').then(function(r){ return r.json(); }).then(function(d){
    var fmt = function(v){ return v >= 1048576 ? (v/1048576).toFixed(1)+' MB' : (v/1024).toFixed(0)+' KB'; };
    document.getElementById('stat-heap').textContent    = fmt(d.heap);
    document.getElementById('stat-psram').textContent   = d.psram ? fmt(d.psram) : 'N/A';
    document.getElementById('stat-clients').textContent = d.clients;
    document.getElementById('fw-badge').textContent     = 'FW ' + d.fw;
  }).catch(function(){});
}

/* GPRS Speed */
function setGPRSSpeedStatus(msg, type) {
  var el = document.getElementById('gprs-speed-status');
  if (el) el.textContent = msg;
  var badge = document.getElementById('badge-gprs-main');
  if (badge) {
    badge.textContent = type === 'ok' ? 'OK' : type === 'warn' ? 'WARN' : 'PENDING';
    badge.className   = type === 'ok' ? 'badge OK' : type === 'warn' ? 'badge WARN' : 'badge PENDING';
  }
}

function doGPRSSpeed() {
  var btn  = document.getElementById('btn-gprs-speed');
  var btn2 = document.getElementById('btg-speed');
  if (btn) btn.disabled = true;
  if (btn2) btn2.disabled = true;
  setGPRSSpeedStatus('Sending AT+IPR=1000000;&W...', 'pending');
  showToast('Sending AT+IPR=1000000;&W to modem...', 'info', 5000);
  fetch('/gprs-speed', {method:'POST'}).then(function(r){ return r.json(); }).then(function(d){
    var ok = d.status === 'ok';
    setGPRSSpeedStatus(d.msg || d.status, ok ? 'ok' : 'warn');
    document.getElementById('stat-gprs-baud').textContent = ok ? '1 Mbps' : '?';
    var sg = document.getElementById('status-gprs-group');
    if (sg) { sg.textContent = d.msg; sg.className = 'btn-group-status visible'; }
    showToast((ok ? 'OK: ' : 'WARN: ') + d.msg, ok ? 'ok' : 'warn');
    fetchLog();
  }).catch(function(){
    setGPRSSpeedStatus('Network error', 'warn');
    showToast('Network error', 'err');
  }).finally(function(){
    if (btn) btn.disabled = false;
    if (btn2) btn2.disabled = false;
  });
}

function doGPRSReset() {
  var btn = document.getElementById('btg-reset');
  if (btn) btn.disabled = true;
  showToast('Sending ATZ to modem...', 'info', 4000);
  fetch('/gprs-reset', {method:'POST'}).then(function(r){ return r.json(); }).then(function(d){
    var ok = d.status === 'ok';
    var sg = document.getElementById('status-gprs-group');
    if (sg) { sg.textContent = d.msg; sg.className = 'btn-group-status visible'; }
    showToast((ok ? 'OK: ' : 'WARN: ') + d.msg, ok ? 'ok' : 'warn');
    fetchLog();
  }).catch(function(){ showToast('Network error', 'err'); }).finally(function(){ if (btn) btn.disabled = false; });
}

function doGPRSEchoOff() {
  var btn = document.getElementById('btg-echo');
  if (btn) btn.disabled = true;
  showToast('Sending ATE0 to modem...', 'info', 3000);
  fetch('/gprs-echo-off', {method:'POST'}).then(function(r){ return r.json(); }).then(function(d){
    var ok = d.status === 'ok';
    var sg = document.getElementById('status-gprs-group');
    if (sg) { sg.textContent = d.msg; sg.className = 'btn-group-status visible'; }
    showToast((ok ? 'OK: ' : 'WARN: ') + d.msg, ok ? 'ok' : 'warn');
    fetchLog();
  }).catch(function(){ showToast('Network error', 'err'); }).finally(function(){ if (btn) btn.disabled = false; });
}

/* Run controls */
function runAll() {
  fetch('/run?test=all').then(function(){
    document.getElementById('last-run').textContent = 'Running all tests...';
    showToast('Running all tests...', 'info', 4000);
    startPoll();
  }).catch(function(){ alert('Could not reach device'); });
}

function runOne(id) {
  fetch('/run?test=' + id).then(function(){
    showToast('Running ' + id.toUpperCase() + ' test...', 'info', 2500);
    startPoll();
  }).catch(function(){});
}

function startPoll() {
  if (pollTimer) return;
  fetchResults(); fetchLog();
  pollTimer = setInterval(function(){ fetchResults(); fetchLog(); }, 1800);
}

/* Log */
function fetchLog() {
  fetch('/log').then(function(r){ return r.text(); }).then(function(txt){
    var el = document.getElementById('log');
    el.textContent = txt || 'No log output yet.';
    el.scrollTop   = el.scrollHeight;
  }).catch(function(){});
}
function clearLog() {
  document.getElementById('log').textContent = '';
  showToast('Log cleared', 'info', 1500);
}

/* OTA */
function setOTAStep(stepId) {
  var ids = ['step-select','step-upload','step-flash','step-reboot'];
  var idx = ids.indexOf(stepId);
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    el.classList.remove('active','done');
    if (i < idx)  el.classList.add('done');
    if (i === idx) el.classList.add('active');
  }
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('ota-drop').classList.remove('over');
  var f = e.dataTransfer.files[0];
  if (f) useFile(f);
}

function onFilePick(input) {
  if (input.files && input.files[0]) useFile(input.files[0]);
}

function useFile(f) {
  selectedFile = f;
  var sz = f.size < 1024*1024 ? (f.size/1024).toFixed(1)+' KB' : (f.size/1024/1024).toFixed(2)+' MB';
  document.getElementById('ota-fname').textContent = 'File: ' + f.name + ' (' + sz + ')';
  document.getElementById('btn-flash').style.display  = 'inline-block';
  document.getElementById('ota-status').style.display = 'none';
  document.getElementById('prog-wrap').style.display  = 'none';
  document.getElementById('prog-fill').style.width    = '0';
  setOTAStep('step-upload');
  showToast('File selected: ' + f.name, 'info', 2000);
}

function doFlash() {
  if (!selectedFile) return;
  var fd = new FormData();
  fd.append('firmware', selectedFile, selectedFile.name);
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/ota');
  document.getElementById('prog-wrap').style.display   = 'block';
  document.getElementById('btn-flash').disabled        = true;
  document.getElementById('ota-status').style.display  = 'none';
  setOTAStep('step-flash');
  showToast('Uploading firmware...', 'info', 30000);
  xhr.upload.addEventListener('progress', function(e){
    if (!e.lengthComputable) return;
    var pct = Math.round(e.loaded / e.total * 100);
    document.getElementById('prog-fill').style.width   = pct + '%';
    document.getElementById('prog-label').textContent = 'Uploading... ' + pct + '%';
  });
  xhr.addEventListener('load', function(){
    var ok = xhr.status === 200;
    var st = document.getElementById('ota-status');
    st.style.display = 'block';
    st.style.color   = ok ? '#34d399' : '#f87171';
    st.textContent   = ok ? 'OTA successful! Device rebooting in 2s...' : 'OTA failed: ' + xhr.responseText;
    document.getElementById('prog-label').textContent = ok ? 'Upload complete!' : 'Upload failed';
    if (ok) { setOTAStep('step-reboot'); showToast('OTA success! Rebooting...', 'ok', 5000); }
    else { document.getElementById('btn-flash').disabled = false; setOTAStep('step-upload'); showToast('OTA failed', 'err'); }
  });
  xhr.addEventListener('error', function(){
    var st = document.getElementById('ota-status');
    st.style.display = 'block'; st.style.color = '#f87171';
    st.textContent = 'Network error — check WiFi connection';
    document.getElementById('btn-flash').disabled = false;
    setOTAStep('step-upload');
    showToast('Network error', 'err');
  });
  xhr.send(fd);
}

/* Init */
buildCards();
buildSwitches();
fetchResults();
fetchLog();
fetchInfo();
startSwLive();
setInterval(fetchResults, 2500);
setInterval(fetchLog,     6000);
setInterval(fetchInfo,    5000);
</script>
</body>
</html>
)HTMLEOF";
