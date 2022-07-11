import { ethers } from 'ethers'
import path from 'path'
import fs from 'fs-extra'
import { JsonFragment } from '@ethersproject/abi'
import { JsonRpcProvider } from '@ethersproject/providers'
import axios from 'axios'
import { FsArrayData as FileTool } from '../helpers/fs-array-data'
import { retry } from '../helpers/parallel-task'
import qs from 'qs'
import { Transaction, InternalTransaction, ContractConfig } from './etherscan-types'


export default class Query {
    private contractDir: string
    public static map: Record<string, ContractConfig[]> = {}
    private apiKey: string
    private output: string

    constructor(output: string, apiKey: string) {
        this.output = output
        this.apiKey = apiKey
        this.contractDir = path.resolve(output, './contracts')
    }

    private async get<T>(url: string) {
        const data = await axios.get<{ status: string, result: T, message: string }>(url, { responseType: 'json' })
        if (data.status === 200 || data.status === 301) {
            if (data.data.status === '1') {
                return data.data.result
            }
            throw data.data
        }
        throw new Error(data.statusText)
    }

    public static writeFile<T>(targetDir: string, filename: string, data: T) {
        fs.ensureDirSync(targetDir)
        const file = path.resolve(targetDir, filename)
        filename.endsWith('json') ? fs.writeJsonSync(file, data) : fs.writeFileSync(file, data as any as string)
        return data
    }

    public static readFile<T>(targetDir: string, filename: string, fill: T) {
        const file = path.resolve(targetDir, filename)
        if (fs.existsSync(file)) {
            return (filename.endsWith('json') ? fs.readJsonSync(file) : fs.readFileSync(file)) as T
        }
        return fill
    }

