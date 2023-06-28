const express = require('express');
const router = express.Router();

const { login, signup, getAllUsers } = require('../controllers/userController');

// get all users
router.get('/allusers', getAllUsers);

// login route
router.post('/login', login);

// signup route
router.post('/signup', signup);

module.exports = router;