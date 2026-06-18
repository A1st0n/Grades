//  Grade Recorder React Frontend  
//  Communicates with Flask REST API via fetch + XMLHttpRequest
//  UI built from reactbits.dev: LightRays, PillNav, MagicBento

import React from 'react'
import { gsap } from 'gsap'


// helper: converts a numeric grade into a letter grade string
function getLetterGrade(g) {
    if (g >= 90) return 'A';
    if (g >= 80) return 'B';
    if (g >= 70) return 'C';
    if (g >= 60) return 'D';
    return 'F';
}

// helper: turns a #rrggbb string into normalized [r,g,b] for the shader
function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
        ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
        : [1, 1, 1];
}


// 
//  LightRays  (reactbits.dev/backgrounds/light-rays)
//  Ported from OGL to raw WebGL so it runs without a build step.
// 
function LightRays({
    raysColor = '#e1d7f7',
    raysSpeed = 1.2,
    lightSpread = 0.8,
    rayLength = 2.2,
    followMouse = true,
    mouseInfluence = 0.12,
}) {
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        container.appendChild(canvas);

        const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
        if (!gl) return;

        const vert = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

        const frag = `precision highp float;
uniform float iTime;
uniform vec2  iResolution;
uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);
  float spreadFactor = pow(max(cosAngle, 0.0), 1.0 / max(lightSpread, 0.001));
  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float baseStrength = clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0);
  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }
  vec4 rays1 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);
  vec4 fragColor = rays1 * 0.5 + rays2 * 0.4;
  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;
  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }
  fragColor.rgb *= raysColor;
  gl_FragColor = fragColor;
}`;

        function compile(type, src) {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return s;
        }

        const program = gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vert));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag));
        gl.linkProgram(program);
        gl.useProgram(program);

        // fullscreen triangle
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const U = name => gl.getUniformLocation(program, name);
        const u = {
            iTime: U('iTime'), iResolution: U('iResolution'),
            rayPos: U('rayPos'), rayDir: U('rayDir'), raysColor: U('raysColor'),
            raysSpeed: U('raysSpeed'), lightSpread: U('lightSpread'), rayLength: U('rayLength'),
            fadeDistance: U('fadeDistance'), saturation: U('saturation'),
            mousePos: U('mousePos'), mouseInfluence: U('mouseInfluence'),
        };

        // set the static uniforms once
        gl.uniform3fv(u.raysColor, hexToRgb(raysColor));
        gl.uniform1f(u.raysSpeed, raysSpeed);
        gl.uniform1f(u.lightSpread, lightSpread);
        gl.uniform1f(u.rayLength, rayLength);
        gl.uniform1f(u.fadeDistance, 1.0);
        gl.uniform1f(u.saturation, 1.0);
        gl.uniform1f(u.mouseInfluence, mouseInfluence);

        const mouse = { x: 0.5, y: 0.5 };
        const smooth = { x: 0.5, y: 0.5 };

        function resize() {
            const dpr = Math.min(window.devicePixelRatio, 2);
            const w = container.clientWidth, h = container.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(u.iResolution, canvas.width, canvas.height);
            // anchor rays at top-center, pointing down
            gl.uniform2f(u.rayPos, 0.5 * canvas.width, -0.2 * canvas.height);
            gl.uniform2f(u.rayDir, 0, 1);
        }
        resize();
        window.addEventListener('resize', resize);

        function onMove(e) {
            const rect = container.getBoundingClientRect();
            mouse.x = (e.clientX - rect.left) / rect.width;
            mouse.y = (e.clientY - rect.top) / rect.height;
        }
        if (followMouse) window.addEventListener('mousemove', onMove);

        let raf;
        function loop(t) {
            gl.uniform1f(u.iTime, t * 0.001);
            if (followMouse) {
                smooth.x = smooth.x * 0.92 + mouse.x * 0.08;
                smooth.y = smooth.y * 0.92 + mouse.y * 0.08;
                gl.uniform2f(u.mousePos, smooth.x, smooth.y);
            }
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            raf = requestAnimationFrame(loop);
        }
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMove);
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        };
    }, [raysColor, raysSpeed, lightSpread, rayLength, followMouse, mouseInfluence]);

    return <div ref={containerRef} className="light-rays-container" />;
}


