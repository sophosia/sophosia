"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagResolvers = exports.STR = exports.NAN = exports.INFINITY = exports.FLOAT = exports.INT_BASE16 = exports.INT_BASE8 = exports.INT = exports.FALSE = exports.TRUE = exports.NULL = void 0;
exports.NULL = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:null",
    test(str) {
        return (!str || // empty
            // see https://yaml.org/spec/1.2/spec.html#id2805071
            str === "null" ||
            str === "Null" ||
            str === "NULL" ||
            str === "~");
    },
    resolve() {
        return null;
    },
};
exports.TRUE = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:bool",
    test(str) {
        // see https://yaml.org/spec/1.2/spec.html#id2805071
        return str === "true" || str === "True" || str === "TRUE";
    },
    resolve() {
        return true;
    },
};
exports.FALSE = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:bool",
    test(str) {
        // see https://yaml.org/spec/1.2/spec.html#id2805071
        return str === "false" || str === "False" || str === "FALSE";
    },
    resolve() {
        return false;
    },
};
exports.INT = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:int",
    test(str) {
        // see https://yaml.org/spec/1.2/spec.html#id2805071
        return /^[-+]?[0-9]+$/u.test(str);
    },
    resolve(str) {
        return parseInt(str, 10);
    },
};
exports.INT_BASE8 = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:int",
    test(str) {
        // see https://yaml.org/spec/1.2/spec.html#id2805071
        return /^0o[0-7]+$/u.test(str);
    },
    resolve(str) {
        return parseInt(str.slice(2), 8);
    },
};
exports.INT_BASE16 = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:int",
    test(str) {
        // see https://yaml.org/spec/1.2/spec.html#id2805071
        return /^0x[0-9a-fA-F]+$/u.test(str);
    },
    resolve(str) {
        return parseInt(str.slice(2), 16);
    },
};
exports.FLOAT = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:float",
    test(str) {
        // see https://yaml.org/spec/1.2/spec.html#id2805071
        return /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/u.test(str);
    },
    resolve(str) {
        return parseFloat(str);
    },
};
exports.INFINITY = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:float",
    test(str) {
        // see https://yaml.org/spec/1.2/spec.html#id2805071
        return /^[-+]?(\.inf|\.Inf|\.INF)$/u.test(str);
    },
    resolve(str) {
        return str.startsWith("-") ? -Infinity : Infinity;
    },
};
exports.NAN = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:float",
    test(str) {
        // see https://yaml.org/spec/1.2/spec.html#id2805071
        return str === ".NaN" || str === ".nan" || str === ".NAN";
    },
    resolve() {
        return NaN;
    },
};
exports.STR = {
    // see https://yaml.org/spec/1.2/spec.html#id2803311
    tag: "tag:yaml.org,2002:str",
    test() {
        return true;
    },
    resolve(str) {
        return str;
    },
};
exports.tagResolvers = [
    exports.NULL,
    exports.TRUE,
    exports.FALSE,
    exports.INT,
    exports.INT_BASE8,
    exports.INT_BASE16,
    exports.FLOAT,
    exports.INFINITY,
    exports.NAN,
    exports.STR,
];
