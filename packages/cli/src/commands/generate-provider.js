"use strict";
/**
 * CLI command: flusk g:provider [name] --from <yaml>
 * Scaffolds a full LLM provider integration from YAML schema.
 */
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
exports.generateProviderCommand = void 0;
var commander_1 = require("commander");
var chalk_1 = require("chalk");
var forge_1 = require("@flusk/forge");
exports.generateProviderCommand = new commander_1.Command('g:provider')
    .description('Scaffold an LLM provider integration')
    .argument('[name]', 'Provider name in kebab-case (e.g., anthropic)')
    .option('--from <path>', 'Provider YAML schema file')
    .option('--dry-run', 'Preview files without writing')
    .action(function (name, options) { return __awaiter(void 0, void 0, void 0, function () {
    var source, isYaml, label, result, _i, _a, f, icon, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                source = options.from || name;
                if (!source) {
                    console.error(chalk_1.default.red('Error: Provide a name or --from <yaml>'));
                    process.exit(1);
                }
                isYaml = source.endsWith('.yaml') || source.endsWith('.yml');
                label = isYaml ? "from ".concat(source) : source;
                console.log(chalk_1.default.blue("\n\uD83D\uDD0C Generating provider: ".concat(label, "\n")));
                if (options.dryRun) {
                    console.log(chalk_1.default.cyan('  (dry-run mode — no files written)'));
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, (0, forge_1.generateProvider)(source)];
            case 2:
                result = _b.sent();
                for (_i = 0, _a = result.files; _i < _a.length; _i++) {
                    f = _a[_i];
                    icon = f.action === 'updated' ? '🔄' : '✅';
                    console.log(chalk_1.default.green("  ".concat(icon, " ").concat(f.path)));
                }
                console.log(chalk_1.default.green('\n✨ Provider scaffolded!\n'));
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                console.error(chalk_1.default.red("\n\u274C Failed: ".concat(error_1)));
                process.exit(1);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
