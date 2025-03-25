use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum NeuralPathwayError {
    #[error("Invalid Instruction")]
    InvalidInstruction,
    #[error("Not Rent Exempt")]
    NotRentExempt,
    #[error("Invalid Agent")]
    InvalidAgent,
    #[error("Pathway Already Exists")]
    PathwayAlreadyExists,
}

impl From<NeuralPathwayError> for ProgramError {
    fn from(e: NeuralPathwayError) -> Self {
        ProgramError::Custom(e as u32)
    }
} 