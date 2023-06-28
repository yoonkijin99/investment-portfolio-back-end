const getUsers = 'SELECT * FROM users';

const checkEmailExists = 'SELECT * FROM users WHERE email = $1';

const addUser = 'INSERT INTO users (email, hashedPassword) VALUES ($1, $2)';



const getUserAssets = 'SELECT * FROM positions WHERE email = $1 ORDER BY date DESC';


const addUserAsset = 'INSERT INTO positions (email, symbol, date, shares) VALUES ($1, $2, $3, $4)';

const getSpecifiedAsset = 'SELECT * FROM positions WHERE email = $1 AND date = $2 AND symbol = $3';

const updateHolding = 'UPDATE positions SET shares = $4 WHERE email = $1 AND date = $2 AND symbol = $3';

const deleteHolding = 'DELETE FROM positions WHERE email = $1 AND date = $2 AND symbol = $3';


module.exports = {
    getUsers,
    checkEmailExists,
    addUser, 
    
    getUserAssets,
    addUserAsset,
    
    getSpecifiedAsset,
    updateHolding,
    deleteHolding,
}
