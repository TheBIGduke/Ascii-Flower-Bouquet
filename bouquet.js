// ASCII Flower Bouquet - JavaScript Port
// Original Python by alishsharma, ported to canvas

// ===== 256-color ANSI palette (xterm-256) =====
const ANSI_PALETTE = (() => {
    const palette = new Array(256);
    // Standard 16 colors
    palette[0] = "#000000"; palette[1] = "#800000"; palette[2] = "#008000"; palette[3] = "#808000";
    palette[4] = "#000080"; palette[5] = "#800080"; palette[6] = "#008080"; palette[7] = "#c0c0c0";
    palette[8] = "#808080"; palette[9] = "#ff0000"; palette[10] = "#00ff00"; palette[11] = "#ffff00";
    palette[12] = "#0000ff"; palette[13] = "#ff00ff"; palette[14] = "#00ffff"; palette[15] = "#ffffff";
    // 6x6x6 color cube (16-231)
    const vals = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
    let idx = 16;
    for (let r = 0; r < 6; r++) {
        for (let g = 0; g < 6; g++) {
            for (let b = 0; b < 6; b++) {
                palette[idx++] = `#${vals[r].toString(16).padStart(2,'0')}${vals[g].toString(16).padStart(2,'0')}${vals[b].toString(16).padStart(2,'0')}`;
            }
        }
    }
    // Grayscale ramp (232-255)
    for (let i = 0; i < 24; i++) {
        const v = 8 + i * 10;
        const hex = v.toString(16).padStart(2, '0');
        palette[idx++] = `#${hex}${hex}${hex}`;
    }
    return palette;
})();

function ansiColor(code) {
    return ANSI_PALETTE[code] || "#ffffff";
}

// ===== Constants from Python =====
const FPS = 24;
const SPIN_SPEED = 0.6;
const TILT = 0.30;
const CAM_DIST = 1.0;
const MESSAGE = "For my Dearest Emma";
const NUM_HEARTS = 20;
const PIVOT_Y = 0.2;

const SHADE = ".:-=+*%@";
const PETAL_SHADE = "+*#%";
const RESET = "\033[0m";

const WHITE = [244, 248, 251, 254, 255, 231];
const PINK = [125, 162, 168, 205, 211, 218, 225];
const RED = [52, 88, 124, 160, 196, 203];
const PURPLE = [54, 91, 97, 134, 140, 183];
const YELLOW = [136, 178, 214, 220, 226, 229];
const ORANGE = [130, 166, 202, 208, 214, 216];
const GOLD_CENTER = [94, 136, 178, 214, 220];
const DARK_CENTER = [52, 58, 94, 130, 136];
const GREENS = [22, 28, 28, 34, 35, 71, 77, 114];
const PAPER = [101, 144, 187, 223, 230, 231];
const RIBBON = [88, 125, 161, 197, 204, 211];
const HEART_COLORS = [161, 197, 204, 205, 211, 218];
const MSG_COLORS = [161, 168, 205, 211, 218, 225, 218, 211, 205, 168];
const TULIP_COLORS = [RED, PINK, YELLOW];

const DISC_TYPES = [
    [WHITE, GOLD_CENTER, 13],
    [PINK, GOLD_CENTER, 8],
    [RED, DARK_CENTER, 6],
    [PURPLE, GOLD_CENTER, 7],
    [YELLOW, DARK_CENTER, 12],
    [ORANGE, DARK_CENTER, 9],
];

// Light direction (normalized)
const _L = [-0.45, 0.6, 0.66];
const _n = Math.sqrt(_L[0]**2 + _L[1]**2 + _L[2]**2);
const LX = _L[0] / _n, LY = _L[1] / _n, LZ = _L[2] / _n;

// ===== Math utilities =====
function norm(v) {
    const m = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2) || 1.0;
    return [v[0]/m, v[1]/m, v[2]/m];
}

function cross(a, b) {
    return [
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    ];
}

