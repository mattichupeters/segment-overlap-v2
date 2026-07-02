import { LightningElement, api } from 'lwc';

const W = 620;
const H = 400;
const R_DEFAULT = 90;
const CX = W / 2;
const CY = H / 2 - 8;
const TWO_PI = Math.PI * 2;

// ═══════════════════════════════════════════════════════════════════════════
//  Geometry primitives
// ═══════════════════════════════════════════════════════════════════════════

function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function ang(c, p) { return Math.atan2(p.y - c.y, p.x - c.x); }
function normAng(a) { return ((a % TWO_PI) + TWO_PI) % TWO_PI; }
function ptOn(c, a) { return { x: c.x + c.r * Math.cos(a), y: c.y + c.r * Math.sin(a) }; }

function inside(pt, c) {
    return (pt.x - c.x) ** 2 + (pt.y - c.y) ** 2 < c.r * c.r - 1;
}

function circleXPts(c1, c2) {
    const d = dist(c1, c2);
    if (d >= c1.r + c2.r - 0.5 || d <= Math.abs(c1.r - c2.r) + 0.5 || d < 0.5) return [];
    const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, c1.r * c1.r - a * a));
    const dx = (c2.x - c1.x) / d, dy = (c2.y - c1.y) / d;
    const mx = c1.x + a * dx, my = c1.y + a * dy;
    return [{ x: mx + h * dy, y: my - h * dx }, { x: mx - h * dy, y: my + h * dx }];
}

function fullCircle(c) {
    return `M ${c.x - c.r} ${c.y} A ${c.r} ${c.r} 0 1 1 ${c.x + c.r} ${c.y} A ${c.r} ${c.r} 0 1 1 ${c.x - c.r} ${c.y} Z`;
}

function svgArc(c, p1, p2, sweep) {
    const span = sweep === 1
        ? normAng(ang(c, p2) - ang(c, p1))
        : normAng(ang(c, p1) - ang(c, p2));
    return `A ${c.r} ${c.r} 0 ${span > Math.PI ? 1 : 0} ${sweep} ${p2.x} ${p2.y}`;
}

function arcMid(c, p1, p2, sweep) {
    const a1 = ang(c, p1), a2 = ang(c, p2);
    const span = sweep === 1 ? normAng(a2 - a1) : normAng(a1 - a2);
    const mid = sweep === 1 ? a1 + span / 2 : a1 - span / 2;
    return ptOn(c, mid);
}

function sweepToward(c, target, p1, p2) {
    return dist(arcMid(c, p1, p2, 1), target) < dist(arcMid(c, p1, p2, 0), target) ? 1 : 0;
}

function sweepAway(c, target, p1, p2) {
    return dist(arcMid(c, p1, p2, 1), target) > dist(arcMid(c, p1, p2, 0), target) ? 1 : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Dynamic circle positioning based on pairwise overlap %
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Given N segments with counts and pairwise overlaps, compute circle centres
 * so that the visual overlap approximates the actual overlap %.
 *
 * For two circles of radius r, the overlap fraction is determined by the
 * distance d between centres. We map overlap% to a distance:
 *   0%   → d = 2r  (touching)
 *   100% → d = 0   (concentric)
 * Linear interpolation:  d = 2r * (1 - overlapFraction)
 * But clamp to [0.3r, 1.85r] for visual readability.
 */
function computePositions(segments, pairwise, r) {
    const n = segments.length;
    if (n < 2) return [];

    // Compute the average pairwise overlap fraction
    const overlapFractions = {};
    let totalFraction = 0;
    let pairCount = 0;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const key = `${i}_${j}`;
            const ov = Number(pairwise[key]) || 0;
            const smaller = Math.min(segments[i].count || 1, segments[j].count || 1);
            const frac = smaller > 0 ? Math.min(ov / smaller, 1) : 0;
            overlapFractions[key] = frac;
            totalFraction += frac;
            pairCount++;
        }
    }

    const avgFrac = pairCount > 0 ? totalFraction / pairCount : 0.3;

    if (n === 2) {
        const frac = overlapFractions['0_1'] || avgFrac;
        const d = computeDistance(frac, r);
        return [
            { x: CX - d / 2, y: CY },
            { x: CX + d / 2, y: CY }
        ];
    }

    if (n === 3) {
        // Place circles in equilateral triangle, distance based on average overlap
        const d = computeDistance(avgFrac, r);
        // Equilateral triangle with side length d, centred at (CX, CY)
        const triR = d / Math.sqrt(3); // circumradius of equilateral triangle with side d
        return [
            { x: CX + triR * Math.cos(-Math.PI / 2),      y: CY + triR * Math.sin(-Math.PI / 2) },
            { x: CX + triR * Math.cos(-Math.PI / 2 + TWO_PI / 3), y: CY + triR * Math.sin(-Math.PI / 2 + TWO_PI / 3) },
            { x: CX + triR * Math.cos(-Math.PI / 2 + 2 * TWO_PI / 3), y: CY + triR * Math.sin(-Math.PI / 2 + 2 * TWO_PI / 3) }
        ];
    }

    if (n === 4) {
        // Diamond layout — all 4 circles equidistant from centre
        // Places circles at top, right, bottom, left of a square rotated 45°
        // This ensures ALL 6 pairwise distances are close, maximising zone count
        const d = computeDistance(avgFrac, r);
        const spread = d * 0.58; // tune so adjacent circles overlap well
        return [
            { x: CX,          y: CY - spread },  // top
            { x: CX + spread,  y: CY },           // right
            { x: CX,          y: CY + spread },   // bottom
            { x: CX - spread,  y: CY }            // left
        ];
    }

    return [];
}

