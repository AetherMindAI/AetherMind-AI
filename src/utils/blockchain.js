/**
 * Blockchain Utility Class
 * 
 * Provides common functionality for interacting with Ethereum, Polygon, BSC and other blockchain networks
 */

const ethers = require('ethers');
const logger = require('./logger');
const { BlockchainError } = require('./errors');

// Supported blockchain networks
const SUPPORTED_CHAINS = {
  ethereum: {
    name: 'Ethereum',
    rpcUrl: process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/your-infura-key',
    chainId: 1,
    explorerUrl: 'https://etherscan.io',
    gasMultiplier: 1.2
  },
  polygon: {
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    chainId: 137,
    explorerUrl: 'https://polygonscan.com',
    gasMultiplier: 1.5
  },
  bsc: {
    name: 'Binance Smart Chain', 
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    chainId: 56,
    explorerUrl: 'https://bscscan.com',
    gasMultiplier: 1.1
  }
};

// Provider cache
const providers = {};

/**
 * Get provider for a specific blockchain
 * @param {string} chain - Blockchain name
 * @returns {ethers.providers.JsonRpcProvider} Blockchain provider
 */
function getProvider(chain) {
  if (!SUPPORTED_CHAINS[chain]) {
    throw new BlockchainError(`Unsupported blockchain: ${chain}`);
  }

  if (!providers[chain]) {
    try {
      providers[chain] = new ethers.providers.JsonRpcProvider(SUPPORTED_CHAINS[chain].rpcUrl);
      logger.info(`Connected to ${SUPPORTED_CHAINS[chain].name} network`);
    } catch (error) {
      logger.error(`Failed to connect to ${chain}:`, error);
      throw new BlockchainError(`Unable to connect to ${chain}`, { cause: error });
    }
  }

  return providers[chain];
}

/**
 * Check blockchain network status
 * @param {string} chain - Blockchain name
 * @returns {Promise<Object>} Object containing network information
 */
async function checkChainStatus(chain) {
  try {
    const provider = getProvider(chain);
    const [blockNumber, gasPrice, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getGasPrice(),
      provider.getNetwork()
    ]);

    return {
      chain,
      blockNumber,
      gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
      chainId: network.chainId,
      name: SUPPORTED_CHAINS[chain].name,
      connected: true
    };
  } catch (error) {
    logger.error(`Error checking ${chain} status:`, error);
    return {
      chain,
      connected: false,
      error: error.message
    };
  }
}

/**
 * Create a wallet using a private key
 * @param {string} privateKey - Private key
 * @param {string} chain - Blockchain name
 * @returns {ethers.Wallet} Wallet connected to the specified network
 */
function createWallet(privateKey, chain = 'ethereum') {
  try {
    const provider = getProvider(chain);
    return new ethers.Wallet(privateKey, provider);
  } catch (error) {
    logger.error(`Failed to create wallet:`, error);
    throw new BlockchainError('Failed to create wallet', { cause: error });
  }
}

/**
 * Deploy smart contract
 * @param {string} chain - Blockchain name
 * @param {object} contractData - Contract data (ABI, bytecode)
 * @param {array} constructorArgs - Constructor arguments
 * @param {ethers.Wallet} wallet - Wallet to deploy contract from
 * @returns {Promise<ethers.Contract>} Deployed contract instance
 */
async function deployContract(chain, contractData, constructorArgs, wallet) {
  try {
    // Ensure we have a wallet
    if (!wallet) {
      throw new BlockchainError('A wallet is required to deploy a contract');
    }

    // Create contract factory
    const factory = new ethers.ContractFactory(
      contractData.abi,
      contractData.bytecode,
      wallet
    );

    // Deploy contract
    logger.info(`Deploying contract on ${chain}...`);
    const contract = await factory.deploy(...constructorArgs);
    
    // Wait for deployment to complete
    await contract.deployed();
    
    logger.info(`Contract deployed to ${chain}, address: ${contract.address}`);
    return contract;
  } catch (error) {
    logger.error(`Failed to deploy contract to ${chain}:`, error);
    throw new BlockchainError(`Failed to deploy contract to ${chain}`, { cause: error });
  }
}

/**
 * Interact with deployed contract
 * @param {string} address - Contract address
 * @param {object} abi - Contract ABI
 * @param {string} chain - Blockchain name
 * @param {ethers.Wallet|null} wallet - Optional wallet for sending transactions
 * @returns {ethers.Contract} Contract instance
 */
function getContract(address, abi, chain = 'ethereum', wallet = null) {
  try {
    const provider = getProvider(chain);
    const signer = wallet || provider;
    return new ethers.Contract(address, abi, signer);
  } catch (error) {
    logger.error(`Failed to get contract instance:`, error);
    throw new BlockchainError('Failed to get contract instance', { cause: error });
  }
}

/**
 * Estimate gas cost for a transaction
 * @param {string} chain - Blockchain name
 * @param {object} txData - Transaction data
 * @returns {Promise<object>} Object containing gas estimates
 */
async function estimateGas(chain, txData) {
  try {
    const provider = getProvider(chain);
    const gasEstimate = await provider.estimateGas(txData);
    const gasPrice = await provider.getGasPrice();
    
    // Apply gas multiplier to ensure fast confirmation
    const adjustedGasPrice = gasPrice.mul(
      Math.floor(SUPPORTED_CHAINS[chain].gasMultiplier * 100)
    ).div(100);
    
    const gasCost = gasEstimate.mul(adjustedGasPrice);
    
    return {
      gasEstimate: gasEstimate.toString(),
      gasPrice: ethers.utils.formatUnits(adjustedGasPrice, 'gwei'),
      gasCost: ethers.utils.formatEther(gasCost),
      chain
    };
  } catch (error) {
    logger.error(`Failed to estimate gas costs for ${chain}:`, error);
    throw new BlockchainError(`Failed to estimate gas costs for ${chain}`, { cause: error });
  }
}

/**
 * Check status of all supported blockchains
 * @returns {Promise<Object>} Object containing status for each chain
 */
async function checkAllChains() {
  const results = {};
  const chains = Object.keys(SUPPORTED_CHAINS);
  
  await Promise.all(
    chains.map(async (chain) => {
      results[chain] = await checkChainStatus(chain);
    })
  );
  
  return results;
}

module.exports = {
  SUPPORTED_CHAINS,
  getProvider,
  createWallet,
  checkChainStatus,
  deployContract,
  getContract,
  estimateGas,
  checkAllChains
}; 