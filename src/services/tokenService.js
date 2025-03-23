/**
 * Token Service for AETHERMIND
 * 
 * Provides functionality to mint and manage Neural Pathway Tokens (NPTs) 
 * on the blockchain.
 */

const ethers = require('ethers');
const logger = require('../utils/logger');
const blockchain = require('../utils/blockchain');
const { BlockchainError } = require('../utils/errors');

// NFT contract info
const nptContractAbi = require('../../contracts/abi/NeuralPathwayToken.json');
const nptAddresses = {
  ethereum: process.env.NPT_CONTRACT_ETH,
  polygon: process.env.NPT_CONTRACT_POLYGON,
  bsc: process.env.NPT_CONTRACT_BSC
};

// Cache for contract instances
const contractInstances = {};

/**
 * Check if NPT minting is enabled
 * @returns {boolean} Whether NPT minting is enabled
 */
function isNptMintingEnabled() {
  return process.env.ENABLE_NPT_MINTING === 'true';
}

/**
 * Get the wallet for contract interactions
 * @param {string} chain - Blockchain network
 * @returns {ethers.Wallet} Wallet instance
 */
function getWallet(chain) {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new BlockchainError('Private key not configured');
  }
  
  return blockchain.createWallet(privateKey, chain);
}

/**
 * Get the NPT contract instance
 * @param {string} chain - Blockchain network
 * @returns {ethers.Contract} Contract instance
 */
function getNptContract(chain) {
  if (!nptAddresses[chain]) {
    throw new BlockchainError(`No NPT contract address defined for ${chain}`);
  }
  
  if (!contractInstances[chain]) {
    const wallet = getWallet(chain);
    contractInstances[chain] = blockchain.getContract(
      nptAddresses[chain],
      nptContractAbi,
      chain,
      wallet
    );
  }
  
  return contractInstances[chain];
}

/**
 * Generate token metadata URI for a pathway
 * @param {Object} pathway - Neural pathway data
 * @returns {string} IPFS or HTTP URI for the metadata
 */
function generateTokenMetadata(pathway) {
  // In a production system, this would store the metadata in IPFS or a database
  // For the MVP, we'll return a mock URI
  return `https://api.aethermind.io/metadata/pathway/${pathway.id}`;
}

/**
 * Mint a new Neural Pathway Token (NPT)
 * @param {Object} pathway - The neural pathway to tokenize
 * @param {string} ownerAddress - Ethereum address that will own the token
 * @returns {Promise<Object>} Token information
 */
async function mintPathwayToken(pathway, ownerAddress) {
  if (!isNptMintingEnabled()) {
    logger.warn('NPT minting is disabled');
    return { 
      success: false,
      message: 'NPT minting is disabled'
    };
  }
  
  try {
    const chain = pathway.chain || 'ethereum';
    const contract = getNptContract(chain);
    
    logger.info(`Minting NPT on ${chain} for pathway ${pathway.id}`);
    
    // Prepare token data
    const sourceAgent = pathway.sourceAgentId.toString();
    const targetAgent = pathway.targetAgentId.toString();
    const strength = Math.floor(pathway.strength * 1000); // Convert 0-1 to 0-1000
    const uri = generateTokenMetadata(pathway);
    
    // Check if token already exists
    const existingToken = await contract.pathwayExists(sourceAgent, targetAgent);
    if (existingToken.toNumber() > 0) {
      logger.warn(`Token already exists for pathway ${pathway.id}`);
      return {
        success: false,
        message: 'Token already exists for this pathway',
        tokenId: existingToken.toNumber()
      };
    }
    
    // Mint the token
    const tx = await contract.mintPathway(
      ownerAddress,
      sourceAgent,
      targetAgent,
      strength,
      uri
    );
    
    logger.info(`NPT mint transaction sent: ${tx.hash}`);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    // Find the token ID from the event
    const mintEvent = receipt.events.find(e => e.event === 'PathwayTokenMinted');
    const tokenId = mintEvent.args.tokenId.toNumber();
    
    logger.info(`NPT minted successfully, token ID: ${tokenId}`);
    
    return {
      success: true,
      chain,
      tokenId,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    logger.error('Failed to mint NPT:', error);
    throw new BlockchainError('Failed to mint Neural Pathway Token', {
      pathwayId: pathway.id,
      chain: pathway.chain,
      cause: error
    });
  }
}

/**
 * Update the strength of an existing NPT
 * @param {Object} pathway - The updated neural pathway
 * @returns {Promise<Object>} Update result
 */
async function updatePathwayTokenStrength(pathway) {
  if (!isNptMintingEnabled() || !pathway.tokenId) {
    return { 
      success: false,
      message: 'NPT minting is disabled or token does not exist'
    };
  }
  
  try {
    const chain = pathway.chain || 'ethereum';
    const contract = getNptContract(chain);
    
    // Convert strength to integer value
    const strength = Math.floor(pathway.strength * 1000);
    
    logger.info(`Updating NPT strength on ${chain}, token ID: ${pathway.tokenId}`);
    
    // Send the transaction
    const tx = await contract.updatePathwayStrength(pathway.tokenId, strength);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    logger.info(`NPT strength updated successfully, token ID: ${pathway.tokenId}`);
    
    return {
      success: true,
      chain,
      tokenId: pathway.tokenId,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    logger.error('Failed to update NPT strength:', error);
    throw new BlockchainError('Failed to update Neural Pathway Token strength', {
      pathwayId: pathway.id,
      tokenId: pathway.tokenId,
      chain: pathway.chain,
      cause: error
    });
  }
}

/**
 * Get details about a specific NPT
 * @param {number} tokenId - The token ID
 * @param {string} chain - Blockchain network
 * @returns {Promise<Object>} Token details
 */
async function getPathwayTokenDetails(tokenId, chain = 'ethereum') {
  try {
    const contract = getNptContract(chain);
    
    // Get token details from the contract
    const details = await contract.getPathwayDetails(tokenId);
    
    return {
      tokenId,
      chain,
      sourceAgentId: details[0],
      targetAgentId: details[1],
      strength: details[2] / 1000 // Convert 0-1000 to 0-1
    };
  } catch (error) {
    logger.error(`Failed to get NPT details for token ${tokenId}:`, error);
    throw new BlockchainError('Failed to get Neural Pathway Token details', {
      tokenId,
      chain,
      cause: error
    });
  }
}

module.exports = {
  isNptMintingEnabled,
  mintPathwayToken,
  updatePathwayTokenStrength,
  getPathwayTokenDetails
}; 