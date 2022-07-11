export interface Options {
    offset?: number;
}
export declare class FsArrayData<T> {
    private offset;
    private filename;
    constructor(filename: string, options?: Options);
    private get files();
    private get filenames();
    private get lastPageNumber();
    private get firstPageNumber();
    private readFile;
    private writeFile;
    private fileExists;
    readLastPageData(): T[] | null;
    read(): () => T[] | null;
    private appendInternal;
    append(data: T[]): void;
}
