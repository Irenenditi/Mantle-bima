import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { uploadFileToIPFS, uploadJSONToIPFS } from './uploadToIPFS.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { loadVerificationLog, saveVerificationLog, getLandEntryById, applyApproval } from './landService.js';
import { mintNFT, getTokenURI, getTokenOwner } from './mantleService.js';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());

async function fetchJsonFromIPFS(cid) {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch IPFS content: ${cid}`);
  return await r.json();
}

// Health Check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      ipfs: process.env.PINATA_API_KEY ? 'configured' : 'not configured',
      mantle: process.env.MANTLE_RPC_URL ? 'configured' : 'not configured',
      wallet: process.env.WALLET_PRIVATE_KEY ? 'configured' : 'not configured',
      nftContract: process.env.NFT_CONTRACT_ADDRESS ? 'configured' : 'not deployed'
    }
  });
});

// IPFS: Upload a file
app.post('/ipfs/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ipfsHash = await uploadFileToIPFS(req.file.path);
    fs.unlinkSync(req.file.path); // Cleanup temp
    res.json({ ipfsHash, status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IPFS: Upload metadata JSON
app.post('/ipfs/upload-json', async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ error: 'No JSON data' });
    const ipfsHash = await uploadJSONToIPFS(req.body);
    res.json({ ipfsHash, status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helpers for safe JSON file I/O
function loadJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.trim()) return [];
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// POST /listings: Create listing, store on IPFS, and mint NFT
app.post('/listings', async (req, res) => {
  try {
    const { metadata, sellerAddress } = req.body;
    if (!metadata || !sellerAddress) {
      return res.status(400).json({ error: 'Both metadata and sellerAddress are required' });
    }

    // Upload metadata to IPFS
    const metadataHash = await uploadJSONToIPFS(metadata);
    
    // Mint NFT to seller's address
    const mintResult = await mintNFT(sellerAddress, metadataHash);
    
    if (!mintResult.success) {
      return res.status(500).json({ 
        error: 'Failed to mint NFT',
        details: mintResult.error 
      });
    }

    // Create listing record
    const listingsFile = path.join(process.cwd(), 'listings-log.json');
    let data = loadJsonSafe(listingsFile);
    
    const record = {
      listingId: Date.now(),
      tokenId: mintResult.tokenId,
      metadataHash,
      sellerAddress,
      transactionHash: mintResult.transactionHash,
      status: 'pending_verification',
      createdAt: new Date().toISOString()
    };
    
    data.push(record);
    saveJson(listingsFile, data);
    
    res.status(201).json({
      success: true,
      ...record
    });
    if (indexCid) {
      try {
        const current = await fetchJsonFromIPFS(indexCid);
        if (Array.isArray(current)) nextIndex = current;
      } catch {}
    }
    if (record.ipfsCid) nextIndex.push(record.ipfsCid);
    let newIndexCid = null;
    try {
      newIndexCid = await uploadJSONToIPFS(nextIndex);
    } catch {}
    res.json({ listingId: record.listingId, status: record.status, ipfsCid: record.ipfsCid, indexCid: newIndexCid || indexCid || null, message: 'Listing created successfully.' });
  } catch (error) {
    console.error('Error saving listing to IPFS:', error);
    res.status(500).json({ error: error.message || 'Failed to save listing to IPFS' });
  }
});

// NFT Routes
app.post('/nft/create', upload.array('documents'), async (req, res) => {
  try {
    const { metadata, ownerAddress, size, price, location } = req.body;
    
    if (!metadata || !ownerAddress) {
      return res.status(400).json({ 
        error: 'Metadata and ownerAddress are required' 
      });
    }

    // Upload metadata to IPFS
    const metadataHash = await uploadJSONToIPFS(metadata);
    
    // Mint NFT to owner's address
    const mintResult = await mintNFT(ownerAddress, metadataHash);
    
    if (!mintResult.success) {
      return res.status(500).json({ 
        error: 'Failed to mint NFT',
        details: mintResult.error 
      });
    }

    // Create land entry
    const landEntry = {
      landId: Date.now(),
      tokenId: mintResult.tokenId,
      size,
      price,
      location,
      metadataHash,
      ownerAddress,
      transactionHash: mintResult.transactionHash,
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
      approvals: []
    };

    // Save to verification log
    const verificationLog = loadVerificationLog();
    verificationLog.push(landEntry);
    saveVerificationLog(verificationLog);

    res.json({ 
      success: true, 
      landId: landEntry.landId,
      tokenId: landEntry.tokenId,
      transactionHash: landEntry.transactionHash,
      metadataHash,
      message: 'Land NFT created successfully'
    });
  } catch (error) {
    console.error('Error creating land NFT:', error);
    res.status(500).json({ 
      error: 'Failed to create land NFT',
      details: error.message 
    });
  }
});

// Get all listings
app.get('/listings', async (req, res) => {
  try {
    const listingsFile = path.join(process.cwd(), 'listings-log.json');
    const data = loadJsonSafe(listingsFile);
    res.json({ items: data });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Get listing by ID
app.get('/listings/:id', async (req, res) => {
  try {
    const { cid } = req.query;
    if (!cid) return res.status(400).json({ error: 'cid is required' });
    const arr = await fetchJsonFromIPFS(String(cid));
    if (!Array.isArray(arr) || arr.length === 0) return res.json({ items: [] });
    const results = [];
    for (const c of arr) {
      try {
        const item = await fetchJsonFromIPFS(String(c));
        results.push({ ...item, ipfsCid: c });
      } catch {}
    }
    res.json({ items: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/nft/mint', async (req, res) => {
  try {
    const { mintNFT } = await import('./mintNFT.js');
    const { tokenId, metadata, metadataHash } = req.body || {};
    if (!tokenId && !process.env.TOKEN_ID) {
      return res.status(400).json({ error: 'tokenId is required (or set env TOKEN_ID)' });
    }
    if (!metadata && !metadataHash) {
      return res.status(400).json({ error: 'Provide metadata object or metadataHash' });
    }
    const result = await mintNFT({ tokenId, metadata, metadataHash });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify land ownership and update status
app.post('/land/verify', async (req, res) => {
  try {
    const { tokenId, verifierAddress, role, notes } = req.body || {};
    
    if (!tokenId || !verifierAddress || !role) {
      return res.status(400).json({ 
        error: 'tokenId, verifierAddress, and role are required' 
      });
    }
    
    // Verify token ownership
    let owner;
    try {
      owner = await getTokenOwner(tokenId);
    } catch (error) {
      return res.status(404).json({ 
        error: 'Token not found or invalid token ID',
        details: error.message
      });
    }

    // Load verification log
    const verificationLog = loadVerificationLog();
    const landIndex = verificationLog.findIndex(entry => entry.tokenId === tokenId);
    
    if (landIndex === -1) {
      return res.status(404).json({ error: 'Land entry not found for this token' });
    }
    
    const landEntry = verificationLog[landIndex];
    
    // Add verification record
    const verificationRecord = {
      role,
      verifierAddress,
      notes,
      timestamp: new Date().toISOString(),
      status: 'verified'
    };
    
    landEntry.approvals = landEntry.approvals || [];
    landEntry.approvals.push(verificationRecord);
    
    // Check if we have all required approvals
    const requiredApprovals = ['surveyor', 'lawyer', 'government'];
    const hasAllApprovals = requiredApprovals.every(requiredRole => 
      landEntry.approvals.some(a => a.role === requiredRole && a.status === 'verified')
    );
    
    if (hasAllApprovals) {
      landEntry.status = 'verified';
      landEntry.verifiedAt = new Date().toISOString();
      console.log(`Land token ${tokenId} has been fully verified`);
    }
    
    // Save the updated log
    verificationLog[landIndex] = landEntry;
    saveVerificationLog(verificationLog);
    
    res.json({
      success: true,
      tokenId,
      owner,
      status: landEntry.status,
      approvals: landEntry.approvals,
      message: `Verification recorded${hasAllApprovals ? '. Land is now fully verified.' : '.'}`
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Failed to process verification',
      details: error.message 
    });
  }
});

// Get all land parcels with optional status filter
app.get('/parcels', async (req, res) => {
  try {
    const { status } = req.query;
    const log = loadVerificationLog();
    let filtered = [...log];
    
    if (status) {
      filtered = filtered.filter((e) => e.status === status);
    }
    
    // Enrich with token data if needed
    const enrichedItems = await Promise.all(filtered.map(async (item) => {
      if (item.tokenId) {
        try {
          const owner = await getTokenOwner(item.tokenId);
          const tokenURI = await getTokenURI(item.tokenId);
          return { ...item, owner, tokenURI };
        } catch (error) {
          console.error(`Error fetching token ${item.tokenId}:`, error);
          return item;
        }
      }
      return item;
    }));
    
    res.json({ 
      count: enrichedItems.length, 
      items: enrichedItems 
    });
  } catch (error) {
    console.error('Error fetching parcels:', error);
    res.status(500).json({ 
      error: 'Failed to fetch parcels',
      details: error.message 
    });
  }
});

// Purchase: MNT transfer from buyer to seller, NFT transfer from seller to buyer
app.post('/market/purchase', async (req, res) => {
  try {
    const { tokenId, buyerAddress, sellerAddress, priceMNT } = req.body || {};
    
    if (!tokenId || !buyerAddress || !sellerAddress || !priceMNT) {
      return res.status(400).json({ 
        error: 'tokenId, buyerAddress, sellerAddress, and priceMNT are required' 
      });
    }
    
    // Get the NFT contract instance
    const nftContract = await getNFTContract();
    
    try {
      // 1. Verify the NFT is owned by the seller
      const currentOwner = await getTokenOwner(tokenId);
      if (currentOwner.toLowerCase() !== sellerAddress.toLowerCase()) {
        return res.status(400).json({ 
          error: 'Seller is not the current owner of this token' 
        });
      }
      
      // 2. In a real implementation, we would:
      //    - Check buyer's MNT balance
      //    - Approve the NFT transfer
      //    - Transfer MNT from buyer to seller (using a payment processor or smart contract)
      //    - Transfer NFT from seller to buyer
      
      // For this example, we'll simulate a successful transfer
      console.log(`Simulating transfer of token ${tokenId} from ${sellerAddress} to ${buyerAddress} for ${priceMNT} MNT`);
      
      // 3. In a real implementation, you would call the NFT contract's transfer function:
      // const tx = await nftContract.transferFrom(sellerAddress, buyerAddress, tokenId);
      // const receipt = await tx.wait();
      
      // 4. Update the land record
      const verificationLog = loadVerificationLog();
      const landIndex = verificationLog.findIndex(entry => entry.tokenId === tokenId);
      
      if (landIndex !== -1) {
        verificationLog[landIndex].ownerAddress = buyerAddress;
        verificationLog[landIndex].lastSoldPrice = priceMNT;
        verificationLog[landIndex].lastSoldAt = new Date().toISOString();
        verificationLog[landIndex].status = 'owned';
        saveVerificationLog(verificationLog);
      }
      
      res.json({
        success: true,
        message: 'Purchase completed successfully',
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64), // Simulated tx hash
        details: {
          tokenId,
          from: sellerAddress,
          to: buyerAddress,
          amount: priceMNT,
          currency: 'MNT',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Purchase error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Purchase failed:', error);
    res.status(500).json({ 
      error: 'Purchase failed',
      details: error.message 
    });
  }
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});