import type { Node } from "estree";
import type { AST } from "eslint";
import type { JSONNode, JSONProgram } from "./ast";
import type { TokenStore } from "./token-store";
import type { Token as AcornToken } from "acorn";
export declare type JSONSyntaxContext = {
    trailingCommas: boolean;
    comments: boolean;
    plusSigns: boolean;
    spacedSigns: boolean;
    leadingOrTrailingDecimalPoints: boolean;
    infinities: boolean;
    nans: boolean;
    numericSeparators: boolean;
    binaryNumericLiterals: boolean;
    octalNumericLiterals: boolean;
    legacyOctalNumericLiterals: boolean;
    invalidJsonNumbers: boolean;
    multilineStrings: boolean;
    unquoteProperties: boolean;
    singleQuotes: boolean;
    numberProperties: boolean;
    undefinedKeywords: boolean;
    sparseArrays: boolean;
    regExpLiterals: boolean;
    templateLiterals: boolean;
    bigintLiterals: boolean;
    unicodeCodepointEscapes: boolean;
    escapeSequenceInIdentifier: boolean;
};
export declare class TokenConvertor {
    private readonly code;
    private readonly templateBuffer;
    private readonly tokTypes;
    constructor(code: string);
    convertToken(token: AcornToken): AST.Token | null;
}
export declare function convertProgramNode(node: Node | JSONNode, tokens: TokenStore, ctx: JSONSyntaxContext, code: string): JSONProgram;
