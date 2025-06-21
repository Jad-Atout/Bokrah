// src/utils/ticks.js

/**
 * Generate 1-minute ticks between start and end (exclusive).
 * @param {ObjectId} staffId
 * @param {Date} start - inclusive
 * @param {Date} end - exclusive
 * @param {number} step - default 1 minute
 * @returns Array<{ staffId, slotStart }>
 */
export function ticks(staffId, start, end, step = 1) {
    const out = [];
    const t = new Date(start);
    t.setSeconds(0, 0);
    while (t < end) {
        out.push({ staffId, slotStart: new Date(t) });
        t.setMinutes(t.getMinutes() + step);
    }

    return out;
}
