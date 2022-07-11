import filter from 'p-filter'
import map from 'p-map'
import every from 'p-every'
import one from 'p-one'
import reduce from 'p-reduce'

export interface Options {
    concurrency: number
}

export class AsyncArray<T> extends Array<T>{

    private options: Options | undefined
    private static defaultOptions: Options = { concurrency: 1 }

    constructor(options?: Options) {
        super()
        this.options = Object.assign({}, options, AsyncArray.defaultOptions)
    }

    static fromWithOptions<T>(iterable: Iterable<T> | ArrayLike<T>, options?: { concurrency: number }) {
        const elements = Array.from(iterable)
        let arr = new AsyncArray<T>(options)
        for (let i = 0; i < elements.length; i++) {
            arr.push(elements[i])
        }
        return arr
    }

    static from<T>(iterable: Iterable<T> | ArrayLike<T>) {
        return this.fromWithOptions(iterable)
    }

    static of<T>(...iterable: Array<T>) {
        return AsyncArray.from(iterable)
    }

    async mapAsync<U>(callbackfn: (value: T, index: number) => (U | Promise<U>)): Promise<U[]> {
        const r = await map(this, callbackfn, this.options)
        return AsyncArray.from(r)
    }

    async forEachAsync(callbackfn: (value: T, index: number) => (any | Promise<any>)) {
        await this.mapAsync(callbackfn)
    }

    async filterAsync(callbackfn: (value: T, index: number) => (boolean | Promise<boolean>)): Promise<T[]> {
        const r = await filter<T>(this, callbackfn, this.options)
        return AsyncArray.from(r)
    }

    async everyAsync(callbackfn: (value: T, index: number) => (boolean | Promise<boolean>)): Promise<boolean> {
        return await every<T>(this, callbackfn, this.options)
    }

    async someAsync(callbackfn: (value: T, index: number) => (boolean | Promise<boolean>)): Promise<boolean> {
        return await one<T>(this, callbackfn, this.options)
    }

    async reduceAsync(callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => (T | Promise<T>)) {
        return await reduce<T>(this, callbackfn)
    }
}