function computeDistance(frac, r) {
    // Map fraction (0 to 1) to distance (2r down to 0)
    // Clamp for visual readability
    const raw = 2 * r * (1 - frac);
    return Math.max(r * 0.3, Math.min(r * 1.85, raw));
}

// ═══════════════════════════════════════════════════════════════════════════
//  General zone path builder — works for 2, 3, 4 circles
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build all non-empty zone paths for a set of circles.
 *
 * ALGORITHM: For each zone (defined by include/exclude sets):
 * 1. Find a sample point strictly inside the zone
 * 2. Collect all circle-circle intersection points on the zone boundary
 * 3. Sort them angularly around the sample point
 * 4. Connect consecutive points with arcs on the correct circle,
 *    sweeping toward the sample point
 *
 * This is a general algorithm that works for any number of circles.
 */
function buildAllZones(circles) {
    const n = circles.length;
    if (n < 2) return [];

    // Pre-compute all intersection points with metadata
    const xPts = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const pts = circleXPts(circles[i], circles[j]);
            for (const pt of pts) {
                // Classify: for each other circle, is this point inside?
                const membership = [];
                for (let k = 0; k < n; k++) {
                    if (k === i || k === j) {
                        membership.push(true); // on the boundary of i and j
                    } else {
                        membership.push(inside(pt, circles[k]));
                    }
                }
                xPts.push({ pt, ci: i, cj: j, membership });
            }
        }
    }

    const zones = [];

    // Enumerate all 2^n - 1 non-empty subsets
    for (let mask = 1; mask < (1 << n); mask++) {
        const include = [];
        const exclude = [];
        for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) include.push(i);
            else exclude.push(i);
        }

        const path = buildZonePath(circles, xPts, include, exclude, n);
        if (path) {
            zones.push({ path, include, exclude });
        }
    }

    return zones;
}

