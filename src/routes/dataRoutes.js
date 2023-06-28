const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');

const { deleteHolding, getUserPortfolioData, addPosition, editPosition } = require('../controllers/dataController');



router.use(requireAuth);



router.post('/addposition', addPosition);

router.patch('/editposition', editPosition);

router.delete('/deleteposition', deleteHolding);

router.get('/getportfoliodata', getUserPortfolioData);

module.exports = router;