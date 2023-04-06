import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { FC, useEffect, useState } from 'react';

import * as anchor from '@project-serum/anchor';
import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import idl from './solitor.json';
import { PublicKey } from '@solana/web3.js';

const idlString = JSON.stringify(idl);
const idlObject = JSON.parse(idlString);
const programID = new PublicKey(idl.metadata.address);

interface Audit {
    assets: {asset: string, status: number, shadowStatus?: number }[];
    auditor: PublicKey;
    owner: PublicKey;
}


export const Bank: FC = () => {
    const wallet = useWallet();
    
    const { connection } = useConnection();

    const anchorProvider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions()); //getProvider();
    const program = new Program(idlObject, programID, anchorProvider);

    const [ otherAddress, setOtherAddress ] = useState<string>('');
    const [ assetHash, setAssetHash ] = useState<string>('');
    const [ assetStatus, setAssetStatus ] = useState<string>('');
    const [ isAuditorRole, setIsAuditorRole ] = useState<boolean>(false);
    
    const [ hasPDA, setHasPDA ] = useState<boolean>(false);
    const [ auditData, setAuditData ] = useState<Audit>({ assets: [], auditor: undefined, owner: undefined });

    useEffect(() => {
        getAuditData();
    }, [ otherAddress ]);

    const generatePDAddress = () => {
        const addr1 = anchorProvider.wallet.publicKey.toBuffer();
        const addr2 = new anchor.web3.PublicKey(otherAddress).toBuffer();
        
        const [ audits ] = PublicKey.findProgramAddressSync([ // seeds
            utils.bytes.utf8.encode("sol-audit-trail"), 
            isAuditorRole ? addr2 : addr1,
            isAuditorRole ? addr1 : addr2
        ], program.programId);

        return audits;
    };

    const getAuditData = async () => {
        try {
            const audit = generatePDAddress();
            const auditPDAccount = await program.account.solAudit.fetch(audit);

            console.log('[getAuditData] auditPDAccount: ', auditPDAccount);
            console.log('[getAuditData] auditPDAccount: ', auditPDAccount as Audit);

            setHasPDA(true);
            setAuditData(auditPDAccount as Audit);
        } catch(err) {
            console.error(err);
            setHasPDA(false);
        }
    };

    // function to check if owner or auditor
    const isPDAOwner = anchorProvider.wallet.publicKey?.toString() === auditData.owner?.toString();
    const isPDAAuditor = anchorProvider.wallet.publicKey?.toString() === auditData.auditor?.toString();

    // function to create pda
    const createAssetLog = async () => {
        try {            
            // need to create a new PDA for the asset logs
            const audit = generatePDAddress();

            const tx = await program.methods.create().accounts({
                audit: audit,
                user: anchorProvider.wallet.publicKey,
                auditor: new PublicKey(otherAddress),
                systemProgram: web3.SystemProgram.programId,
              }).rpc();

            console.log('Wow! new asset pda created: ' + tx.toString());
            getAuditData();
        } catch(err) {
            console.log('error creating bank | err: ', err);
        }
    };

    // function to add asset to blockchain
    const addAsset = async () => {
        try {            
            // need to create a new PDA for the asset logs
            const audit = generatePDAddress();

            const tx = await program.methods.addAudit(assetHash).accounts({
                audit: audit,
                user: anchorProvider.wallet.publicKey,
                systemProgram: web3.SystemProgram.programId,
              }).rpc();

            console.log('Wow! new asset in pda: ' + tx.toString());
            getAuditData();
        } catch(err) {
            console.log('error creating bank | err: ', err);
        }
    };

    // function for auditor to set status of asset
    const setAuditStatus = async () => {
        try {            
            // need to create a new PDA for the asset logs
            const audit = generatePDAddress();

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

    const setAuditStatusV2 = async (assetHash: string, assetStatus: number) => {
        try {            
            // need to create a new PDA for the asset logs
            const audit = generatePDAddress();

            const tx = await program.methods.respondAudit(assetHash, assetStatus).accounts({
                audit: audit,
                user: anchorProvider.wallet.publicKey,
                systemProgram: web3.SystemProgram.programId,
              }).rpc();

            console.log('Wow! new asset pda created: ' + tx.toString());
            getAuditData();
        } catch(err) {
            console.log('error creating bank | err: ', err);
        }
    };

    // function to get asset and status
    /*
    const getAssetLogs = async () => {
    };
    */

    // <input for other address> | <button to create PDA> (maybe)<button to fetch pda data (assets)>
    // {for each asset}
    //      <text asset string> | {owner ? <text status> : {status is zero ? <text status> : <input for status> } }
    // {owner && <input for asset> | <button to submit>}

    return (
        <>
            <div className="flex flex-col justify-center">
                <>
                <div className="flex flex-row justify-center">
                    <div className="relative group items-center" style={{ padding: 8}}>
                        <input type="checkbox" id="horns" name="horns" checked={isAuditorRole} onChange={(e) => setIsAuditorRole(!isAuditorRole)} />
                        <label for="horns">Please check if you are an Auditor for a Client</label>
                    </div>
                </div>
                
                <div className="flex flex-row justify-center">
                    <div className="relative group items-center" style={{ padding: 8}}>
                        <h6>{isAuditorRole ? 'Client' : 'Auditor'} Address:</h6>
                        <input type="text"
                            style={{ color: 'black' }}
                            value={otherAddress}
                            onChange={(e) => setOtherAddress(e.target.value)} />
                    </div>

                    {!hasPDA && <div className="relative group items-center" style={{ padding: 8}}>
                            <button
                                className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                onClick={createAssetLog}>
                                <span className="block group-disabled:hidden" > 
                                    Create Audit PDA
                                </span>
                            </button>
                    </div>
                    }
                </div>
                
                {auditData.assets.map((asset, ix) => 
                    <div className="flex flex-row justify-center" key={`asset-${ix}`}>
                        <div className="relative group items-center" style={{ padding: 8}}>
                            <h6>Asset Entry #{ix}: </h6>
                        </div>
                        <div className="relative group items-center" style={{ padding: 8}}>
                            <h6>{asset.asset}</h6>
                        </div>
                        {0 < asset.status &&
                            <div className="relative group items-center" style={{ padding: 8}}>
                                <h6>{asset.status}</h6>
                            </div>
                        }

                        {isPDAAuditor && asset.status == 0 && <>
                            <div className="relative group items-center" style={{ padding: 8}}>
                                <h6>Asset Status:</h6>
                                <input type="number"
                                    style={{ color: 'black' }}
                                    value={asset.shadowStatus}
                                    onChange={(e) => setAuditData({ 
                                        ...auditData, 
                                        assets: auditData.assets.map(a => 
                                            a.asset === asset.asset ? 
                                                { ...a, shadowStatus: parseInt(e.target.value) } : 
                                                a
                                        )
                                    })
                                } />
                            </div>

                            <div className="relative group items-center" style={{ padding: 8}}>
                                <button
                                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                    onClick={(e) => setAuditStatusV2(asset.asset, asset.shadowStatus)}>
                                    <span className="block group-disabled:hidden" > 
                                        Update Status
                                    </span>
                                </button>
                            </div>
                        </>
                        }
                        
                    </div>
                )}

                {isPDAOwner && <div className="flex flex-row justify-center">
                    <div className="relative group items-center" style={{ padding: 8}}>
                        <h6>Asset Hash:</h6>
                        <input type="text"
                            style={{ color: 'black' }}
                            value={assetHash}
                            onChange={(e) => setAssetHash(e.target.value)} />
                    </div>

                    <div className="relative group items-center" style={{ padding: 8}}>
                        <button
                            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={addAsset}>
                            <span className="block group-disabled:hidden" > 
                                Add Asset to Audit
                            </span>
                        </button>
                    </div>
                </div>
                }
                </>
            </div>
        </>
    );
};