function buildZonePath(circles, xPts, include, exclude, n) {
    // Step 1: Find a sample point
    const sample = findSample(circles, include, exclude);
    if (!sample) return null;

    // Step 2: Collect boundary points for this zone.
    // A crossing point (on circles i,j) is a boundary point of this zone if
    // its membership for all OTHER circles matches the zone's requirement.
    const boundary = [];
    for (const xp of xPts) {
        let match = true;
        for (let k = 0; k < n; k++) {
            if (k === xp.ci || k === xp.cj) continue; // skip the two circles this point is on
            const required = include.includes(k);
            if (xp.membership[k] !== required) { match = false; break; }
        }
        if (match) {
            boundary.push(xp);
        }
    }

    // For zones with no boundary crossings (e.g., one circle entirely inside/outside another),
    // use the full circle path if it's a single-include zone
    if (boundary.length < 2) {
        if (include.length === 1 && exclude.length >= 1) {
            // Check that circle is fully outside all excluded circles (or fully inside is impossible for "only")
            return fullCircle(circles[include[0]]);
        }
        return null;
    }

    // Step 3: Sort boundary points angularly around the sample
    boundary.sort((a, b) =>
        normAng(ang(sample, a.pt)) - normAng(ang(sample, b.pt))
    );

    // Step 4: Connect consecutive points with arcs
    let d = `M ${boundary[0].pt.x} ${boundary[0].pt.y} `;

    for (let i = 0; i < boundary.length; i++) {
        const curr = boundary[i];
        const next = boundary[(i + 1) % boundary.length];

        // Find the circle this arc lies on.
        // The arc between curr and next lies on a circle that:
        //   - both curr and next are on (they share a common circle)
        //   - the arc on that circle (sweeping toward sample) stays in the zone
        const arcC = pickArcCircle(circles, curr, next, sample, include, exclude);
        if (!arcC) continue;

        const sw = sweepToward(arcC, sample, curr.pt, next.pt);
        d += svgArc(arcC, curr.pt, next.pt, sw) + ' ';
    }

    d += 'Z';
    return d;
}

/**
 * Pick which circle the arc between two boundary points lies on.
 * Both points lie on two circles each; they share exactly one circle
 * (the one whose arc forms the zone boundary between them).
 */
function pickArcCircle(circles, ptA, ptB, sample, include, exclude) {
    // Find shared circles
    const aCircles = [ptA.ci, ptA.cj];
    const bCircles = [ptB.ci, ptB.cj];
    const shared = aCircles.filter(c => bCircles.includes(c));

    if (shared.length === 1) {
        return circles[shared[0]];
    }

    if (shared.length > 1) {
        // Pick the one whose toward-sample arc midpoint is actually inside the zone
        for (const ci of shared) {
            const c = circles[ci];
            const sw = sweepToward(c, sample, ptA.pt, ptB.pt);
            const mid = arcMid(c, ptA.pt, ptB.pt, sw);
            if (isInZone(mid, circles, include, exclude)) return c;
        }
        // Fallback: closest midpoint to sample
        let best = circles[shared[0]];
        let bestD = Infinity;
        for (const ci of shared) {
            const c = circles[ci];
            const sw = sweepToward(c, sample, ptA.pt, ptB.pt);
            const mid = arcMid(c, ptA.pt, ptB.pt, sw);
            const d = dist(mid, sample);
            if (d < bestD) { bestD = d; best = c; }
        }
        return best;
    }

    // No shared circle — find which circle both points are approximately on
    for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        const dA = Math.abs(dist(ptA.pt, c) - c.r);
        const dB = Math.abs(dist(ptB.pt, c) - c.r);
        if (dA < 3 && dB < 3) return c;
    }

    return circles[0]; // ultimate fallback
}

function findSample(circles, include, exclude) {
    // Start from centroid of included circles
    let sx = 0, sy = 0;
    for (const i of include) { sx += circles[i].x; sy += circles[i].y; }
    sx /= include.length; sy /= include.length;
    if (isInZone({ x: sx, y: sy }, circles, include, exclude)) return { x: sx, y: sy };

    // Spiral search
    for (let dr = 2; dr <= R_DEFAULT * 2.5; dr += 2) {
        for (let da = 0; da < TWO_PI; da += 0.12) {
            const pt = { x: sx + dr * Math.cos(da), y: sy + dr * Math.sin(da) };
            if (isInZone(pt, circles, include, exclude)) return pt;
        }
    }
    return null;
}

