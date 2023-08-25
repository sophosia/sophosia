"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseForESLint = void 0;
const yaml_1 = require("yaml");
const visitor_keys_1 = require("./visitor-keys");
const convert_1 = require("./convert");
const errors_1 = require("./errors");
const context_1 = require("./context");
/**
 * Parse source code
 */
function parseForESLint(code, _options) {
    try {
        const ctx = new context_1.Context(code);
        const docs = yaml_1.parseAllDocuments(ctx.code, {
            merge: false,
            keepCstNodes: true,
        });
        const ast = convert_1.convertRoot(docs, ctx);
        if (ctx.hasCR) {
            ctx.remapCR(ast);
        }
        return {
            ast,
            visitorKeys: visitor_keys_1.KEYS,
            services: {
                isYAML: true,
            },
        };
    }
    catch (err) {
        if (isYAMLSyntaxError(err)) {
            let message = err.message;
            const atIndex = message.lastIndexOf(" at");
            if (atIndex >= 0) {
                message = message.slice(0, atIndex);
            }
            throw new errors_1.ParseError(message, err.range.start, err.linePos.start.line, err.linePos.start.col - 1);
        }
        if (isYAMLSyntaxErrorForV1(err)) {
            const message = err.message;
            throw new errors_1.ParseError(message, err.source.range.start, err.source.rangeAsLinePos.start.line, err.source.rangeAsLinePos.start.col - 1);
        }
        throw err;
    }
}
exports.parseForESLint = parseForESLint;
/**
 * Type guard for YAMLSyntaxError.
 */
function isYAMLSyntaxError(error) {
    return (error.linePos &&
        typeof error.linePos === "object" &&
        error.linePos.start &&
        typeof error.linePos.start === "object" &&
        typeof error.linePos.start.line === "number" &&
        typeof error.linePos.start.col === "number");
}
/**
 * Type guard for YAMLSyntaxError (yaml@1.10).
 */
function isYAMLSyntaxErrorForV1(error) {
    return (error.source &&
        error.source.rangeAsLinePos &&
        typeof error.source.rangeAsLinePos === "object" &&
        error.source.rangeAsLinePos.start &&
        typeof error.source.rangeAsLinePos.start === "object" &&
        typeof error.source.rangeAsLinePos.start.line === "number" &&
        typeof error.source.rangeAsLinePos.start.col === "number");
}
