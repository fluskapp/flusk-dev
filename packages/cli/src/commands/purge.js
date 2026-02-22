"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeCommand = void 0;
/**
 * CLI command: flusk purge --older-than <days>
 * Deletes telemetry data older than the specified number of days.
 */
var commander_1 = require("commander");
var chalk_1 = require("chalk");
var resources_1 = require("@flusk/resources");
var forge_1 = require("@flusk/forge");
var logger_1 = require("@flusk/logger");
var log = (0, logger_1.createLogger)({ name: 'purge' });
exports.purgeCommand = new commander_1.Command('purge')
    .description('Purge old telemetry data')
    .option('--older-than <days>', 'Delete data older than N days')
    .option('--dry-run', 'Show what would be deleted without deleting')
    .action(function (opts) { return __awaiter(void 0, void 0, void 0, function () {
    var config, days, cutoff, db, counts, total;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, (0, forge_1.loadConfig)()];
            case 1:
                config = _d.sent();
                days = parseInt((_a = opts.olderThan) !== null && _a !== void 0 ? _a : (_b = config.storage) === null || _b === void 0 ? void 0 : _b.retentionDays, 10);
                if (!days || days <= 0) {
                    console.error(chalk_1.default.red('Specify --older-than <days> or set storage.retentionDays in config'));
                    process.exit(1);
                }
                cutoff = new Date(Date.now() - days * 86400000).toISOString();
                db = (0, resources_1.getDb)((_c = config.storage) === null || _c === void 0 ? void 0 : _c.path);
                counts = countRows(db, cutoff);
                total = counts.llmCalls + counts.sessions + counts.patterns;
                if (opts.dryRun) {
                    console.log(chalk_1.default.yellow("Would delete ".concat(total, " records older than ").concat(days, " days")));
                    printCounts(counts);
                    (0, resources_1.closeDb)();
                    return [2 /*return*/];
                }
                deleteRows(db, cutoff);
                db.exec('VACUUM');
                (0, resources_1.closeDb)();
                console.log(chalk_1.default.green("\u2705 Purged ".concat(total, " records older than ").concat(days, " days")));
                printCounts(counts);
                log.info({ days: days, total: total }, 'Purge complete');
                return [2 /*return*/];
        }
    });
}); });
function countRows(db, cutoff) {
    var q = function (table) {
        return db.prepare("SELECT count(*) as c FROM ".concat(table, " WHERE created_at < ?")).get(cutoff).c;
    };
    return { llmCalls: q('llm_calls'), sessions: q('analyze_sessions'), patterns: q('performance_patterns') };
}
function deleteRows(db, cutoff) {
    for (var _i = 0, _a = ['llm_calls', 'analyze_sessions', 'performance_patterns']; _i < _a.length; _i++) {
        var t = _a[_i];
        db.prepare("DELETE FROM ".concat(t, " WHERE created_at < ?")).run(cutoff);
    }
}
function printCounts(c) {
    console.log(chalk_1.default.dim("  LLM calls: ".concat(c.llmCalls, ", Sessions: ").concat(c.sessions, ", Patterns: ").concat(c.patterns)));
}