    private async _queryContract(provider: JsonRpcProvider, address: string): Promise<ContractConfig[]> {
        if (Query.map[address]) {
            return Query.map[address]
        }
        const filename = `${address}.json`
        const file = Query.readFile<ContractConfig[] | null>(this.contractDir, filename, null)
        if (file) {
            Query.map[address] = file
            return file
        }
        const sourceCodes = await this.get<{ Implementation: string, SourceCode: string, ABI: string }[]>(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${process.env.API_KEY} `);
        const configs: ContractConfig[] = []
        for (const code of sourceCodes) {
            let implemention = code.Implementation
            if (!implemention) {
                const slot = await provider.getStorageAt(address, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc')
                const implementionSlot = ethers.utils.hexStripZeros(slot)
                if (implementionSlot !== '0x') {
                    implemention = implementionSlot
                }
            }
            // implemention === address 会出现循环请求
            let impl: ContractConfig[] | null = null
            if (implemention && ethers.utils.isAddress(implemention) && ethers.utils.getAddress(implemention).toLowerCase() !== ethers.utils.getAddress(address).toLowerCase()) {
                impl = await this._queryContract(provider, implemention)
            }
            try {
                const abi: JsonFragment[] = JSON.parse(code.ABI)
                let sourcecode = code.SourceCode
                let temp = sourcecode.trim()
                if (temp.startsWith('{{') && temp.endsWith('}}')) {
                    temp = temp.slice(1, -1)
                    try {
                        const sourceConfig = JSON.parse(temp);
                        sourcecode = Object.keys(sourceConfig.sources).reduce((prev, cur) => {
                            const val = sourceConfig.sources[cur]
                            if (val.content) {
                                return `${prev}${'//  ' + cur}\r\n${val.content}\r\n`
                            }
                            return prev
                        }, '')
                        debugger
                    } catch (e) {
                        console.log(e)
                    }
                }
                const bytecode = await provider.getCode(address)
                configs.push({ address, abi, sourcecode, bytecode, implementation: impl })
            } catch (e) {
                console.error(e, address)
            }
        }
        Query.writeFile(this.contractDir, filename, configs)
        return configs
    }

    async queryContract(provider: JsonRpcProvider, address: string): Promise<ContractConfig[]> {
        if (Query.map[address]) {
            return Query.map[address]
        }
        return Query.map[address] = await this._queryContract(provider, address)
    }

    private async queryTxsData<T extends { blockNumber: string, hash: string }>(address: string, startblock: number, endblock: number | 'latest', dir: string, getTxs: (address: string, fromBlock: number, endblock: number | 'latest', page: number, offset: number) => Promise<T[]>) {
        const fileTool = new FileTool<T>(dir, { offset: 10000 })
        const lastPageData = fileTool.readLastPageData();
        const lastHash = lastPageData && lastPageData.length > 0 ? lastPageData[lastPageData.length - 1].hash : null
        const fromBlock = lastPageData && lastPageData.length > 0 ? Number(lastPageData[lastPageData.length - 1].blockNumber) : startblock
        let page = 1
        const offset = 50
        let data: T[], isEOL = false
        do {
            data = await getTxs(address, fromBlock, endblock, page, offset)
            isEOL = data.length < offset
            debugger
            if (page === 1 && lastHash) {
                const index = data.findIndex(el => el.hash === lastHash)
                if (index > -1) {
                    data = data.slice(index + 1)
                }
            }
            if (data && data.length > 0) {
                // @ts-ignore getLogs
                if (data[0].transactionHash && !data[0].hash) {
                    fileTool.append(data.map(el => {
                        // @ts-ignore getLogs
                        const hash = el.transactionHash
                        // @ts-ignore getLogs
                        delete el.transactionHash
                        // @ts-ignore getLogs
                        return { hash, ...el }
                    }))
                } else {
                    fileTool.append(data)
                }
            }
            page++
            // Result window is too large, PageNo x Offset size must be less than or equal to 10000
            if (page * offset >= 10000) {
                const lastPageData = fileTool.readLastPageData();
                const fromBlock = lastPageData && lastPageData.length > 0 ? Number(lastPageData[lastPageData.length - 1].blockNumber) : startblock
                await this.queryTxsData(address, fromBlock, endblock, dir, getTxs)
                isEOL = true
            }
        } while (!isEOL)
        return fileTool.read()
    }

    // only reture the basic internal txs, not advanced txs(without ehter value)
    async queryInternalTxs(address: string, startblock?: number, endblock?: number | 'latest') {
        const dir = path.resolve(path.resolve(this.output, './txlistinternal'), `${address}-${startblock || 1}-${endblock || 'latest'}`)
        return await this.queryTxsData<InternalTransaction>(address, startblock || 1, endblock || 'latest', dir, async (address: string, startblock: number, endblock: number | 'latest', page: number, offset: number) => {
            return retry(
                `http://api.etherscan.io/api?module=account&action=txlistinternal&address=${address}&startblock=${startblock}&endblock=${endblock}&page=${page}&offset=${offset}&sort=asc&apikey=${this.apiKey}`,
                async (url) => {
                    console.log(`Request ${url}`);
                    try {
                        return await this.get<InternalTransaction[]>(url)
                    } catch (e) {
                        debugger
                        const err = e as { status: string, result: [], message: string }
                        if (err.message === 'No transactions found') {
                            return []
                        }
                        throw new Error(err.message)
                    }
                })
        })
    }

    async queryTxs(address: string, startblock?: number, endblock?: number | 'latest') {
        const dir = path.resolve(path.resolve(this.output, './txlist'), `${address}-${startblock || 1}-${endblock || 'latest'}`)
        return await this.queryTxsData<Transaction>(address, startblock || 1, endblock || 'latest', dir, async (address: string, startblock: number, endblock: number | 'latest', page: number, offset: number) => {
            return retry(
                `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=${startblock}&endblock=${endblock}&page=${page}&offset=${offset}&sort=asc&apikey=${this.apiKey}`,
                async (url) => {
                    console.log(`Request ${url}`);
                    try {
                        return await this.get<Transaction[]>(url)
                    } catch (e) {
                        debugger
                        const err = e as { status: string, result: [], message: string }
                        if (err.message === 'No transactions found') {
                            return []
                        }
                        throw new Error(err.message)
                    }
                })
        })
    }

    async queryLogs(address: string, startblock?: number, endblock?: number | 'latest', params?: {}) {
        const querystring = params ? qs.stringify(params) : ''
        let savePath = `${address}-${startblock || 1}-${endblock || 'latest'}` + (querystring ? `-${querystring}` : '')
        const dir = path.resolve(path.resolve(this.output, './getLogs'), savePath)
        return await this.queryTxsData<Transaction>(address, startblock || 1, endblock || 'latest', dir, async (address: string, startblock: number, endblock: number | 'latest', page: number, offset: number) => {
            return retry(
                `https://api.etherscan.io/api?module=logs&action=getLogs&address=${address}&fromBlock=${startblock}&toBlock=${endblock}&page=${page}&offset=${offset}&sort=asc&apikey=${this.apiKey}` + (querystring ? `&${querystring}` : ''),
                async (url) => {
                    console.log(`Request ${url}`);
                    try {
                        return await this.get<Transaction[]>(url)
                    } catch (e) {
                        debugger
                        const err = e as { status: string, result: [], message: string }
                        if (err.message === 'No transactions found' || err.message === 'No records found') {
                            return []
                        }
                        throw new Error(err.message)
                    }
                })
        })
    }
}