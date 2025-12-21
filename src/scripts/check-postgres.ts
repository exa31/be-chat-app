import {initPostgres, query, shutdownPostgres} from '../databases/postgres';

async function run() {
    try {
        await initPostgres();
        const res = await query('SELECT 1 AS ok');
        const ok = res.rows?.[0]?.ok;
        // eslint-disable-next-line no-console
        if (ok === 1) console.log('Postgres check OK');
        else console.log('Postgres check returned unexpected result:', res.rows);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Postgres check failed:', (err as Error).message);
        process.exitCode = 2;
    } finally {
        await shutdownPostgres();
    }
}

run();

