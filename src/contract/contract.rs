use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token};
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;

declare_id!("E7N3tt6G96BLoD6vXVhztDaD1mGpDEm533jjxKErVaKk"); // Replace with your program ID

#[program]
pub mod chaperone_me {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let admin_account = &mut ctx.accounts.admin_account;
        admin_account.authority = ctx.accounts.authority.key();
        admin_account.guides_count = 0;
        Ok(())
    }

    pub fn submit_verification(
        ctx: Context<SubmitVerification>,
        ic_number: String,
        name: String,
        email: String,
        phone: String,
        wallet_address: String,
        license_uri: String,
        photo_id_uri: String,
        attachment_uri: Option<String>,
        affiliation_type: AffiliationType,
        agency_name: Option<String>,
        offer_letter_uri: Option<String>,
    ) -> Result<()> {
        let guide_account = &mut ctx.accounts.guide_account;
        let admin_account = &mut ctx.accounts.admin_account;
        
        // Check if agency information is provided when required
        if affiliation_type == AffiliationType::Agency {
            require!(
                agency_name.is_some() && offer_letter_uri.is_some(),
                ErrorCode::MissingAgencyInformation
            );
        }
        
        guide_account.authority = ctx.accounts.authority.key();
        guide_account.ic_number = ic_number;
        guide_account.name = name;
        guide_account.email = email;
        guide_account.phone = phone;
        guide_account.wallet_address = wallet_address;
        guide_account.license_uri = license_uri;
        guide_account.photo_id_uri = photo_id_uri;
        guide_account.attachment_uri = attachment_uri;
        guide_account.affiliation_type = affiliation_type;
        guide_account.agency_name = agency_name;
        guide_account.offer_letter_uri = offer_letter_uri;
        guide_account.status = VerificationStatus::Pending;
        guide_account.approved_at = None;
        guide_account.index = admin_account.guides_count;
        
        // In Anchor 0.31.1, the bump for guide_account should be accessed like this:
        guide_account.bump = ctx.bumps.guide_account;
        
        admin_account.guides_count = admin_account.guides_count.checked_add(1).unwrap();
        
        emit!(VerificationSubmittedEvent {
            guide: guide_account.key(),
            submitter: ctx.accounts.authority.key(),
            name: guide_account.name.clone(),
            status: guide_account.status,
        });
        
        Ok(())
    }
    
    pub fn approve_verification(
        ctx: Context<ApproveVerification>,
        guide_authority: Pubkey,
        guide_index: u64,
    ) -> Result<()> {
        let guide_account = &mut ctx.accounts.guide_account;
        
        // Only pending guides can be approved
        require!(
            guide_account.status == VerificationStatus::Pending,
            ErrorCode::InvalidGuideStatus
        );
        
        guide_account.status = VerificationStatus::Approved;
        guide_account.approved_at = Some(Clock::get()?.unix_timestamp);
        
        emit!(VerificationStatusUpdatedEvent {
            guide: guide_account.key(),
            authority: guide_account.authority,
            status: guide_account.status,
        });
        
        Ok(())
    }
    
    pub fn reject_verification(
        ctx: Context<ApproveVerification>,
        guide_authority: Pubkey,
        guide_index: u64,
    ) -> Result<()> {
        let guide_account = &mut ctx.accounts.guide_account;
        
        // Only pending guides can be rejected
        require!(
            guide_account.status == VerificationStatus::Pending,
            ErrorCode::InvalidGuideStatus
        );
        
        guide_account.status = VerificationStatus::Rejected;
        
        emit!(VerificationStatusUpdatedEvent {
            guide: guide_account.key(),
            authority: guide_account.authority,
            status: guide_account.status,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AdminAccount::SIZE,
        seeds = [b"admin".as_ref()],
        bump
    )]
    pub admin_account: Account<'info, AdminAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitVerification<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GuideAccount::SIZE,
        seeds = [b"guide".as_ref(), authority.key().as_ref(), &admin_account.guides_count.to_le_bytes()],
        bump
    )]
    pub guide_account: Account<'info, GuideAccount>,
    
    #[account(
        mut,
        seeds = [b"admin".as_ref()],
        bump
    )]
    pub admin_account: Account<'info, AdminAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveVerification<'info> {
    #[account(
        mut,
        seeds = [b"guide".as_ref(), guide_account.authority.as_ref(), &guide_account.index.to_le_bytes()],
        bump = guide_account.bump
    )]
    pub guide_account: Account<'info, GuideAccount>,
    
    #[account(
        seeds = [b"admin".as_ref()],
        bump,
        constraint = admin_account.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub admin_account: Account<'info, AdminAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct AdminAccount {
    pub authority: Pubkey,      // The admin who can approve/reject verifications
    pub guides_count: u64,      // Total number of guide accounts created
}

impl AdminAccount {
    pub const SIZE: usize = 32 + 8; // authority + guides_count
}

#[account]
pub struct GuideAccount {
    pub authority: Pubkey,               // The guide's wallet
    pub ic_number: String,               // IC number (max 20 chars)
    pub name: String,                    // Full name (max 100 chars)
    pub email: String,                   // Email (max 100 chars)
    pub phone: String,                   // Phone number (max 20 chars)
    pub wallet_address: String,          // Wallet address (max 44 chars)
    pub license_uri: String,             // IPFS URI for the license (max 150 chars)
    pub photo_id_uri: String,           // IPFS URI for the photo ID (max 150 chars)
    pub attachment_uri: Option<String>,  // Optional attachment URI (max 150 chars)
    pub affiliation_type: AffiliationType, // Whether guide is agency or freelance
    pub agency_name: Option<String>,     // Agency name if affiliated (max 100 chars)
    pub offer_letter_uri: Option<String>, // IPFS URI for offer letter if agency affiliated (max 150 chars)
    pub status: VerificationStatus,      // Current verification status
    pub approved_at: Option<i64>,        // Timestamp when approved
    pub index: u64,                      // Index for PDA derivation
    pub bump: u8,                        // PDA bump
}

impl GuideAccount {
    pub const SIZE: usize = 32 + // authority
                            (4 + 20) + // ic_number
                            (4 + 100) + // name
                            (4 + 100) + // email
                            (4 + 20) + // phone
                            (4 + 44) + // wallet_address
                            (4 + 150) + // license_uri
                            (4 + 150) + // photo_id_uri
                            (1 + 4 + 150) + // attachment_uri (option)
                            1 + // affiliation_type
                            (1 + 4 + 100) + // agency_name (option)
                            (1 + 4 + 150) + // offer_letter_uri (option)
                            1 + // status
                            (1 + 8) + // approved_at (option)
                            8 + // index
                            1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy)]
pub enum VerificationStatus {
    Pending,
    Approved,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Copy)]
pub enum AffiliationType {
    Freelance,
    Agency,
}

#[event]
pub struct VerificationSubmittedEvent {
    pub guide: Pubkey,
    pub submitter: Pubkey,
    pub name: String,
    pub status: VerificationStatus,
}

#[event]
pub struct VerificationStatusUpdatedEvent {
    pub guide: Pubkey,
    pub authority: Pubkey,
    pub status: VerificationStatus,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
    #[msg("Invalid guide status for this operation")]
    InvalidGuideStatus,
    #[msg("Missing required agency information")]
    MissingAgencyInformation,
}
