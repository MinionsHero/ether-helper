export declare function retry<T, U>(el: T, request: (el: T) => Promise<U>, onAttempt?: (e: any, times: number) => PromiseLike<boolean>): Promise<U>;
export declare function sliceTask<T, U>(feedData: T[], chunks: number, request: (el: T) => Promise<U>, saveData?: (data: U[], chunk: T[]) => PromiseLike<void>): Promise<U[]>;
