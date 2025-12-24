/**
 * OPPRO.NET - Background Particle System
 * Version: 1.2
 */

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animationFrame;

// Automatische Skalierung des Canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5; // Kleinere, edlere Punkte
        this.speedX = Math.random() * 0.5 - 0.25; // Langsamere Bewegung
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Wenn Partikel aus dem Bild fliegt, neu setzen
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.reset();
        }
    }

    draw() {
        ctx.fillStyle = `rgba(88, 101, 242, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function init() {
    particles = [];
    const particleCount = Math.min(window.innerWidth / 10, 150); // Dynamische Anzahl basierend auf Bildschirmbreite
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Leichter Glow für den gesamten Layer
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(88, 101, 242, 0.2)';

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }
    animationFrame = requestAnimationFrame(animate);
}

// Start
init();
animate();