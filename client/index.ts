import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AicatAirdrop } from "../target/types/aicat_airdrop";
import { PublicKey, Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

export class AicatAirdropClient {
    private program: Program<AicatAirdrop>;
    private connection: Connection;
    private wallet: anchor.Wallet;

    constructor(
        connection: Connection,
        wallet: anchor.Wallet,
        programId: PublicKey
    ) {
        this.connection = connection;
        this.wallet = wallet;
        
        // Initialize the program
        const provider = new anchor.AnchorProvider(connection, wallet, {
            commitment: "confirmed",
        });
        anchor.setProvider(provider);
        
        this.program = anchor.workspace.AicatAirdrop as Program<AicatAirdrop>;
    }

    /**
     * Get the pool PDA
     */
    async getPoolPDA(): Promise<[PublicKey, number]> {
        return PublicKey.findProgramAddress(
            [Buffer.from("pool")],
            this.program.programId
        );
    }

    /**
     * Get the user account PDA
     */
    async getUserAccountPDA(user: PublicKey): Promise<[PublicKey, number]> {
        return PublicKey.findProgramAddress(
            [Buffer.from("user"), user.toBuffer()],
            this.program.programId
        );
    }

    /**
     * Initialize the airdrop pool
     */
    async initializePool(
        airdropTokenMint: PublicKey,
        initialAmount: number,
        airdropAmount: number
    ) {
        const [poolPDA, poolBump] = await this.getPoolPDA();
        
        // Get associated token accounts
        const poolTokenAccount = await getAssociatedTokenAddress(
            airdropTokenMint,
            poolPDA,
            true
        );
        
        const adminTokenAccount = await getAssociatedTokenAddress(
            airdropTokenMint,
            this.wallet.publicKey
        );

        try {
            const tx = await this.program.methods
                .initializePool(
                    new anchor.BN(initialAmount),
                    new anchor.BN(airdropAmount)
                )
                .accounts({
                    pool: poolPDA,
                    admin: this.wallet.publicKey,
                    airdropTokenMint: airdropTokenMint,
                    poolTokenAccount: poolTokenAccount,
                    adminTokenAccount: adminTokenAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                })
                .rpc();

            console.log("Pool initialized successfully:", tx);
            return tx;
        } catch (error) {
            console.error("Error initializing pool:", error);
            throw error;
        }
    }

    /**
     * Create a new user and allocate airdrop tokens
     */
    async createUser(airdropTokenMint: PublicKey) {
        const [poolPDA] = await this.getPoolPDA();
        const [userAccountPDA] = await this.getUserAccountPDA(this.wallet.publicKey);
        
        // Get associated token accounts
        const userTokenAccount = await getAssociatedTokenAddress(
            airdropTokenMint,
            this.wallet.publicKey
        );
        
        const poolTokenAccount = await getAssociatedTokenAddress(
            airdropTokenMint,
            poolPDA
        );

        try {
            const tx = await this.program.methods
                .createUser()
                .accounts({
                    pool: poolPDA,
                    userAccount: userAccountPDA,
                    user: this.wallet.publicKey,
                    userTokenAccount: userTokenAccount,
                    poolTokenAccount: poolTokenAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                })
                .rpc();

            console.log("User created successfully:", tx);
            return tx;
        } catch (error) {
            console.error("Error creating user:", error);
            throw error;
        }
    }

    /**
     * Mark that a user has placed a bet
     */
    async markUserBet(user: PublicKey) {
        const [userAccountPDA] = await this.getUserAccountPDA(user);

        try {
            const tx = await this.program.methods
                .markUserBet()
                .accounts({
                    userAccount: userAccountPDA,
                    user: user,
                })
                .rpc();

            console.log("User bet marked successfully:", tx);
            return tx;
        } catch (error) {
            console.error("Error marking user bet:", error);
            throw error;
        }
    }

    /**
     * Allow user to withdraw their airdrop tokens after betting
     */
    async withdrawAirdrop(airdropTokenMint: PublicKey) {
        const [poolPDA] = await this.getPoolPDA();
        const [userAccountPDA] = await this.getUserAccountPDA(this.wallet.publicKey);
        
        // Get associated token accounts
        const userTokenAccount = await getAssociatedTokenAddress(
            airdropTokenMint,
            this.wallet.publicKey
        );
        
        const userWallet = await getAssociatedTokenAddress(
            airdropTokenMint,
            this.wallet.publicKey
        );

        try {
            const tx = await this.program.methods
                .withdrawAirdrop()
                .accounts({
                    userAccount: userAccountPDA,
                    user: this.wallet.publicKey,
                    userTokenAccount: userTokenAccount,
                    pool: poolPDA,
                    userWallet: userWallet,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();

            console.log("Airdrop withdrawn successfully:", tx);
            return tx;
        } catch (error) {
            console.error("Error withdrawing airdrop:", error);
            throw error;
        }
    }

    /**
     * Admin function to refill the pool
     */
    async refillPool(airdropTokenMint: PublicKey, amount: number) {
        const [poolPDA] = await this.getPoolPDA();
        
        // Get associated token accounts
        const adminTokenAccount = await getAssociatedTokenAddress(
            airdropTokenMint,
            this.wallet.publicKey
        );
        
        const poolTokenAccount = await getAssociatedTokenAddress(
            airdropTokenMint,
            poolPDA
        );

        try {
            const tx = await this.program.methods
                .refillPool(new anchor.BN(amount))
                .accounts({
                    pool: poolPDA,
                    admin: this.wallet.publicKey,
                    adminTokenAccount: adminTokenAccount,
                    poolTokenAccount: poolTokenAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();

            console.log("Pool refilled successfully:", tx);
            return tx;
        } catch (error) {
            console.error("Error refilling pool:", error);
            throw error;
        }
    }

    /**
     * Admin function to update airdrop amount
     */
    async updateAirdropAmount(newAmount: number) {
        const [poolPDA] = await this.getPoolPDA();

        try {
            const tx = await this.program.methods
                .updateAirdropAmount(new anchor.BN(newAmount))
                .accounts({
                    pool: poolPDA,
                    admin: this.wallet.publicKey,
                })
                .rpc();

            console.log("Airdrop amount updated successfully:", tx);
            return tx;
        } catch (error) {
            console.error("Error updating airdrop amount:", error);
            throw error;
        }
    }

    /**
     * Get pool information
     */
    async getPoolInfo() {
        const [poolPDA] = await this.getPoolPDA();
        
        try {
            const poolAccount = await this.program.account.pool.fetch(poolPDA);
            return poolAccount;
        } catch (error) {
            console.error("Error fetching pool info:", error);
            throw error;
        }
    }

    /**
     * Get user account information
     */
    async getUserAccountInfo(user: PublicKey) {
        const [userAccountPDA] = await this.getUserAccountPDA(user);
        
        try {
            const userAccount = await this.program.account.userAccount.fetch(userAccountPDA);
            return userAccount;
        } catch (error) {
            console.error("Error fetching user account info:", error);
            throw error;
        }
    }
} 