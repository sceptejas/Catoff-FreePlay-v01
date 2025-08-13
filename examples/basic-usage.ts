import { AicatAirdropClient } from '../client';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

async function main() {
    // Setup connection and wallet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // In production, you would load your actual wallet
    const adminWallet = Keypair.generate();
    const userWallet = Keypair.generate();
    
    // Your program ID (update this after deployment)
    const programId = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
    
    // AICAT token mint address (replace with your actual token mint)
    const aicatMint = new PublicKey('YOUR_AICAT_TOKEN_MINT_ADDRESS');
    
    // Initialize client
    const client = new AicatAirdropClient(connection, adminWallet, programId);
    
    try {
        console.log('🚀 Starting AICAT Airdrop Demo...\n');
        
        // Step 1: Admin initializes the pool
        console.log('1️⃣ Initializing pool...');
        await client.initializePool(aicatMint, 1000000, 100); // 1M tokens, 100 per user
        console.log('✅ Pool initialized successfully!\n');
        
        // Step 2: User creates account and receives airdrop
        console.log('2️⃣ Creating user account...');
        const userClient = new AicatAirdropClient(connection, userWallet, programId);
        await userClient.createUser(aicatMint);
        console.log('✅ User account created and airdrop received!\n');
        
        // Step 3: Check user account info
        console.log('3️⃣ Checking user account info...');
        const userInfo = await client.getUserAccountInfo(userWallet.publicKey);
        console.log('User Info:', {
            hasBet: userInfo.hasBet,
            canWithdraw: userInfo.canWithdraw,
            airdropAmount: userInfo.airdropAmount.toNumber()
        });
        console.log('✅ User info retrieved!\n');
        
        // Step 4: Simulate user placing a bet (your betting system would call this)
        console.log('4️⃣ Marking user bet...');
        await client.markUserBet(userWallet.publicKey);
        console.log('✅ User bet marked successfully!\n');
        
        // Step 5: User withdraws airdrop tokens
        console.log('5️⃣ Withdrawing airdrop...');
        await userClient.withdrawAirdrop(aicatMint);
        console.log('✅ Airdrop withdrawn successfully!\n');
        
        // Step 6: Check final user account info
        console.log('6️⃣ Checking final user account info...');
        const finalUserInfo = await client.getUserAccountInfo(userWallet.publicKey);
        console.log('Final User Info:', {
            hasBet: finalUserInfo.hasBet,
            canWithdraw: finalUserInfo.canWithdraw,
            airdropAmount: finalUserInfo.airdropAmount.toNumber()
        });
        console.log('✅ Final user info retrieved!\n');
        
        // Step 7: Admin refills the pool
        console.log('7️⃣ Refilling pool...');
        await client.refillPool(aicatMint, 50000); // Add 50k tokens
        console.log('✅ Pool refilled successfully!\n');
        
        // Step 8: Check pool info
        console.log('8️⃣ Checking pool info...');
        const poolInfo = await client.getPoolInfo();
        console.log('Pool Info:', {
            totalTokens: poolInfo.totalTokens.toNumber(),
            totalUsers: poolInfo.totalUsers.toNumber(),
            airdropAmount: poolInfo.airdropAmount.toNumber()
        });
        console.log('✅ Pool info retrieved!\n');
        
        console.log('🎉 Demo completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during demo:', error);
    }
}

// Integration example with betting system
async function integrateWithBettingSystem() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const adminWallet = Keypair.generate();
    const programId = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
    const aicatMint = new PublicKey('YOUR_AICAT_TOKEN_MINT_ADDRESS');
    
    const airdropClient = new AicatAirdropClient(connection, adminWallet, programId);
    
    // This function would be called by your betting system when a user places a bet
    async function onUserPlacesBet(userPublicKey: PublicKey) {
        try {
            console.log(`🎲 User ${userPublicKey.toString()} placed a bet`);
            
            // Mark the user as having placed a bet
            await airdropClient.markUserBet(userPublicKey);
            
            console.log('✅ User bet marked in airdrop contract');
            
            // Now the user can withdraw their airdrop tokens
            console.log('💰 User can now withdraw their airdrop tokens');
            
        } catch (error) {
            console.error('❌ Failed to mark user bet:', error);
        }
    }
    
    // Example usage
    const userPublicKey = Keypair.generate().publicKey;
    await onUserPlacesBet(userPublicKey);
}

// Run the demo
if (require.main === module) {
    main().catch(console.error);
}

export { main, integrateWithBettingSystem }; 