import { JsonRpcProvider } from '@ethersproject/providers';
import { Transaction, InternalTransaction, ContractConfig } from './etherscan-types';
export default class Query {
    private contractDir;
    static map: Record<string, ContractConfig[]>;
    private apiKey;
    private output;
    constructor(output: string, apiKey: string);
    private get;
    static writeFile<T>(targetDir: string, filename: string, data: T): T;
    static readFile<T>(targetDir: string, filename: string, fill: T): T;
    private _queryContract;
    queryContract(provider: JsonRpcProvider, address: string): Promise<ContractConfig[]>;
    private queryTxsData;
    queryInternalTxs(address: string, startblock?: number, endblock?: number | 'latest'): Promise<() => InternalTransaction[] | null>;
    queryTxs(address: string, startblock?: number, endblock?: number | 'latest'): Promise<() => Transaction[] | null>;
    queryLogs(address: string, startblock?: number, endblock?: number | 'latest', params?: {}): Promise<() => Transaction[] | null>;
}