function basis(axis) {
    const helper = Math.abs(axis[1]) < 0.9 ? [0.0, 1.0, 0.0] : [1.0, 0.0, 0.0];
    const u = norm(cross(helper, axis));
    return [u, cross(axis, u)];
}

function add(p, d, k) {
    return [p[0] + d[0]*k, p[1] + d[1]*k, p[2] + d[2]*k];
}

// ===== Scene building =====
function buildScene() {
    const rnd = new SeededRandom(21);
    const pts = [];
    const neck = [0.0, -0.12, 0.0];

    const C = [0.0, 0.12, 0.0];
    const D = 0.64;
    const N = 10;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const heads = [];
    for (let i = 0; i < N; i++) {
        const el = (88 - 60 * Math.sqrt(i / (N - 1))) * Math.PI / 180;
        const az = i * golden;
        const d = [
            Math.cos(el) * Math.cos(az),
            Math.sin(el),
            Math.cos(el) * Math.sin(az)
        ];
        const pos = add(C, d, D * rnd.uniform(0.92, 1.05));
        heads.push([pos, norm(d)]);
    }

    const tulip_slots = new Set([3, 8]);
    const flowers = [];
    let disc_i = 0;
    for (let idx = 0; idx < heads.length; idx++) {
        const [pos, axis] = heads[idx];
        const base = add(pos, axis, -0.03);
        for (let j = 0; j < 70; j++) {
            const t = j / 69;
            const p = [
                base[0] + (neck[0] - base[0]) * t,
                base[1] + (neck[1] - base[1]) * t,
                base[2] + (neck[2] - base[2]) * t
            ];
            // [x, y, z, nx, ny, nz, palette, tone, two_sided, override_char]
            pts.push([p[0], p[1], p[2], axis[0], 0.0, axis[2], GREENS, -0.15, true, null]);
        }

        if (tulip_slots.has(idx)) {
            const n_t = Array.from(tulip_slots).filter(k => k < idx).length;
            flowers.push([pos, "tulip", TULIP_COLORS[n_t % TULIP_COLORS.length], null, 0, 0.11, rnd.uniform(0, 2*Math.PI)]);
        } else {
            const [petals, center, n_pet] = DISC_TYPES[disc_i % DISC_TYPES.length];
            disc_i++;
            flowers.push([pos, "disc", petals, center, n_pet, rnd.uniform(0.12, 0.14), rnd.uniform(0, 2*Math.PI)]);
        }
    }

    // Leaves
    for (let i = 0; i < 8; i++) {
        const a = (i + 0.4) / 8 * 2 * Math.PI;
        const c = Math.cos(a), s = Math.sin(a);
        const base = [0.26 * c, 0.30, 0.26 * s];
        const d = norm([c, 0.15, s]);
        const side = [-s, 0.0, c];
        const n = norm(cross(side, d));
        const L = 0.30, W = 0.07;
        for (let ti = 0; ti < 32; ti++) {
            const t = ti / 31;
            for (let wi = -5; wi <= 5; wi++) {
                const w = wi / 5;
                const curl = 0.025 * w * w;
                const p = [
                    base[0] + d[0] * L * t + side[0] * W * Math.sin(Math.PI * t) * w + n[0] * curl,
                    base[1] + d[1] * L * t - 0.10 * t * t + n[1] * curl,
                    base[2] + d[2] * L * t + side[2] * W * Math.sin(Math.PI * t) * w + n[2] * curl
                ];
                const rib = (wi === 0) ? -0.25 : 0.0;
                pts.push([p[0], p[1], p[2], n[0], n[1], n[2], GREENS, rib, true, null]);
            }
        }
    }

    // Paper wrap
    const y0 = -0.20, y1 = 0.30, r0 = 0.06, r1 = 0.36;
    const k = (r1 - r0) / (y1 - y0);
    const rings = 50;
    for (let i = 0; i < rings; i++) {
        const t = i / (rings - 1);
        const r = r0 + (r1 - r0) * t;
        const count = Math.max(8, Math.floor(170 * r));
        for (let j = 0; j < count; j++) {
            const ph = (j + rnd.random()) / count * 2 * Math.PI;
            const c = Math.cos(ph), s = Math.sin(ph);
            let y = y0 + (y1 - y0) * t;
            if (t > 0.9) y += 0.03 * Math.sin(9 * ph);
            const fold = 0.3 * (Math.abs(Math.sin(5 * ph)) - 0.6);
            const nn = norm([c, -k, s]);
            pts.push([r * c, y, r * s, nn[0], nn[1], nn[2], PAPER, fold, false, null]);
        }
    }

    // Stems base
    for (let i = 0; i < 7; i++) {
        const a = i / 7 * 2 * Math.PI;
        const sx = 0.025 * Math.cos(a), sz = 0.025 * Math.sin(a);
        for (let j = 0; j < 40; j++) {
            const t = j / 39;
            pts.push([
                sx * (1 + 1.2 * t),
                -0.20 - 0.30 * t,
                sz * (1 + 1.2 * t),
                Math.cos(a), 0.0, Math.sin(a), GREENS, -0.1, true, null
            ]);
        }
    }

    // Ribbon
    const by = -0.12;
    const br = r0 + k * (by - y0) + 0.01;
    for (let j = 0; j < 90; j++) {
        const ph = j / 90 * 2 * Math.PI;
        for (const dy of [-0.012, 0.0, 0.012]) {
            pts.push([
                br * Math.cos(ph), by + dy, br * Math.sin(ph),
                Math.cos(ph), 0.0, Math.sin(ph), RIBBON, 0.0, false, null
            ]);
        }
    }
    const knot = [0.0, by, br + 0.01];
    for (const side of [-1, 1]) {
        for (let j = 0; j < 70; j++) {
            const a = j / 70 * 2 * Math.PI;
            const lx = side * (0.07 + 0.07 * Math.cos(a));
            const ly = 0.04 * Math.sin(a) + 0.02 * (0.07 + 0.07 * Math.cos(a)) / 0.14;
            for (const fill of [1.0, 0.7]) {
                pts.push([
                    knot[0] + lx * fill, knot[1] + ly * fill, knot[2] + 0.01,
                    side * 0.3, 0.2, 0.93, RIBBON, 0.1, true, null
                ]);
            }
        }
        for (let j = 0; j < 30; j++) {
            const t = j / 29;
            pts.push([
                knot[0] + side * 0.06 * t, knot[1] - 0.15 * t, knot[2] + 0.015,
                side * 0.2, 0.0, 0.98, RIBBON, -0.05 + 0.05 * Math.sin(t * 9), true, null
            ]);
        }
    }
    for (const dx of [-0.01, 0.0, 0.01]) {
        pts.push([dx, by, knot[2] + 0.02, 0, 0, 1, RIBBON, 0.2, true, "@"]);
    }

    // Baby's breath
    const babies = [];
    for (let i = 0; i < 90; i++) {
        const a = rnd.random() * 2 * Math.PI;
        const el = rnd.uniform(0.3, 1.4);
        const rr = rnd.uniform(0.40, 0.58);
        babies.push([
            rr * Math.cos(a) * Math.cos(el),
            C[1] + rr * Math.sin(el),
            rr * Math.sin(a) * Math.cos(el),
            rnd.uniform(0, 2*Math.PI)
        ]);
    }

    // Sparkles
    const sparkles = [];
    for (let i = 0; i < 30; i++) {
        const a = rnd.random() * 2 * Math.PI;
        const rr = rnd.uniform(0.75, 0.95);
        sparkles.push([
            rr * Math.cos(a),
            rnd.uniform(-0.3, 1.0),
            rr * Math.sin(a),
            rnd.uniform(0, 2*Math.PI),
            rnd.uniform(1.5, 4.0)
        ]);
    }

    return [pts, flowers, babies, sparkles];
}

