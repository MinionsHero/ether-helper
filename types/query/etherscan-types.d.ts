import { JsonFragment } from '@ethersproject/abi';
export interface Transaction {
    "blockNumber": string;
    "timeStamp": string;
    "hash": string;
    "nonce": string;
    "blockHash": string;
    "transactionIndex": string;
    "from": string;
    "to": string;
    "value": string;
    "gas": string;
    "gasPrice": string;
    "isError": string;
    "txreceipt_status": string;
    "input": string;
    "contractAddress": string;
    "cumulativeGasUsed": string;
    "gasUsed": string;
    "confirmations": string;
    "methodId": string;
    "functionName": string;
}
export interface InternalTransaction {
    "blockNumber": string;
    "timeStamp": string;
    "hash": string;
    "from": string;
    "to": string;
    "value": string;
    "contractAddress": string;
    "input": string;
    "type": string;
    "gas": string;
    "gasUsed": string;
    "traceId": string;
    "isError": string;
    "errCode": string;
}
export interface ContractConfig {
    address: string;
    sourcecode: string;
    abi: JsonFragment[];
    bytecode: string;
    implementation: ContractConfig[] | null;
}