// 
// 
// prop: receives items list, active id, and onSelect handler from App
function PillNav({ brand, items, activeId, onSelect, ease = 'power3.out' }) {
    const circleRefs = React.useRef([]);
    const tlRefs = React.useRef([]);
    const tweenRefs = React.useRef([]);

    // build a GSAP timeline per pill for the expanding-fill hover effect
    React.useLayoutEffect(() => {
        if (!gsap) return;
        const layout = () => {
            circleRefs.current.forEach((circle, i) => {
                if (!circle || !circle.parentElement) return;
                const pill = circle.parentElement;
                const { width: w, height: h } = pill.getBoundingClientRect();
                if (!w || !h) return;

                const R = ((w * w) / 4 + h * h) / (2 * h);
                const D = Math.ceil(2 * R) + 2;
                const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
                const originY = D - delta;

                circle.style.width = `${D}px`;
                circle.style.height = `${D}px`;
                circle.style.bottom = `-${delta}px`;
                gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` });

                const label = pill.querySelector('.pill-label');
                const hover = pill.querySelector('.pill-label-hover');
                if (label) gsap.set(label, { y: 0 });
                if (hover) gsap.set(hover, { y: h + 12, opacity: 0 });

                tlRefs.current[i]?.kill();
                const tl = gsap.timeline({ paused: true });
                tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0);
                if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0);
                if (hover) tl.to(hover, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0);
                tlRefs.current[i] = tl;
            });
        };
        layout();
        window.addEventListener('resize', layout);
        return () => window.removeEventListener('resize', layout);
    }, [items, ease]);

    function enter(i) {
        const tl = tlRefs.current[i];
        if (!tl) return;
        tweenRefs.current[i]?.kill();
        tweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: 'auto' });
    }
    function leave(i) {
        const tl = tlRefs.current[i];
        if (!tl) return;
        tweenRefs.current[i]?.kill();
        tweenRefs.current[i] = tl.tweenTo(0, { duration: 0.2, ease, overwrite: 'auto' });
    }

    return (
        <div className="pill-nav-container">
            <nav className="pill-nav" aria-label="Primary">
                <span className="pill-logo">{brand}</span>
                <ul className="pill-list">
                    {items.map((item, i) => (
                        <li key={item.id}>
                            <button
                                className={`pill${activeId === item.id ? ' is-active' : ''}`}
                                onMouseEnter={() => enter(i)}
                                onMouseLeave={() => leave(i)}
                                onClick={() => onSelect(item.id)}
                            >
                                <span
                                    className="hover-circle"
                                    aria-hidden="true"
                                    ref={el => { circleRefs.current[i] = el; }}
                                />
                                <span className="label-stack">
                                    <span className="pill-label">{item.label}</span>
                                    <span className="pill-label-hover" aria-hidden="true">{item.label}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}


//  MagicBento  (reactbits.dev/components/magic-bento)
//  ParticleCard + GlobalSpotlight, square-edged.
// 
const GLOW_COLOR = '132, 0, 255';
const PARTICLE_COUNT = 10;
const SPOTLIGHT_RADIUS = 320;

// creates one floating square particle element
function createParticle(x, y) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.cssText = `position:absolute;width:4px;height:4px;border-radius:0;
        background:rgba(${GLOW_COLOR},1);box-shadow:0 0 6px rgba(${GLOW_COLOR},0.6);
        pointer-events:none;z-index:100;left:${x}px;top:${y}px;`;
    return el;
}

// ── ParticleCard ───────────────────────────────────────────────
// prop: receives children + className from whichever view renders it
// wraps content with particle burst + tilt + magnetism on hover
function ParticleCard({ children, className = '', style }) {
    const cardRef = React.useRef(null);
    const particlesRef = React.useRef([]);
    const timeoutsRef = React.useRef([]);
    const hoveredRef = React.useRef(false);
    const memoRef = React.useRef([]);
    const initedRef = React.useRef(false);

    React.useEffect(() => {
        const el = cardRef.current;
        if (!el || !gsap) return;

        function initParticles() {
            if (initedRef.current) return;
            const { width, height } = el.getBoundingClientRect();
            memoRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
                createParticle(Math.random() * width, Math.random() * height));
            initedRef.current = true;
        }

        function clearParticles() {
            timeoutsRef.current.forEach(clearTimeout);
            timeoutsRef.current = [];
            particlesRef.current.forEach(p => {
                gsap.to(p, {
                    scale: 0, opacity: 0, duration: 0.3, ease: 'back.in(1.7)',
                    onComplete: () => p.parentNode && p.parentNode.removeChild(p),
                });
            });
            particlesRef.current = [];
        }

        function onEnter() {
            hoveredRef.current = true;
            initParticles();
            memoRef.current.forEach((particle, index) => {
                const id = setTimeout(() => {
                    if (!hoveredRef.current) return;
                    const clone = particle.cloneNode(true);
                    el.appendChild(clone);
                    particlesRef.current.push(clone);
                    gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
                    gsap.to(clone, {
                        x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100,
                        rotation: Math.random() * 360, duration: 2 + Math.random() * 2,
                        ease: 'none', repeat: -1, yoyo: true,
                    });
                }, index * 100);
                timeoutsRef.current.push(id);
            });
        }

        function onMove(e) {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left, y = e.clientY - rect.top;
            const cx = rect.width / 2, cy = rect.height / 2;
            gsap.to(el, {
                rotateX: ((y - cy) / cy) * -6, rotateY: ((x - cx) / cx) * 6,
                duration: 0.1, ease: 'power2.out', transformPerspective: 1000,
            });
            gsap.to(el, { x: (x - cx) * 0.04, y: (y - cy) * 0.04, duration: 0.3, ease: 'power2.out' });
        }

        function onLeave() {
            hoveredRef.current = false;
            clearParticles();
            gsap.to(el, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
        }

        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        return () => {
            hoveredRef.current = false;
            el.removeEventListener('mouseenter', onEnter);
            el.removeEventListener('mousemove', onMove);
            el.removeEventListener('mouseleave', onLeave);
            clearParticles();
        };
    }, []);

    return (
        <div ref={cardRef} className={`${className} particle-container`} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
            {children}
        </div>
    );
}

//  GlobalSpotlight 
// prop: receives gridRef from BentoSection
// draws a mouse-following glow + lights up nearby card borders
function GlobalSpotlight({ gridRef }) {
    React.useEffect(() => {
        if (!gsap || !gridRef.current) return;

        const spotlight = document.createElement('div');
        spotlight.className = 'global-spotlight';
        spotlight.style.cssText = `position:fixed;width:800px;height:800px;border-radius:50%;
            pointer-events:none;background:radial-gradient(circle,
            rgba(${GLOW_COLOR},0.15) 0%, rgba(${GLOW_COLOR},0.08) 15%,
            rgba(${GLOW_COLOR},0.04) 25%, rgba(${GLOW_COLOR},0.02) 40%,
            rgba(${GLOW_COLOR},0.01) 65%, transparent 70%);
            z-index:200;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;`;
        document.body.appendChild(spotlight);

        const proximity = SPOTLIGHT_RADIUS * 0.5;
        const fade = SPOTLIGHT_RADIUS * 0.75;

        function onMove(e) {
            const section = gridRef.current?.closest('.bento-section');
            const rect = section?.getBoundingClientRect();
            const inside = rect && e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom;
            const cards = gridRef.current?.querySelectorAll('.magic-bento-card') || [];

            if (!inside) {
                gsap.to(spotlight, { opacity: 0, duration: 0.3 });
                cards.forEach(c => c.style.setProperty('--glow-intensity', '0'));
                return;
            }

            let minDist = Infinity;
            cards.forEach(card => {
                const r = card.getBoundingClientRect();
                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                const dist = Math.max(0, Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(r.width, r.height) / 2);
                minDist = Math.min(minDist, dist);
                let intensity = 0;
                if (dist <= proximity) intensity = 1;
                else if (dist <= fade) intensity = (fade - dist) / (fade - proximity);
                const rx = ((e.clientX - r.left) / r.width) * 100;
                const ry = ((e.clientY - r.top) / r.height) * 100;
                card.style.setProperty('--glow-x', `${rx}%`);
                card.style.setProperty('--glow-y', `${ry}%`);
                card.style.setProperty('--glow-intensity', intensity.toString());
                card.style.setProperty('--glow-radius', `${SPOTLIGHT_RADIUS}px`);
            });

            gsap.to(spotlight, { left: e.clientX, top: e.clientY, duration: 0.1 });
            const target = minDist <= proximity ? 0.8
                : minDist <= fade ? ((fade - minDist) / (fade - proximity)) * 0.8 : 0;
            gsap.to(spotlight, { opacity: target, duration: target > 0 ? 0.2 : 0.5 });
        }

        document.addEventListener('mousemove', onMove);
        return () => {
            document.removeEventListener('mousemove', onMove);
            spotlight.parentNode && spotlight.parentNode.removeChild(spotlight);
        };
    }, [gridRef]);

    return null;
}

//  BentoSection 
// prop: receives children (the cards) from each view
// wires a grid + a GlobalSpotlight around them
function BentoSection({ children, className = '' }) {
    const gridRef = React.useRef(null);
    return (
        <React.Fragment>
            <GlobalSpotlight gridRef={gridRef} />
            <div className={`card-grid bento-section ${className}`} ref={gridRef}>
                {children}
            </div>
        </React.Fragment>
    );
}


// 
//  Grade app views
// 

// ── StudentGrid (main page) 
// prop: receives students object from App state
// renders a MagicBento grid of student cards ; names only, no grades
function StudentGrid({ students }) {
    const names = Object.keys(students);
    if (names.length === 0) {
        return (
            <BentoSection>
                <ParticleCard className="magic-bento-card magic-bento-card--border-glow wide">
                    <p className="empty-cell">No students yet — add one from the Add Student tab.</p>
                </ParticleCard>
            </BentoSection>
        );
    }
    return (
        <BentoSection>
            {names.map(name => (
                <ParticleCard key={name} className="magic-bento-card magic-bento-card--border-glow">
                    <div className="magic-bento-card__header">
                        <div className="magic-bento-card__label">STUDENT</div>
                    </div>
                    <div className="magic-bento-card__content">
                        <h2 className="magic-bento-card__title">{name}</h2>
                    </div>
                </ParticleCard>
            ))}
        </BentoSection>
    );
}


//  EditableGrade 
// state: editing; create resource tracking if this cell is in edit mode
// state: draft ;holds the in-progress grade value, sends to PUT on Enter
// prop: receives name + grade + onEdit handler from GradeTable
function EditableGrade({ name, grade, onEdit }) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(String(grade));

    function commit() {
        const g = parseFloat(draft);
        if (!isNaN(g) && g >= 0 && g <= 100) onEdit(name, g);
        setEditing(false);
    }

    if (editing) {
        return (
            <input
                className="inline-edit" type="number" min="0" max="100" step="0.1"
                value={draft} autoFocus
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') { setDraft(String(grade)); setEditing(false); }
                }}
                onBlur={commit}
            />
        );
    }
    return (
        <span className="editable-grade" title="Click to edit grade"
            onClick={() => { setDraft(String(grade)); setEditing(true); }}>
            {grade}
        </span>
    );
}


//  GradeTable 
// prop: receives students object + onEdit/onDelete handlers from App
function GradeTable({ students, onEdit, onDelete }) {
    const entries = Object.entries(students);
    return (
        <BentoSection>
            <ParticleCard className="magic-bento-card magic-bento-card--border-glow wide">
                <div className="section-label">All Grades — click a grade to edit</div>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th><th>Student Name</th><th>Grade</th><th>Letter</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.length === 0
                                ? <tr><td className="empty-cell" colSpan="5">No records to display</td></tr>
                                : entries.map(([name, grade], idx) => {
                                    const l = getLetterGrade(grade);
                                    return (
                                        <tr key={name}>
                                            <td className="row-num">{idx + 1}</td>
                                            <td>{name}</td>
                                            <td><EditableGrade name={name} grade={grade} onEdit={onEdit} /></td>
                                            <td><span className={`letter-badge letter-${l}`}>{l}</span></td>
                                            <td><span className="delete-x" title="Delete student" onClick={() => onDelete(name)}>✕</span></td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </ParticleCard>
        </BentoSection>
    );
}


// ── AddForm 
// state: newName — create resource for the name input, sent on Enter
// state: newGrade — create resource for the grade input, sent on Enter
// prop: receives onAdd handler from App to POST a new student
function AddForm({ onAdd }) {
    const [newName, setNewName] = React.useState('');
    const [newGrade, setNewGrade] = React.useState('');
    const [err, setErr] = React.useState('');

    function submit() {
        if (!newName.trim()) { setErr('Student name is required.'); return; }
        if (newGrade === '') { setErr('Grade is required.'); return; }
        const g = parseFloat(newGrade);
        if (g < 0 || g > 100) { setErr('Grade must be 0 – 100.'); return; }
        onAdd(newName.trim(), g);
        setNewName(''); setNewGrade(''); setErr('');
    }
    const onKey = e => { if (e.key === 'Enter') submit(); };

    return (
        <BentoSection>
            <ParticleCard className="magic-bento-card magic-bento-card--border-glow wide">
                <div className="section-label">Add New Student</div>
                {err && <p className="error-text" style={{ marginBottom: '10px' }}>{err}</p>}
                <div className="form-col">
                    <input type="text" placeholder="Student Name (case sensitive)" value={newName}
                        onChange={e => { setNewName(e.target.value); setErr(''); }} onKeyDown={onKey} />
                    <input type="number" placeholder="Grade (0 – 100)" min="0" max="100" step="0.1" value={newGrade}
                        onChange={e => { setNewGrade(e.target.value); setErr(''); }} onKeyDown={onKey} />
                    <p className="hint-text">Press <kbd>Enter</kbd> to add the student.</p>
                </div>
            </ParticleCard>
        </BentoSection>
    );
}


// ── SearchPanel ────────────────────────────────────────────────
// state: searchName — create resource for the lookup input
//        sent as a URL param to GET /grades/<name> via XMLHttpRequest
// state: searchResult — stores the JSON response from the backend
// state: notFound — tracks whether the backend returned a 404
function SearchPanel() {
    const [searchName, setSearchName] = React.useState('');
    const [searchResult, setSearchResult] = React.useState(null);
    const [notFound, setNotFound] = React.useState(false);

    // uses XMLHttpRequest (from Lecture 7) to GET one student by name
    function runSearch() {
        if (!searchName.trim()) return;
        const xhttp = new XMLHttpRequest();
        // encodeURIComponent turns spaces into %20 as required
        xhttp.open('GET', `/grades/${encodeURIComponent(searchName.trim())}`, true);
        xhttp.onload = function () {
            if (this.status === 200) { setSearchResult(JSON.parse(this.responseText)); setNotFound(false); }
            else { setSearchResult(null); setNotFound(true); }
        };
        xhttp.onerror = function () { setSearchResult(null); setNotFound(true); };
        xhttp.send();
    }

    return (
        <BentoSection>
            <ParticleCard className="magic-bento-card magic-bento-card--border-glow wide">
                <div className="section-label">Look Up Student</div>
                <div className="form-col">
                    <input type="text" placeholder="Student Name (case sensitive)" value={searchName}
                        onChange={e => { setSearchName(e.target.value); setSearchResult(null); setNotFound(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') runSearch(); }} />
                    <p className="hint-text">Press <kbd>Enter</kbd> to search.</p>
                </div>
                {searchResult && (
                    <div className="search-result-box">
                        {Object.entries(searchResult).map(([name, grade]) => {
                            const l = getLetterGrade(grade);
                            return (
                                <div key={name}>
                                    <strong>{name}</strong><br />
                                    Grade: <span className="grade-num">{grade}</span>&nbsp;&nbsp;
                                    <span className={`letter-badge letter-${l}`}>{l}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {notFound && <p className="error-text" style={{ marginTop: '10px' }}>Student not found.</p>}
            </ParticleCard>
        </BentoSection>
    );
}


// 
//  App (root)
// 
// state: students source of truth for all grade data, synced with Flask
// state: view  which page the PillNav is showing
// state: statusMsg  short success message after each operation
function App() {
    const [students, setStudents] = React.useState({});
    const [view, setView] = React.useState('students');
    const [statusMsg, setStatusMsg] = React.useState('');

    function showStatus(msg) {
        setStatusMsg(msg);
        setTimeout(() => setStatusMsg(''), 2800);
    }

    // GET /grades — fetches full grades dict into students state
    function loadAll() {
        const xhttp = new XMLHttpRequest();
        xhttp.open('GET', '/grades', true);
        xhttp.onload = function () { setStudents(JSON.parse(this.responseText)); };
        xhttp.send();
    }

    React.useEffect(() => { loadAll(); }, []);

    // POST /grades — sends {name, grade}, refreshes students from response
    function handleAdd(name, grade) {
        fetch('/grades', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, grade }),
        }).then(r => r.json()).then(data => {
            setStudents(data); showStatus(`Added "${name}" with grade ${grade}`);
        }).catch(e => console.error('POST error:', e));
    }

    // PUT /grades/<name> — sends {grade}, refreshes students from response
    function handleEdit(name, grade) {
        fetch(`/grades/${encodeURIComponent(name)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grade }),
        }).then(r => r.json()).then(data => {
            setStudents(data); showStatus(`Updated "${name}" to ${grade}`);
        }).catch(e => console.error('PUT error:', e));
    }

    // DELETE /grades/<name> — removes student, refreshes students from response
    function handleDelete(name) {
        fetch(`/grades/${encodeURIComponent(name)}`, { method: 'DELETE' })
            .then(r => r.json()).then(data => {
                setStudents(data); showStatus(`Deleted "${name}"`);
            }).catch(e => console.error('DELETE error:', e));
    }

    const navItems = [
        { id: 'students', label: 'Students' },
        { id: 'grades', label: 'All Grades' },
        { id: 'add', label: 'Add Student' },
        { id: 'search', label: 'Look Up' },
    ];

    // decide which view renders based on the active PillNav tab
    function renderView() {
        if (view === 'grades') return <GradeTable students={students} onEdit={handleEdit} onDelete={handleDelete} />;
        if (view === 'add') return <AddForm onAdd={handleAdd} />;
        if (view === 'search') return <SearchPanel />;
        return <StudentGrid students={students} />;
    }

    return (
        <React.Fragment>
            <LightRays />
            <div className="page">
                <PillNav brand="Grade Recorder" items={navItems} activeId={view} onSelect={setView} />
                <div className="app">
                    {statusMsg && <div className="status-toast">{statusMsg}</div>}
                    {renderView()}
                </div>
            </div>
        </React.Fragment>
    );
}

export default App
