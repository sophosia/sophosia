"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJSON = exports.isUndefinedIdentifier = exports.isNumberIdentifier = exports.isExpression = exports.getStaticJSONValue = exports.traverseNodes = exports.VisitorKeys = exports.parseForESLint = void 0;
const parser_1 = require("./parser/parser");
Object.defineProperty(exports, "parseForESLint", { enumerable: true, get: function () { return parser_1.parseForESLint; } });
const traverse_1 = require("./parser/traverse");
Object.defineProperty(exports, "traverseNodes", { enumerable: true, get: function () { return traverse_1.traverseNodes; } });
const ast_1 = require("./utils/ast");
Object.defineProperty(exports, "getStaticJSONValue", { enumerable: true, get: function () { return ast_1.getStaticJSONValue; } });
Object.defineProperty(exports, "isExpression", { enumerable: true, get: function () { return ast_1.isExpression; } });
Object.defineProperty(exports, "isNumberIdentifier", { enumerable: true, get: function () { return ast_1.isNumberIdentifier; } });
Object.defineProperty(exports, "isUndefinedIdentifier", { enumerable: true, get: function () { return ast_1.isUndefinedIdentifier; } });
const visitor_keys_1 = require("./parser/visitor-keys");
exports.VisitorKeys = (0, visitor_keys_1.getVisitorKeys)();
function parseJSON(code, options) {
    return (0, parser_1.parseForESLint)(code, options).ast;
}
exports.parseJSON = parseJSON;
