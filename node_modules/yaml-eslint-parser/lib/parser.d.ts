import type { SourceCode } from "eslint";
import type { YAMLProgram } from "./ast";
/**
 * Parse source code
 */
export declare function parseForESLint(code: string, _options?: any): {
    ast: YAMLProgram;
    visitorKeys: SourceCode.VisitorKeys;
    services: {
        isYAML: boolean;
    };
};
