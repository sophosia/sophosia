export interface ESPree {
    latestEcmaVersion?: number;
    version: string;
}
export declare function getEspree(): ESPree;
declare type NewestKind = "cwd" | "linter" | "self";
export declare function getNewestEspreeKind(): NewestKind;
export {};
