"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseYAML = exports.getStaticYAMLValue = exports.traverseNodes = exports.VisitorKeys = exports.parseForESLint = exports.ParseError = void 0;
const parser_1 = require("./parser");
Object.defineProperty(exports, "parseForESLint", { enumerable: true, get: function () { return parser_1.parseForESLint; } });
const traverse_1 = require("./traverse");
Object.defineProperty(exports, "traverseNodes", { enumerable: true, get: function () { return traverse_1.traverseNodes; } });
const utils_1 = require("./utils");
Object.defineProperty(exports, "getStaticYAMLValue", { enumerable: true, get: function () { return utils_1.getStaticYAMLValue; } });
const visitor_keys_1 = require("./visitor-keys");
const errors_1 = require("./errors");
Object.defineProperty(exports, "ParseError", { enumerable: true, get: function () { return errors_1.ParseError; } });
// Keys
// eslint-disable-next-line @typescript-eslint/naming-convention -- ignore
exports.VisitorKeys = visitor_keys_1.KEYS;
/**
 * Parse YAML source code
 */
function parseYAML(code, options) {
    return parser_1.parseForESLint(code, options).ast;
}
exports.parseYAML = parseYAML;
