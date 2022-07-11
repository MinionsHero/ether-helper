import fs from 'fs-extra'
import path from 'path'

export interface Options {
    offset?: number
}

export class FsArrayData<T> {

    private offset: number
    private filename: string

    constructor(filename: string, options?: Options) {
        const o = Object.assign({}, options, {
            offset: 10000
        })
        this.filename = filename
        this.offset = o.offset
    }

    private get files() {
        if (fs.existsSync(this.filename)) {
            const dirFs = fs.readdirSync(this.filename)
            return dirFs
        }
        return []
    }

    private get filenames() {
        const files = this.files
        const filenames = files.map(el => el.replace('.json', '')).map(el => Number(el))
        if (!filenames.every(el => !Number.isNaN(el))) {
            throw new Error('parse error!')
        }
        return filenames
    }

    private get lastPageNumber(): number {
        const filenames = this.filenames
        const lastPageNumber = filenames.length > 0 ? Math.max(...filenames) : 0
        return lastPageNumber
    }

    private get firstPageNumber(): number {
        const filenames = this.filenames
        const firstPageNumber = filenames.length > 0 ? Math.min(...filenames) : 0
        return firstPageNumber
    }

    private readFile(i: number) {
        const filePath = path.resolve(this.filename, `${i}.json`)
        const data: T[] = fs.readJsonSync(filePath)
        return Array.isArray(data) ? data : []
    }

    private writeFile(i: number, data: T[]) {
        fs.ensureDirSync(this.filename)
        const filePath = path.resolve(this.filename, `${i}.json`)
        fs.writeJsonSync(filePath, data)
    }

    private fileExists(i: number) {
        const filePath = path.resolve(this.filename, `${i}.json`)
        return fs.existsSync(filePath)
    }

    public readLastPageData() {
        if (this.lastPageNumber) {
            return this.readFile(this.lastPageNumber)
        }
        return null
    }

    public read() {
        const firstPageNumber = this.firstPageNumber
        const lastPageIndex = this.lastPageNumber
        let index = firstPageNumber
        return () => {
            if (index === 0 || index > lastPageIndex) {
                return null
            }
            const file = this.readFile(index)
            index++
            return file
        }
    }

    private appendInternal(data: T[]) {
        if (data.length === 0) {
            return
        }
        const lastPageNumber = this.lastPageNumber
        if (this.fileExists(lastPageNumber)) {
            const originalData: T[] = this.readFile(lastPageNumber)
            if (originalData.length < this.offset) {
                const diff = this.offset - originalData.length
                const slice = Math.min(diff, data.length)
                this.writeFile(lastPageNumber, originalData.concat(data.splice(0, slice)))
            } else {
                this.writeFile(lastPageNumber + 1, data.splice(0, this.offset))
            }
        } else {
            this.writeFile(1, data.splice(0, this.offset))
        }
        this.appendInternal(data)
    }

    public append(data: T[]) {
        return this.appendInternal([...data])
    }
}