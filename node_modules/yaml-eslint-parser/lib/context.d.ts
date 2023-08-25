import type { Comment, Locations, Range, Token, YAMLProgram } from "./ast";
import type { ASTNode } from "./yaml";
declare type CSTRangeData = {
    start: number;
    end: number;
};
export declare class Context {
    readonly code: string;
    readonly tokens: Token[];
    readonly comments: Comment[];
    hasCR: boolean;
    private readonly locs;
    private readonly locsMap;
    private readonly crs;
    constructor(origCode: string);
    remapCR(ast: YAMLProgram): void;
    getLocFromIndex(index: number): {
        line: number;
        column: number;
    };
    /**
     * Get the location information of the given node.
     * @param node The node.
     */
    getConvertLocation(node: {
        range: Range;
    } | ASTNode): Locations;
    /**
     * Get the location information of the given CSTRange.
     * @param node The node.
     */
    getConvertLocationFromCSTRange(range: CSTRangeData | undefined | null): Locations;
    addComment(comment: Comment): void;
    /**
     * Add token to tokens
     */
    addToken(type: Token["type"], range: Range): Token;
}
export {};
