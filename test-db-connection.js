const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://philip:postgres@127.0.0.1:5432/postgres'
});

async function testParam() {
    try {
        await client.connect();
        console.log('Connected successfully');
        const res = await client.query('SELECT 1');
        console.log('Query result:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection error', err);
        process.exit(1);
    }
}

testParam();