// ===== Seeded Random (matches Python's random.Random) =====
class SeededRandom {
    constructor(seed) {
        this.seed = seed >>> 0;
    }
    random() {
        // Python's random uses Mersenne Twister, but we'll use a simple LCG for deterministic results
        // This is a simplified version - for exact match we'd need MT19937
        this.seed = (this.seed * 1103515245 + 12345) >>> 0;
        return (this.seed >>> 16) / 65536;
    }
    uniform(a, b) {
        return a + this.random() * (b - a);
    }
    choice(arr) {
        return arr[Math.floor(this.random() * arr.length)];
    }
}

// ===== Heart animation =====
function updateHearts(hearts, dt) {
    while (hearts.length < NUM_HEARTS) {
        hearts.push([
            Math.random(),
            1.0 + Math.random(),
            Math.random() * 0.05 + 0.03,
            Math.random() * 2 * Math.PI,
            HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)]
        ]);
    }
    for (const h of hearts) {
        h[1] -= h[2] * dt;
        if (h[1] < 0) {
            h[0] = Math.random();
            h[1] = 1.0;
            h[4] = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
        }
    }
}

// ===== Main Bouquet Class =====
class Bouquet {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.scene = buildScene();
        this.hearts = [];
        this.time = 0;
        this.lastTime = performance.now();

