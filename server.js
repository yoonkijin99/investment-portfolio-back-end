const express = require('express');
const app = express();

const cors = require("cors");

require('dotenv').config();

app.use(express.json());


app.use(cors({
    origin: '*',
    methods: 'GET, POST, PUT, DELETE, PATCH',
    allowedHeaders: 'Content-Type, Authorization'
  }));
  

// import routes
const userRoutes = require('./src/routes/userRoutes');
const dataRoutes = require('./src/routes/dataRoutes');


// use routes
app.use('/user', userRoutes);
app.use('/data', dataRoutes);


app.listen(3070, () => {
    console.log('Connected to db - Listening on port,', 3070);
})


module.exports = app;