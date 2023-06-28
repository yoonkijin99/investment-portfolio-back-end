const pool = require('../../db');
const queries = require('./queries');
const cts = require('check-ticker-symbol');
const moment = require("moment");
const Alpaca = require("@alpacahq/alpaca-trade-api");

const getUserPortfolioInfo = async (req, res) => {

  console.log('getUserPortfolioInfo getUserPortfolioInfo')

  try {
    const { userEmail } = req.user;
    const queryResults = await pool.query(queries.getUserAssets, [userEmail]);
    return queryResults.rows;
  } catch (error) {
    console.error('Error retrieving user portfolio info:', error);
    throw new Error(error.message);
  }
};



const getUserPortfolioData = async (req, res) => {
  console.log('getUserPortfolioData getUserPortfolioData');

  try {
    const portfolioInfo = await getUserPortfolioInfo(req, res);

    if (portfolioInfo.length === 0) {
      return res.status(200).json('No currently open positions');
    }

    portfolioInfo.forEach(position => position.date = new Date(position.date));


    const allDataSets = await fetchAllPositionData(portfolioInfo);
    const positionsData = getPositionsData(allDataSets);
    const portfolioData = getPortfolioPercentageMovement(positionsData, portfolioInfo);

    res.status(200).json([positionsData, portfolioData, portfolioInfo]);
  } catch (error) {
    console.error('Error retrieving user portfolio data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
  
};


const fetchAllPositionData = async (portfolioInfo) => {
  const allDataSets = [];

  for (let i = 0; i < portfolioInfo.length; i++) {
    const positionInfo = portfolioInfo[i];
    const { symbol, date } = positionInfo;
    const positionData = await getHoldingData(symbol, date);
    allDataSets.push(positionData);
  }

  return allDataSets;
};








const padArraysToSameLength = (allPercentageMovements, numDataSets, longestLength) => {
  const allPercentageMovementsSameLengthArrays = [];

  for (let k = 0; k < numDataSets; k++) {
    const currDataSetLen = allPercentageMovements[k].length;
    const paddedArray = Array(longestLength).fill(null);

    for (let i = 0; i < currDataSetLen; i++) {
      paddedArray[longestLength - currDataSetLen + i] = allPercentageMovements[k][i];
    }

    allPercentageMovementsSameLengthArrays.push(paddedArray);
  }

  return allPercentageMovementsSameLengthArrays;
};

const calculatePortfolioValueInDollars = (allPercentageMovementsSameLengthArrays, holdingsInfo, numDataSets, i) => {
  let portfolioValueInDollars = 0;

  for (let k = 0; k < numDataSets; k++) {
    if (allPercentageMovementsSameLengthArrays[k][i]) {
      const numShares = holdingsInfo[k].shares;
      const openPrice = allPercentageMovementsSameLengthArrays[k][i].OpenPrice;
      const positionValueInDollars = numShares * openPrice;

      portfolioValueInDollars += positionValueInDollars;
    }
  }

  return portfolioValueInDollars;
};

const calculatePositionsWeightingsAndPortfolioPctMvt = (allPercentageMovementsSameLengthArrays, holdingsInfo, numDataSets, portfolioValueInDollars, i) => {
  let portfolioPctMvt = 0;
  const positionsWeightings = [];

  for (let k = 0; k < numDataSets; k++) {
    if (allPercentageMovementsSameLengthArrays[k][i]) {
      const numShares = holdingsInfo[k].shares;
      const price = allPercentageMovementsSameLengthArrays[k][i].OpenPrice;
      const positionValueInDollars = numShares * price;
      const positionPortfolioWeighting = positionValueInDollars / portfolioValueInDollars;
      const currDatePctMvt = allPercentageMovementsSameLengthArrays[k][i].pct * positionPortfolioWeighting;

      portfolioPctMvt += currDatePctMvt;
      positionsWeightings.push({ symbol: holdingsInfo[k].symbol, weighting: positionPortfolioWeighting });
    }
  }

  return { positionsWeightings, portfolioPctMvt };
};

const getPortfolioPercentageMovement = (allPercentageMovements, holdingsInfo) => {
  const longestDataSetIndex = getLongestDataSetIndex(allPercentageMovements);
  const numDataSets = allPercentageMovements.length;
  const longestLength = allPercentageMovements[longestDataSetIndex].length;

  const allPercentageMovementsSameLengthArrays = padArraysToSameLength(
    allPercentageMovements,
    numDataSets,
    longestLength
  );

  const portfolioData = [];

  for (let i = 0; i < longestLength; i++) {
    const portfolioValueInDollars = calculatePortfolioValueInDollars(
      allPercentageMovementsSameLengthArrays,
      holdingsInfo,
      numDataSets,
      i
    );

    const { positionsWeightings, portfolioPctMvt } = calculatePositionsWeightingsAndPortfolioPctMvt(
      allPercentageMovementsSameLengthArrays,
      holdingsInfo,
      numDataSets,
      portfolioValueInDollars,
      i
    );

    portfolioData.push({ positionsWeightings, pct: portfolioPctMvt, Timestamp: allPercentageMovementsSameLengthArrays[longestDataSetIndex][i].Timestamp });
  }

  return portfolioData;
};









const getLongestDataSetIndex = (allDataSets) => {

  let maxLen = 0
  let longestDataSetIndex = 0

  for (let i = 0; i < allDataSets.length; i++) {
    if (allDataSets[i].length > maxLen) {
      maxLen = allDataSets[i].length;
      longestDataSetIndex = i
    }
  }

  return longestDataSetIndex
}



const getPositionsData = (allDataSets) => {

  const allPercentageMovements = allDataSets.map(dataSet => getPercentageMovementForSingleHolding(dataSet));

  return allPercentageMovements;

}















const getPercentageMovementForSingleHolding = (dataset) => {
  const purchasePrice = dataset[0].OpenPrice;
  const percentageMovementDataSet = dataset.map(dayInfo => ({
    ...dayInfo,
    pct: (100 * (dayInfo.OpenPrice - purchasePrice) / purchasePrice),
  }));

  return percentageMovementDataSet;
};









const getHoldingData = async (symbol, date) => {
  symbol = symbol.toUpperCase();

  try {
    const singleHoldingData = await getHistoricalData(symbol, date);
    return singleHoldingData;
  } catch (error) {
    throw new Error(error.message);
  }
};
















const alpaca = new Alpaca({
  keyId: process.env.API_KEY,
  secretKey: process.env.API_SECRET,
  paper: true,
});

const calculateStartDate = (pastDate) => {
  const startDate = new Date(pastDate);
  startDate.setDate(pastDate.getDate() - 1);
  return startDate;
};

const fetchHistoricalData = async (assetSymbol, startDate) => {
  try {
    const bars = await alpaca.getBarsV2(assetSymbol, {
      start: startDate,
      end: moment().subtract(1, "days").format(),
      timeframe: "1Day",
      adjustment: 'all'
    });
    const got = [];
    for await (let b of bars) {
      b.symbol = assetSymbol;
      got.push(b);
    }
    return got;
  } catch (error) {
    throw new Error('API error');
  }
};

const getHistoricalData = async (assetSymbol, pastDate) => {
  const startDate = calculateStartDate(pastDate);
  const historicalData = await fetchHistoricalData(assetSymbol, startDate);
  return historicalData;
};

























const updateAsset = async (pool, queries, email, symbol, date, shares) => {
  const queryResults = await pool.query(queries.getSpecifiedAsset, [email, date, symbol]);

  if (queryResults.rows.length) {
    await pool.query(queries.updateHolding, [email, date, symbol, shares]);
  } else {
    await pool.query(queries.addUserAsset, [email, symbol, date, shares]);
  }

  return await pool.query(queries.getSpecifiedAsset, [email, date, symbol]);
};

const editPosition = async (req, res) => {
  console.log('editPosition editPosition');

  const { email, symbol, date, shares } = req.body;

  try {
    const symbolUpperCase = symbol.toUpperCase();

    const queryResults = await updateAsset(pool, queries, email, symbolUpperCase, date, shares);

    res.status(200).json(queryResults.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};














const validateSymbol = (symbol) => {
  if (symbol !== 'GOOGL' && !cts.valid(symbol)) {
    throw new Error('Not a valid ticker symbol');
  }
};

const validateDate = (date) => {
  const purchaseDate = new Date(date);
  const currentDate = new Date();
  const easternOffset = -240;
  const currentEasternDate = new Date(currentDate.getTime() - easternOffset * 60 * 1000);

  const earliestAllowedDate = new Date(currentEasternDate);
  const minimumDaysPast = 20;
  earliestAllowedDate.setDate(earliestAllowedDate.getDate() - minimumDaysPast);

  if (purchaseDate >= earliestAllowedDate) {
    throw new Error('Date has been set too early. Must not be as recent as 20 days of the current date.');
  }
};

const handlePositionAdd = async (pool, queries, email, symbol, date, shares) => {
  const queryResults = await pool.query(queries.getSpecifiedAsset, [email, date, symbol]);

  if (queryResults.rows.length) {
    throw new Error('A position of the input date already exists in the current portfolio. Please edit the position\'s shares instead (via the Edit Position buttons).');
  } else {
    await pool.query(queries.addUserAsset, [email, symbol, date, shares]);
  }

  return await pool.query(queries.getSpecifiedAsset, [email, date, symbol]);
};

const addPosition = async (req, res) => {
  console.log('addPosition addPosition');

  const { email, symbol, date, shares } = req.body;

  try {
    validateSymbol(symbol);
    validateDate(date);

    console.log('addPosition --- ', date);

    const symbolUpperCase = symbol.toUpperCase();

    const queryResults = await handlePositionAdd(pool, queries, email, symbolUpperCase, date, shares);

    res.status(200).json(queryResults.rows);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};





const deleteHolding = async (req, res) => {
  const { email, symbol, date } = req.body;

  if (!email || typeof email !== 'string' || !symbol || typeof symbol !== 'string' || !date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Invalid input parameters.' });
  }

  const dateString = date.split('T')[0];

  try {
    const queryResults = await pool.query(queries.getSpecifiedAsset, [email, dateString, symbol]);

    if (queryResults.rows.length) {
      await pool.query(queries.deleteHolding, [email, dateString, symbol]);
      return res.status(200).json(queryResults.rows);
    } else {
      return res.status(404).json({ error: 'No such holding' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


module.exports = {
  editPosition,
  addPosition,
  deleteHolding,
  getUserPortfolioData,
}
