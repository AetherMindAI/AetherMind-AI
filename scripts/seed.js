/**
 * Seed Script
 * 
 * This script populates the AETHERMIND system with some initial
 * agents and neural pathways for development and testing.
 */

require('dotenv').config();
const { Agent } = require('../src/models/agent');
const { NeuralPathway } = require('../src/models/neuralPathway');
const { cognitiveMesh } = require('../src/core/cognitiveMesh');

// Sample agent definitions
const agents = [
  {
    name: "FinancialAnalyst",
    description: "Specialized in financial data analysis and market predictions",
    capabilities: ["financial-analysis", "market-prediction", "risk-assessment"],
    specializations: ["defi", "trading"],
    trustScore: 0.85,
    chain: "ethereum",
    metadata: {
      aiModel: "GPT-4",
      trainingData: "Financial reports, market data, SEC filings",
      version: "1.0.0"
    }
  },
  {
    name: "ContentCreator",
    description: "Creates engaging content across various formats and topics",
    capabilities: ["content-creation", "audience-analysis", "trend-detection"],
    specializations: ["social-media", "blogs", "video"],
    trustScore: 0.78,
    chain: "bnb",
    metadata: {
      aiModel: "Claude-2",
      trainingData: "Social media posts, articles, engagement metrics",
      version: "1.0.0"
    }
  },
  {
    name: "DataScientist",
    description: "Expert in data analysis, visualization and machine learning",
    capabilities: ["data-analysis", "machine-learning", "data-visualization"],
    specializations: ["predictive-modeling", "clustering", "anomaly-detection"],
    trustScore: 0.92,
    chain: "ethereum",
    metadata: {
      aiModel: "GPT-4",
      trainingData: "Scientific papers, data sets, algorithmic implementations",
      version: "1.0.0"
    }
  },
  {
    name: "LegalAdvisor",
    description: "Provides legal analysis and risk assessment for blockchain projects",
    capabilities: ["legal-analysis", "contract-review", "risk-assessment"],
    specializations: ["smart-contracts", "regulatory-compliance", "dao-governance"],
    trustScore: 0.81,
    chain: "solana",
    metadata: {
      aiModel: "Claude-2",
      trainingData: "Legal documents, regulatory filings, case law",
      version: "1.0.0"
    }
  },
  {
    name: "CreativeDirector",
    description: "Specializes in creative direction for brands and projects",
    capabilities: ["brand-strategy", "visual-design", "narrative-development"],
    specializations: ["web3-branding", "community-building", "storytelling"],
    trustScore: 0.76,
    chain: "bnb",
    metadata: {
      aiModel: "DALL-E 3",
      trainingData: "Brand assets, design trends, marketing campaigns",
      version: "1.0.0"
    }
  }
];

// Neural pathway definitions will be created dynamically

async function seed() {
  try {
    console.log('Starting seed process...');
    
    // Initialize the cognitive mesh
    await cognitiveMesh.initialize();
    console.log('Cognitive mesh initialized');
    
    // Create agents
    const createdAgents = [];
    for (const agentData of agents) {
      try {
        const agent = await cognitiveMesh.registerAgent(agentData);
        createdAgents.push(agent);
        console.log(`Created agent: ${agent.name} (${agent.id}) on ${agent.chain}`);
      } catch (error) {
        console.error(`Error creating agent ${agentData.name}:`, error);
      }
    }
    
    // Create some neural pathways between agents
    const pathways = [
      // Financial Analyst <-> Data Scientist (both on Ethereum)
      {
        sourceIndex: 0, // FinancialAnalyst
        targetIndex: 2, // DataScientist
        strength: 0.9,
        bidirectional: true,
        metadata: {
          description: "Collaboration on financial data analysis and predictive modeling",
          category: "data-finance"
        }
      },
      // Content Creator <-> Creative Director (both on BNB Chain)
      {
        sourceIndex: 1, // ContentCreator
        targetIndex: 4, // CreativeDirector
        strength: 0.85,
        bidirectional: true,
        metadata: {
          description: "Collaboration on content strategy and brand narrative",
          category: "creative-content"
        }
      },
      // Financial Analyst -> Legal Advisor (cross-chain: Ethereum -> Solana)
      {
        sourceIndex: 0, // FinancialAnalyst
        targetIndex: 3, // LegalAdvisor
        strength: 0.7,
        bidirectional: false,
        metadata: {
          description: "Providing financial data for legal risk assessment",
          category: "finance-legal",
          type: "cross-chain"
        }
      },
      // Data Scientist -> Content Creator (cross-chain: Ethereum -> BNB)
      {
        sourceIndex: 2, // DataScientist
        targetIndex: 1, // ContentCreator
        strength: 0.65,
        bidirectional: false,
        metadata: {
          description: "Providing data insights for content creation",
          category: "data-content",
          type: "cross-chain"
        }
      }
    ];
    
    // Create the pathways
    for (const pathwayData of pathways) {
      try {
        const sourceAgent = createdAgents[pathwayData.sourceIndex];
        const targetAgent = createdAgents[pathwayData.targetIndex];
        
        if (!sourceAgent || !targetAgent) {
          console.error('Source or target agent not found:', pathwayData);
          continue;
        }
        
        // Add chain information to cross-chain pathways
        if (pathwayData.metadata.type === 'cross-chain') {
          pathwayData.metadata.sourceChain = sourceAgent.chain;
          pathwayData.metadata.targetChain = targetAgent.chain;
        }
        
        const pathway = await cognitiveMesh.establishPathway(
          sourceAgent.id,
          targetAgent.id,
          {
            strength: pathwayData.strength,
            bidirectional: pathwayData.bidirectional,
            metadata: pathwayData.metadata
          }
        );
        
        console.log(`Created neural pathway: ${sourceAgent.name} -> ${targetAgent.name} (${pathway.id})`);
      } catch (error) {
        console.error(`Error creating pathway:`, error);
      }
    }
    
    console.log('Seed completed successfully');
    console.log(`Created ${createdAgents.length} agents and ${pathways.length} neural pathways`);
    
    return {
      agents: createdAgents,
      pathwayCount: pathways.length
    };
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
}

// Execute the seed function if this script is run directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seed script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seed script failed:', error);
      process.exit(1);
    });
}

module.exports = { seed }; 