"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsArrayData = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class FsArrayData {
    constructor(filename, options) {
        const o = Object.assign({}, options, {
            offset: 10000
        });
        this.filename = filename;
        this.offset = o.offset;
    }
    get files() {
        if (fs_extra_1.default.existsSync(this.filename)) {
            const dirFs = fs_extra_1.default.readdirSync(this.filename);
            return dirFs;
        }
        return [];
    }
    get filenames() {
        const files = this.files;
        const filenames = files.map(el => el.replace('.json', '')).map(el => Number(el));
        if (!filenames.every(el => !Number.isNaN(el))) {
            throw new Error('parse error!');
        }
        return filenames;
    }
    get lastPageNumber() {
        const filenames = this.filenames;
        const lastPageNumber = filenames.length > 0 ? Math.max(...filenames) : 0;
        return lastPageNumber;
    }
    get firstPageNumber() {
        const filenames = this.filenames;
        const firstPageNumber = filenames.length > 0 ? Math.min(...filenames) : 0;
        return firstPageNumber;
    }
    readFile(i) {
        const filePath = path_1.default.resolve(this.filename, `${i}.json`);
        const data = fs_extra_1.default.readJsonSync(filePath);
        return Array.isArray(data) ? data : [];
    }
    writeFile(i, data) {
        fs_extra_1.default.ensureDirSync(this.filename);
        const filePath = path_1.default.resolve(this.filename, `${i}.json`);
        fs_extra_1.default.writeJsonSync(filePath, data);
    }
    fileExists(i) {
        const filePath = path_1.default.resolve(this.filename, `${i}.json`);
        return fs_extra_1.default.existsSync(filePath);
    }
    readLastPageData() {
        if (this.lastPageNumber) {
            return this.readFile(this.lastPageNumber);
        }
        return null;
    }
    read() {
        const firstPageNumber = this.firstPageNumber;
        const lastPageIndex = this.lastPageNumber;
        let index = firstPageNumber;
        return () => {
            if (index === 0 || index > lastPageIndex) {
                return null;
            }
            const file = this.readFile(index);
            index++;
            return file;
        };
    }
    appendInternal(data) {
        if (data.length === 0) {
            return;
        }
        const lastPageNumber = this.lastPageNumber;
        if (this.fileExists(lastPageNumber)) {
            const originalData = this.readFile(lastPageNumber);
            if (originalData.length < this.offset) {
                const diff = this.offset - originalData.length;
                const slice = Math.min(diff, data.length);
                this.writeFile(lastPageNumber, originalData.concat(data.splice(0, slice)));
            }
            else {
                this.writeFile(lastPageNumber + 1, data.splice(0, this.offset));
            }
        }
        else {
            this.writeFile(1, data.splice(0, this.offset));
        }
        this.appendInternal(data);
    }
    append(data) {
        return this.appendInternal([...data]);
    }
}
exports.FsArrayData = FsArrayData;
//# sourceMappingURL=fs-array-data.js.map