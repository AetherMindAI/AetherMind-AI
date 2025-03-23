/**
 * Chain Adapter - Cross-chain interoperability layer
 * 
 * This module provides adapters for different blockchain networks,
 * enabling AETHERMIND to operate across multiple chains.
 */

const { ethers } = require('ethers');
const Web3 = require('web3');

// Base Chain Adapter class
class ChainAdapter {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.networkId = null;
  }

  async connect() {
    throw new Error('Method not implemented in base class');
  }

  async disconnect() {
    this.connected = false;
  }

  async isConnected() {
    return this.connected;
  }

  async getNetworkId() {
    return this.networkId;
  }

  async executeTransaction(txData) {
    throw new Error('Method not implemented in base class');
  }

  async verifyTransaction(txHash) {
    throw new Error('Method not implemented in base class');
  }
}

// Ethereum Chain Adapter
class EthereumAdapter extends ChainAdapter {
  constructor(config) {
    super(config);
    this.provider = null;
    this.signer = null;
  }

  async connect() {
    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL;
      
      if (!rpcUrl) {
        throw new Error('Ethereum RPC URL not configured');
      }
      
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      const network = await this.provider.getNetwork();
      this.networkId = network.chainId.toString();
      
      // If private key is provided, create a signer
      if (this.config.privateKey) {
        this.signer = new ethers.Wallet(this.config.privateKey, this.provider);
      }
      
      this.connected = true;
      console.log(`Connected to Ethereum network with chain ID: ${this.networkId}`);
      
      return true;
    } catch (error) {
      console.error('Failed to connect to Ethereum network:', error);
      throw error;
    }
  }

  async executeTransaction(txData) {
    if (!this.connected) {
      await this.connect();
    }

    if (!this.signer) {
      throw new Error('Signer not configured. Cannot execute transaction');
    }

    try {
      const tx = await this.signer.sendTransaction({
        to: txData.to,
        data: txData.data,
        value: txData.value || 0,
        gasLimit: txData.gasLimit,
      });

      return {
        txHash: tx.hash,
        blockNumber: null, // Will be set when mined
        status: 'submitted'
      };
    } catch (error) {
      console.error('Failed to execute Ethereum transaction:', error);
      throw error;
    }
  }

  async verifyTransaction(txHash) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return {
          status: 'pending',
          confirmed: false
        };
      }

      return {
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        confirmed: true
      };
    } catch (error) {
      console.error('Failed to verify Ethereum transaction:', error);
      throw error;
    }
  }
}

// BNB Chain Adapter
class BnbChainAdapter extends ChainAdapter {
  constructor(config) {
    super(config);
    this.web3 = null;
    this.account = null;
  }

  async connect() {
    try {
      const rpcUrl = process.env.BNB_CHAIN_RPC_URL;
      
      if (!rpcUrl) {
        throw new Error('BNB Chain RPC URL not configured');
      }
      
      this.web3 = new Web3(rpcUrl);
      this.networkId = await this.web3.eth.getChainId();
      
      // If private key is provided, create an account
      if (this.config.privateKey) {
        this.account = this.web3.eth.accounts.privateKeyToAccount(this.config.privateKey);
        this.web3.eth.accounts.wallet.add(this.account);
      }
      
      this.connected = true;
      console.log(`Connected to BNB Chain with chain ID: ${this.networkId}`);
      
      return true;
    } catch (error) {
      console.error('Failed to connect to BNB Chain:', error);
      throw error;
    }
  }

  async executeTransaction(txData) {
    if (!this.connected) {
      await this.connect();
    }

    if (!this.account) {
      throw new Error('Account not configured. Cannot execute transaction');
    }

    try {
      const tx = await this.web3.eth.sendTransaction({
        from: this.account.address,
        to: txData.to,
        data: txData.data,
        value: txData.value || 0,
        gas: txData.gasLimit,
      });

      return {
        txHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        status: tx.status ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Failed to execute BNB Chain transaction:', error);
      throw error;
    }
  }

  async verifyTransaction(txHash) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return {
          status: 'pending',
          confirmed: false
        };
      }

      return {
        status: receipt.status ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        confirmed: true
      };
    } catch (error) {
      console.error('Failed to verify BNB Chain transaction:', error);
      throw error;
    }
  }
}

// Solana Chain Adapter (simplified placeholder - would use @solana/web3.js in actual implementation)
class SolanaAdapter extends ChainAdapter {
  constructor(config) {
    super(config);
    this.connection = null;
  }

  async connect() {
    try {
      // Placeholder for Solana connection
      // In a real implementation, would use:
      // const connection = new Connection(process.env.SOLANA_RPC_URL);
      
      this.connected = true;
      this.networkId = 'solana-mainnet'; // Placeholder
      
      console.log('Connected to Solana network');
      return true;
    } catch (error) {
      console.error('Failed to connect to Solana network:', error);
      throw error;
    }
  }

  async executeTransaction(txData) {
    // Placeholder for Solana transaction execution
    return {
      txHash: 'solana-tx-hash-placeholder',
      status: 'submitted'
    };
  }

  async verifyTransaction(txHash) {
    // Placeholder for Solana transaction verification
    return {
      status: 'success', // Placeholder
      confirmed: true
    };
  }
}

/**
 * Get a chain adapter for the specified blockchain
 * @param {string} chain - The blockchain identifier ('ethereum', 'bnb', 'solana')
 * @param {Object} config - Chain-specific configuration
 */
async function getChainAdapter(chain, config = {}) {
  let adapter;
  
  switch (chain.toLowerCase()) {
    case 'ethereum':
      adapter = new EthereumAdapter(config);
      break;
    case 'bnb':
      adapter = new BnbChainAdapter(config);
      break;
    case 'solana':
      adapter = new SolanaAdapter(config);
      break;
    default:
      throw new Error(`Unsupported blockchain: ${chain}`);
  }
  
  // Initialize connection if autoConnect is not explicitly disabled
  if (config.autoConnect !== false) {
    await adapter.connect();
  }
  
  return adapter;
}

module.exports = {
  ChainAdapter,
  EthereumAdapter,
  BnbChainAdapter,
  SolanaAdapter,
  getChainAdapter
}; 