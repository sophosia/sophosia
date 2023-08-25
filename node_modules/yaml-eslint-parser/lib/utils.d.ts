import type { YAMLProgram, YAMLContent, YAMLDocument, YAMLMapping, YAMLSequence, YAMLScalar, YAMLAlias, YAMLPair, YAMLWithMeta } from "./ast";
declare type YAMLContentValue = string | number | boolean | null | YAMLContentValue[] | YAMLMappingValue;
declare type YAMLMappingValue = {
    [key: string]: YAMLContentValue;
    [key: number]: YAMLContentValue;
};
export declare function getStaticYAMLValue(node: YAMLMapping | YAMLPair): YAMLMappingValue;
export declare function getStaticYAMLValue(node: YAMLSequence): YAMLContentValue[];
export declare function getStaticYAMLValue(node: YAMLScalar): string | number | boolean | null;
export declare function getStaticYAMLValue(node: YAMLAlias | YAMLProgram | YAMLDocument | YAMLContent | YAMLPair | YAMLWithMeta): YAMLContentValue;
export {};
