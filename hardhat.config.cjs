require('@nomiclabs/hardhat-ethers');
require('solidity-coverage');

module.exports = {
  solidity: '0.8.27',
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};
