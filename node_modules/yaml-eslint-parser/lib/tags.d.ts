export declare type TagResolver<T> = {
    tag: string;
    test: (str: string) => boolean;
    resolve: (str: string) => T;
};
export declare const NULL: TagResolver<null>;
export declare const TRUE: TagResolver<true>;
export declare const FALSE: TagResolver<false>;
export declare const INT: TagResolver<number>;
export declare const INT_BASE8: TagResolver<number>;
export declare const INT_BASE16: TagResolver<number>;
export declare const FLOAT: TagResolver<number>;
export declare const INFINITY: TagResolver<number>;
export declare const NAN: TagResolver<number>;
export declare const STR: TagResolver<string>;
export declare const tagResolvers: (TagResolver<null> | TagResolver<true> | TagResolver<false> | TagResolver<number> | TagResolver<string>)[];
