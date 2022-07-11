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
exports.AsyncArray = void 0;
const p_filter_1 = __importDefault(require("p-filter"));
const p_map_1 = __importDefault(require("p-map"));
const p_every_1 = __importDefault(require("p-every"));
const p_one_1 = __importDefault(require("p-one"));
const p_reduce_1 = __importDefault(require("p-reduce"));
class AsyncArray extends Array {
    constructor(options) {
        super();
        this.options = Object.assign({}, options, AsyncArray.defaultOptions);
    }
    static fromWithOptions(iterable, options) {
        const elements = Array.from(iterable);
        let arr = new AsyncArray(options);
        for (let i = 0; i < elements.length; i++) {
            arr.push(elements[i]);
        }
        return arr;
    }
    static from(iterable) {
        return this.fromWithOptions(iterable);
    }
    static of(...iterable) {
        return AsyncArray.from(iterable);
    }
    mapAsync(callbackfn) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield (0, p_map_1.default)(this, callbackfn, this.options);
            return AsyncArray.from(r);
        });
    }
    forEachAsync(callbackfn) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.mapAsync(callbackfn);
        });
    }
    filterAsync(callbackfn) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield (0, p_filter_1.default)(this, callbackfn, this.options);
            return AsyncArray.from(r);
        });
    }
    everyAsync(callbackfn) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, p_every_1.default)(this, callbackfn, this.options);
        });
    }
    someAsync(callbackfn) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, p_one_1.default)(this, callbackfn, this.options);
        });
    }
    reduceAsync(callbackfn) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, p_reduce_1.default)(this, callbackfn);
        });
    }
}
exports.AsyncArray = AsyncArray;
AsyncArray.defaultOptions = { concurrency: 1 };
//# sourceMappingURL=async-array.js.map