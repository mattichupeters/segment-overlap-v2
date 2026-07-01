import { LightningElement, api } from 'lwc';

const W = 620;
const H = 400;
const R = 95;   // circle radius

/**
 * Positions for 2, 3, or 4 circles (relative to center of SVG).
 * Overlap amounts tuned for readability.
 */
const LAYOUTS = {
    2: [
        { x: -50, y: 0 },
        { x:  50, y: 0 }
    ],
    3: [
        { x:   0, y: -42 },
        { x: -48, y:  32 },
        { x:  48, y:  32 }
    ],
    4: [
        { x: -42, y: -38 },
        { x:  42, y: -38 },
        { x: -42, y:  38 },
        { x:  42, y:  38 }
    ]
};

const CX = W / 2;
const CY = H / 2 - 8;

export default class VennDiagramSvg extends LightningElement {

    @api
    get segmentsJson() { return this._segmentsJson; }
    set segmentsJson(val) {
        this._segmentsJson = val;
        try {
            this._segments = JSON.parse(val || '[]');
        } catch (e) {
            this._segments = [];
        }
    }

    _segmentsJson = '[]';
    _segments = [];

    get viewBox() { return `0 0 ${W} ${H}`; }

    get hasCircles() {
        const n = this._segments.length;
        return n >= 2 && n <= 4;
    }

    get circles() {
        const segs = this._segments;
        const n = segs.length;
        if (n < 2 || n > 4) return [];

        const layout = LAYOUTS[n];
        return segs.map((seg, i) => ({
            key:       `c-${i}`,
            cx:        CX + layout[i].x,
            cy:        CY + layout[i].y,
            r:         R,
            fill:      seg.fill   || 'rgba(1,118,211,0.15)',
            stroke:    seg.color  || '#0176D3',
            label:     this._truncate(seg.name, 22),
            count:     this._fmt(seg.count),
            labelX:    CX + layout[i].x,
            labelY:    CY + layout[i].y + R + 22,
            countX:    this._countX(layout, i, n),
            countY:    this._countY(layout, i, n),
            txtFill:   seg.textFill || '#014486',
            labelFill: '#3E3E3C'
        }));
    }

    /**
     * Position count labels toward the outer edge of each circle
     * (away from center) so they avoid the intersection zone.
     */
    _countX(layout, i, n) {
        const pos = layout[i];
        if (n === 2) {
            return CX + pos.x + (i === 0 ? -32 : 32);
        }
        const dx = pos.x === 0 ? 0 : (pos.x > 0 ? 30 : -30);
        return CX + pos.x + dx;
    }

    _countY(layout, i, n) {
        const pos = layout[i];
        if (n === 2) return CY + pos.y;
        const dy = pos.y > 0 ? 24 : -24;
        return CY + pos.y + dy;
    }

    _fmt(n) {
        const num = Number(n) || 0;
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'K';
        return String(num);
    }

    _truncate(s, max = 22) {
        if (!s) return '';
        return s.length > max ? s.slice(0, max - 1) + '…' : s;
    }
}
