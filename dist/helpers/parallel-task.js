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
exports.sliceTask = exports.retry = void 0;
const lodash_1 = require("lodash");
const async_array_1 = require("./async-array");
const delay_1 = __importDefault(require("delay"));
function _retry(el, request, onAttempt, times = 0, errors = []) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield request(el);
        }
        catch (e) {
            errors.push(e);
            times++;
            let continueAttempt = true;
            if (onAttempt) {
                continueAttempt = yield onAttempt(e, times);
            }
            if (continueAttempt) {
                return yield _retry(el, request, onAttempt, times, errors);
            }
            throw errors;
        }
    });
}
function retry(el, request, onAttempt) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield _retry(el, request, onAttempt, 0, []);
    });
}
exports.retry = retry;
function poll(chunk, feedAmount, request, _result, _retries) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = _result ? _result : new Array(chunk.length).fill(null);
        const retries = _retries ? _retries : new Array(chunk.length).fill(1);
        if (result.length !== chunk.length || retries.length !== chunk.length) {
            throw new Error('result.length should be equal to chunk.');
        }
        if (result.every(el => el !== null)) {
            return result.map(el => el.data);
        }
        async_array_1.AsyncArray.fromWithOptions(chunk, { concurrency: feedAmount }).forEachAsync((el, i) => __awaiter(this, void 0, void 0, function* () {
            if (!result[i]) {
                const data = yield retry(el, request, (e, times) => __awaiter(this, void 0, void 0, function* () {
                    retries[i] = times;
                    yield (0, delay_1.default)(200);
                    return true;
                }));
                result[i] = { data };
            }
        }));
        return yield poll(chunk, feedAmount, request, result, retries);
    });
}
function sliceTask(feedData, chunks, request, saveData) {
    return __awaiter(this, void 0, void 0, function* () {
        const dataChunks = (0, lodash_1.chunk)(feedData, chunks);
        const result = yield async_array_1.AsyncArray.fromWithOptions(dataChunks, { concurrency: 1 }).mapAsync((chunk) => __awaiter(this, void 0, void 0, function* () {
            const data = yield poll(chunk, chunks, request);
            if (saveData) {
                yield saveData(data, chunk);
            }
            return data;
        }));
        return (0, lodash_1.flatten)(result);
    });
}
exports.sliceTask = sliceTask;
//# sourceMappingURL=parallel-task.js.map