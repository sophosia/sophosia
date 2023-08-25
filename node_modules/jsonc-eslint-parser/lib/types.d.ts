import type { AST } from "eslint";
import type { Comment as ESTreeComment } from "estree";
export interface RuleListener {
    [key: string]: (node: never) => void;
}
export declare type Token = AST.Token;
export declare type Comment = ESTreeComment;
export declare type JSONSyntax = "JSON" | "JSONC" | "JSON5" | null;
export interface ParserOptions {
    jsonSyntax?: JSONSyntax;
}