        // Rotation state (mouse drag)
        this.rotationX = 0;
        this.rotationY = 0;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Auto-spin when not interacting
        this.autoSpin = true;
        this.autoSpinTime = 0;

        this.setupCanvas();
        this.setupEvents();
        this.animate();
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + "px";
        this.canvas.style.height = rect.height + "px";
        this.ctx.scale(dpr, dpr);
        this.canvasWidth = rect.width;
        this.canvasHeight = rect.height;

        // Font setup - responsive to screen size
        this.charWidth = 0;
        this.charHeight = 0;
        this.measureFont();
    }

    measureFont() {
        // Scale font based on canvas width - smaller screens get smaller chars
        const baseFontSize = Math.max(8, Math.min(14, this.canvasWidth / 35));
        this.ctx.font = `${baseFontSize}px monospace`;
        this.charWidth = this.ctx.measureText("A").width;
        this.charHeight = baseFontSize * 1.2; // line height
    }

    setupEvents() {
        // Mouse events
        this.canvas.addEventListener("mousedown", (e) => this.onDragStart(e.clientX, e.clientY));
        window.addEventListener("mousemove", (e) => this.onDragMove(e.clientX, e.clientY));
        window.addEventListener("mouseup", () => this.onDragEnd());

        // Touch events - handle properly for mobile
        this.canvas.addEventListener("touchstart", (e) => {
            if (e.touches.length === 1) {
                this.onDragStart(e.touches[0].clientX, e.touches[0].clientY);
                e.preventDefault();
            }
        }, { passive: false });
        this.canvas.addEventListener("touchmove", (e) => {
            if (e.touches.length === 1) {
                this.onDragMove(e.touches[0].clientX, e.touches[0].clientY);
                e.preventDefault();
            }
        }, { passive: false });
        this.canvas.addEventListener("touchend", (e) => {
            this.onDragEnd();
            e.preventDefault();
        }, { passive: false });
        this.canvas.addEventListener("touchcancel", () => this.onDragEnd());

        // Resize - use debounce for performance
        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.setupCanvas(), 100);
        });

        // Also handle orientation change
        window.addEventListener("orientationchange", () => {
            setTimeout(() => this.setupCanvas(), 200);
        });

        // Stop auto-spin on interaction
        this.canvas.addEventListener("mousemove", () => { this.autoSpin = false; });
        this.canvas.addEventListener("touchstart", () => { this.autoSpin = false; }, { passive: true });

        // Resume auto-spin after inactivity
        let inactivityTimer;
        const resetInactivity = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => { this.autoSpin = true; }, 3000);
        };
        this.canvas.addEventListener("mousemove", resetInactivity);
        this.canvas.addEventListener("touchmove", resetInactivity, { passive: true });
    }

    onDragStart(x, y) {
        this.isDragging = true;
        this.lastMouseX = x;
        this.lastMouseY = y;
        this.autoSpin = false;
    }

    onDragMove(x, y) {
        if (!this.isDragging) return;
        const dx = x - this.lastMouseX;
        const dy = y - this.lastMouseY;
        this.targetRotationY += dx * 0.005;
        this.targetRotationX += dy * 0.005;
        this.targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.targetRotationX));
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    onDragEnd() {
        this.isDragging = false;
    }

    animate() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.time += dt;

        // Smooth rotation towards target
        this.rotationX += (this.targetRotationX - this.rotationX) * 0.1;
        this.rotationY += (this.targetRotationY - this.rotationY) * 0.1;

        // Auto-spin
        if (this.autoSpin) {
            this.targetRotationY += dt * SPIN_SPEED;
        }

        updateHearts(this.hearts, dt);
        this.render();

        requestAnimationFrame(() => this.animate());
    }

    project(x, y, z, ang, ca, sa, ct, st, cx, cy, scale, sx_scale) {
        const xr = x * ca - z * sa;
        const zr = x * sa + z * ca;
        const yp = y - PIVOT_Y;
        const yt = yp * ct - zr * st;
        const zt = yp * st + zr * ct;
        const f = CAM_DIST / (CAM_DIST - zt);
        return [
            cx + xr * f * sx_scale,
            cy - yt * f * scale,
            zt
        ];
    }

    projectF(x, y, z, ang, ca, sa, ct, st, cx, cy, scale, sx_scale) {
        const xr = x * ca - z * sa;
        const zr = x * sa + z * ca;
        const yp = y - PIVOT_Y;
        const yt = yp * ct - zr * st;
        const zt = yp * st + zr * ct;
        const f = CAM_DIST / (CAM_DIST - zt);
        return [
            cx + xr * f * sx_scale,
            cy - yt * f * scale,
            zt,
            f
        ];
    }

    render() {
        const [pts, flowers, babies, sparkles] = this.scene;
        const ctx = this.ctx;
        const width = this.canvasWidth;
        const height = this.canvasHeight;

        // Clear
        ctx.fillStyle = "#0d0d0d";
        ctx.fillRect(0, 0, width, height);

        // Calculate projection parameters
        const viewRows = height - 40; // leave space for message
        const scale = Math.max(1.0, Math.min((viewRows - 2) / 1.45, (width - 2) / 2.7));
        const sx_scale = scale * 2.0;
        const cx = width / 2;
        const cy = 20 + 0.78 * scale; // offset for message area

        // Current rotation (including user drag)
        const ang = this.rotationY;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const ct = Math.cos(TILT + this.rotationX), st = Math.sin(TILT + this.rotationX);

        // Depth buffer (using a flat array for performance)
        const cols = Math.ceil(width / this.charWidth);
        const rows = Math.ceil(viewRows / this.charHeight);
        const zbuf = new Float32Array(cols * rows);
        zbuf.fill(-1e9);

        // Character buffers
        const charBuf = new Array(rows);
        const colorBuf = new Array(rows);
        for (let r = 0; r < rows; r++) {
            charBuf[r] = new Array(cols).fill(" ");
            colorBuf[r] = new Array(cols).fill(0);
        }

        function plot(col, row, z, ch, colorCode) {
            if (row >= 0 && row < rows && col >= 0 && col < cols && z > zbuf[row * cols + col]) {
                zbuf[row * cols + col] = z;
                charBuf[row][col] = ch;
                colorBuf[row][col] = colorCode;
            }
        }

        // Render hearts
        for (const [x, y, , phase, color] of this.hearts) {
            const col = Math.floor(((x + 0.015 * Math.sin(this.time * 1.2 + phase)) * width) / this.charWidth) % cols;
            const row = Math.floor(y * viewRows / this.charHeight);
            plot(col, row, -50, "♥", color);
        }

        // Render points (stems, leaves, paper, ribbon)
        for (const [x, y, z, nx, ny, nz, pal, tone, two_sided, override] of pts) {
            const [colF, rowF, zt] = this.project(x, y, z, ang, ca, sa, ct, st, cx, cy, scale, sx_scale);
            const col = Math.floor(colF / this.charWidth);
            const row = Math.floor(rowF / this.charHeight);

            // Rotate normal
            const nxr = nx * ca - nz * sa;
            const nzr = nx * sa + nz * ca;
            const nyt = ny * ct - nzr * st;
            const nzt = ny * st + nzr * ct;

            let dot = nxr * LX + nyt * LY + nzt * LZ;
            if (two_sided && dot < 0) dot = -dot * 0.55;
            let b = 0.25 + 0.75 * Math.max(0.0, dot) + tone;
            b = Math.min(0.999, Math.max(0.0, b));

            let ch;
            if (override === "P") {
                ch = PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)];
            } else {
                ch = override || SHADE[Math.floor(b * SHADE.length)];
            }
            const color = pal[Math.floor(b * pal.length)];
            plot(col, row, zt, ch, color);
        }

        // Render flowers
        for (const [pos, kind, pal, cpal, n_pet, R, seed] of flowers) {
            const [x, y, z] = pos;
            const [fx, fy, zt, f] = this.projectF(x, y, z, ang, ca, sa, ct, st, cx, cy, scale, sx_scale);
            const rx = R * f * sx_scale / this.charWidth;
            const ry = R * f * scale / this.charHeight;
            const dim = -0.4 * (1 - Math.min(1.0, Math.max(0.0, (zt + 0.6) / 1.2)));
            const rot = seed + ang * 0.7;

            const rowStart = Math.max(0, Math.floor(fy / this.charHeight - ry) - 1);
            const rowEnd = Math.min(rows - 1, Math.ceil(fy / this.charHeight + ry) + 1);
            const colStart = Math.max(0, Math.floor(fx / this.charWidth - rx) - 1);
            const colEnd = Math.min(cols - 1, Math.ceil(fx / this.charWidth + rx) + 1);

            for (let row = rowStart; row <= rowEnd; row++) {
                const dy = (row * this.charHeight + this.charHeight/2 - fy) / (ry * this.charHeight);
                for (let col = colStart; col <= colEnd; col++) {
                    const dx = (col * this.charWidth + this.charWidth/2 - fx) / (rx * this.charWidth);

                    if (kind === "disc") {
                        const s = Math.sqrt(dx*dx + dy*dy);
                        if (s > 1.0) continue;

                        if (s < 0.3) {
                            let b = 0.55 - 0.35 * dx - 0.35 * dy + dim;
                            b = Math.min(0.999, Math.max(0.0, b));
                            const ch = s < 0.17 ? "@" : "o";
                            const color = cpal[Math.floor(b * cpal.length)];
                            plot(col, row, zt + 0.06, ch, color);
                            continue;
                        }

                        const ph = Math.atan2(dy, dx);
                        const reach = 0.32 + 0.68 * Math.pow(Math.abs(Math.cos(n_pet * (ph + rot) / 2)), 0.7);
                        if (s > reach) continue;

                        const edge = s > reach - 0.14 ? -0.22 : 0.0;
                        let b = 0.62 - 0.22 * dx - 0.28 * dy + 0.12 * s + edge + dim;
                        b = Math.min(0.999, Math.max(0.0, b));
                        const ch = PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)];
                        const color = pal[Math.floor(b * pal.length)];
                        plot(col, row, zt + 0.04 * (1 - s), ch, color);
                    } else {
                        // Tulip
                        const v = (1 - dy) / 2;
                        if (v < 0 || v > 1) continue;
                        const hw = 0.62 * Math.sin(Math.PI * 0.5 * Math.min(1.0, v * 1.5 + 0.05));
                        if (hw <= 0 || Math.abs(dx) > hw) continue;
                        const xn = dx / hw;
                        if (v > 0.72 + 0.28 * Math.pow(Math.cos(1.5 * Math.PI * xn), 2)) continue;

                        const seam = (Math.abs(Math.abs(xn) - 0.33) < 0.12 && v > 0.3) ? -0.25 : 0.0;
                        let b = 0.55 - 0.3 * xn + 0.1 * v + seam + dim;
                        b = Math.min(0.999, Math.max(0.0, b));
                        const ch = PETAL_SHADE[Math.floor(b * PETAL_SHADE.length)];
                        const color = pal[Math.floor(b * pal.length)];
                        plot(col, row, zt + 0.03, ch, color);
                    }
                }
            }
        }

        // Render babies
        for (const [x, y, z, phase] of babies) {
            const [colF, rowF, zt] = this.project(x, y, z, ang, ca, sa, ct, st, cx, cy, scale, sx_scale);
            const col = Math.floor(colF / this.charWidth);
            const row = Math.floor(rowF / this.charHeight);
            const star = Math.sin(this.time * 2 + phase) > 0.6;
            plot(col, row, zt + 0.02, star ? "*" : "·", star ? 231 : 255);
        }

        // Render sparkles
        for (const [x, y, z, phase, speed] of sparkles) {
            const [colF, rowF, zt] = this.project(x, y, z, ang, ca, sa, ct, st, cx, cy, scale, sx_scale);
            const col = Math.floor(colF / this.charWidth);
            const row = Math.floor(rowF / this.charHeight);
            const tw = Math.sin(this.time * speed + phase);
            if (tw > 0.85) {
                plot(col, row, zt, "*", 231);
            } else if (tw > 0.4) {
                plot(col, row, zt, "+", 225);
            } else if (tw > 0.0) {
                plot(col, row, zt, "·", 218);
            }
        }

        // Draw to canvas
        ctx.font = `${this.charHeight}px monospace`;
        ctx.textBaseline = "top";

        for (let row = 0; row < rows; row++) {
            const y = row * this.charHeight;
            let lastColor = -1;
            let lineText = "";
            let lineX = 0;

            for (let col = 0; col < cols; col++) {
                const ch = charBuf[row][col];
                const colorCode = colorBuf[row][col];
                const x = col * this.charWidth;

                if (ch !== " " && colorCode !== lastColor) {
                    // Flush previous run
                    if (lineText) {
                        ctx.fillStyle = ansiColor(lastColor);
                        ctx.fillText(lineText, lineX, y);
                    }
                    lastColor = colorCode;
                    lineText = ch;
                    lineX = x;
                } else if (ch !== " ") {
                    lineText += ch;
                } else if (lineText) {
                    // Space breaks the run
                    ctx.fillStyle = ansiColor(lastColor);
                    ctx.fillText(lineText, lineX, y);
                    lineText = "";
                }
            }
            if (lineText) {
                ctx.fillStyle = ansiColor(lastColor);
                ctx.fillText(lineText, lineX, y);
            }
        }

        // Draw message
        const mrow = rows - 2;
        const my = mrow * this.charHeight;
        const start = Math.max(0, Math.floor((cols - MESSAGE.length) / 2));
        const shift = Math.floor(this.time * 6);
        for (let i = 0; i < MESSAGE.length; i++) {
            const col = start + i;
            if (col < cols) {
                const ch = MESSAGE[i];
                const color = MSG_COLORS[(i + shift) % MSG_COLORS.length];
                ctx.fillStyle = ansiColor(color);
                ctx.fillText(ch, col * this.charWidth, my);
            }
        }

        // Draw hint
        const hint = "Drag to rotate • Wait for auto-spin";
        const hstart = Math.max(0, Math.floor((cols - hint.length) / 2));
        ctx.fillStyle = ansiColor(238);
        for (let i = 0; i < hint.length; i++) {
            const col = hstart + i;
            if (col < cols) {
                ctx.fillText(hint[i], col * this.charWidth, (rows - 1) * this.charHeight);
            }
        }
    }
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("bouquet-canvas");
    if (canvas) {
        window.bouquet = new Bouquet(canvas);
    }
});