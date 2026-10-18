(function(){
"use strict";
var RH = {};

/* ---- color.js ---- */
(function(){
/** Parse #rgb, #rrggbb or rgb() into 0–255 channels; null for anything else. */
function parseColor(input) {
    const s = input.trim();
    const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
        const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
        const n = parseInt(h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const rgb = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (rgb)
        return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    return null;
}

RH.parseColor = parseColor;
})();

/* ---- ticker.js ---- */
(function(){
/* One shared animation loop for every head on the page. Each subscriber
   gets the seconds since the last frame; the loop sleeps while the tab is
   hidden or nobody is listening. */
/** Where the pointer last was on the page, NaN while it is away. */
const pointer = { x: NaN, y: NaN };
const subscribers = new Set();
let frame = 0;
let last = 0;
let listening = false;
function loop(now) {
    frame = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    subscribers.forEach((fn) => fn(dt));
    if (subscribers.size)
        frame = requestAnimationFrame(loop);
}
function start() {
    if (frame || typeof document === 'undefined' || document.hidden)
        return;
    last = 0;
    frame = requestAnimationFrame(loop);
}
function stop() {
    if (frame)
        cancelAnimationFrame(frame);
    frame = 0;
}
function listen() {
    if (listening || typeof document === 'undefined')
        return;
    listening = true;
    const away = () => {
        pointer.x = NaN;
        pointer.y = NaN;
    };
    document.addEventListener('pointermove', (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
    }, { passive: true });
    document.addEventListener('pointerleave', away);
    window.addEventListener('blur', away);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden)
            stop();
        else if (subscribers.size)
            start();
    });
}
function subscribe(fn) {
    listen();
    subscribers.add(fn);
    start();
    return () => {
        subscribers.delete(fn);
        if (!subscribers.size)
            stop();
    };
}

RH.pointer = pointer;
RH.subscribe = subscribe;
})();

/* ---- tv/light.js ---- */
(function(){
/* A small physically-minded lighting model for the shell, evaluated per
   quad: a studio key from the upper left, a cool fill, a sky dome, a
   softbox overhead and the key's own window caught as glossy
   reflections (a clear coat's Fresnel), a back light that rims the
   silhouette, and a filmic tone curve. All in linear light. */
const n3 = (x, y, z) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
};
const KEY = n3(-0.5, -0.78, 0.62);
const FILL = n3(0.85, 0.15, 0.5);
const BACK = n3(0.55, -0.55, -0.62);
const HALF = n3(KEY[0], KEY[1], KEY[2] + 1);
const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};
/* the studio seen in a reflection along r */
function environment(rx, ry, rz) {
    const up = -ry;
    const horizon = 0.05 + 0.12 * smooth(-0.25, 0.3, up);
    const softbox = 1.1 * smooth(0.42, 0.78, up) * smooth(-0.9, -0.2, rz - 0.6 * Math.abs(rx));
    const window = 2.6 * smooth(0.86, 0.97, rx * KEY[0] + ry * KEY[1] + rz * KEY[2]);
    const strip = 0.5 * smooth(0.6, 0.85, -rx) * smooth(-0.35, 0.05, up) * (1 - smooth(0.2, 0.5, up));
    return horizon + softbox + window + strip;
}
const toLinear = (c) => Math.pow(c / 255, 2.2);
function linear(rgb) {
    return [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
}
/* ACES-like curve, then sRGB */
function display(x) {
    const t = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
    return Math.round(255 * Math.pow(Math.min(1, Math.max(0, t)), 1 / 2.2));
}
/** The shell's colour at a world-space normal, as linear light. */
function radiance(m, nx, ny, nz, out = [0, 0, 0]) {
    const ndl = nx * KEY[0] + ny * KEY[1] + nz * KEY[2];
    /* a little wrap so the terminator is soft, like a moulded part */
    const key = Math.max(0, (ndl + 0.12) / 1.12);
    const fill = Math.max(0, nx * FILL[0] + ny * FILL[1] + nz * FILL[2]);
    const sky = 0.5 - 0.5 * ny;
    const ndv = Math.max(0, nz);
    const fres = m.f0 + (1 - m.f0) * Math.pow(1 - ndv, 5);
    /* reflection of the view ray */
    const rx = 2 * ndv * nx, ry = 2 * ndv * ny, rz = 2 * ndv * nz - 1;
    const env = environment(rx, ry, rz) * fres;
    const spec = m.spec * Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), m.shininess);
    const back = Math.max(0, nx * BACK[0] + ny * BACK[1] + nz * BACK[2]);
    const rim = m.rim * back * back * Math.pow(1 - ndv, 1.6);
    const diffuse = 0.05 + 0.1 * sky + 1.25 * key + 0.16 * fill;
    for (let i = 0; i < 3; i++) {
        const a = m.albedo[i];
        const tint = 1 - m.metal + m.metal * a * 2.2;
        /* the rim is a cool back light */
        const rimTint = i === 0 ? 0.62 : i === 1 ? 0.78 : 1;
        out[i] = a * diffuse * (1 - fres * 0.6) + (env + spec) * tint + rim * rimTint * (0.35 + a);
    }
    return out;
}
function css(c, alpha = 1) {
    return alpha >= 1
        ? `rgb(${display(c[0])},${display(c[1])},${display(c[2])})`
        : `rgba(${display(c[0])},${display(c[1])},${display(c[2])},${alpha})`;
}
function shadeCss(m, nx, ny, nz) {
    return css(radiance(m, nx, ny, nz));
}
function luma(c) {
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

RH.KEY = KEY;
RH.linear = linear;
RH.radiance = radiance;
RH.css = css;
RH.shadeCss = shadeCss;
RH.luma = luma;
})();

