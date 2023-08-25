"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
const lodash_1 = __importDefault(require("lodash"));
const traverse_1 = require("./traverse");
class Context {
    constructor(origCode) {
        this.tokens = [];
        this.comments = [];
        this.hasCR = false;
        this.locsMap = new Map();
        const len = origCode.length;
        const lineStartIndices = [0];
        const crs = [];
        let code = "";
        for (let index = 0; index < len;) {
            const c = origCode[index++];
            if (c === "\r") {
                const next = origCode[index++] || "";
                if (next === "\n") {
                    code += next;
                    crs.push(index - 2);
                }
                else {
                    code += `\n${next}`;
                }
                lineStartIndices.push(code.length);
            }
            else {
                code += c;
                if (c === "\n") {
                    lineStartIndices.push(code.length);
                }
            }
        }
        this.code = code;
        this.locs = new LinesAndColumns(lineStartIndices);
        this.hasCR = Boolean(crs.length);
        this.crs = crs;
    }
    remapCR(ast) {
        const cache = {};
        const remapIndex = (index) => {
            let result = cache[index];
            if (result != null) {
                return result;
            }
            result = index;
            for (const cr of this.crs) {
                if (cr < result) {
                    result++;
                }
                else {
                    break;
                }
            }
            return (cache[index] = result);
        };
        // eslint-disable-next-line func-style -- ignore
        const remapRange = (range) => {
            return [remapIndex(range[0]), remapIndex(range[1])];
        };
        traverse_1.traverseNodes(ast, {
            enterNode(node) {
                node.range = remapRange(node.range);
            },
            leaveNode() {
                // ignore
            },
        });
        for (const token of ast.tokens) {
            token.range = remapRange(token.range);
        }
        for (const comment of ast.comments) {
            comment.range = remapRange(comment.range);
        }
    }
    getLocFromIndex(index) {
        let loc = this.locsMap.get(index);
        if (!loc) {
            loc = this.locs.getLocFromIndex(index);
            this.locsMap.set(index, loc);
        }
        return {
            line: loc.line,
            column: loc.column,
        };
    }
    /**
     * Get the location information of the given node.
     * @param node The node.
     */
    getConvertLocation(node) {
        const [start, end] = node.range;
        return {
            range: [start, end],
            loc: {
                start: this.getLocFromIndex(start),
                end: this.getLocFromIndex(end),
            },
        };
    }
    /**
     * Get the location information of the given CSTRange.
     * @param node The node.
     */
    getConvertLocationFromCSTRange(range) {
        return this.getConvertLocation({ range: [range.start, range.end] });
    }
    addComment(comment) {
        this.comments.push(comment);
    }
    /**
     * Add token to tokens
     */
    addToken(type, range) {
        const token = Object.assign({ type, value: this.code.slice(...range) }, this.getConvertLocation({ range }));
        this.tokens.push(token);
        return token;
    }
}
exports.Context = Context;
class LinesAndColumns {
    constructor(lineStartIndices) {
        this.lineStartIndices = lineStartIndices;
    }
    getLocFromIndex(index) {
        const lineNumber = lodash_1.default.sortedLastIndex(this.lineStartIndices, index);
        return {
            line: lineNumber,
            column: index - this.lineStartIndices[lineNumber - 1],
        };
    }
}
