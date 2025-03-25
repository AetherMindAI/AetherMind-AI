use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct NeuralPathway {
    pub source_agent: Pubkey,
    pub target_agent: Pubkey,
    pub strength: u8,
    pub created_at: i64,
    pub last_used: i64,
    pub success_count: u64,
    pub failure_count: u64,
}

impl NeuralPathway {
    pub fn new(source_agent: Pubkey, target_agent: Pubkey) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            source_agent,
            target_agent,
            strength: 1,
            created_at: now,
            last_used: now,
            success_count: 0,
            failure_count: 0,
        }
    }
} 