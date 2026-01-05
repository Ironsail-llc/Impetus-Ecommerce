const { Client } = require('pg')

describe('Simple DB Check', () => {
    it('connects to postgres', async () => {
        console.log("Attempting to connect to DB via pg client...")
        const client = new Client({
            connectionString: "postgres://philip:postgres@127.0.0.1:5432/postgres"
        })
        try {
            await client.connect()
            console.log("Connected!")
            const res = await client.query('SELECT $1::text as message', ['Hello world!'])
            console.log("Query result:", res.rows[0].message)
            expect(res.rows[0].message).toBe('Hello world!')
        } catch (e) {
            console.error("Connection failed:", e)
            throw e
        } finally {
            await client.end()
        }
    })
})
