# AICAT Airdrop Contract

A Solana smart contract for managing AICAT token airdrops with betting requirements. This contract ensures that users can only withdraw their airdropped tokens after they have placed at least one bet.

## Features

### Pool Management
- **Initialize Pool**: Set up the airdrop pool with initial AICAT tokens
- **Track Statistics**: Monitor total tokens, users created, and airdrop amounts
- **Admin Controls**: Refill pool and update airdrop amounts
- **Secure Access**: Only authorized admin can manage the pool

### User Management
- **Create Users**: Generate individual airdrop accounts for each user
- **Token Allocation**: Automatically allocate tokens from the pool to user accounts
- **State Tracking**: Monitor user betting status and withdrawal eligibility

### Betting Requirements
- **Bet Verification**: `has_bet` boolean tracks if user has placed a bet
- **Withdrawal Control**: Users can only withdraw after placing a bet
- **Integration Ready**: `mark_user_bet` function for betting system integration

## Contract Structure

### Pool Account
```rust
pub struct Pool {
    pub admin: Pubkey,                    // Admin wallet address
    pub airdrop_token_mint: Pubkey,       // AICAT token mint address
    pub pool_token_account: Pubkey,       // Pool's token account
    pub total_tokens: u64,                // Total tokens in pool
    pub airdrop_amount: u64,              // Amount per airdrop
    pub total_users: u64,                 // Total users created
    pub bump: u8,                         // PDA bump seed
}
```

### User Account
```rust
pub struct UserAccount {
    pub user: Pubkey,                     // User wallet address
    pub pool: Pubkey,                     // Associated pool
    pub airdrop_amount: u64,              // Airdrop amount received
    pub has_bet: bool,                    // Whether user has placed a bet
    pub can_withdraw: bool,               // Whether user can withdraw
    pub bump: u8,                         // PDA bump seed
}
```

## Instructions

### 1. Initialize Pool
```typescript
await client.initializePool(
    airdropTokenMint,  // AICAT token mint address
    initialAmount,     // Initial pool amount (e.g., 1000000)
    airdropAmount      // Amount per user (e.g., 100)
);
```

### 2. Create User
```typescript
await client.createUser(airdropTokenMint);
```

### 3. Mark User Bet (Called by Betting System)
```typescript
await client.markUserBet(userPublicKey);
```

### 4. Withdraw Airdrop (After Betting)
```typescript
await client.withdrawAirdrop(airdropTokenMint);
```

### 5. Admin Functions
```typescript
// Refill pool
await client.refillPool(airdropTokenMint, amount);

// Update airdrop amount
await client.updateAirdropAmount(newAmount);
```

## Setup Instructions

### Prerequisites
- Rust and Cargo
- Solana CLI
- Anchor Framework
- Node.js and npm

### Installation

1. **Clone and Setup**
```bash
git clone <repository>
cd aicat-airdrop-contract
```

2. **Install Dependencies**
```bash
# Install Rust dependencies
cargo build

# Install TypeScript client dependencies
cd client
npm install
```

3. **Build the Program**
```bash
anchor build
```

4. **Deploy to Solana**
```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

### Configuration

1. **Update Program ID**
   - After building, update the `declare_id!()` in `src/lib.rs` with your program ID
   - Update the program ID in your client configuration

2. **Set Up AICAT Token**
   - Ensure you have the AICAT token mint address
   - Make sure the admin wallet has sufficient AICAT tokens

## Usage Examples

### Basic Workflow

```typescript
import { AicatAirdropClient } from './client';
import { Connection, Keypair } from '@solana/web3.js';

// Initialize client
const connection = new Connection('https://api.devnet.solana.com');
const wallet = new Keypair(); // Your wallet
const client = new AicatAirdropClient(connection, wallet, programId);

// 1. Admin initializes pool
await client.initializePool(aicatMint, 1000000, 100);

// 2. User creates account and receives airdrop
await client.createUser(aicatMint);

// 3. User places a bet (your betting system calls this)
await client.markUserBet(userPublicKey);

// 4. User withdraws airdrop tokens
await client.withdrawAirdrop(aicatMint);
```

### Integration with Betting System

```typescript
// In your betting system, after a user places a bet:
async function onUserBet(userPublicKey: PublicKey) {
    try {
        await airdropClient.markUserBet(userPublicKey);
        console.log('User bet marked successfully');
    } catch (error) {
        console.error('Failed to mark user bet:', error);
    }
}
```

## Security Features

- **PDA Protection**: All accounts use Program Derived Addresses for security
- **Admin Controls**: Only authorized admin can manage pool
- **Betting Verification**: Users must bet before withdrawal
- **Token Safety**: Tokens are held in secure associated token accounts
- **Overflow Protection**: All arithmetic operations use checked math

## Error Handling

The contract includes comprehensive error handling:

- `InsufficientPoolFunds`: Pool doesn't have enough tokens
- `UnauthorizedUser`: User not authorized for operation
- `UnauthorizedAdmin`: Admin not authorized for operation
- `WithdrawalNotAllowed`: User cannot withdraw yet
- `BettingRequired`: User must bet before withdrawal
- `ArithmeticOverflow`: Mathematical overflow protection

## Testing

```bash
# Run tests
anchor test

# Run specific test
anchor test --skip-lint test_name
```

## Deployment Checklist

- [ ] Build program successfully
- [ ] Update program ID in source code
- [ ] Deploy to devnet for testing
- [ ] Test all functions with real transactions
- [ ] Deploy to mainnet
- [ ] Initialize pool with AICAT tokens
- [ ] Set up admin wallet
- [ ] Test user creation and betting flow

## Support

For issues or questions:
1. Check the error messages in the contract
2. Verify all account addresses are correct
3. Ensure sufficient SOL for transaction fees
4. Confirm AICAT token mint address is valid

## License

This project is licensed under the MIT License. 