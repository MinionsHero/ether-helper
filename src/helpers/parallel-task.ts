import { chunk, flatten } from 'lodash'
import { AsyncArray } from './async-array'
import delay from 'delay'

async function _retry<T, U>(el: T, request: (el: T) => Promise<U>, onAttempt?: (e: any, times: number) => PromiseLike<boolean>, times: number = 0, errors: any[] = []): Promise<U> {
    try {
        return await request(el)
    } catch (e) {
        errors.push(e)
        times++
        let continueAttempt = true
        if (onAttempt) {
            continueAttempt = await onAttempt(e, times)
        }
        if (continueAttempt) {
            return await _retry(el, request, onAttempt, times, errors)
        }
        throw errors
    }
}

export async function retry<T, U>(el: T, request: (el: T) => Promise<U>, onAttempt?: (e: any, times: number) => PromiseLike<boolean>): Promise<U> {
    return await _retry(el, request, onAttempt, 0, []);
}

async function poll<T, U>(chunk: T[], feedAmount: number, request: (el: T) => Promise<U>, _result?: ({ data: U | null } | null)[], _retries?: number[]): Promise<U[]> {
    const result = _result ? _result : new Array<{ data: U | null } | null>(chunk.length).fill(null)
    const retries = _retries ? _retries : new Array<number>(chunk.length).fill(1)
    if (result.length !== chunk.length || retries.length !== chunk.length) {
        throw new Error('result.length should be equal to chunk.')
    }
    if (result.every(el => el !== null)) {
        return result.map(el => (el as { data: U }).data)
    }
    AsyncArray.fromWithOptions(chunk, { concurrency: feedAmount }).forEachAsync(async (el, i) => {
        if (!result[i]) {
            const data: U = await retry<T, U>(el, request, async (e, times) => {
                retries[i] = times
                await delay(200)
                return true
            })
            result[i] = { data }
        }
    })
    return await poll(chunk, feedAmount, request, result, retries)
}


export async function sliceTask<T, U>(feedData: T[], chunks: number, request: (el: T) => Promise<U>, saveData?: (data: U[], chunk: T[]) => PromiseLike<void>): Promise<U[]> {
    const dataChunks = chunk(feedData, chunks)
    const result: U[][] = await AsyncArray.fromWithOptions(dataChunks, { concurrency: 1 }).mapAsync(async chunk => {
        const data = await poll(chunk, chunks, request)
        if (saveData) {
            await saveData(data, chunk)
        }
        return data
    })
    return flatten(result)
}