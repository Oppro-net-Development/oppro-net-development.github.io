/**
 * OPPRO.NET - UNIVERSAL EVOLUTION ENGINE (v37 - SMOOTH HEADER PASS)
 * -------------------------------------------------------------------------
 * UPDATES:
 * 1. PERSISTENT PHYSICS: Planeten können nun hinter/über den Header fliegen.
 * 2. CLICK PROTECTION: Keine neuen Sonnen im Header-Bereich möglich.
 * 3. BOUNDARY SYNC: Nur an den Seiten und unten wird hart abgeprallt.
 * 4. ORBITAL FREEDOM: Die Umlaufbahnen werden oben nicht mehr abgeschnitten.
 * -------------------------------------------------------------------------
 */

"use strict";

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

// --- UI KONFIGURATION ---
const HEADER_HEIGHT = 80; // Bereich, in dem nicht geklickt werden kann
const G = 0.15; 

const COLORS = {
    space: '#010108',
    starYellow: '#ffcc00',
    starBlue: '#00d2ff',
    giant: '#e67e22', 
    life: '#22c55e'
};

let entities = [];
let stars = [];
let mouse = { x: -1000, y: -1000 };
let isSpacePressed = false;

// --- SOUND ENGINE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
class SoundEngine {
    static play(freq, type, vol, decay) {
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + decay);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + decay);
        } catch (e) {}
    }
}

function initBackground() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({length: 400}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height, // Sterne überall
        size: Math.random() * 1.5,
        blink: Math.random() * 0.02
    }));
}

class BaseEntity {
    constructor(x, y, vx, vy, mass, size, color) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.mass = mass; this.size = size; this.color = color;
        this.removed = false;
        this.trail = [];
    }

    applyBoundaries() {
        const margin = 20;
        // Seitliche Ränder: Hartes Abprallen
        if (this.x < margin) { this.vx = Math.abs(this.vx) * 0.8; this.x = margin; }
        if (this.x > canvas.width - margin) { this.vx = -Math.abs(this.vx) * 0.8; this.x = canvas.width - margin; }
        
        // UNTERER RAND: Abprallen
        if (this.y > canvas.height - margin) { this.vy = -Math.abs(this.vy) * 0.8; this.y = canvas.height - margin; }
        
        // OBERER RAND (Über dem Header): 
        // Wir lassen sie hier frei fliegen, damit Orbits nicht kaputt gehen.
        // Nur wenn sie EXTREM weit rausfliegen (z.B. -200px), drücken wir sie sanft zurück.
        if (this.y < -200) { this.vy += 0.5; }
    }
}

class CelestialBody extends BaseEntity {
    constructor(x, y, vx, vy, mass, size, color, type, parent = null) {
        super(x, y, vx, vy, mass, size, color);
        this.type = type; 
        this.parent = parent;
        this.children = [];
        this.orbitRadius = 0;
        this.orbitAngle = Math.random() * 6.28;
        this.isCaptured = !!parent;
        this.path = [];
    }

    updatePhysics(allBodies) {
        if (this.removed) return;

        if (this.isCaptured && this.parent) {
            let speed = 0.5 / Math.sqrt(this.orbitRadius * 0.12);
            this.orbitAngle += speed * 0.05;
            let tx = this.parent.x + Math.cos(this.orbitAngle) * this.orbitRadius;
            let ty = this.parent.y + Math.sin(this.orbitAngle) * this.orbitRadius;
            
            // Planeten folgen der Sonne weich (auch durch den Header-Bereich)
            this.x += (tx - this.x) * 0.25;
            this.y += (ty - this.y) * 0.25;
        } else {
            allBodies.forEach(other => {
                if (other === this || other.removed) return;
                if (other.mass > this.mass) {
                    let dx = other.x - this.x, dy = other.y - this.y;
                    let d2 = dx*dx + dy*dy, d = Math.sqrt(d2);
                    if (d < 500) {
                        let force = (G * this.mass * other.mass) / (d2 + 150);
                        this.vx += (dx / d) * force;
                        this.vy += (dy / d) * force;
                        // 5% Capture Chance
                        if (d < other.size * 3.5 && Math.random() < 0.05) this.captureBy(other, d);
                    }
                }
            });
            this.x += this.vx; this.y += this.vy;
            this.vx *= 0.999; this.vy *= 0.999;
        }

        if (this.type === 'star') {
            this.trail.push({x: this.x, y: this.y});
            if (this.trail.length > 20) this.trail.shift();
        }

        // Gravitations-Sog (Deaktiviert im Header, damit Menüs bedienbar bleiben)
        if (isSpacePressed && mouse.y > HEADER_HEIGHT) {
            let dx = mouse.x - this.x, dy = mouse.y - this.y, d = Math.hypot(dx, dy);
            if (d < 400) { this.vx += (dx/d)*0.2; this.vy += (dy/d)*0.2; }
        }
        this.applyBoundaries();
    }