/* ---- tv/geometry.js ---- */
(function(){
/* The TV head as real geometry: a shell with a rolled edge, two knob
   ears and an antenna collar, built once per shape as quad meshes in
   head units (x right, y down, z toward the viewer). Every frame the
   vertices are turned with the pose and projected orthographically, so a
   turn, a nod or a full spin shows the true silhouette — the shell is
   convex, so back-face culling alone hides what cannot be seen.

   Every shape is one outline: a convex polygon of corner centres grown
   by a corner radius (a circle is a single centre). The front plate, the
   hole for the screen, the gasket and the glass are that outline inset
   step by step, so each shape carries the same parts. */
/* what every shape shares */
const HEAD = {
    /* radius of the rolled edge round the front and the back */
    bevel: 0.075,
    /* the shell's rim round the screen, then the rubber gasket */
    margin: 0.045,
    gasket: 0.022,
    /* how far the glass sits behind the face */
    recess: 0.03,
    earY: 0.03,
    /* the antenna: the stem's length and the ball's radius */
    stem: 0.2,
    ball: 0.052,
};
/* how far in from the outline each layer of the face starts */
const INSET = {
    plate: HEAD.bevel,
    hole: HEAD.bevel + HEAD.margin,
    glass: HEAD.bevel + HEAD.margin + HEAD.gasket,
};
/** v' = Roll · Yaw · Pitch · v, row-major. */
function rotation(yaw, pitch, roll) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    /* Yaw · Pitch */
    const a = [cy, sy * sp, sy * cp, 0, cp, -sp, -sy, cy * sp, cy * cp];
    /* Roll · that */
    return [
        cr * a[0] - sr * a[3], cr * a[1] - sr * a[4], cr * a[2] - sr * a[5],
        sr * a[0] + cr * a[3], sr * a[1] + cr * a[4], sr * a[2] + cr * a[5],
        a[6], a[7], a[8],
    ];
}
function rotate(m, x, y, z) {
    return [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
}
const norm = (x, y, z) => {
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
};
const TAU = Math.PI * 2;
function makeShape(name, centres, r, depth, 
/* the directions, from the middle, of the screws on the face and on the back */
screwAt, backScrewAt) {
    /* corners in order of angle round the middle: clockwise on screen */
    const pts = centres
        .map(([x, y]) => ({ x, y, t: Math.atan2(y, x) }))
        .sort((a, b) => a.t - b.t);
    const n = pts.length;
    /* each edge's outward normal angle */
    const edge = [];
    for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        edge.push(Math.atan2(-(b.x - a.x), b.y - a.y));
    }
    const corners = pts.map((p, i) => {
        if (n === 1)
            return { x: p.x, y: p.y, a0: -Math.PI, a1: Math.PI };
        let a0 = edge[(i - 1 + n) % n];
        let a1 = edge[i];
        while (a1 < a0)
            a1 += TAU;
        return { x: p.x, y: p.y, a0, a1 };
    });
    const sdPoly = (x, y) => {
        if (n === 1)
            return Math.hypot(x - pts[0].x, y - pts[0].y);
        let d = Infinity;
        let inside = true;
        for (let i = 0; i < n; i++) {
            const a = pts[i], b = pts[(i + 1) % n];
            const ex = b.x - a.x, ey = b.y - a.y;
            const px = x - a.x, py = y - a.y;
            const t = Math.max(0, Math.min(1, (px * ex + py * ey) / (ex * ex + ey * ey)));
            d = Math.min(d, Math.hypot(px - ex * t, py - ey * t));
            /* clockwise on screen: the inside is to the right of each edge */
            if (ex * py - ey * px < 0)
                inside = false;
        }
        return inside ? -d : d;
    };
    const sd = (x, y, inset) => sdPoly(x, y) - (r - inset);
    const path = (ctx, inset) => {
        const rr = Math.max(0.0005, r - inset);
        corners.forEach((c, i) => {
            if (i === 0)
                ctx.moveTo(c.x + rr * Math.cos(c.a0), c.y + rr * Math.sin(c.a0));
            ctx.arc(c.x, c.y, rr, c.a0, c.a1);
        });
        ctx.closePath();
    };
    let hx = 0, hy = 0;
    for (const p of pts) {
        hx = Math.max(hx, Math.abs(p.x) + r);
        hy = Math.max(hy, Math.abs(p.y) + r);
    }
    /* the ears go where the outline crosses their height */
    let lo = 0, hi = hx + 0.1;
    for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (sd(mid, HEAD.earY, 0) < 0)
            lo = mid;
        else
            hi = mid;
    }
    /* a screw sits in the corner whose arc faces its way, at `inward` in from the outline */
    const place = (dirs, inward) => dirs.map((d, i) => {
        const a = (d * Math.PI) / 180;
        const c = corners.find((k) => [a, a + TAU, a - TAU].some((x) => x >= k.a0 - 1e-6 && x <= k.a1 + 1e-6)) ?? corners[0];
        return [c.x + Math.cos(a) * (r - inward), c.y + Math.sin(a) * (r - inward), 0.5 + i * 0.9];
    });
    /* the LEDs are sized so the face (14 cells wide, 10 tall) fills the same
       share of every screen, leaving each the rectangle's breathing room */
    const gw = 2 * (hx - INSET.glass), gh = 2 * (hy - INSET.glass);
    const pitch = Math.min((FACE_SHARE * gw) / 14, (0.65 * gh) / 10);
    return {
        name, r, depth, corners, hx, hy, pitch,
        earX: lo - 0.008,
        /* on the face: halfway between the lip round the hole and the rolled edge */
        screws: place(screwAt, (INSET.hole - 0.018 + INSET.plate) / 2),
        /* on the back: inside the panel line */
        backScrews: place(backScrewAt, INSET.plate + 0.07),
        sd, path,
    };
}
/* flat top and bottom, a point at either side */
const hexCentres = (a) => [0, 60, 120, 180, 240, 300].map((d) => [a * Math.cos((d * Math.PI) / 180), a * Math.sin((d * Math.PI) / 180)]);
const FACE_SHARE = 0.6;
const CORNERS = [45, 135];
const BACK_CORNERS = [-135, -45, 45, 135];
const SHAPES = {
    rectangle: () => makeShape('rectangle', [[-0.29, -0.17], [0.29, -0.17], [0.29, 0.17], [-0.29, 0.17]], 0.21, 0.6, CORNERS, BACK_CORNERS),
    square: () => makeShape('square', [[-0.22, -0.22], [0.22, -0.22], [0.22, 0.22], [-0.22, 0.22]], 0.2, 0.6, CORNERS, BACK_CORNERS),
    circle: () => makeShape('circle', [[0, 0]], 0.46, 0.56, CORNERS, BACK_CORNERS),
    hexagon: () => makeShape('hexagon', hexCentres(0.35), 0.16, 0.58, [60, 120], [-120, -60, 60, 120]),
};
const shapeCache = new Map();
function getShape(name) {
    let s = shapeCache.get(name);
    if (!s) {
        s = (SHAPES[name] ?? SHAPES.rectangle)();
        shapeCache.set(name, s);
    }
    return s;
}
/* ── meshes ──────────────────────────────────────────────────────────── */
function finish(pos, quads, vn) {
    const normals = new Float32Array((quads.length / 4) * 3);
    for (let q = 0; q < quads.length / 4; q++) {
        let x = 0, y = 0, z = 0;
        for (let k = 0; k < 4; k++) {
            const i = quads[q * 4 + k] * 3;
            x += vn[i];
            y += vn[i + 1];
            z += vn[i + 2];
        }
        normals.set(norm(x, y, z), q * 3);
    }
    return { pos: new Float32Array(pos), quads: new Uint16Array(quads), normals };
}
/* rings × samples round a closed loop → quads between neighbouring rings */
function stitch(rings, samples, closed = true) {
    const quads = [];
    const span = closed ? samples : samples - 1;
    for (let k = 0; k < rings - 1; k++) {
        for (let j = 0; j < span; j++) {
            const j2 = (j + 1) % samples;
            quads.push(k * samples + j, k * samples + j2, (k + 1) * samples + j2, (k + 1) * samples + j);
        }
    }
    return quads;
}
/** The shell's sides and its rolled edges, front and back (the flat faces are drawn as plates). */
function buildBody(shape, bevelSteps = 10) {
    const R = shape.r, b = HEAD.bevel, zf = shape.depth / 2;
    /* the outline: each sample's corner centre and its outward normal */
    const outline = [];
    for (const c of shape.corners) {
        const sweep = c.a1 - c.a0;
        const steps = Math.max(2, Math.ceil((sweep / (Math.PI / 2)) * 14));
        /* a full circle closes on itself, so its last sample would repeat the first */
        const last = sweep >= TAU - 1e-6 ? steps - 1 : steps;
        for (let i = 0; i <= last; i++) {
            const a = c.a0 + (i / steps) * sweep;
            outline.push([c.x, c.y, Math.cos(a), Math.sin(a)]);
        }
    }
    /* the profile through the depth: back cap → back roll → side → front roll → front cap */
    const profile = [];
    for (let i = bevelSteps; i >= 0; i--) {
        const t = (i / bevelSteps) * (Math.PI / 2);
        profile.push([-zf + b - b * Math.sin(t), b * (1 - Math.cos(t)), -t]);
    }
    for (let i = 0; i <= bevelSteps; i++) {
        const t = (i / bevelSteps) * (Math.PI / 2);
        profile.push([zf - b + b * Math.sin(t), b * (1 - Math.cos(t)), t]);
    }
    const pos = [], vn = [];
    for (const [z, inset, t] of profile) {
        for (const [cx, cy, nx, ny] of outline) {
            pos.push(cx + (R - inset) * nx, cy + (R - inset) * ny, z);
            vn.push(nx * Math.cos(t), ny * Math.cos(t), Math.sin(t));
        }
    }
    return finish(pos, stitch(profile.length, outline.length), vn);
}
/**
 * A solid of revolution: `profile` is [radius, distance along the axis]
 * from `origin` outward, closing on the axis at its end.
 */
function buildLathe(profile, origin, axis, segments = 36) {
    /* two directions across the axis */
    const e1 = Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e2 = norm(axis[1] * e1[2] - axis[2] * e1[1], axis[2] * e1[0] - axis[0] * e1[2], axis[0] * e1[1] - axis[1] * e1[0]);
    const pos = [], vn = [];
    for (let k = 0; k < profile.length; k++) {
        const [r, t] = profile[k];
        const prev = profile[Math.max(0, k - 1)], next = profile[Math.min(profile.length - 1, k + 1)];
        /* the profile's outward normal in (radial, axial) */
        const dr = next[0] - prev[0], dt = next[1] - prev[1];
        const l = Math.hypot(dr, dt) || 1;
        const nr = dt / l, na = -dr / l;
        for (let j = 0; j < segments; j++) {
            const a = (j / segments) * TAU;
            const rx = Math.cos(a) * e1[0] + Math.sin(a) * e2[0];
            const ry = Math.cos(a) * e1[1] + Math.sin(a) * e2[1];
            const rz = Math.cos(a) * e1[2] + Math.sin(a) * e2[2];
            pos.push(origin[0] + axis[0] * t + r * rx, origin[1] + axis[1] * t + r * ry, origin[2] + axis[2] * t + r * rz);
            vn.push(rx * nr + axis[0] * na, ry * nr + axis[1] * na, rz * nr + axis[2] * na);
        }
    }
    return finish(pos, stitch(profile.length, segments), vn);
}
/* a knob ear: a short collar sunk into the shell, a drum, a domed cap */
const EAR_PROFILE = [
    [0.06, -0.012], [0.068, 0], [0.074, 0.006], [0.08, 0.018], [0.084, 0.032], [0.084, 0.048],
    [0.079, 0.06], [0.068, 0.07], [0.052, 0.077], [0.032, 0.081], [0.014, 0.083], [0, 0.0835],
];
/* the antenna's collar on the top of the head */
const COLLAR_PROFILE = [
    [0.05, -0.012], [0.052, 0.006], [0.05, 0.016], [0.042, 0.024], [0.026, 0.029], [0.014, 0.031], [0, 0.032],
];
const meshCache = new Map();
function headMeshes(shape) {
    let m = meshCache.get(shape.name);
    if (!m) {
        m = {
            body: buildBody(shape),
            earL: buildLathe(EAR_PROFILE, [-shape.earX, HEAD.earY, 0], [-1, 0, 0]),
            earR: buildLathe(EAR_PROFILE, [shape.earX, HEAD.earY, 0], [1, 0, 0]),
            collar: buildLathe(COLLAR_PROFILE, [0, -shape.hy, 0], [0, -1, 0], 16),
        };
        meshCache.set(shape.name, m);
    }
    return m;
}

RH.HEAD = HEAD;
RH.INSET = INSET;
RH.rotation = rotation;
RH.rotate = rotate;
RH.getShape = getShape;
RH.buildBody = buildBody;
RH.buildLathe = buildLathe;
RH.headMeshes = headMeshes;
})();

