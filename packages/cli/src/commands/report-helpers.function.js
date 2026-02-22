"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupByModel = groupByModel;
exports.findDuplicates = findDuplicates;
exports.fmt = fmt;
exports.usd = usd;
exports.truncate = truncate;
exports.formatDuration = formatDuration;
function groupByModel(calls) {
    var _a, _b, _c;
    var map = new Map();
    for (var _i = 0, calls_1 = calls; _i < calls_1.length; _i++) {
        var c = calls_1[_i];
        var existing = (_a = map.get(c.model)) !== null && _a !== void 0 ? _a : { model: c.model, calls: 0, tokens: 0, cost: 0 };
        existing.calls++;
        existing.tokens += ((_c = (_b = c.tokens) === null || _b === void 0 ? void 0 : _b.total) !== null && _c !== void 0 ? _c : 0);
        existing.cost += c.cost;
        map.set(c.model, existing);
    }
    return __spreadArray([], map.values(), true).sort(function (a, b) { return b.cost - a.cost; });
}
function findDuplicates(calls) {
    var _a;
    var hashMap = new Map();
    for (var _i = 0, calls_2 = calls; _i < calls_2.length; _i++) {
        var c = calls_2[_i];
        var group = (_a = hashMap.get(c.promptHash)) !== null && _a !== void 0 ? _a : [];
        group.push(c);
        hashMap.set(c.promptHash, group);
    }
    return __spreadArray([], hashMap.entries(), true).filter(function (_a) {
        var v = _a[1];
        return v.length > 1;
    })
        .sort(function (a, b) { return b[1].length - a[1].length; });
}
function fmt(n) {
    return n.toLocaleString('en-US');
}
function usd(n) {
    return n < 0.01 ? "$".concat(n.toFixed(4)) : "$".concat(n.toFixed(2));
}
function truncate(s, max) {
    if (max === void 0) { max = 50; }
    return s.length > max ? s.slice(0, max) + '...' : s;
}
function formatDuration(ms) {
    return ms < 1000 ? "".concat(ms, "ms") : "".concat(Math.round(ms / 1000), "s");
}
