"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionsRoutes = transactionsRoutes;
const parserExcel_1 = require("./parserExcel");
const service_1 = require("./service");
const dayjs_1 = __importDefault(require("dayjs"));
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const promises_2 = require("stream/promises");
const child_process_1 = require("child_process");
const runParser = async (targetDir) => {
    const parserScript = path_1.default.resolve(__dirname, '../../../../parser/parser.py');
    const venvPython = path_1.default.resolve(__dirname, '../../../../.venv/bin/python');
    const candidates = [venvPython, process.env.PYTHON, 'python3', 'python'];
    const pythonExecutable = candidates.find((candidate) => {
        if (!candidate)
            return false;
        if (candidate === venvPython)
            return (0, fs_1.existsSync)(candidate);
        return true;
    });
    if (!pythonExecutable) {
        throw new Error('Python interpreter not found.');
    }
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(pythonExecutable, [parserScript], {
            cwd: targetDir,
            env: { ...process.env, PYTHONUNBUFFERED: '1' },
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        child.on('error', (error) => reject(error));
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(stderr.trim() || stdout.trim() || `Parser exited with code ${code}`));
        });
    });
};
async function transactionsRoutes(app) {
    app.post('/upload', async (request, reply) => {
        const data = await request.file();
        if (!data) {
            reply.code(400);
            return { error: 'Nessun file caricato.' };
        }
        const originalName = data.filename ?? 'upload.pdf';
        const safeName = path_1.default.basename(originalName);
        const ext = path_1.default.extname(safeName).toLowerCase();
        if (ext !== '.pdf') {
            reply.code(400);
            return { error: 'Sono accettati solo file PDF.' };
        }
        const targetDir = path_1.default.resolve(__dirname, '../../../../parser/resources');
        await (0, promises_1.mkdir)(targetDir, { recursive: true });
        const targetPath = path_1.default.join(targetDir, safeName);
        await (0, promises_2.pipeline)(data.file, (0, fs_1.createWriteStream)(targetPath));
        try {
            await runParser(path_1.default.resolve(__dirname, '../../../../parser'));
            return {
                ok: true,
                filename: safeName,
                path: targetPath,
                parser: 'executed',
            };
        }
        catch (error) {
            reply.code(500);
            return {
                error: 'Il file è stato salvato ma il parser non ha generato il file Excel.',
                details: error?.message ?? String(error),
            };
        }
    });
    app.get('/data', async (request) => {
        const { period = 'year', date, start_date, end_date } = request.query;
        const { spese, entrate, aggregatedSpese, aggregatedEntrate } = (0, parserExcel_1.parseExcel)();
        let referenceDate;
        let endDateObj;
        // Determine the date range based on period and provided parameters
        if (period === 'day' && date) {
            referenceDate = (0, dayjs_1.default)(date);
        }
        else if (period === 'week' && start_date && end_date) {
            referenceDate = (0, dayjs_1.default)(start_date);
            endDateObj = (0, dayjs_1.default)(end_date);
        }
        else if (period === 'month' && date) {
            referenceDate = (0, dayjs_1.default)(date);
        }
        else if (period === 'year' && date) {
            // date could be just YYYY or YYYY-MM-DD
            // If it's just YYYY, parse it as the first day of that year
            if (date.length === 4) {
                referenceDate = (0, dayjs_1.default)(`${date}-01-01`);
            }
            else {
                referenceDate = (0, dayjs_1.default)(date);
            }
        }
        else {
            // Default: use the earliest date from data
            const allDates = [...spese, ...entrate]
                .map(item => item.data)
                .filter(d => d)
                .sort();
            referenceDate = allDates.length > 0 ? (0, dayjs_1.default)(allDates[0]) : (0, dayjs_1.default)();
        }
        const filteredSpese = (0, service_1.filterByPeriod)(spese, period, referenceDate, endDateObj);
        const filteredEntrate = (0, service_1.filterByPeriod)(entrate, period, referenceDate, endDateObj);
        const dynamicSpese = (0, service_1.aggregateByCategory)(filteredSpese);
        const dynamicEntrate = (0, service_1.aggregateByCategory)(filteredEntrate);
        // For year period, use the aggregated data from Excel file directly
        const finalSpese = period === 'year' ? aggregatedSpese : dynamicSpese;
        const finalEntrate = period === 'year' ? aggregatedEntrate : dynamicEntrate;
        return {
            spese: finalSpese,
            entrate: finalEntrate,
            raw: {
                spese: filteredSpese,
                entrate: filteredEntrate,
            },
        };
    });
}