/* ---- tv/faces.js ---- */
(function(){
/* What the screen shows: an LED matrix, one brightness per cell, composed
   every frame from the state and the face's live parameters (where the
   eyes look, how far a blink has closed them).

   Faces are drawn on a 22 × 14 face area — the eyes at columns 6–8 and
   13–15, rows 5–8, symmetric about the middle — centred on a matrix that
   covers the whole screen, whatever its shape. Effects that belong to the
   screen rather than the face (the search beam) run across all of it. */
const COLS = 22;
const ROWS = 14;
/** A matrix of `cols` × `rows` (each at least the face area, by even steps) with the face area centred. */
function makeGrid(cols, rows) {
    const c = COLS + 2 * Math.max(0, Math.ceil((cols - COLS) / 2));
    const r = ROWS + 2 * Math.max(0, Math.ceil((rows - ROWS) / 2));
    return { v: new Float32Array(c * r), cols: c, rows: r, ox: (c - COLS) / 2, oy: (r - ROWS) / 2 };
}
/* in face-area coordinates; the matrix reaches past them on every side by ox, oy */
const put = (g, c, r, v) => {
    const x = c + g.ox, y = r + g.oy;
    if (x < 0 || y < 0 || x >= g.cols || y >= g.rows)
        return;
    const i = y * g.cols + x;
    if (v > g.v[i])
        g.v[i] = v;
};
const rect = (g, c, r, w, h, v) => {
    for (let y = r; y < r + h; y++)
        for (let x = c; x < c + w; x++)
            put(g, x, y, v);
};
/* a sprite: '#' full, '+' half, '.' off */
const sprite = (g, c, r, rows, v) => {
    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            if (row[x] === '#')
                put(g, c + x, r + y, v);
            else if (row[x] === '+')
                put(g, c + x, r + y, v * 0.5);
        }
    });
};
const EYE_L = 6;
const EYE_R = 13;
const EYE_TOP = 5;
/* two block eyes, 3 wide and `h` tall, closing toward their middle */
function eyes(g, f, h = 4, v = 1, dy = 0, lid = 0) {
    const dx = Math.round(f.lookX);
    const ly = Math.round(f.lookY) + dy;
    const open = Math.max(1, Math.round(h - (h - 1) * f.blink));
    const top = EYE_TOP + Math.floor((4 - h) / 2) + ly + Math.floor((h - open) / 2);
    for (const c of [EYE_L, EYE_R]) {
        /* a heavy lid dims the top row */
        if (lid > 0 && open > 1) {
            rect(g, c + dx, top, 3, 1, v * (1 - lid));
            rect(g, c + dx, top + 1, 3, open - 1, v);
        }
        else
            rect(g, c + dx, top, 3, open, v);
    }
}
const noise = (x) => {
    /* a smooth 1D value noise from a few incommensurate sines */
    return 0.5 + 0.25 * Math.sin(x * 1.7) + 0.15 * Math.sin(x * 3.1 + 1.3) + 0.1 * Math.sin(x * 5.3 + 4.1);
};
const CARET = ['..#..', '.#.#.', '#...#'];
const CROSS = ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'];
const Z_BIG = ['####', '..#.', '.#..', '####'];
const Z_SMALL = ['###', '.#.', '###'];
const FACES = {
    idle(g, f) {
        eyes(g, f);
    },
    thinking(g, f) {
        /* eyes up toward the side it is turned to, lids heavy, a row of dots */
        eyes(g, { ...f, lookX: f.lookX + f.side * 1.4, lookY: f.lookY - 1.2 }, 3, 1, 0, 0.45);
        for (let i = 0; i < 3; i++) {
            const p = (f.time * 1.6 - i * 0.22) % 1;
            const pulse = p < 0.35 ? Math.sin((p / 0.35) * Math.PI) : 0;
            rect(g, 6 + i * 4, 11 - (pulse > 0.5 ? 1 : 0), 2, 2, 0.28 + 0.72 * pulse);
        }
    },
    searching(g, f) {
        eyes(g, f);
        /* a beam sweeping across the whole screen, top to bottom, with a trail */
        const first = -g.ox, last = COLS - 1 + g.ox;
        const sweep = first + (Math.sin(f.time * 1.6 + 0.4) * 0.5 + 0.5) * (last - first);
        const dir = Math.cos(f.time * 1.6 + 0.4) > 0 ? -1 : 1;
        for (let k = 0; k < 5; k++) {
            const c = Math.round(sweep + dir * k);
            const v = 0.32 * (1 - k / 5);
            for (let r = -g.oy; r < ROWS + g.oy; r++)
                put(g, c, r, v);
        }
    },
    listening(g, f) {
        eyes(g, f, 4, 1, -1);
        /* an equaliser, bottom-anchored, louder in the middle */
        for (let i = 0; i < 12; i++) {
            const centre = 1 - Math.abs(i - 5.5) / 7;
            const level = noise(f.time * 7 + i * 1.9 + f.seed * 10) * centre;
            const h = Math.max(1, Math.round(level * 4));
            for (let k = 0; k < h; k++)
                put(g, 5 + i, 12 - k, 0.75 - k * 0.12);
        }
    },
    speaking(g, f) {
        eyes(g, f, 4, 1, -1);
        /* a mouth that opens and closes with the words */
        const env = Math.max(0, Math.sin(f.time * 2.1) * 0.5 + Math.sin(f.time * 3.7 + 1) * 0.5);
        for (let i = 0; i < 8; i++) {
            const centre = 1 - Math.abs(i - 3.5) / 5;
            const a = noise(f.time * 11 + i * 0.9) * centre * (0.35 + env);
            const h = a > 0.55 ? 3 : a > 0.28 ? 2 : 1;
            const top = h === 3 ? 10 : 11;
            const rows = h === 3 ? 3 : h === 2 ? 2 : 1;
            rect(g, 7 + i, top, 1, rows, 1);
        }
    },
    working(g, f) {
        /* focused: flat eyes looking down at the job, a progress bar */
        eyes(g, { ...f, lookY: f.lookY + 1 }, 2, 1, 0);
        const p = (f.time / 2.6) % 1;
        const fill = Math.round(p * 12);
        for (let i = 0; i < 12; i++)
            put(g, 5 + i, 11, i < fill ? 0.95 : 0.16);
        put(g, 4, 11, 0.4);
        put(g, 17, 11, 0.4);
    },
    happy(g, f) {
        const hop = Math.round(Math.max(0, Math.sin(f.time * 5.6)) * -1);
        sprite(g, EYE_L - 1, EYE_TOP + hop, CARET, 1);
        sprite(g, EYE_R - 1, EYE_TOP + hop, CARET, 1);
        /* a wide smile */
        sprite(g, 7, 10 + hop, ['#......#', '.######.'], 0.9);
    },
    error(g, f) {
        const on = Math.sin(f.time * 7) > -0.6 ? 1 : 0.55;
        sprite(g, EYE_L - 1, 4, CROSS, on);
        sprite(g, EYE_R - 1, 4, CROSS, on);
        for (let i = 0; i < 8; i++)
            put(g, 7 + i, i % 2 ? 11 : 12, 0.8);
    },
    sleeping(g, f) {
        /* shut eyes, curved down at the ends, dim */
        for (const c of [EYE_L, EYE_R]) {
            put(g, c - 1, 7, 0.32);
            rect(g, c, 8, 3, 1, 0.42);
            put(g, c + 3, 7, 0.32);
        }
        /* a z rising and fading, a small one after it */
        for (const [delay, big] of [[0, true], [1.1, false]]) {
            const p = ((f.time + delay) / 2.2) % 1;
            const v = Math.sin(p * Math.PI) * 0.6;
            const y = Math.round(5 - p * 5);
            const x = 16 + Math.round(p * 2);
            sprite(g, x, y, big ? Z_BIG : Z_SMALL, v);
        }
    },
};
const steady = (v) => () => v;
const LIGHTS = {
    idle: { screen: null, ball: [255, 250, 240], pulse: (t) => 0.75 + 0.1 * Math.sin(t * 1.4) },
    thinking: { screen: null, ball: [255, 184, 64], pulse: (t) => 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 4.2)) },
    searching: { screen: null, ball: [90, 220, 255], pulse: (t) => ((t * 2.4) % 1 < 0.18 ? 1 : 0.25) },
    listening: { screen: null, ball: [96, 255, 150], pulse: steady(0.95) },
    speaking: { screen: null, ball: [255, 250, 240], pulse: (t) => 0.55 + 0.45 * noise(t * 11) },
    working: { screen: null, ball: [110, 160, 255], pulse: (t) => ((t * 1.7) % 1 < 0.5 ? 1 : 0.35) },
    happy: { screen: null, ball: [255, 130, 200], pulse: (t) => 0.8 + 0.2 * Math.sin(t * 8) },
    error: { screen: [255, 70, 64], ball: [255, 60, 50], pulse: (t) => ((t * 3) % 1 < 0.5 ? 1 : 0.15) },
    sleeping: { screen: null, ball: [255, 250, 240], pulse: steady(0) },
};

RH.COLS = COLS;
RH.ROWS = ROWS;
RH.makeGrid = makeGrid;
RH.FACES = FACES;
RH.LIGHTS = LIGHTS;
})();

