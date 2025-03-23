// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Neural Pathway Token
 * @dev ERC721 token representing neural pathways in the AETHERMIND network
 */
contract NeuralPathwayToken is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    // Mapping from token ID to source agent ID
    mapping(uint256 => string) private _sourceAgents;
    
    // Mapping from token ID to target agent ID
    mapping(uint256 => string) private _targetAgents;
    
    // Mapping from token ID to pathway strength (0-1000 representing 0.0-1.0)
    mapping(uint256 => uint16) private _strengths;
    
    // Mapping from agent pair to token ID (for uniqueness check)
    mapping(bytes32 => uint256) private _pathwayTokens;
    
    // Events
    event PathwayTokenMinted(uint256 indexed tokenId, string sourceAgentId, string targetAgentId, uint16 strength);
    event PathwayStrengthUpdated(uint256 indexed tokenId, uint16 previousStrength, uint16 newStrength);

    constructor() ERC721("Neural Pathway Token", "NPT") {}
    
    /**
     * @dev Creates a new Neural Pathway Token
     * @param to The address that will own the minted token
     * @param sourceAgentId The ID of the source agent
     * @param targetAgentId The ID of the target agent
     * @param strength The initial strength of the pathway (0-1000)
     * @param uri The token URI for metadata
     * @return The token ID of the newly minted token
     */
    function mintPathway(
        address to,
        string memory sourceAgentId,
        string memory targetAgentId,
        uint16 strength,
        string memory uri
    ) public onlyOwner returns (uint256) {
        require(strength <= 1000, "Strength must be between 0-1000");
        
        // Create a unique hash for the agent pair to ensure uniqueness
        bytes32 pathwayHash = keccak256(abi.encodePacked(sourceAgentId, targetAgentId));
        require(_pathwayTokens[pathwayHash] == 0, "Pathway token already exists");
        
        // Get the next token ID
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // Mint the token
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Store pathway data
        _sourceAgents[tokenId] = sourceAgentId;
        _targetAgents[tokenId] = targetAgentId;
        _strengths[tokenId] = strength;
        _pathwayTokens[pathwayHash] = tokenId;
        
        emit PathwayTokenMinted(tokenId, sourceAgentId, targetAgentId, strength);
        
        return tokenId;
    }
    
    /**
     * @dev Updates the strength of an existing pathway
     * @param tokenId The token ID of the pathway
     * @param newStrength The new strength value (0-1000)
     */
    function updatePathwayStrength(uint256 tokenId, uint16 newStrength) public onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(newStrength <= 1000, "Strength must be between 0-1000");
        
        uint16 previousStrength = _strengths[tokenId];
        _strengths[tokenId] = newStrength;
        
        emit PathwayStrengthUpdated(tokenId, previousStrength, newStrength);
    }
    
    /**
     * @dev Returns pathway details for a given token ID
     * @param tokenId The token ID
     * @return A tuple containing sourceAgentId, targetAgentId, and strength
     */
    function getPathwayDetails(uint256 tokenId) public view returns (string memory, string memory, uint16) {
        require(_exists(tokenId), "Token does not exist");
        
        return (_sourceAgents[tokenId], _targetAgents[tokenId], _strengths[tokenId]);
    }
    
    /**
     * @dev Checks if a pathway exists between two agents
     * @param sourceAgentId The ID of the source agent
     * @param targetAgentId The ID of the target agent
     * @return The token ID if it exists, 0 otherwise
     */
    function pathwayExists(string memory sourceAgentId, string memory targetAgentId) public view returns (uint256) {
        bytes32 pathwayHash = keccak256(abi.encodePacked(sourceAgentId, targetAgentId));
        return _pathwayTokens[pathwayHash];
    }
    
    // Required overrides
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 