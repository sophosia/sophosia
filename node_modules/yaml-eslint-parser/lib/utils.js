"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaticYAMLValue = void 0;
const yaml_1 = require("yaml");
const tags_1 = require("./tags");
/**
 * Gets the static value for the given node.
 */
function getStaticYAMLValue(node) {
    return resolver[node.type](node);
}
exports.getStaticYAMLValue = getStaticYAMLValue;
const resolver = {
    Program(node) {
        return node.body.length === 0
            ? null
            : node.body.length === 1
                ? // eslint-disable-next-line new-cap -- traverse key
                    resolver.YAMLDocument(node.body[0])
                : // eslint-disable-next-line new-cap -- traverse key
                    node.body.map((n) => resolver.YAMLDocument(n));
    },
    YAMLDocument(node) {
        return node.content ? getStaticYAMLValue(node.content) : null;
    },
    YAMLMapping(node) {
        const result = {};
        for (const pair of node.pairs) {
            Object.assign(result, getStaticYAMLValue(pair));
        }
        return result;
    },
    YAMLPair(node) {
        const result = {};
        let key = node.key ? getStaticYAMLValue(node.key) : null;
        if (typeof key !== "string" && typeof key !== "number") {
            key = String(key);
        }
        result[key] = node.value ? getStaticYAMLValue(node.value) : null;
        return result;
    },
    YAMLSequence(node) {
        const result = [];
        for (const entry of node.entries) {
            result.push(entry ? getStaticYAMLValue(entry) : null);
        }
        return result;
    },
    YAMLScalar(node) {
        return node.value;
    },
    YAMLAlias(node) {
        const anchor = findAnchor(node);
        return anchor ? getStaticYAMLValue(anchor.parent) : null;
    },
    YAMLWithMeta(node) {
        if (node.tag) {
            if (node.value == null) {
                return getTaggedValue(node.tag, "", "");
            }
            if (node.value.type === "YAMLScalar") {
                if (node.value.style === "plain") {
                    return getTaggedValue(node.tag, node.value.strValue, node.value.strValue);
                }
                if (node.value.style === "double-quoted" ||
                    node.value.style === "single-quoted") {
                    return getTaggedValue(node.tag, node.value.raw, node.value.strValue);
                }
            }
        }
        if (node.value == null) {
            return null;
        }
        return getStaticYAMLValue(node.value);
    },
};
/**
 * Find Anchor
 */
function findAnchor(node) {
    let p = node.parent;
    let doc = null;
    while (p) {
        if (p.type === "YAMLDocument") {
            doc = p;
            break;
        }
        p = p.parent;
    }
    const anchors = doc.anchors[node.name];
    if (!anchors) {
        return null;
    }
    let target = {
        anchor: null,
        distance: Infinity,
    };
    for (const anchor of anchors) {
        if (anchor.range[0] < node.range[0]) {
            const distance = node.range[0] - anchor.range[0];
            if (target.distance >= distance) {
                target = {
                    anchor,
                    distance,
                };
            }
        }
    }
    return target.anchor;
}
/**
 * Get tagged value
 */
function getTaggedValue(tag, text, str) {
    for (const tagResolver of tags_1.tagResolvers) {
        if (tagResolver.tag === tag.tag && tagResolver.test(str)) {
            return tagResolver.resolve(str);
        }
    }
    const tagText = tag.tag.startsWith("!") ? tag.tag : `!<${tag.tag}>`;
    const value = yaml_1.parseDocument(`${tagText} ${text}`).toJSON();
    return value;
}
