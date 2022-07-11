export interface Options {
    concurrency: number;
}
export declare class AsyncArray<T> extends Array<T> {
    private options;
    private static defaultOptions;
    constructor(options?: Options);
    static fromWithOptions<T>(iterable: Iterable<T> | ArrayLike<T>, options?: {
        concurrency: number;
    }): AsyncArray<T>;
    static from<T>(iterable: Iterable<T> | ArrayLike<T>): AsyncArray<T>;
    static of<T>(...iterable: Array<T>): AsyncArray<T>;
    mapAsync<U>(callbackfn: (value: T, index: number) => (U | Promise<U>)): Promise<U[]>;
    forEachAsync(callbackfn: (value: T, index: number) => (any | Promise<any>)): Promise<void>;
    filterAsync(callbackfn: (value: T, index: number) => (boolean | Promise<boolean>)): Promise<T[]>;
    everyAsync(callbackfn: (value: T, index: number) => (boolean | Promise<boolean>)): Promise<boolean>;
    someAsync(callbackfn: (value: T, index: number) => (boolean | Promise<boolean>)): Promise<boolean>;
    reduceAsync(callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => (T | Promise<T>)): Promise<T>;
}
