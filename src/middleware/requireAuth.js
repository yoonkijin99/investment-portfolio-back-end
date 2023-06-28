const jwt = require('jsonwebtoken');

const requireAuth = async (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) {
        res.status(401).json({ error: 'Authorization token required' });
        return;
    }    

    const token = authorization.split(' ')[1]; 

    try {

        const { userEmail } = jwt.verify(token, process.env.SECRET);

        req.user = { userEmail }

        next();

    } catch (error) { 
        res.status(401).json({ error: 'Request is not authorized' })
    }



}


module.exports = requireAuth;