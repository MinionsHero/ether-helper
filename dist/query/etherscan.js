"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const axios_1 = __importDefault(require("axios"));
const fs_array_data_1 = require("../helpers/fs-array-data");
const parallel_task_1 = require("../helpers/parallel-task");
const qs_1 = __importDefault(require("qs"));
class Query {
    constructor(output, apiKey) {
        this.output = output;
        this.apiKey = apiKey;
        this.contractDir = path_1.default.resolve(output, './contracts');
    }
    get(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield axios_1.default.get(url, { responseType: 'json' });
            if (data.status === 200 || data.status === 301) {
                if (data.data.status === '1') {
                    return data.data.result;
                }
                throw data.data;
            }
            throw new Error(data.statusText);
        });
    }
    static writeFile(targetDir, filename, data) {
        fs_extra_1.default.ensureDirSync(targetDir);
        const file = path_1.default.resolve(targetDir, filename);
        filename.endsWith('json') ? fs_extra_1.default.writeJsonSync(file, data) : fs_extra_1.default.writeFileSync(file, data);
        return data;
    }
    static readFile(targetDir, filename, fill) {
        const file = path_1.default.resolve(targetDir, filename);
        if (fs_extra_1.default.existsSync(file)) {
            return (filename.endsWith('json') ? fs_extra_1.default.readJsonSync(file) : fs_extra_1.default.readFileSync(file));
        }
        return fill;
    }
    _queryContract(provider, address) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Query.map[address]) {
                return Query.map[address];
            }
            const filename = `${address}.json`;
            const file = Query.readFile(this.contractDir, filename, null);
            if (file) {
                Query.map[address] = file;
                return file;
            }
            const sourceCodes = yield this.get(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${process.env.API_KEY} `);
            const configs = [];
            for (const code of sourceCodes) {
                let implemention = code.Implementation;
                if (!implemention) {
                    const slot = yield provider.getStorageAt(address, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
                    const implementionSlot = ethers_1.ethers.utils.hexStripZeros(slot);
                    if (implementionSlot !== '0x') {
                        implemention = implementionSlot;
                    }
                }
                // implemention === address 会出现循环请求
                let impl = null;
                if (implemention && ethers_1.ethers.utils.isAddress(implemention) && ethers_1.ethers.utils.getAddress(implemention).toLowerCase() !== ethers_1.ethers.utils.getAddress(address).toLowerCase()) {
                    impl = yield this._queryContract(provider, implemention);
                }
                try {
                    const abi = JSON.parse(code.ABI);
                    let sourcecode = code.SourceCode;
                    let temp = sourcecode.trim();
                    if (temp.startsWith('{{') && temp.endsWith('}}')) {
                        temp = temp.slice(1, -1);
                        try {
                            const sourceConfig = JSON.parse(temp);
                            sourcecode = Object.keys(sourceConfig.sources).reduce((prev, cur) => {
                                const val = sourceConfig.sources[cur];
                                if (val.content) {
                                    return `${prev}${'//  ' + cur}\r\n${val.content}\r\n`;
                                }
                                return prev;
                            }, '');
                            debugger;
                        }
                        catch (e) {
                            console.log(e);
                        }
                    }
                    const bytecode = yield provider.getCode(address);
                    configs.push({ address, abi, sourcecode, bytecode, implementation: impl });
                }
                catch (e) {
                    console.error(e, address);
                }
            }
            Query.writeFile(this.contractDir, filename, configs);
            return configs;
        });
    }
    queryContract(provider, address) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Query.map[address]) {
                return Query.map[address];
            }
            return Query.map[address] = yield this._queryContract(provider, address);
        });
    }
    queryTxsData(address, startblock, endblock, dir, getTxs) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileTool = new fs_array_data_1.FsArrayData(dir, { offset: 10000 });
            const lastPageData = fileTool.readLastPageData();
            const lastHash = lastPageData && lastPageData.length > 0 ? lastPageData[lastPageData.length - 1].hash : null;
            const fromBlock = lastPageData && lastPageData.length > 0 ? Number(lastPageData[lastPageData.length - 1].blockNumber) : startblock;
            let page = 1;
            const offset = 50;
            let data, isEOL = false;
            do {
                data = yield getTxs(address, fromBlock, endblock, page, offset);
                isEOL = data.length < offset;
                debugger;
                if (page === 1 && lastHash) {
                    const index = data.findIndex(el => el.hash === lastHash);
                    if (index > -1) {
                        data = data.slice(index + 1);
                    }
                }
                if (data && data.length > 0) {
                    // @ts-ignore getLogs
                    if (data[0].transactionHash && !data[0].hash) {
                        fileTool.append(data.map(el => {
                            // @ts-ignore getLogs
                            const hash = el.transactionHash;
                            // @ts-ignore getLogs
                            delete el.transactionHash;
                            // @ts-ignore getLogs
                            return Object.assign({ hash }, el);
                        }));
                    }
                    else {
                        fileTool.append(data);
                    }
                }
                page++;
                // Result window is too large, PageNo x Offset size must be less than or equal to 10000
                if (page * offset >= 10000) {
                    const lastPageData = fileTool.readLastPageData();
                    const fromBlock = lastPageData && lastPageData.length > 0 ? Number(lastPageData[lastPageData.length - 1].blockNumber) : startblock;
                    yield this.queryTxsData(address, fromBlock, endblock, dir, getTxs);
                    isEOL = true;
                }
            } while (!isEOL);
            return fileTool.read();
        });
    }
    // only reture the basic internal txs, not advanced txs(without ehter value)
    queryInternalTxs(address, startblock, endblock) {
        return __awaiter(this, void 0, void 0, function* () {
            const dir = path_1.default.resolve(path_1.default.resolve(this.output, './txlistinternal'), `${address}-${startblock || 1}-${endblock || 'latest'}`);
            return yield this.queryTxsData(address, startblock || 1, endblock || 'latest', dir, (address, startblock, endblock, page, offset) => __awaiter(this, void 0, void 0, function* () {
                return (0, parallel_task_1.retry)(`http://api.etherscan.io/api?module=account&action=txlistinternal&address=${address}&startblock=${startblock}&endblock=${endblock}&page=${page}&offset=${offset}&sort=asc&apikey=${this.apiKey}`, (url) => __awaiter(this, void 0, void 0, function* () {
                    console.log(`Request ${url}`);
                    try {
                        return yield this.get(url);
                    }
                    catch (e) {
                        debugger;
                        const err = e;
                        if (err.message === 'No transactions found') {
                            return [];
                        }
                        throw new Error(err.message);
                    }
                }));
            }));
        });
    }
    queryTxs(address, startblock, endblock) {
        return __awaiter(this, void 0, void 0, function* () {
            const dir = path_1.default.resolve(path_1.default.resolve(this.output, './txlist'), `${address}-${startblock || 1}-${endblock || 'latest'}`);
            return yield this.queryTxsData(address, startblock || 1, endblock || 'latest', dir, (address, startblock, endblock, page, offset) => __awaiter(this, void 0, void 0, function* () {
                return (0, parallel_task_1.retry)(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=${startblock}&endblock=${endblock}&page=${page}&offset=${offset}&sort=asc&apikey=${this.apiKey}`, (url) => __awaiter(this, void 0, void 0, function* () {
                    console.log(`Request ${url}`);
                    try {
                        return yield this.get(url);
                    }
                    catch (e) {
                        debugger;
                        const err = e;
                        if (err.message === 'No transactions found') {
                            return [];
                        }
                        throw new Error(err.message);
                    }
                }));
            }));
        });
    }
    queryLogs(address, startblock, endblock, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const querystring = params ? qs_1.default.stringify(params) : '';
            let savePath = `${address}-${startblock || 1}-${endblock || 'latest'}` + (querystring ? `-${querystring}` : '');
            const dir = path_1.default.resolve(path_1.default.resolve(this.output, './getLogs'), savePath);
            return yield this.queryTxsData(address, startblock || 1, endblock || 'latest', dir, (address, startblock, endblock, page, offset) => __awaiter(this, void 0, void 0, function* () {
                return (0, parallel_task_1.retry)(`https://api.etherscan.io/api?module=logs&action=getLogs&address=${address}&fromBlock=${startblock}&toBlock=${endblock}&page=${page}&offset=${offset}&sort=asc&apikey=${this.apiKey}` + (querystring ? `&${querystring}` : ''), (url) => __awaiter(this, void 0, void 0, function* () {
                    console.log(`Request ${url}`);
                    try {
                        return yield this.get(url);
                    }
                    catch (e) {
                        debugger;
                        const err = e;
                        if (err.message === 'No transactions found' || err.message === 'No records found') {
                            return [];
                        }
                        throw new Error(err.message);
                    }
                }));
            }));
        });
    }
}
exports.default = Query;
Query.map = {};
//# sourceMappingURL=etherscan.js.map