/* ---- tv/sim.js ---- */
(function(){
/* The head's motion. Each state sets targets for a small rig — yaw,
   pitch, roll, a sway and a bob — that springs chase, so a state switch
   always eases across. Jumps are scripted on top (crouch, a parabola
   with an optional full turn, a landing squash), and the antenna is a
   wobbly spring of its own, shaken by whatever the head does. */
class Spring {
    constructor(x = 0) {
        this.x = 0;
        this.v = 0;
        this.x = x;
    }
    step(target, dt, freq, damping) {
        const w = freq * Math.PI * 2;
        this.v += (w * w * (target - this.x) - 2 * damping * w * this.v) * dt;
        this.x += this.v * dt;
    }
}
function rng(seed) {
    let a = Math.floor(seed * 4294967295) >>> 0 || 1;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const CROUCH = 0.11;
class RobotSim {
    constructor(seed, state) {
        /* seconds since `shown` changed, and since the head appeared */
        this.switched = 10;
        this.age = 0;
        this.time = 0;
        this.since = 0;
        this.pose = { yaw: 0, pitch: 0, roll: 0, x: 0, lift: 0, sx: 1, sy: 1, antennaX: 0, antennaZ: 0 };
        /* the pointer, relative to the head's centre in CSS px, or null */
        this.pointer = null;
        this.yaw = new Spring();
        this.pitch = new Spring();
        this.roll = new Spring();
        this.sway = new Spring();
        this.squash = new Spring();
        this.antX = new Spring();
        this.antZ = new Spring();
        this.lastV = { roll: 0, pitch: 0, sway: 0 };
        this.jump = null;
        this.lookAt = { yaw: 0, pitch: 0, x: 0, y: 0 };
        this.nextLook = 0.6;
        this.nextBlink = 1.5;
        this.blinkAge = -1;
        this.nextHop = 8;
        this.nextSide = 4;
        this.reactUntil = -1;
        this.nextNod = 2.5;
        this.random = rng(seed);
        this.state = this.shown = this.previous = state;
        this.face = { lookX: 0, lookY: 0, blink: 0, time: 0, side: 1, seed };
        this.nextBlink = 1 + this.random() * 3;
        this.nextHop = 6 + this.random() * 6;
    }
    setState(s) {
        if (s === this.state)
            return;
        this.state = s;
        this.since = 0;
        this.nextLook = 0;
        this.nextHop = this.time + (s === 'happy' ? 0.2 : 3 + this.random() * 4);
        if (s === 'happy')
            this.hop(0.22, 1);
    }
    /** A click: a hop with a full turn and a happy face. */
    poke() {
        this.hop(0.24, this.random() < 0.5 ? 1 : -1);
        this.reactUntil = this.time + 1.6;
    }
    hop(height, spin) {
        if (this.jump)
            return;
        this.jump = { age: 0, height, spin, lean: (this.random() - 0.5) * 0.3, air: 0.42 + height * 0.45, landed: false };
    }
    update(dt) {
        if (!(dt > 0))
            return;
        /* small steps keep the springs stable on a slow frame */
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        for (let i = 0; i < steps; i++)
            this.step(dt / steps);
    }
    step(dt) {
        this.time += dt;
        this.since += dt;
        this.age += dt;
        this.switched += dt;
        const t = this.time;
        const rand = this.random;
        const shown = t < this.reactUntil ? 'happy' : this.state;
        if (shown !== this.shown) {
            this.previous = this.shown;
            this.shown = shown;
            this.switched = 0;
        }
        /* the state's targets */
        let yaw = 0, pitch = 0, roll = 0, sway = 0, bob = Math.sin(t * 1.9) * 0.008;
        let lookX = 0, lookY = 0;
        let freq = 1.3, damping = 0.62;
        let shake = 0;
        const p = this.pointer;
        const follows = p && (this.state === 'idle' || this.state === 'listening' || this.state === 'happy' || this.state === 'speaking');
        if (t > this.nextLook) {
            this.lookAt = {
                yaw: (rand() - 0.5) * 0.75,
                pitch: (rand() - 0.5) * 0.24,
                x: 0,
                y: 0,
            };
            this.lookAt.x = clamp(Math.round(this.lookAt.yaw * 5), -2, 2);
            this.lookAt.y = rand() < 0.3 ? -1 : rand() < 0.2 ? 1 : 0;
            this.nextLook = t + 1.4 + rand() * 2.6;
        }
        switch (this.state) {
            case 'idle':
                yaw = this.lookAt.yaw;
                pitch = this.lookAt.pitch;
                roll = -this.lookAt.yaw * 0.16;
                lookX = this.lookAt.x;
                lookY = this.lookAt.y;
                if (t > this.nextHop) {
                    this.hop(0.15 + rand() * 0.07, rand() < 0.35 ? (rand() < 0.5 ? 1 : -1) : 0);
                    this.nextHop = t + 7 + rand() * 7;
                }
                break;
            case 'thinking': {
                if (t > this.nextSide) {
                    this.face.side = -this.face.side;
                    this.nextSide = t + 3 + rand() * 2;
                }
                const s = this.face.side;
                yaw = 0.24 * s + Math.sin(t * 0.9) * 0.05;
                pitch = 0.17 + Math.sin(t * 1.3) * 0.03;
                roll = -0.13 * s;
                freq = 0.9;
                break;
            }
            case 'searching': {
                const ph = t * 1.6;
                yaw = Math.sin(ph) * 0.55;
                pitch = -0.04 + Math.sin(ph * 2) * 0.04;
                roll = Math.sin(ph) * -0.06;
                /* the eyes lead the head */
                lookX = clamp(Math.sin(ph + 0.4) * 3, -3, 3);
                freq = 2.2;
                damping = 0.8;
                break;
            }
            case 'listening': {
                yaw = -0.14;
                pitch = 0.02;
                roll = 0.17;
                if (t > this.nextNod) {
                    this.pitch.v -= 0.9;
                    this.nextNod = t + 2 + rand() * 2.5;
                }
                break;
            }
            case 'speaking':
                yaw = Math.sin(t * 0.7) * 0.12;
                pitch = 0.03 + Math.sin(t * 6.3) * 0.025 * (0.5 + 0.5 * Math.sin(t * 2.1));
                roll = Math.sin(t * 0.9) * 0.05;
                bob += Math.abs(Math.sin(t * 6.3)) * 0.01;
                freq = 1.8;
                break;
            case 'working':
                yaw = Math.sin(t * 0.8) * 0.08;
                pitch = -0.16;
                roll = Math.sin(t * 0.5) * 0.04;
                bob += Math.abs(Math.sin(t * 7)) * 0.012;
                if (t > this.nextHop) {
                    this.hop(0.2, rand() < 0.5 ? 1 : -1);
                    this.nextHop = t + 5 + rand() * 3;
                }
                break;
            case 'happy':
                yaw = Math.sin(t * 2.2) * 0.18;
                roll = Math.sin(t * 4.4) * 0.12;
                pitch = 0.08;
                if (t > this.nextHop) {
                    this.hop(0.17, rand() < 0.34 ? (rand() < 0.5 ? 1 : -1) : 0);
                    this.nextHop = t + 1.05 + rand() * 0.4;
                }
                break;
            case 'error': {
                /* a shake of the head every couple of seconds */
                const c = (t % 2.4) / 0.7;
                shake = c < 1 ? Math.sin(c * Math.PI * 7) * 0.22 * (1 - c) : 0;
                pitch = -0.06;
                roll = -0.05;
                freq = 1.6;
                break;
            }
            case 'sleeping':
                pitch = -0.34;
                roll = 0.13;
                yaw = 0.06;
                bob = Math.sin(t * 1.15) * 0.016;
                freq = 0.55;
                damping = 0.9;
                if (t > this.nextNod) {
                    this.pitch.v -= 0.5;
                    this.nextNod = t + 5 + rand() * 4;
                }
                break;
        }
        if (follows && p) {
            yaw = clamp(p.x / 260, -1, 1) * 0.55;
            pitch = -clamp(p.y / 260, -1, 1) * 0.32;
            roll = -yaw * 0.12 + (this.state === 'listening' ? 0.12 : 0);
            lookX = clamp(p.x / 120, -2.4, 2.4);
            lookY = clamp(p.y / 160, -1.4, 1.4);
        }
        this.yaw.step(yaw, dt, freq, damping);
        this.pitch.step(pitch, dt, freq, damping);
        this.roll.step(roll, dt, freq, damping);
        this.sway.step(sway, dt, 1.2, 0.7);
        /* the jump */
        let lift = 0, spin = 0, lean = 0;
        let squashTarget = 0;
        const j = this.jump;
        if (j) {
            j.age += dt;
            if (j.age < CROUCH) {
                squashTarget = 0.14;
            }
            else {
                const ap = (j.age - CROUCH) / j.air;
                if (ap < 1) {
                    if (ap < 0.06 && this.squash.x > 0.05) {
                        /* leaving the ground: spring up into a stretch, the antenna lagging */
                        this.squash.v = -2.6;
                        this.antZ.v -= 3;
                    }
                    lift = 4 * j.height * ap * (1 - ap);
                    spin = j.spin * Math.PI * 2 * easeInOut(clamp(ap * 1.08, 0, 1));
                    lean = j.lean * Math.sin(ap * Math.PI);
                    squashTarget = ap < 0.5 ? -0.05 : 0;
                }
                else if (!j.landed) {
                    j.landed = true;
                    this.squash.v += 3.2;
                    this.antX.v += (rand() < 0.5 ? -1 : 1) * (2.5 + rand() * 2);
                    this.antZ.v += 3.5;
                }
                else if (j.age - CROUCH - j.air > 0.35) {
                    this.jump = null;
                }
            }
        }
        this.squash.step(squashTarget, dt, 3.2, 0.32);
        /* blinks */
        if (t > this.nextBlink) {
            this.blinkAge = 0;
            this.nextBlink = t + 2.2 + rand() * 3.5;
            if (rand() < 0.2)
                this.nextBlink = t + 0.35;
        }
        let blink = 0;
        if (this.blinkAge >= 0) {
            this.blinkAge += dt;
            blink = Math.sin(clamp(this.blinkAge / 0.17, 0, 1) * Math.PI);
            if (this.blinkAge > 0.17)
                this.blinkAge = -1;
        }
        /* the antenna, pushed about by how the head accelerates */
        const rollAcc = (this.roll.v - this.lastV.roll) / dt;
        const pitchAcc = (this.pitch.v - this.lastV.pitch) / dt;
        const swayAcc = (this.sway.v - this.lastV.sway) / dt;
        this.lastV = { roll: this.roll.v, pitch: this.pitch.v, sway: this.sway.v };
        const aw = 2.3;
        this.antX.v -= (rollAcc * 0.05 + swayAcc * 0.3) * dt * 6;
        this.antZ.v -= pitchAcc * 0.05 * dt * 6;
        this.antX.step(0, dt, aw, 0.09);
        this.antZ.step(0, dt, aw, 0.09);
        this.antX.x = clamp(this.antX.x, -0.7, 0.7);
        this.antZ.x = clamp(this.antZ.x, -0.7, 0.7);
        const sq = this.squash.x;
        this.pose = {
            yaw: this.yaw.x + spin + shake,
            pitch: this.pitch.x,
            roll: this.roll.x + lean,
            x: this.sway.x,
            lift: lift + bob,
            sx: 1 + sq * 0.55,
            sy: 1 - sq,
            antennaX: this.antX.x,
            antennaZ: this.antZ.x,
        };
        this.face.lookX = lookX;
        this.face.lookY = lookY;
        this.face.blink = this.state === 'sleeping' ? 0 : blink;
        this.face.time = this.since;
    }
}
/** The still pose of a state, for reduced motion and paused heads. */
function restPose(state) {
    const base = { yaw: 0, pitch: 0, roll: 0, x: 0, lift: 0, sx: 1, sy: 1, antennaX: 0, antennaZ: 0 };
    switch (state) {
        case 'thinking': return { ...base, yaw: 0.24, pitch: 0.17, roll: -0.13 };
        case 'searching': return { ...base, yaw: 0.3, roll: -0.04 };
        case 'listening': return { ...base, yaw: -0.14, pitch: 0.02, roll: 0.17 };
        case 'working': return { ...base, pitch: -0.16 };
        case 'happy': return { ...base, pitch: 0.08, roll: 0.06 };
        case 'error': return { ...base, pitch: -0.06, roll: -0.05 };
        case 'sleeping': return { ...base, pitch: -0.34, roll: 0.13, yaw: 0.06 };
        default: return { ...base, yaw: -0.18, pitch: 0.04, roll: 0.03 };
    }
}

RH.RobotSim = RobotSim;
RH.restPose = restPose;
})();

/* ---- tv/render.js ---- */
(function(){
/* Drawing the TV head on a 2D canvas. The shell's sides and rolled
   edges are lit per quad; the flat front and back are plates drawn in
   their own plane (an affine map is exact under an orthographic view),
   each carrying a baked relief — the lip into the screen hole, the
   rubber gasket, the shadow the lip casts on the glass, the screws, the
   vents on the back. The glass sits a little behind the face, so it
   slides against the bezel as the head turns. The LEDs are drawn crisp,
   then bloomed from a one-pixel-per-LED image scaled up smooth. */
var { COLS, FACES, LIGHTS, ROWS, makeGrid } = RH;
var { HEAD, INSET, headMeshes, rotate, rotation } = RH;
var { KEY, css, radiance, shadeCss } = RH;
const makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
};
const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};
/* a stable hash for the grain, so a rebake does not shimmer */
const hash = (x, y) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const HALF = (() => {
    const l = Math.hypot(KEY[0], KEY[1], KEY[2] + 1);
    return [KEY[0] / l, KEY[1] / l, (KEY[2] + 1) / l];
})();
/* the head's reach, in head units: the antenna up to the top of its bulb,
   the knob alone, the ears past the sides; then the room motion needs past
   that: the bulb's glow, the highest hop (a click), the body rising past it
   as it stretches and leans in (with an antenna, its own room covers that),
   the floor's shadow, a turn or a lean past the ears */
const HEAD_TRAVEL = { antenna: 0.028 + HEAD.stem + HEAD.ball * 1.8, knob: 0.035, ear: 0.105, glow: 0.18, hop: 0.3, overshoot: 0.13, shadow: 0.22, side: 0.12 };
/* the resting robot fills its box but for this inset, as a share of the box */
const BOX_INSET = 0.05;
function frameFor(shape, antenna, box) {
    const top = antenna ? HEAD_TRAVEL.antenna : HEAD_TRAVEL.knob;
    const tall = 2 * shape.hy + top;
    const wide = 2 * (shape.earX + HEAD_TRAVEL.ear);
    const inner = box * (1 - 2 * BOX_INSET);
    const unit = Math.min(inner / tall, inner / wide);
    /* the resting robot, centred in the box */
    const above = (box - tall * unit) / 2;
    const centreY = above + (shape.hy + top) * unit;
    const reachUp = (antenna ? HEAD_TRAVEL.glow + HEAD_TRAVEL.hop : HEAD_TRAVEL.hop + HEAD_TRAVEL.overshoot) * unit;
    const reachDown = centreY + (shape.hy + HEAD_TRAVEL.shadow) * unit;
    const reachSide = box / 2 + (shape.earX + HEAD_TRAVEL.ear + HEAD_TRAVEL.side) * unit;
    /* whole px, and a pixel spare, so nothing ever touches the canvas edge */
    const padTop = Math.ceil(Math.max(0, reachUp - above) + 1);
    const padBottom = Math.ceil(Math.max(0, reachDown - box) + 1);
    const padSide = Math.ceil(Math.max(0, reachSide - box) + 1);
    return { box, padTop, padBottom, padSide, unit, cx: padSide + box / 2, cy: padTop + centreY };
}
/* how far the screen image reaches past the glass, so the recess never shows a gap */
const SCREEN_OVER = 0.035;
/* the glass's half extents, and the screen image's: the glass or the LED grid, whichever is bigger */
const glassOf = (s) => ({ hx: s.hx - INSET.glass, hy: s.hy - INSET.glass });
function screenOf(s) {
    const g = glassOf(s);
    return {
        hx: Math.max(g.hx, (COLS / 2) * s.pitch) + SCREEN_OVER,
        hy: Math.max(g.hy, (ROWS / 2) * s.pitch) + SCREEN_OVER,
    };
}
const plateOf = (s) => ({ hx: s.hx - INSET.plate, hy: s.hy - INSET.plate });
/**
 * A relief as light: positive brightens toward white, negative darkens
 * toward black, laid over a plate as white or black with that alpha.
 */
function bakeRelief(shape, unit, fn) {
    const PLATE = plateOf(shape);
    const w = Math.ceil(PLATE.hx * 2 * unit), h = Math.ceil(PLATE.hy * 2 * unit);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(c.width, c.height);
    const d = img.data;
    const px = (PLATE.hx * 2) / c.width;
    for (let iy = 0; iy < c.height; iy++) {
        const v = -PLATE.hy + (iy + 0.5) * px;
        for (let ix = 0; ix < c.width; ix++) {
            const u = -PLATE.hx + (ix + 0.5) * px;
            const edge = shape.sd(u, v, INSET.plate);
            const cover = Math.min(1, Math.max(0, 0.5 - edge / px));
            if (cover <= 0)
                continue;
            const val = fn(u, v, px, ix, iy);
            const i = (iy * c.width + ix) * 4;
            const a = Math.min(1, Math.abs(val)) * cover;
            const white = val > 0 ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = white;
            d[i + 3] = Math.round(a * 255);
        }
    }
    ctx.putImageData(img, 0, 0);
    return c;
}
/* lighting of a tilted bit of surface, relative to the flat plate */
function tilt(nx, ny, nz, gloss = 0.55, power = 36) {
    const l = Math.hypot(nx, ny, nz);
    nx /= l;
    ny /= l;
    nz /= l;
    const diff = (nx * KEY[0] + ny * KEY[1] + nz * KEY[2] - KEY[2]) * 0.95;
    const spec = gloss * Math.pow(Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]), power);
    return diff + spec - gloss * Math.pow(HALF[2], power);
}
/* gradient of a signed distance, by central differences */
function grad(fn, u, v) {
    const e = 0.0015;
    const gx = fn(u + e, v) - fn(u - e, v);
    const gy = fn(u, v + e) - fn(u, v - e);
    const l = Math.hypot(gx, gy) || 1;
    return [gx / l, gy / l];
}
function screw(u, v, cx, cy, angle) {
    const rs = 0.013;
    const dx = u - cx, dy = v - cy;
    const d = Math.hypot(dx, dy);
    if (d > rs + 0.006)
        return null;
    if (d > rs)
        return -0.5 * (1 - (d - rs) / 0.006);
    const nz = Math.sqrt(Math.max(0, 1 - (d / rs) ** 2)) + 0.6;
    let val = tilt(dx / rs, dy / rs, nz, 0.9, 30) * 1.3 + 0.08;
    /* the slot */
    const c = Math.cos(angle), s = Math.sin(angle);
    const across = Math.abs(dx * -s + dy * c);
    if (across < 0.0026 && d < rs * 0.8)
        val = -0.65;
    return val;
}
function bakeFront(shape, unit) {
    const LIP = 0.018;
    const sdHole = (u, v) => shape.sd(u, v, INSET.hole);
    const sdGlass = (u, v) => shape.sd(u, v, INSET.glass);
    const screws = shape.screws;
    return bakeRelief(shape, unit, (u, v, _px, ix, iy) => {
        const grain = (hash(ix, iy) - 0.5) * 0.07;
        for (const [cx, cy, a] of screws) {
            const s = screw(u, v, cx, cy, a);
            if (s !== null)
                return s;
        }
        const dh = sdHole(u, v);
        if (dh >= 0) {
            /* the shell rolls down into the hole */
            if (dh < LIP) {
                const [gx, gy] = grad(sdHole, u, v);
                const s = 1 - dh / LIP;
                const th = s * s * 1.25;
                return tilt(-gx * Math.sin(th), -gy * Math.sin(th), Math.cos(th)) + grain;
            }
            return grain;
        }
        const dg = sdGlass(u, v);
        if (dg >= 0) {
            /* the rubber gasket, a soft bead */
            const s = dg / HEAD.gasket;
            const [gx, gy] = grad(sdGlass, u, v);
            const th = (s - 0.45) * 2.2;
            return tilt(gx * Math.sin(th), gy * Math.sin(th), Math.cos(th), 0.22, 14) * 0.7 + grain * 0.4;
        }
        /* on the glass: the lip's cast shadow, darker toward the edge */
        const k = 0.05;
        const blocked = smooth(-0.012, 0.012, sdGlass(u - KEY[0] * k, v - KEY[1] * k));
        return -(0.5 * blocked + 0.32 * Math.exp(dg / 0.014));
    });
}
function bakeBack(shape, unit) {
    const vents = [-0.12, -0.065, -0.01, 0.045, 0.1];
    const panel = (u, v) => shape.sd(u, v, INSET.plate + 0.04);
    const screws = shape.backScrews;
    return bakeRelief(shape, unit, (u, v, _px, ix, iy) => {
        const grain = (hash(ix, iy) - 0.5) * 0.07;
        for (const [cx, cy, a] of screws) {
            const s = screw(u, v, cx, cy, a);
            if (s !== null)
                return s;
        }
        /* a panel line */
        const dp = panel(u, v);
        if (Math.abs(dp) < 0.006) {
            const [gx, gy] = grad(panel, u, v);
            const th = (dp / 0.006) * 1.1;
            return tilt(-gx * Math.sin(th), -gy * Math.sin(th), Math.cos(th)) * 0.9 - 0.18;
        }
        for (const vy of vents) {
            const slot = (a, b) => Math.hypot(Math.max(0, Math.abs(a) - 0.196), b - vy) - 0.014;
            const d = slot(u, v);
            if (d < 0) {
                /* down in the slot: dark, the top lip's shadow over it */
                return -0.72 - 0.15 * smooth(-0.014, 0, -(v - vy));
            }
            if (d < 0.01) {
                const [gx, gy] = grad(slot, u, v);
                const th = (1 - d / 0.01) ** 2 * 1.2;
                return tilt(-gx * Math.sin(th), -gy * Math.sin(th), Math.cos(th)) + grain;
            }
        }
        return grain;
    });
}
/* the screen's background and the dark LEDs, which never change */
function bakeScreenBase(w, h, pitch, x0, y0, led) {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
    g.addColorStop(0, '#111417');
    g.addColorStop(1, '#050607');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    /* each LED a dark lens in a black grid */
    const cell = pitch * 0.8;
    const off = (pitch - cell) / 2;
    const lens = `rgba(${Math.round(60 + led[0] * 0.12)},${Math.round(64 + led[1] * 0.12)},${Math.round(70 + led[2] * 0.12)},0.34)`;
    /* the dark lenses fill the whole glass, past the cells the faces use */
    const c0 = -Math.ceil(x0 / pitch), c1 = Math.ceil((w - x0) / pitch);
    const r0 = -Math.ceil(y0 / pitch), r1 = Math.ceil((h - y0) / pitch);
    ctx.fillStyle = lens;
    for (let r = r0; r < r1; r++)
        for (let q = c0; q < c1; q++)
            ctx.fillRect(x0 + q * pitch + off, y0 + r * pitch + off, cell, cell);
    /* a faint highlight on the top edge of each lens */
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let r = r0; r < r1; r++)
        for (let q = c0; q < c1; q++)
            ctx.fillRect(x0 + q * pitch + off, y0 + r * pitch + off, cell, Math.max(1, cell * 0.16));
    return c;
}
/* the glass over the LEDs: vignette, a curved reflection, a cool sheen */
function bakeGlass(w, h) {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    const top = ctx.createLinearGradient(0, 0, 0, h);
    top.addColorStop(0, 'rgba(190,210,255,0.09)');
    top.addColorStop(0.42, 'rgba(190,210,255,0.015)');
    top.addColorStop(0.43, 'rgba(190,210,255,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w * 0.3, h * 0.2);
    ctx.scale(1, 0.45);
    const spot = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.35);
    spot.addColorStop(0, 'rgba(255,255,255,0.07)');
    spot.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(-w, -h * 3, w * 2, h * 6);
    ctx.restore();
    return c;
}
function grainPattern(ctx) {
    const c = makeCanvas(128, 128);
    const g = c.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < 128 * 128; i++) {
        const r = hash(i, 7);
        const on = r > 0.5 ? 255 : 0;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = on;
        img.data[i * 4 + 3] = Math.round(hash(i, 13) * 9);
    }
    g.putImageData(img, 0, 0);
    return ctx.createPattern(c, 'repeat');
}
/* bakes depend only on the shape and the size, so every head on the page shares them */
const bakes = new Map();
function bakesFor(shape, unit) {
    const key = `${shape.name}:${Math.round(unit)}`;
    let b = bakes.get(key);
    if (!b) {
        const sc = screenOf(shape);
        b = { front: bakeFront(shape, unit), back: bakeBack(shape, unit), glass: bakeGlass(sc.hx * 2 * unit, sc.hy * 2 * unit) };
        bakes.set(key, b);
    }
    return b;
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
class RobotRenderer {
    constructor() {
        this.shape = null;
        this.meshes = null;
        this.unit = 0;
        this.ledKey = '';
        this.front = null;
        this.back = null;
        this.screen = null;
        this.screenBase = null;
        this.glass = null;
        this.layer = null;
        this.tiny = makeCanvas(COLS, ROWS);
        this.tinyHalf = makeCanvas(COLS / 2, ROWS / 2);
        this.tinyImg = null;
        this.grain = null;
        this.grid = makeGrid(COLS, ROWS);
        this.gridPrev = makeGrid(COLS, ROWS);
        this.proj = new Float32Array(2048 * 3);
        this.screenGeo = { pitch: 0, x0: 0, y0: 0 };
    }
    prepare(shape, unit, led) {
        if (Math.abs(unit - this.unit) > 0.5 || shape !== this.shape) {
            this.unit = unit;
            this.shape = shape;
            this.meshes = headMeshes(shape);
            const b = bakesFor(shape, unit);
            this.front = b.front;
            this.back = b.back;
            this.glass = b.glass;
            const sc = screenOf(shape);
            this.screen = makeCanvas(sc.hx * 2 * unit, sc.hy * 2 * unit);
            this.ledKey = '';
            /* the matrix covers the whole glass, the face area centred in it */
            const gl = glassOf(shape);
            this.grid = makeGrid(Math.ceil((gl.hx * 2) / shape.pitch), Math.ceil((gl.hy * 2) / shape.pitch));
            this.gridPrev = makeGrid(this.grid.cols, this.grid.rows);
            this.tiny = makeCanvas(this.grid.cols, this.grid.rows);
            this.tinyHalf = makeCanvas(Math.ceil(this.grid.cols / 2), Math.ceil(this.grid.rows / 2));
            this.tinyImg = null;
            const pitch = shape.pitch * unit;
            this.screenGeo = {
                pitch,
                x0: (this.screen.width - pitch * this.grid.cols) / 2,
                y0: (this.screen.height - pitch * this.grid.rows) / 2,
            };
        }
        const key = led.join(',');
        if (key !== this.ledKey && this.screen) {
            this.ledKey = key;
            const { pitch, x0, y0 } = this.screenGeo;
            this.screenBase = bakeScreenBase(this.screen.width, this.screen.height, pitch, x0, y0, led);
        }
    }
    /* the LED matrix for this frame */
    compose(sim, state) {
        const grid = this.grid;
        const g = grid.v;
        const { cols, rows } = grid;
        g.fill(0);
        if (!sim) {
            FACES[state](grid, { lookX: 0, lookY: 0, blink: 0, time: 0.4, side: 1, seed: 0 });
            return grid;
        }
        FACES[sim.shown](grid, sim.face);
        /* a cross-fade from the last face, with a flicker of glitch */
        if (sim.switched < 0.3) {
            const p = this.gridPrev;
            p.v.fill(0);
            FACES[sim.previous](p, { ...sim.face, time: sim.face.time + 10 });
            const k = sim.switched / 0.3;
            for (let i = 0; i < g.length; i++)
                g[i] = g[i] * k + p.v[i] * (1 - k);
            if (sim.switched < 0.13) {
                const seed = Math.floor(sim.time * 30);
                for (let r = 0; r < rows; r++) {
                    const shift = Math.floor((Math.sin(seed * 12.9 + r * 78.2) * 0.5 + 0.5) * 3) - 1;
                    if (!shift)
                        continue;
                    const row = g.slice(r * cols, (r + 1) * cols);
                    for (let c = 0; c < cols; c++)
                        g[r * cols + c] = row[(c - shift + cols) % cols];
                }
                for (let i = 0; i < g.length; i++)
                    if (Math.sin(i * 91.7 + seed * 3.1) > 0.93)
                        g[i] = Math.max(g[i], 0.3);
            }
        }
        /* switching on: a bright line that opens to the full screen */
        if (sim.age < 0.55) {
            const open = smooth(0.08, 0.5, sim.age) * (rows / 2 + 0.5);
            for (let r = 0; r < rows; r++) {
                const d = Math.abs(r - (rows - 1) / 2);
                for (let c = 0; c < cols; c++) {
                    const i = r * cols + c;
                    if (d > open)
                        g[i] = 0;
                    else if (d > open - 1.2)
                        g[i] = Math.max(g[i], 0.85 * (1 - sim.age / 0.55));
                }
            }
        }
        return grid;
    }
    drawScreen(grid, led) {
        const s = this.screen;
        const ctx = s.getContext('2d');
        const { cols, rows, v: g } = grid;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(this.screenBase, 0, 0);
        const { pitch, x0, y0 } = this.screenGeo;
        const core = mix(led, [255, 255, 255], 0.6);
        const coreCss = `rgb(${core.map(Math.round).join(',')})`;
        const bleedCss = `rgb(${led.map(Math.round).join(',')})`;
        const cell = pitch * 0.8, off = (pitch - cell) / 2;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const v = g[r * cols + c];
                if (v < 0.01)
                    continue;
                ctx.globalAlpha = Math.min(1, v * 0.4);
                ctx.fillStyle = bleedCss;
                ctx.fillRect(x0 + c * pitch + off * 0.4, y0 + r * pitch + off * 0.4, pitch - off * 0.8, pitch - off * 0.8);
                ctx.globalAlpha = Math.min(1, v);
                ctx.fillStyle = coreCss;
                ctx.fillRect(x0 + c * pitch + off, y0 + r * pitch + off, cell, cell);
            }
        }
        /* bloom: the matrix at one pixel per LED, scaled up smooth */
        const t = this.tiny.getContext('2d');
        if (!this.tinyImg)
            this.tinyImg = t.createImageData(cols, rows);
        const d = this.tinyImg.data;
        for (let i = 0; i < cols * rows; i++) {
            d[i * 4] = led[0];
            d[i * 4 + 1] = led[1];
            d[i * 4 + 2] = led[2];
            d[i * 4 + 3] = Math.round(Math.min(1, g[i]) * 255);
        }
        t.putImageData(this.tinyImg, 0, 0);
        const h = this.tinyHalf.getContext('2d');
        h.clearRect(0, 0, this.tinyHalf.width, this.tinyHalf.height);
        h.imageSmoothingEnabled = true;
        h.drawImage(this.tiny, 0, 0, this.tinyHalf.width, this.tinyHalf.height);
        ctx.imageSmoothingEnabled = true;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7;
        ctx.drawImage(this.tiny, x0, y0, cols * pitch, rows * pitch);
        ctx.globalAlpha = 0.65;
        ctx.drawImage(this.tinyHalf, x0 - pitch, y0 - pitch, (cols + 2) * pitch, (rows + 2) * pitch);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(this.glass, 0, 0);
    }
    /** Draw a frame; `frame` is in CSS px, the canvas in device px (`dpr` per CSS px). */
    draw(ctx, frame, dpr, pose, sim, state, shape, palette, opts) {
        const U = frame.unit * dpr;
        const PLATE = plateOf(shape);
        const GLASS = glassOf(shape);
        const SCREEN = screenOf(shape);
        const shown = sim ? sim.shown : state;
        const lightNow = LIGHTS[shown];
        let led = lightNow.screen ?? palette.led;
        if (sim && sim.switched < 0.3) {
            const was = LIGHTS[sim.previous].screen ?? palette.led;
            led = mix(was, led, sim.switched / 0.3).map(Math.round);
        }
        this.prepare(shape, U, led);
        if (!this.layer || this.layer.width !== ctx.canvas.width || this.layer.height !== ctx.canvas.height) {
            this.layer = makeCanvas(ctx.canvas.width, ctx.canvas.height);
            this.grain = grainPattern(ctx);
        }
        const layer = this.layer.getContext('2d');
        const R = rotation(pose.yaw, pose.pitch, pose.roll);
        const cx = frame.cx * dpr + pose.x * U;
        /* the head's centre at rest */
        const rest = frame.cy * dpr;
        const cy = rest - pose.lift * U;
        const by = cy + shape.hy * U;
        const P = (x, y, z) => {
            const r = rotate(R, x, y, z);
            return [cx + r[0] * U * pose.sx, by + (cy + r[1] * U - by) * pose.sy, r[2]];
        };
        const plane = (c, z, flip) => {
            const o = P(0, 0, z), ex = P(flip ? -1 : 1, 0, z), ey = P(0, 1, z);
            c.setTransform(ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1], o[0], o[1]);
        };
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        /* the floor's shadow, smaller and fainter the higher the head is */
        if (opts.floorShadow) {
            const up = Math.max(0, pose.lift);
            const fy = rest + (shape.hy + 0.11) * U;
            const rx = U * shape.hx * (1 - up * 0.9) * pose.sx;
            ctx.save();
            ctx.translate(frame.cx * dpr + pose.x * U, fy);
            ctx.scale(1, 0.16);
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
            const a = 0.55 * Math.max(0, 1 - up * 1.6);
            g.addColorStop(0, `rgba(0,0,0,${a})`);
            g.addColorStop(0.55, `rgba(0,0,0,${a * 0.45})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        const { body, earL, earR, collar } = this.meshes;
        const earLz = rotate(R, -shape.earX - 0.05, HEAD.earY, 0)[2];
        const earRz = rotate(R, shape.earX + 0.05, HEAD.earY, 0)[2];
        const topZ = rotate(R, 0, -shape.hy, 0)[2];
        const antennaBehind = topZ < -0.012;
        const drawMesh = (c, mesh, mat) => {
            const n = mesh.pos.length / 3;
            const pr = this.proj;
            for (let i = 0; i < n; i++) {
                const p = P(mesh.pos[i * 3], mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2]);
                pr[i * 3] = p[0];
                pr[i * 3 + 1] = p[1];
                pr[i * 3 + 2] = p[2];
            }
            const order = [];
            const q = mesh.quads, nn = mesh.normals;
            for (let k = 0; k < q.length / 4; k++) {
                const nz = R[6] * nn[k * 3] + R[7] * nn[k * 3 + 1] + R[8] * nn[k * 3 + 2];
                if (nz < -0.03)
                    continue;
                const z = pr[q[k * 4] * 3 + 2] + pr[q[k * 4 + 1] * 3 + 2] + pr[q[k * 4 + 2] * 3 + 2] + pr[q[k * 4 + 3] * 3 + 2];
                order.push([z, k]);
            }
            order.sort((a, b) => a[0] - b[0]);
            c.lineWidth = Math.max(0.6, U / 260);
            c.lineJoin = 'round';
            for (const [, k] of order) {
                const nx = nn[k * 3], ny = nn[k * 3 + 1], nz0 = nn[k * 3 + 2];
                const w = rotate(R, nx, ny, nz0);
                const col = shadeCss(mat, w[0], w[1], w[2]);
                c.beginPath();
                for (let j = 0; j < 4; j++) {
                    const vi = q[k * 4 + j] * 3;
                    if (j)
                        c.lineTo(pr[vi], pr[vi + 1]);
                    else
                        c.moveTo(pr[vi], pr[vi + 1]);
                }
                c.closePath();
                c.fillStyle = col;
                c.strokeStyle = col;
                c.fill();
                c.stroke();
            }
        };
        /* the knob on top always; the stem and its bulb only with the antenna on */
        const antenna = () => this.drawAntenna(ctx, P, U, pose, palette, sim, shown, lightNow, collar, opts.antenna);
        if (antennaBehind)
            antenna();
        if (earLz < 0)
            drawMesh(ctx, earL, palette.trim);
        if (earRz < 0)
            drawMesh(ctx, earR, palette.trim);
        /* the shell, on its own layer so the grain stays on it */
        layer.setTransform(1, 0, 0, 1, 0, 0);
        layer.globalCompositeOperation = 'source-over';
        layer.clearRect(0, 0, this.layer.width, this.layer.height);
        drawMesh(layer, body, palette.shell);
        const frontZ = R[8];
        const zf = shape.depth / 2;
        const facing = Math.abs(frontZ) > 0.005 ? (frontZ > 0 ? 1 : -1) : 0;
        if (facing) {
            const dome = 0.17;
            plane(layer, facing * zf, facing < 0);
            const at = (dx, dy) => {
                const w = rotate(R, dx * (facing < 0 ? -1 : 1), dy, facing);
                const l = Math.hypot(w[0], w[1], w[2]);
                return css(radiance(palette.shell, w[0] / l, w[1] / l, w[2] / l));
            };
            layer.beginPath();
            shape.path(layer, INSET.plate - 0.002);
            const vg = layer.createLinearGradient(0, -PLATE.hy, 0, PLATE.hy);
            vg.addColorStop(0, at(0, -dome));
            vg.addColorStop(0.5, at(0, 0));
            vg.addColorStop(1, at(0, dome));
            layer.fillStyle = vg;
            layer.fill();
            const hg = layer.createLinearGradient(-PLATE.hx, 0, PLATE.hx, 0);
            hg.addColorStop(0, at(-dome, 0));
            hg.addColorStop(0.5, at(0, 0));
            hg.addColorStop(1, at(dome, 0));
            layer.globalAlpha = 0.5;
            layer.fillStyle = hg;
            layer.fill();
            layer.globalAlpha = 1;
        }
        if (this.grain) {
            layer.setTransform(1, 0, 0, 1, 0, 0);
            layer.globalCompositeOperation = 'source-atop';
            const m = typeof DOMMatrix === 'function' ? new DOMMatrix().translate(cx, cy) : null;
            if (m && 'setTransform' in this.grain)
                this.grain.setTransform(m);
            layer.fillStyle = this.grain;
            layer.fillRect(0, 0, this.layer.width, this.layer.height);
            layer.globalCompositeOperation = 'source-over';
        }
        ctx.drawImage(this.layer, 0, 0);
        /* the plate's details: the screen in front, the vents behind */
        if (facing > 0) {
            ctx.save();
            plane(ctx, zf, false);
            ctx.beginPath();
            shape.path(ctx, INSET.hole);
            ctx.fillStyle = '#060709';
            ctx.fill();
            ctx.save();
            ctx.beginPath();
            shape.path(ctx, INSET.glass);
            ctx.clip();
            this.drawScreen(this.compose(sim, state), led);
            plane(ctx, zf - HEAD.recess, false);
            ctx.drawImage(this.screen, -SCREEN.hx, -SCREEN.hy, SCREEN.hx * 2, SCREEN.hy * 2);
            /* a reflection sliding over the glass as the head turns */
            plane(ctx, zf, false);
            const s = -0.05 - pose.yaw * 0.9 + pose.pitch * 0.5;
            const sg = ctx.createLinearGradient(-0.55 + s, -0.35, 0.15 + s, 0.35);
            sg.addColorStop(0, 'rgba(255,255,255,0)');
            sg.addColorStop(0.36, 'rgba(255,255,255,0)');
            sg.addColorStop(0.43, 'rgba(220,232,255,0.075)');
            sg.addColorStop(0.5, 'rgba(255,255,255,0)');
            sg.addColorStop(0.58, 'rgba(255,255,255,0)');
            sg.addColorStop(0.61, 'rgba(220,232,255,0.04)');
            sg.addColorStop(0.65, 'rgba(255,255,255,0)');
            ctx.fillStyle = sg;
            ctx.fillRect(-GLASS.hx, -GLASS.hy, GLASS.hx * 2, GLASS.hy * 2);
            ctx.restore();
            ctx.drawImage(this.front, -PLATE.hx, -PLATE.hy, PLATE.hx * 2, PLATE.hy * 2);
            ctx.restore();
        }
        else if (facing < 0) {
            ctx.save();
            plane(ctx, -zf, true);
            ctx.drawImage(this.back, -PLATE.hx, -PLATE.hy, PLATE.hx * 2, PLATE.hy * 2);
            ctx.restore();
        }
        if (earLz >= 0)
            drawMesh(ctx, earL, palette.trim);
        if (earRz >= 0)
            drawMesh(ctx, earR, palette.trim);
        if (!antennaBehind)
            antenna();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    drawAntenna(ctx, P, U, pose, palette, sim, shown, lightNow, collar, stem) {
        /* the collar, lit like the ears */
        const R = rotation(pose.yaw, pose.pitch, pose.roll);
        const pr = this.proj;
        const n = collar.pos.length / 3;
        for (let i = 0; i < n; i++) {
            const p = P(collar.pos[i * 3], collar.pos[i * 3 + 1], collar.pos[i * 3 + 2]);
            pr[i * 3] = p[0];
            pr[i * 3 + 1] = p[1];
            pr[i * 3 + 2] = p[2];
        }
        const q = collar.quads, nn = collar.normals;
        ctx.lineWidth = Math.max(0.6, U / 260);
        for (let k = 0; k < q.length / 4; k++) {
            const w = rotate(R, nn[k * 3], nn[k * 3 + 1], nn[k * 3 + 2]);
            if (w[2] < -0.03)
                continue;
            const col = shadeCss(palette.trim, w[0], w[1], w[2]);
            ctx.beginPath();
            for (let j = 0; j < 4; j++) {
                const vi = q[k * 4 + j] * 3;
                if (j)
                    ctx.lineTo(pr[vi], pr[vi + 1]);
                else
                    ctx.moveTo(pr[vi], pr[vi + 1]);
            }
            ctx.closePath();
            ctx.fillStyle = col;
            ctx.strokeStyle = col;
            ctx.fill();
            ctx.stroke();
        }
        if (!stem)
            return;
        /* the stem bends toward its tip; the ball rides on the end */
        const top = -this.shape.hy - 0.028;
        const L = HEAD.stem;
        const ax = pose.antennaX, az = pose.antennaZ;
        const dir = [Math.sin(ax), -Math.cos(ax) * Math.cos(az), Math.sin(az)];
        const base = P(0, top, 0);
        const ctrl = P(0, top - L * 0.55, 0);
        const tip = P(dir[0] * L, top + dir[1] * L, dir[2] * L);
        const ballC = P(dir[0] * (L + HEAD.ball * 0.8), top + dir[1] * (L + HEAD.ball * 0.8), dir[2] * (L + HEAD.ball * 0.8));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(base[0], base[1]);
        ctx.quadraticCurveTo(ctrl[0], ctrl[1], tip[0], tip[1]);
        ctx.lineWidth = U * 0.02;
        ctx.strokeStyle = '#4a5260';
        ctx.stroke();
        ctx.lineWidth = U * 0.009;
        ctx.strokeStyle = '#9aa3b1';
        ctx.stroke();
        ctx.save();
        ctx.translate(-U * 0.004, 0);
        ctx.lineWidth = U * 0.004;
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.stroke();
        ctx.restore();
        /* the bulb: frosted glass, lit from inside by the state's light */
        let colour = lightNow.ball;
        let level = lightNow.pulse(sim ? sim.face.time : 0.3);
        if (sim && sim.switched < 0.3) {
            const was = LIGHTS[sim.previous];
            const k = sim.switched / 0.3;
            colour = mix(was.ball, colour, k);
            level = was.pulse(sim.face.time + 10) * (1 - k) + level * k;
        }
        if (sim && sim.age < 0.55)
            level *= smooth(0.1, 0.5, sim.age);
        void shown;
        const r = HEAD.ball * U * pose.sx;
        const [bx, by] = ballC;
        const frost = [168, 174, 186];
        const lit = mix(frost, mix(colour, [255, 255, 255], 0.35), level);
        /* the glass thickens toward its edge and tints with the light inside,
           so even a white bulb has a rim that reads on a pale page */
        const glassTint = mix([150, 158, 172], colour, 0.5);
        const shoulder = mix(lit, glassTint, 0.48);
        const edge = mix([70, 76, 88], mix(colour, [90, 96, 108], 0.5), level * 0.55);
        /* the hot core sits a little up and in, the filament the light comes from */
        const g = ctx.createRadialGradient(bx - r * 0.18, by - r * 0.22, r * 0.05, bx, by, r);
        g.addColorStop(0, `rgb(${mix(lit, [255, 255, 255], 0.6 + level * 0.3).map(Math.round).join(',')})`);
        g.addColorStop(0.38, `rgb(${lit.map(Math.round).join(',')})`);
        g.addColorStop(0.78, `rgb(${shoulder.map(Math.round).join(',')})`);
        g.addColorStop(1, `rgb(${edge.map(Math.round).join(',')})`);
        /* its glow, behind the bulb so it lights the air and never washes out the glass */
        if (level > 0.01) {
            ctx.globalCompositeOperation = 'lighter';
            const glow = ctx.createRadialGradient(bx, by, r * 0.6, bx, by, r * 4.2);
            const c = colour.map(Math.round).join(',');
            glow.addColorStop(0, `rgba(${c},${0.5 * level})`);
            glow.addColorStop(0.35, `rgba(${c},${0.14 * level})`);
            glow.addColorStop(1, `rgba(${c},0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(bx, by, r * 4.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        /* where the bulb sits on the stem, a little contact shade */
        const seat = ctx.createRadialGradient(bx, by + r * 0.9, 0, bx, by + r * 0.9, r * 0.7);
        seat.addColorStop(0, 'rgba(20,24,32,0.28)');
        seat.addColorStop(1, 'rgba(20,24,32,0)');
        ctx.fillStyle = seat;
        ctx.beginPath();
        ctx.arc(bx, by + r * 0.9, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        /* a hairline at the silhouette: the glass's own edge, invisible on dark, a crisp outline on light */
        ctx.lineWidth = Math.max(0.75, r * 0.07);
        ctx.strokeStyle = 'rgba(28,32,42,0.28)';
        ctx.stroke();
        /* the window's reflection */
        const sp = ctx.createRadialGradient(bx - r * 0.38, by - r * 0.42, 0, bx - r * 0.38, by - r * 0.42, r * 0.38);
        sp.addColorStop(0, 'rgba(255,255,255,0.95)');
        sp.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sp;
        ctx.fill();
    }
}

RH.frameFor = frameFor;
RH.RobotRenderer = RobotRenderer;
})();

/* ---- vanilla wrapper ---- */
(function(){

var parseColor = RH.parseColor, linear = RH.linear;
var pointer = RH.pointer, subscribe = RH.subscribe;
var getShape = RH.getShape, frameFor = RH.frameFor;
var RobotSim = RH.RobotSim, restPose = RH.restPose, RobotRenderer = RH.RobotRenderer;

/* ---- vanilla wrapper (port of RobotHead.tsx, no React) ---- */
var ROBOT_STATES = ['idle', 'thinking', 'searching', 'listening', 'speaking', 'working', 'happy', 'error', 'sleeping'];
var ROBOT_SHAPES = ['rectangle', 'square', 'circle', 'hexagon'];

function rhHashSeed(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}
function rhReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function rhPalette(color, trim, screen) {
  var shell = parseColor(color) || [48, 80, 172];
  var metal = parseColor(trim) || [150, 168, 200];
  var led = parseColor(screen) || [232, 242, 255];
  return {
    shell: { albedo: linear(shell), f0: 0.05, metal: 0.15, spec: 0.55, shininess: 70, rim: 0.9 },
    trim: { albedo: linear(metal), f0: 0.2, metal: 0.65, spec: 0.8, shininess: 45, rim: 0.7 },
    led: led
  };
}

var rhUid = 0;
function mountRobot(box, opts) {
  opts = opts || {};
  var stateKey = ROBOT_STATES.indexOf(opts.state) >= 0 ? opts.state : 'idle';
  var shapeKey = ROBOT_SHAPES.indexOf(opts.shape) >= 0 ? opts.shape : 'rectangle';
  var size = opts.size || 160;
  var color = opts.color || '#2b49a3';
  var trimColor = opts.trimColor || '#93a6c8';
  var screenColor = opts.screenColor || '#e8f2ff';
  var speed = typeof opts.speed === 'number' ? opts.speed : 1;
  var paused = !!opts.paused;
  var interactive = opts.interactive !== false;
  var floorShadow = opts.floorShadow !== false;
  var antenna = opts.antenna !== false;
  var seed = typeof opts.seed === 'number' ? opts.seed : rhHashSeed('rh' + (++rhUid));

  var still = paused || !(speed > 0) || rhReducedMotion();

  var span = document.createElement('span');
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', 'Robot, ' + stateKey);
  span.style.position = 'relative';
  span.style.display = 'block';
  span.style.flex = 'none';
  span.style.width = size + 'px';
  span.style.height = size + 'px';
  if (interactive) span.style.cursor = 'pointer';

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'absolute';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';
  span.appendChild(canvas);
  box.appendChild(span);

  var sim = new RobotSim(seed, stateKey);
  var renderer = new RobotRenderer();
  var pal = rhPalette(color, trimColor, screenColor);
  var frame = frameFor(getShape(shapeKey), antenna, size);
  var unsub = null;
  var destroyed = false;

  function layoutFrame() {
    frame = frameFor(getShape(shapeKey), antenna, size);
    canvas.style.left = (-frame.padSide) + 'px';
    canvas.style.top = (-frame.padTop) + 'px';
    canvas.style.width = (frame.box + 2 * frame.padSide) + 'px';
    canvas.style.height = (frame.box + frame.padTop + frame.padBottom) + 'px';
  }
  layoutFrame();

  function paint(animated) {
    if (destroyed) return;
    var dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    var w = Math.round((frame.box + 2 * frame.padSide) * dpr);
    var h = Math.round((frame.box + frame.padTop + frame.padBottom) * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderer.draw(ctx, frame, dpr, animated ? sim.pose : restPose(stateKey), animated ? sim : null, stateKey, getShape(shapeKey), pal, { floorShadow: floorShadow, antenna: antenna });
  }

  function startLoop() {
    stopLoop();
    if (still) { paint(false); return; }
    unsub = subscribe(function (dt) {
      if (destroyed) return;
      if (interactive && Number.isFinite(pointer.x)) {
        var boxr = span.getBoundingClientRect();
        var dx = pointer.x - (boxr.left + boxr.width / 2);
        var dy = pointer.y - (boxr.top + frame.cy - frame.padTop);
        sim.pointer = Math.hypot(dx, dy) < 700 ? { x: dx, y: dy } : null;
      } else {
        sim.pointer = null;
      }
      sim.update(dt * speed);
      paint(true);
    });
  }
  function stopLoop() {
    if (unsub) { unsub(); unsub = null; }
  }

  span.addEventListener('click', function () {
    if (interactive && !still) sim.poke();
  });

  startLoop();

  function refreshStill() {
    still = paused || !(speed > 0) || rhReducedMotion();
    startLoop();
  }

  return {
    el: span,
    getState: function () { return stateKey; },
    setState: function (s) {
      if (ROBOT_STATES.indexOf(s) < 0) return;
      stateKey = s;
      sim.setState(s);
      span.setAttribute('aria-label', 'Robot, ' + s);
      if (still) paint(false);
    },
    setShape: function (s) {
      if (ROBOT_SHAPES.indexOf(s) < 0) return;
      shapeKey = s;
      layoutFrame();
      if (still) paint(false);
    },
    setColors: function (c) {
      if (c.color) color = c.color;
      if (c.trimColor) trimColor = c.trimColor;
      if (c.screenColor) screenColor = c.screenColor;
      pal = rhPalette(color, trimColor, screenColor);
      if (still) paint(false);
    },
    setSpeed: function (v) { speed = v; refreshStill(); },
    setPaused: function (p) { paused = !!p; refreshStill(); },
    setAntenna: function (a) { antenna = !!a; layoutFrame(); if (still) paint(false); },
    setSize: function (s) {
      size = s;
      span.style.width = s + 'px';
      span.style.height = s + 'px';
      layoutFrame();
      if (still) paint(false);
    },
    destroy: function () {
      destroyed = true;
      stopLoop();
      if (span.parentNode) span.parentNode.removeChild(span);
    }
  };
}

window.RobotHead = {
  mount: mountRobot,
  states: ROBOT_STATES,
  shapes: ROBOT_SHAPES
};

})();

})();