    captureBy(target, dist) {
        if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this);
        this.parent = target; this.isCaptured = true; this.orbitRadius = dist;
        this.orbitAngle = Math.atan2(this.y - target.y, this.x - target.x);
        target.children.push(this);
    }

    draw() {
        // Sonnen-Spur
        if (this.type === 'star' && this.trail.length > 1) {
            ctx.beginPath(); ctx.strokeStyle = this.color + '08'; ctx.lineWidth = this.size;
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            this.trail.forEach(t => ctx.lineTo(t.x, t.y)); ctx.stroke();
        }
        
        // Zeichne den Körper (auch wenn er y < HEADER_HEIGHT ist)
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, 7);
        ctx.fillStyle = this.color;
        if (this.type === 'star') { ctx.shadowBlur = 30; ctx.shadowColor = this.color; }
        ctx.fill(); ctx.shadowBlur = 0;
    }
}

class GalaxyManager {
    static spawnSystem(x, y, isStart = false) {
        // Verhindere Klick-Spawns im Header
        if (y < HEADER_HEIGHT) return;

        let svx = (Math.random() - 0.5) * 0.5;
        let svy = (Math.random() - 0.5) * 0.3;
        let sun = new CelestialBody(x, y, svx, svy, 80, 28, isStart ? COLORS.starYellow : COLORS.starBlue, 'star');
        entities.push(sun);

        let pCount = isStart ? 6 : 2 + Math.floor(Math.random()*4);
        for(let i=0; i<pCount; i++) {
            let isGiant = Math.random() < 0.35; 
            let p = new CelestialBody(x, y, svx, svy, isGiant ? 22 : 5, isGiant ? 12 : 6, isGiant ? COLORS.giant : COLORS.life, 'planet', sun);
            p.orbitRadius = 100 + (i * 55);
            sun.children.push(p); entities.push(p);
        }
    }
}

function loop() {
    ctx.fillStyle = COLORS.space; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Hintergrund-Sterne
    stars.forEach(s => {
        let op = 0.2 + Math.abs(Math.sin(Date.now() * s.blink)) * 0.6;
        ctx.fillStyle = `rgba(255, 255, 255, ${op})`; ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    entities.forEach(e => { e.updatePhysics(entities); e.draw(); });

    // OPTIONAL: Den Header-Bereich ganz leicht abdunkeln, damit man sieht, dass es "dahinter" liegt
    ctx.fillStyle = "rgba(0,0,0,0.3)"; 
    ctx.fillRect(0, 0, canvas.width, HEADER_HEIGHT);

    requestAnimationFrame(loop);
}

window.addEventListener('mousedown', (e) => GalaxyManager.spawnSystem(e.clientX, e.clientY));
window.addEventListener('keydown', (e) => { if(e.code === 'Space') isSpacePressed = true; });
window.addEventListener('keyup', () => isSpacePressed = false);
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

initBackground();
GalaxyManager.spawnSystem(canvas.width/2, HEADER_HEIGHT + 250, true);
loop();