function isInZone(pt, circles, include, exclude) {
    for (const i of include) {
        if ((pt.x - circles[i].x) ** 2 + (pt.y - circles[i].y) ** 2 >= circles[i].r * circles[i].r) return false;
    }
    for (const i of exclude) {
        if ((pt.x - circles[i].x) ** 2 + (pt.y - circles[i].y) ** 2 < circles[i].r * circles[i].r - 1) return false;
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════════════

export default class VennDiagramSvg extends LightningElement {

    @api
    get segmentsJson() { return this._segmentsJson; }
    set segmentsJson(val) {
        this._segmentsJson = val;
        try { this._segments = JSON.parse(val || '[]'); }
        catch (e) { this._segments = []; }
    }

    @api
    get overlapJson() { return this._overlapJson; }
    set overlapJson(val) {
        this._overlapJson = val;
        try { this._overlap = JSON.parse(val || '{}'); }
        catch (e) { this._overlap = {}; }
    }

    _segmentsJson = '[]';
    _overlapJson = '{}';
    _segments = [];
    _overlap = {};  // { pairwise: {"0_1": count, ...}, allOverlap: N, counts: [n1, n2, ...] }

    get viewBox() { return `0 0 ${W} ${H}`; }

    get hasCircles() {
        const n = this._segments.length;
        return n >= 2 && n <= 4;
    }

    get _circleObjects() {
        const segs = this._segments;
        const n = segs.length;
        if (n < 2 || n > 4) return [];

        const r = R_DEFAULT;
        const pairwise = this._overlap.pairwise || {};
        const positions = computePositions(segs, pairwise, r);

        return segs.map((seg, i) => ({
            x: positions[i] ? positions[i].x : CX,
            y: positions[i] ? positions[i].y : CY,
            r: r,
            fillColor:   seg.fill     || 'rgba(1,118,211,0.15)',
            strokeColor: seg.color    || '#0176D3',
            textFill:    seg.textFill || '#014486',
            name:        seg.name,
            count:       seg.count,
            index:       i
        }));
    }

    get circles() {
        return this._circleObjects.map((c, i) => ({
            key:    `bg-${i}`,
            cx:     c.x,
            cy:     c.y,
            r:      c.r,
            fill:   c.fillColor,
            stroke: c.strokeColor
        }));
    }

    get zonePaths() {
        const co = this._circleObjects;
        if (co.length < 2) return [];

        const zones = buildAllZones(co);

        return zones
            .filter(z => z.path && z.path.length > 0)
            .map((z, i) => ({
                key:     `zone-${i}`,
                d:       z.path,
                include: JSON.stringify(z.include),
                exclude: JSON.stringify(z.exclude),
                label:   this._zoneLabel(z.include, z.exclude)
            }));
    }

    get legendItems() {
        const co = this._circleObjects;
        return co.map((c, i) => ({
            key:            `legend-${i}`,
            name:           c.name || `Segment ${i + 1}`,
            formattedCount: this._fmtFull(c.count),
            dotStyle:       `background-color: ${c.strokeColor}`
        }));
    }

    get circleCountLabels() {
        const co = this._circleObjects;
        const n = co.length;
        return co.map((c, i) => {
            // Position count label in the outer part of the circle, away from centre
            const cx = co.reduce((s, o) => s + o.x, 0) / n;
            const cy = co.reduce((s, o) => s + o.y, 0) / n;
            const dx = c.x - cx;
            const dy = c.y - cy;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const offset = c.r * 0.4;
            return {
                key:     `cnt-${i}`,
                x:       c.x + (dx / d) * offset,
                y:       c.y + (dy / d) * offset,
                count:   this._fmt(c.count),
                txtFill: c.textFill
            };
        });
    }

    handleZoneClick(event) {
        const target = event.currentTarget;
        const include = JSON.parse(target.dataset.include);
        const exclude = JSON.parse(target.dataset.exclude);
        this.dispatchEvent(new CustomEvent('zoneclick', {
            detail: { include, exclude },
            bubbles: true,
            composed: true
        }));
    }

    _zoneLabel(include, exclude) {
        const segs = this._segments;
        const incNames = include.map(i => segs[i]?.name || `Segment ${i + 1}`);
        if (exclude.length === 0) return incNames.join(' ∩ ');
        return incNames.join(' ∩ ') + ' only';
    }

    _fmt(n) {
        const num = Number(n) || 0;
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K';
        return String(num);
    }

    _fmtFull(n) {
        return (Number(n) || 0).toLocaleString();
    }

    _truncate(s, max = 22) {
        if (!s) return '';
        return s.length > max ? s.slice(0, max - 1) + '…' : s;
    }
}
