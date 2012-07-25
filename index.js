module.exports = process.env.EVENTUALLY_COV
  ? require('./lib-cov/eventually')
  : require('./lib/eventually');