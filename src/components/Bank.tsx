import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useEffect, useState } from 'react';

import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import idl from './solanapdas.json';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

const idlString = JSON.stringify(idl);
const idlObject = JSON.parse(idlString);
const programID = new PublicKey(idl.metadata.address);


export const Bank: FC = () => {
    const wallet = useWallet();
    
    const { connection } = useConnection();

    const getProvider = () => new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    const anchorProvider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions()); //getProvider();
    const program = new Program(idlObject, programID, anchorProvider);

    const [ otherAddress, setOtherAddress ] = useState<string>();
    const [ assetHash, setAssetHash ] = useState<string>();
    const [ assetStatus, setAssetStatus ] = useState<string>();
    
    const [ hasPDA, setHasPDA ] = useState<boolean>(false);
    const [ isPDAOwner, setPDAOwner ] = useState<boolean>(false);

    const [ assetLogs, setAssetLogs ] = useState([]);

    useEffect(() => {
        setOwner();
    }, [ program ]);

    const setOwner = async () => {
        const owner = await isOwner();
        setPDAOwner(owner);
    };


    const generatePDAddress = async () => {
        try {
            const [ audits ] = await PublicKey.findProgramAddressSync([ // seeds
                utils.bytes.utf8.encode("sol-audit-trail"), 
                anchorProvider.wallet.publicKey.toBuffer(),
                new Buffer(otherAddress)
            ], program.programId);
            setHasPDA(true);
            return audits;
        } catch(err) {
            console.log('[generatePDAddress] err: ', err);
            setHasPDA(false);
            return null;
        }
    };

    // function to check if owner or auditor
    const isOwner = async (): Promise<boolean> => {
        try {
        const audit = await generatePDAddress();

        const auditPDAccount = await program.account.solAudit.fetch(audit);
        console.log('auditPDAccount.owner: ', auditPDAccount.owner);
        return anchorProvider.wallet.publicKey.toString() === auditPDAccount.owner.toString();
        } catch(err) {
            console.error(err);
            return false;
        }
    };

    // function to create pda
    const createAssetLog = async () => {
        try {            
            // need to create a new PDA for the asset logs
            const audit = await generatePDAddress();

            const tx = await program.methods.create().accounts({
                audit: audit,
                user: anchorProvider.wallet.publicKey,
                auditor: new PublicKey(otherAddress),
                systemProgram: web3.SystemProgram.programId,
              }).rpc();

            console.log('Wow! new asset pda created: ' + tx.toString());
        } catch(err) {
            console.log('error creating bank | err: ', err);
        }
    };

    // function to add asset to blockchain
    const addAsset = async () => {
        try {            
            // need to create a new PDA for the asset logs
            const audit = await generatePDAddress();

            const tx = await program.methods.addAudit(assetHash).accounts({
                audit: audit,
                user: anchorProvider.wallet.publicKey,
                systemProgram: web3.SystemProgram.programId,
              }).rpc();

            console.log('Wow! new asset pda created: ' + tx.toString());
        } catch(err) {
            console.log('error creating bank | err: ', err);
        }
    };

    // function for auditor to set status of asset
    const setAuditStatus = async () => {
        try {            
            // need to create a new PDA for the asset logs
            const audit = await generatePDAddress();

            const tx = await program.methods.respondAudit(assetHash, parseInt(assetStatus)).accounts({
                audit: audit,
                user: anchorProvider.wallet.publicKey,
                systemProgram: web3.SystemProgram.programId,
              }).rpc();

            console.log('Wow! new asset pda created: ' + tx.toString());
        } catch(err) {
            console.log('error creating bank | err: ', err);
        }
    };

    // function to get asset and status
    const getAssetLogs = async () => {

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
            <div className="flex flex-col justify-center">
                <>
                <div className="relative group items-center">
                    <div className="flex flex-row justify-center">
                        {isOwner && <div className="relative group items-center" style={{ padding: 8 }}>
                                <h6>Asset Status:</h6>
                                <input type="text"
                                    value={otherAddress}
                                    onChange={(event) => setOtherAddress(event.target.value)} />
                            </div>
                        }
                        
                        <div className="relative group items-center" style={{ padding: 8}}>
                            <button
                                className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                onClick={createAssetLog}>
                                <span className="block group-disabled:hidden" > 
                                    Create Asset
                                </span>
                            </button>
                        </div>
                    </div>                    
                    
                    <div className="flex flex-row justify-center">

                        <div className="relative group items-center" style={{ padding: 8}}>
                            <h6>Asset Hash: </h6>
                            <input type="text"
                                value={assetHash}
                                onChange={(e) => setAssetHash(e.target.value)} />
                        </div>

                        {isOwner && <div className="relative group items-center" style={{ padding: 8}}>
                                <h6>Asset Status:</h6>
                                <input type="text"
                                    value={assetStatus}
                                    onChange={(event) => setAssetStatus(event.target.value)} />
                            </div>
                        }

                    </div>

                    <div className="relative group items-center">
                        <button
                            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={isOwner ? addAsset : setAuditStatus}>
                            <span className="block group-disabled:hidden" > 
                                {isOwner ? 'Add Asset' : 'Log Asset'}
                            </span>
                        </button>
                    </div>
                </div>
                </>
            </div>
        </>
    );
};
