"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExcel = void 0;
const XLSX = require('xlsx');
const path = require('path');
function normalizeHeader(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}
const parseNumberValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }
    const stringValue = String(value).trim().replace(/\s/g, '').replace(/[€]/g, '');
    if (!stringValue) {
        return 0;
    }
    const hasComma = stringValue.includes(',');
    const hasDot = stringValue.includes('.');
    let normalized = stringValue;
    if (hasComma && hasDot) {
        normalized = stringValue.replace(/\./g, '').replace(',', '.');
    }
    else if (hasComma) {
        normalized = stringValue.replace(',', '.');
    }
    const numericValue = Number(normalized);
    return Number.isFinite(numericValue) ? numericValue : 0;
};
const parseExcel = (filePathArg) => {
    const defaultPath = path.resolve(__dirname, '../../../../parser/resources/2026.xlsx');
    const filePath = filePathArg ? path.resolve(filePathArg) : defaultPath;
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    function isTransfer(category) {
        const normalized = category.toLowerCase().trim();
        return normalized.includes('trasferimento') || normalized.includes('transfer');
    }
    let workbook;
    try {
        workbook = XLSX.readFile(filePath);
    }
    catch (err) {
        const msg = err && err.message ? err.message : String(err);
        throw new Error(`Failed to read Excel file ${filePath}: ${msg}`);
    }
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    function parseDateString(v) {
        if (!v && v !== 0)
            return '';
        const s = String(v).trim();
        // try dd/mm/yyyy
        const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) {
            const dd = Number(m[1]);
            const mm = Number(m[2]);
            const yyyy = Number(m[3]);
            const d = new Date(Date.UTC(yyyy, mm - 1, dd));
            return d.toISOString().slice(0, 10);
        }
        // try ISO-ish
        const iso = new Date(s);
        if (!isNaN(iso.getTime()))
            return iso.toISOString().slice(0, 10);
        return s;
    }
    const normalized = rows.map((row) => {
        const norm = {};
        for (const [k, v] of Object.entries(row)) {
            norm[normalizeHeader(k)] = v;
        }
        const data = norm['data'] ?? norm['date'] ?? '';
        const valuta = norm['valuta'] ?? norm['currency'] ?? '';
        const descrizione = norm['descrizione_operazione'] ?? norm['descrizione'] ?? norm['description'] ?? '';
        const uscitaRaw = norm['uscita'] ?? norm['out'] ?? norm['debit'] ?? '';
        const entrataRaw = norm['entrata'] ?? norm['in'] ?? norm['credit'] ?? '';
        const categoria = norm['categoria'] ?? norm['category'] ?? '';
        const uscita = parseNumberValue(uscitaRaw);
        const entrata = parseNumberValue(entrataRaw);
        return {
            original: norm,
            data: parseDateString(data),
            valuta,
            descrizione_operazione: String(descrizione || '').trim(),
            uscita: uscita,
            entrata: entrata,
            categoria: String(categoria || '').trim(),
        };
    });
    // filter out incomplete rows
    const filtered = normalized.filter((r) => {
        // require at least a date and a description
        if (!r.data || r.data === '')
            return false;
        if (!r.descrizione_operazione || r.descrizione_operazione.length < 3)
            return false;
        // require at least one of uscita/entrata to be non-zero
        if ((!r.uscita || Number(r.uscita) === 0) && (!r.entrata || Number(r.entrata) === 0))
            return false;
        // filter out transfer categories
        if (isTransfer(r.categoria))
            return false;
        return true;
    });
    // normalize category fallback
    for (const r of filtered) {
        if (!r.categoria || r.categoria === '')
            r.categoria = 'Altro';
    }
    const spese = filtered
        .filter((r) => r.uscita && Number(r.uscita) !== 0)
        .map(({ original, ...rest }) => rest);
    const entrate = filtered
        .filter((r) => r.entrata && Number(r.entrata) !== 0)
        .map(({ original, ...rest }) => rest);
    // Read aggregated data from Excel (H12+, I12+, J12+)
    const sheet = workbook.Sheets[sheetName];
    const aggregatedSpese = [];
    const aggregatedEntrate = [];
    let row = 12; // Start from row 12 (Excel rows are 1-indexed, but this is for reading)
    while (true) {
        const cellH = sheet[`H${row}`];
        const cellI = sheet[`I${row}`];
        const cellJ = sheet[`J${row}`];
        const category = cellH ? String(cellH.v || '').trim() : '';
        const uscitaVal = cellI ? Number(cellI.v || 0) : 0;
        const entrataVal = cellJ ? Number(cellJ.v || 0) : 0;
        if (!category)
            break; // Stop when category column is empty
        // Skip transfer categories
        if (isTransfer(category)) {
            row++;
            continue;
        }
        if (uscitaVal > 0) {
            aggregatedSpese.push({ label: category, value: uscitaVal });
        }
        if (entrataVal > 0) {
            aggregatedEntrate.push({ label: category, value: entrataVal });
        }
        row++;
    }
    return {
        spese,
        entrate,
        aggregatedSpese,
        aggregatedEntrate,
    };
};
exports.parseExcel = parseExcel;
