const Pool = require('pg').Pool;

const pool = new Pool({
    user: 'postgres',
    host: 'postgresql',  // postgresql localhost
    database: 'portfolio',
    password: 'deckofcards1',
    port: 5432,
});

module.exports = pool;