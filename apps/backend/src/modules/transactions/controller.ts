import { FastifyInstance } from 'fastify';
import { parseExcel } from './parserExcel';
import { aggregateByCategory, filterByPeriod } from './service';
import dayjs from 'dayjs';
import { createWriteStream, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';

const runParser = async (targetDir: string) => {
  const parserScript = path.resolve(__dirname, '../../../../parser/parser.py');
  const venvPython = path.resolve(__dirname, '../../../../.venv/bin/python');
  const candidates = [venvPython, process.env.PYTHON, 'python3', 'python'];

  const pythonExecutable = candidates.find((candidate) => {
    if (!candidate) return false;
    if (candidate === venvPython) return existsSync(candidate);
    return true;
  });

  if (!pythonExecutable) {
    throw new Error('Python interpreter not found.');
  }

  return new Promise<void>((resolve, reject) => {
    const child = spawn(pythonExecutable, [parserScript], {
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

export async function transactionsRoutes(app: FastifyInstance) {

  app.post('/upload', async (request: any, reply: any) => {
    const data = await request.file();

    if (!data) {
      reply.code(400);
      return { error: 'Nessun file caricato.' };
    }

    const originalName = data.filename ?? 'upload.pdf';
    const safeName = path.basename(originalName);
    const ext = path.extname(safeName).toLowerCase();

    if (ext !== '.pdf') {
      reply.code(400);
      return { error: 'Sono accettati solo file PDF.' };
    }

    const targetDir = path.resolve(__dirname, '../../../../parser/resources');
    await mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, safeName);
    await pipeline(data.file, createWriteStream(targetPath));

    try {
      await runParser(path.resolve(__dirname, '../../../../parser'));
      return {
        ok: true,
        filename: safeName,
        path: targetPath,
        parser: 'executed',
      };
    } catch (error: any) {
      reply.code(500);
      return {
        error: 'Il file è stato salvato ma il parser non ha generato il file Excel.',
        details: error?.message ?? String(error),
      };
    }
  });

  app.get('/data', async (request: any) => {
    const { period = 'year', date, start_date, end_date } = request.query;

    const { spese, entrate, aggregatedSpese, aggregatedEntrate } = parseExcel();

    let referenceDate: dayjs.Dayjs;
    let endDateObj: dayjs.Dayjs | undefined;

    // Determine the date range based on period and provided parameters
    if (period === 'day' && date) {
      referenceDate = dayjs(date);
    } else if (period === 'week' && start_date && end_date) {
      referenceDate = dayjs(start_date);
      endDateObj = dayjs(end_date);
    } else if (period === 'month' && date) {
      referenceDate = dayjs(date);
    } else if (period === 'year' && date) {
      // date could be just YYYY or YYYY-MM-DD
      // If it's just YYYY, parse it as the first day of that year
      if (date.length === 4) {
        referenceDate = dayjs(`${date}-01-01`);
      } else {
        referenceDate = dayjs(date);
      }
    } else {
      // Default: use the earliest date from data
      const allDates = [...spese, ...entrate]
        .map(item => item.data)
        .filter(d => d)
        .sort();
      referenceDate = allDates.length > 0 ? dayjs(allDates[0]) : dayjs();
    }

    const filteredSpese = filterByPeriod(spese, period, referenceDate, endDateObj);
    const filteredEntrate = filterByPeriod(entrate, period, referenceDate, endDateObj);

    const dynamicSpese = aggregateByCategory(filteredSpese);
    const dynamicEntrate = aggregateByCategory(filteredEntrate);

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