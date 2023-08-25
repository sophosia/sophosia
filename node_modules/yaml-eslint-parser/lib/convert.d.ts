import type { YAMLProgram } from "./ast";
import type { ASTDocument } from "./yaml";
import type { Context } from "./context";
/**
 * Convert yaml root to YAMLProgram
 */
export declare function convertRoot(documents: ASTDocument[], ctx: Context): YAMLProgram;
