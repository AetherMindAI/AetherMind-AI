use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct TokenMetadata {
    pub pathway_id: Pubkey,
    pub mint: Pubkey,
    pub owner: Pubkey,
    pub created_at: i64,
    pub strength: u8,
    pub uri: String,
}

impl TokenMetadata {
    pub fn new(pathway_id: Pubkey, mint: Pubkey, owner: Pubkey, uri: String) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            pathway_id,
            mint,
            owner,
            created_at: now,
            strength: 1,
            uri,
        }
    }
} 