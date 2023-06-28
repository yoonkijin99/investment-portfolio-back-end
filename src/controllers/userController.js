const jwt = require('jsonwebtoken');
const queries = require('./queries')
const bcrypt = require('bcrypt')
const pool = require('../../db');
const validator = require('validator');

const getAllUsers = async (req, res) => {
    pool.query(queries.getUserAssets, (error, results) => {  
        if (error) {
            throw error;
        }
        res.status(200).json(results.rows); // send back the JSON data
    });  

    results = await pool.query(queries.checkEmailExists, [email]);

}





const createToken = (userEmail) => {
    return jwt.sign({ userEmail }, process.env.SECRET) 
}







const login = async (req, res) => {

    console.log('login login')

    const { email, password } = req.body;    

    try {
        const userEmail = await authenticateUser(email, password); 

        const token = createToken(userEmail);

        res.status(200).json({ email, token }) 

    } catch (error) {
        res.status(400).json({ error: error.message })  
    }

}



const authenticateUser = async (email, password) => {

    if (!email || !password) {
        throw Error('All fields must be filled');
    }

    results = await pool.query(queries.checkEmailExists, [email]);

    if (!results.rows.length) {
        throw Error('Incorrect email');
    } else {
        hashedPassword = results.rows[0].hashedpassword;
        const match = await bcrypt.compare(password, hashedPassword);

        if (!match) {
            throw Error('Incorrect password');
        }
    
        return results.rows[0].email;
    }

}
























const signup = async(req, res) => {

    console.log('signup signup')


    const { email, password } = req.body;

    try {
        await createNewUser(email, password);

        const token = createToken(email); 
        
        res.status(200).json({ email, token })
    } catch (error) {
        res.status(400).json({ error: error.message }) 
    }

}

const createNewUser = async (email, password) => {


    if (!email || !password) {
        throw Error('All fields must be filled');
    }

    if (!validator.isEmail(email)) {
        throw Error('Please enter valid email');
    }
    


    checkEmailExistsResult = await pool.query(queries.checkEmailExists, [email]);
    

    if (checkEmailExistsResult.rows.length) {
        throw Error('Email already exists'); 
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt); 

    
    results = await pool.query(queries.addUser, [email, hashedPassword]); 

    return 1
}



module.exports = {
    login,
    signup,
    getAllUsers
}