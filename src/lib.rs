use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod aicat_airdrop {
    use super::*;

    /// Initialize the airdrop pool with initial AICAT tokens
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        initial_amount: u64,
        airdrop_amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.admin = ctx.accounts.admin.key();
        pool.airdrop_token_mint = ctx.accounts.airdrop_token_mint.key();
        pool.pool_token_account = ctx.accounts.pool_token_account.key();
        pool.total_tokens = initial_amount;
        pool.airdrop_amount = airdrop_amount;
        pool.total_users = 0;
        pool.bump = *ctx.bumps.get("pool").unwrap();

        // Transfer initial tokens to pool
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.admin_token_account.to_account_info(),
                to: ctx.accounts.pool_token_account.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, initial_amount)?;

        msg!("Pool initialized with {} AICAT tokens", initial_amount);
        Ok(())
    }

    /// Create a new user and allocate airdrop tokens
    pub fn create_user(
        ctx: Context<CreateUser>,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let user_account = &mut ctx.accounts.user_account;

        // Check if pool has enough tokens
        require!(
            pool.total_tokens >= pool.airdrop_amount,
            AicatAirdropError::InsufficientPoolFunds
        );

        // Initialize user account
        user_account.user = ctx.accounts.user.key();
        user_account.pool = pool.key();
        user_account.airdrop_amount = pool.airdrop_amount;
        user_account.has_bet = false;
        user_account.can_withdraw = false;
        user_account.bump = *ctx.bumps.get("user_account").unwrap();

        // Transfer tokens from pool to user
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            &[&[b"pool", &[pool.bump]]],
        );
        token::transfer(transfer_ctx, pool.airdrop_amount)?;

        // Update pool state
        pool.total_tokens = pool.total_tokens.checked_sub(pool.airdrop_amount)
            .ok_or(AicatAirdropError::ArithmeticOverflow)?;
        pool.total_users = pool.total_users.checked_add(1)
            .ok_or(AicatAirdropError::ArithmeticOverflow)?;

        msg!("User created with {} AICAT tokens", pool.airdrop_amount);
        Ok(())
    }

    /// Mark that a user has placed a bet (called by betting system)
    pub fn mark_user_bet(
        ctx: Context<MarkUserBet>,
    ) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        
        require!(
            user_account.user == ctx.accounts.user.key(),
            AicatAirdropError::UnauthorizedUser
        );

        user_account.has_bet = true;
        user_account.can_withdraw = true;

        msg!("User marked as having placed a bet");
        Ok(())
    }

    /// Allow user to withdraw their airdrop tokens after betting
    pub fn withdraw_airdrop(
        ctx: Context<WithdrawAirdrop>,
    ) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        
        require!(
            user_account.user == ctx.accounts.user.key(),
            AicatAirdropError::UnauthorizedUser
        );
        require!(
            user_account.can_withdraw,
            AicatAirdropError::WithdrawalNotAllowed
        );
        require!(
            user_account.has_bet,
            AicatAirdropError::BettingRequired
        );

        let amount = user_account.airdrop_amount;
        
        // Transfer tokens from user's airdrop account to their wallet
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.user_wallet.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Reset user account
        user_account.airdrop_amount = 0;
        user_account.can_withdraw = false;

        msg!("User withdrew {} AICAT tokens", amount);
        Ok(())
    }

    /// Admin function to refill the pool
    pub fn refill_pool(
        ctx: Context<RefillPool>,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        require!(
            pool.admin == ctx.accounts.admin.key(),
            AicatAirdropError::UnauthorizedAdmin
        );

        // Transfer tokens to pool
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.admin_token_account.to_account_info(),
                to: ctx.accounts.pool_token_account.to_account_info(),
                authority: ctx.accounts.admin.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        pool.total_tokens = pool.total_tokens.checked_add(amount)
            .ok_or(AicatAirdropError::ArithmeticOverflow)?;

        msg!("Pool refilled with {} AICAT tokens", amount);
        Ok(())
    }

    /// Admin function to update airdrop amount
    pub fn update_airdrop_amount(
        ctx: Context<UpdateAirdropAmount>,
        new_amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        require!(
            pool.admin == ctx.accounts.admin.key(),
            AicatAirdropError::UnauthorizedAdmin
        );

        pool.airdrop_amount = new_amount;

        msg!("Airdrop amount updated to {} AICAT tokens", new_amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Pool::LEN,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub airdrop_token_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = airdrop_token_mint,
        associated_token::authority = pool,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = airdrop_token_mint,
        associated_token::authority = admin,
    )]
    pub admin_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(
        init,
        payer = user,
        space = 8 + UserAccount::LEN,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = pool.airdrop_token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = pool.airdrop_token_mint,
        associated_token::authority = pool,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MarkUserBet<'info> {
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawAirdrop<'info> {
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = pool.airdrop_token_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [b"pool"],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(
        mut,
        associated_token::mint = pool.airdrop_token_mint,
        associated_token::authority = user,
    )]
    pub user_wallet: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RefillPool<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,
    
    pub admin: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = pool.airdrop_token_mint,
        associated_token::authority = admin,
    )]
    pub admin_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = pool.airdrop_token_mint,
        associated_token::authority = pool,
    )]
    pub pool_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateAirdropAmount<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,
    
    pub admin: Signer<'info>,
}

#[account]
pub struct Pool {
    pub admin: Pubkey,
    pub airdrop_token_mint: Pubkey,
    pub pool_token_account: Pubkey,
    pub total_tokens: u64,
    pub airdrop_amount: u64,
    pub total_users: u64,
    pub bump: u8,
}

impl Pool {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct UserAccount {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub airdrop_amount: u64,
    pub has_bet: bool,
    pub can_withdraw: bool,
    pub bump: u8,
}

impl UserAccount {
    pub const LEN: usize = 32 + 32 + 8 + 1 + 1 + 1;
}

#[error_code]
pub enum AicatAirdropError {
    #[msg("Insufficient funds in pool")]
    InsufficientPoolFunds,
    #[msg("Unauthorized user")]
    UnauthorizedUser,
    #[msg("Unauthorized admin")]
    UnauthorizedAdmin,
    #[msg("Withdrawal not allowed")]
    WithdrawalNotAllowed,
    #[msg("Betting required before withdrawal")]
    BettingRequired,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
} 
