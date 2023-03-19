import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useState } from 'react';

import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import idl from './solanapdas.json';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

const idlString = JSON.stringify(idl);
const idlObject = JSON.parse(idlString);
const programID = new PublicKey(idl.metadata.address);


export const Bank: FC = () => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [ banks, setBanks ] = useState([]);

    const getProvider = () => new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());

    const createBank = async () => {
        try {
            const anchorProvider = getProvider();
            const program = new Program(idlObject, programID, anchorProvider);
            
            // need to create a new PDA for the bank
            const [ bank ] = await PublicKey.findProgramAddressSync([ // seeds
                utils.bytes.utf8.encode("bankaccount"), 
                anchorProvider.wallet.publicKey.toBuffer()
            ], program.programId); // program id for smart contract


            console.log('idlObject: ', idlObject.toString());
            console.log('programID: ', programID.toString());
            console.log('anchorProvider: ', anchorProvider.toString());
            console.log('program: ', program.toString());
            console.log('utils.bytes.utf8.encode("bankaccount"): ', utils.bytes.utf8.encode("bankaccount").toString());
            console.log('anchorProvider.wallet.publicKey: ', anchorProvider.wallet.publicKey.toString());
            console.log('program.programId: ', program.programId.toString());
            console.log('bank: ', bank.toString());
            console.log('user: ', anchorProvider.wallet.publicKey.toString());
            console.log('systemProgram: ', web3.SystemProgram.programId.toString());

            await program.rpc.create("WsoS Bank", {
                accounts: {
                    bank,
                    user: anchorProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId
                }
            });

            console.log('Wow! new bank created @ ' + bank.toString());

        } catch(err) {
            console.log('error creating bank | err: ', err);
        }
    };

    const depositInBank = async (PDABankPublicKey: string) => {
        try {
            const anchorProvider = getProvider();
            const program = new Program(idlObject, programID, anchorProvider);
            
            // need to create a new PDA for the bank
            const [ bank ] = await PublicKey.findProgramAddressSync([ // seeds
                utils.bytes.utf8.encode("bankaccount"), 
                anchorProvider.wallet.publicKey.toBuffer()
            ], program.programId); // program id for smart contract


            await program.rpc.deposit(new BN(0.12 * LAMPORTS_PER_SOL), {
                accounts: {
                    bank: PDABankPublicKey,
                    user: anchorProvider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId
                }
            });

            console.log('Deposited 0.12 SOL into bank @ ', PDABankPublicKey);

        } catch(err) {
            console.log('error depositing into bank | err: ', err);
        }
    };

    const withdrawFromBank = async (PDABankPublicKey: string) => {
        try {
            const anchorProvider = getProvider();
            const program = new Program(idlObject, programID, anchorProvider);
            
            // need to create a new PDA for the bank
            const [ bank ] = await PublicKey.findProgramAddressSync([ // seeds
                utils.bytes.utf8.encode("bankaccount"), 
                anchorProvider.wallet.publicKey.toBuffer()
            ], program.programId); // program id for smart contract

            const bank_accts = await connection.getParsedProgramAccounts(program.programId);
            const bank_info_ctx = await connection.getParsedAccountInfo(bank);

            console.log('Withdraw all from bank @ ', PDABankPublicKey);
            console.log('bank: ', bank);
            console.log('bank_accts: ', bank_accts);
            console.log('bank_info_ctx: ', bank_info_ctx);

            
            await program.rpc.withdraw(new BN(0.1 * LAMPORTS_PER_SOL), {
                accounts: {
                    bank: PDABankPublicKey,
                    user: anchorProvider.wallet.publicKey
                }
            });
            

            console.log('Withdrew 0.1 SOL from bank @ ', PDABankPublicKey);
        } catch(err) {
            console.log('error withdrawing from bank | err: ', err);
        }
    };

    const getBanks = async () => {
        try {
            const anchorProvider = getProvider();
            const program = new Program(idlObject, programID, anchorProvider);

            Promise.all((await connection.getProgramAccounts(programID)).map(async bank => {
                console.log('[promise all map] bank: ', bank);
                return {
                    ...(await program.account.bank.fetch(bank.pubkey)),
                    pubkey: bank.pubkey
                }
            }
            )).then(banks => {
                console.log('[then] banks: ', banks);
                setBanks(banks);
            });
        } catch(err) {
            console.log('error fetching banks | err: ', err);
        }
    };


    return (
        <>
            {banks.map((bank) => {
                return (
                    <div key={bank.pubkey} className="md:hero-content flex flex-col">
                        <h1>{bank.name.toString()}</h1>
                        <span>{bank.balance.toString()}</span>
                        <div className="relative group items-center">
                            <button
                                className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                onClick={() => depositInBank(bank.pubkey)}>
                                Deposit 0.12 SOL
                            </button>
                            <button
                                className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                onClick={() => withdrawFromBank(bank.pubkey)}>
                                Withdraw 0.1 SOL
                            </button>
                        </div>
                    </div>
                )
            })}

            <div className="flex flex-row justify-center">
                <>
                    <div className="relative group items-center">
                        <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                        rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                        <button
                            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={createBank}>
                            <span className="block group-disabled:hidden" > 
                                Create Bank
                            </span>
                        </button>
                        <button
                            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={getBanks}>
                            <span className="block group-disabled:hidden" > 
                                Fetch Banks
                            </span>
                        </button>
                    </div>
                </>
            </div>
        </>
    );
};
