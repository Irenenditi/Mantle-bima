import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer, { FileFilterCallback } from "multer";
import * as path from "path";
import * as fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";
import OpenAI from "openai";
import { dbHelpers } from "./database";
import type { ListingInput, StatusUpdate } from "./types";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// Middleware
app.use(cors());
app.use(express.json());
app.use("/storage", express.static(path.join(__dirname, "..", "storage")));

// Ensure upload/storage directories exist
const storageRoot = path.join(__dirname, "..", "storage");
fs.ensureDirSync(storageRoot);
fs.ensureDirSync(path.join(storageRoot, "uploads", "images"));
fs.ensureDirSync(path.join(storageRoot, "uploads", "documents"));
fs.ensureDirSync(path.join(storageRoot, "ipfs"));

// Configure multer for file uploads (all file writing goes under /storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir =
      file.fieldname === "images"
        ? path.join(storageRoot, "uploads", "images")
        : path.join(storageRoot, "uploads", "documents");
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb: FileFilterCallback) => {
    if (file.fieldname === "images") {
      // Accept images only
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for property images"));
      }
    } else {
      // Accept documents (PDF, DOC, DOCX, etc.)
      const allowedMimes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid document format"));
      }
    }
  },
});

// Chat proxy to OpenAI (secure, uses backend API key)
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing messages array" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "OPENAI_API_KEY not configured on server" });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content || "";
    return res.json({ reply });
  } catch (error: any) {
    const errPayload = error?.response?.data || {
      message: error.message || "Unknown error",
    };
    console.error("OpenAI proxy error:", errPayload);
    const payload =
      process.env.NODE_ENV === "production"
        ? { error: "Failed to get response from model" }
        : { error: "Failed to get response from model", details: errPayload };
    return res.status(500).json(payload);
  }
});

// Routes

// ---------- Core Bima backend routes (used directly by frontend) ----------

// Health check (used by frontend `backendStore.ts` and Mantle service checker)
const healthHandler = (req: Request, res: Response) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      ipfs: "configured",
      Mantle: "not configured", // This backend is acting as a local replacement
    },
  });
};

// Unprefixed version for Mantle service client
app.get("/health", healthHandler);
// Existing prefixed version retained for any legacy callers
app.get("/api/health", healthHandler);

// Simple IPFS-like file upload endpoint used by `api.uploadFileToIPFS`
// Reuses the global `upload` instance so limits and filters are consistent.
app.post("/ipfs/upload", upload.single("file"), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file provided" });
  }

  // Local dev: we are NOT uploading to real IPFS.
  // Return a stable, directly fetchable URL so the frontend doesn't try to treat it like a CID.
  const baseUrl = process.env.LOCAL_IPFS_GATEWAY || "http://localhost:5000";
  const isImage = (file.mimetype || "").startsWith("image/");
  const relativeUrl = isImage
    ? `/storage/uploads/images/${file.filename}`
    : `/storage/uploads/documents/${file.filename}`;
  const ipfsHash = `${baseUrl}${relativeUrl}`;

  // Return the shape expected by the frontend: { ipfsHash, url? }
  return res.json({
    ipfsHash,
    filename: file.filename,
    url: relativeUrl,
  });
});

// Simple IPFS-like JSON upload endpoint used by `api.uploadJSONToIPFS`
app.post("/ipfs/upload-json", async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    const ipfsDir = path.join(__dirname, "..", "storage", "ipfs");
    await fs.ensureDir(ipfsDir);

    const filename = `${Date.now()}-${uuidv4()}.json`;
    const fullPath = path.join(ipfsDir, filename);
    await fs.writeJson(fullPath, payload, { spaces: 2 });

    // For local dev, make the "hash" equal to the local gateway URL
    // so when the frontend calls https://gateway.pinata.cloud/ipfs/<hash>
    // it can instead be detected and proxied or simply ignored.
    const ipfsHash = `${process.env.LOCAL_IPFS_GATEWAY || "http://localhost:5000"}/storage/ipfs/${filename}`;

    return res.json({
      ipfsHash,
      filename,
      url: `/storage/ipfs/${filename}`,
    });
  } catch (error) {
    console.error("Error in /ipfs/upload-json:", error);
    return res.status(500).json({ error: "Failed to store JSON metadata" });
  }
});

// Lightweight listings index endpoint used by `api.createListing`
// This mimics the Mantle listings index API enough for the frontend to work.
app.post("/listings", (req: Request, res: Response) => {
  const { metadataHash, sellerId, indexCid } = req.body || {};

  if (!metadataHash || !sellerId) {
    return res
      .status(400)
      .json({ error: "metadataHash and sellerId are required" });
  }

  const newIndexCid =
    indexCid && typeof indexCid === "string"
      ? indexCid
      : `local-index-${Date.now()}`;

  // In a real Mantle service, this would update an IPFS index.
  // For local development we just echo back a stable indexCid so the UI works.
  return res.json({
    indexCid: newIndexCid,
    metadataHash,
    sellerId,
  });
});

// Mantle NFT create endpoint - creates a listing in the database so it appears in marketplace
// In production this would also interact with the Mantle blockchain service.
app.post("/nft/create", async (req: Request, res: Response) => {
  try {
    const { metadataHash, size, price, location } = req.body || {};
    
    if (!metadataHash || !size || !price || !location) {
      return res.status(400).json({ 
        error: "metadataHash, size, price, and location are required" 
      });
    }

    // Try to fetch metadata from IPFS/local storage to get additional fields
    let metadata: any = {};
    try {
      // Handle local IPFS hashes (http://localhost:5000/storage/ipfs/...)
      let metaUrl = metadataHash;
      if (!metadataHash.startsWith("http")) {
        // Try to resolve as local file first
        const localPath = path.join(__dirname, "..", "storage", "ipfs");
        const files = await fs.readdir(localPath);
        const matchingFile = files.find(f => metadataHash.includes(f) || f.includes(metadataHash.split("-").pop() || ""));
        if (matchingFile) {
          metaUrl = `http://localhost:5000/storage/ipfs/${matchingFile}`;
        } else {
          // Fallback to gateway (though this won't work for local-* hashes)
          metaUrl = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
        }
      }
      
      // Fetch metadata
      const metaResponse = await fetch(metaUrl);
      if (metaResponse.ok) {
        metadata = await metaResponse.json();
      }
    } catch (err) {
      console.log("Could not fetch metadata, using provided fields only:", err);
    }

    // Create listing data - use metadata if available, otherwise use provided fields
    const listingId = uuidv4();
    const listingData: ListingInput & {
      id: string;
      createdAt: string;
      updatedAt: string;
      status: string;
    } = {
      id: listingId,
      title: metadata.title || location || "Land Parcel",
      location: location,
      size: size,
      price: parseFloat(String(price)),
      description: metadata.description || "",
      landType: metadata.landType || null,
      zoning: metadata.zoning || null,
      accessibility: metadata.accessibility || null,
      metadataHash: metadataHash,
      status: "pending_verification", // New listings start as pending verification
      sellerName: metadata.owner?.name || metadata.sellerName || null,
      sellerPhone: metadata.owner?.phone || metadata.sellerPhone || null,
      sellerEmail: metadata.owner?.email || metadata.sellerEmail || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: metadata.images?.map((img: any) => {
        const imgHash = typeof img === "string" ? img : img.cid || img.ipfsHash || img.hash;
        return {
          filename: `${imgHash}.jpg`,
          originalName: typeof img === "string" ? `${imgHash}.jpg` : img.name || `${imgHash}.jpg`,
          path: imgHash.startsWith("http") ? imgHash : `/storage/uploads/images/${imgHash}.jpg`,
        };
      }) || [],
      documents: metadata.documents ? {
        titleDeed: metadata.documents.ownershipProof ? {
          filename: `${metadata.documents.ownershipProof}.pdf`,
          originalName: "title_deed.pdf",
          path: `/storage/uploads/documents/${metadata.documents.ownershipProof}.pdf`,
        } : undefined,
        surveyReport: metadata.documents.surveyMap ? {
          filename: `${metadata.documents.surveyMap}.pdf`,
          originalName: "survey_map.pdf",
          path: `/storage/uploads/documents/${metadata.documents.surveyMap}.pdf`,
        } : undefined,
      } : undefined,
      utilities: metadata.utilities || [],
      nearbyAmenities: metadata.nearbyAmenities || [],
    };

    // Save to database
    const newListing = dbHelpers.createListing(listingData);

    return res.json({
      ok: true,
      landId: listingId,
      metadataHash,
      size,
      price,
      location,
      message: "Listing created successfully",
    });
  } catch (error) {
    console.error("Error in /nft/create:", error);
    return res.status(500).json({ 
      error: "Failed to create listing",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Stub NFT mint endpoint so `api.mintLandNFT` works in local dev without errors.
app.post("/nft/mint", (req: Request, res: Response) => {
  const { tokenId, metadata } = req.body || {};
  return res.json({
    ok: true,
    tokenId,
    metadata,
    txId: "0.0.0@0.0.0", // dummy transaction id
    message: "NFT mint stubbed in local backend",
  });
});

// Stub land verification endpoint to satisfy `api.verifyLand` calls in local dev.
app.post("/land/verify", (req: Request, res: Response) => {
  try {
    const { landId, role, name, tokenId } = req.body || {};
    const id = String(landId || "").trim();
    if (!id) {
      return res.status(400).json({ error: "landId is required" });
    }

    const listing = dbHelpers.getListingById(id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found", landId: id });
    }

    // Map inspector roles to verification steps
    // - Surveyor: site verification
    // - Chief: legal verification
    const current = listing.verificationStatus || {
      documents: "pending",
      site: "pending",
      legal: "pending",
    };

    const next: any = { ...current };
    const roleStr = String(role || "").toLowerCase();
    if (roleStr === "surveyor") next.site = "approved";
    if (roleStr === "chief") next.legal = "approved";

    // If seller uploaded documents, we treat them as submitted; an admin flow could approve later.
    if (current.documents === "pending") {
      next.documents = "approved";
    }

    const allApproved =
      next.documents === "approved" &&
      next.site === "approved" &&
      next.legal === "approved";

    const updated = dbHelpers.updateListingStatus(id, {
      status: allApproved ? "verified" : "pending_verification",
      verificationStatus: next,
    });

    return res.json({
      ok: true,
      verified: allApproved,
      status: updated.status,
      landId: id,
      role,
      name,
      tokenId,
      verificationStatus: updated.verificationStatus,
      message: allApproved
        ? "Listing verified"
        : "Verification recorded (awaiting additional approvals)",
    });
  } catch (error) {
    console.error("Error in /land/verify:", error);
    return res.status(500).json({ error: "Failed to verify land" });
  }
});

// Resolve local IPFS hash to actual file URL
// This helps the frontend find files when metadata only contains "local-xxx" hashes
app.get("/ipfs/resolve/:hash", async (req: Request, res: Response) => {
  try {
    const hash = req.params.hash;
    if (!hash || !hash.startsWith("local-")) {
      return res.status(400).json({ error: "Invalid local hash format" });
    }

    // Extract UUID part from hash (local-xxx or local-json-xxx)
    const uuidPart = hash.replace(/^local-json-/, "").replace(/^local-/, "");
    
    // Search in both images and documents directories
    const imagesDir = path.join(__dirname, "..", "storage", "uploads", "images");
    const documentsDir = path.join(__dirname, "..", "storage", "uploads", "documents");
    const ipfsDir = path.join(__dirname, "..", "storage", "ipfs");

    const searchDirs = [imagesDir, documentsDir, ipfsDir];
    
    for (const dir of searchDirs) {
      try {
        const files = await fs.readdir(dir);
        // Find file that contains the UUID part
        const matchingFile = files.find(f => f.includes(uuidPart));
        if (matchingFile) {
          const relativePath = dir === ipfsDir 
            ? `/storage/ipfs/${matchingFile}`
            : dir === imagesDir
              ? `/storage/uploads/images/${matchingFile}`
              : `/storage/uploads/documents/${matchingFile}`;
          return res.json({ 
            url: `${process.env.LOCAL_IPFS_GATEWAY || "http://localhost:5000"}${relativePath}`,
            relativePath 
          });
        }
      } catch (err) {
        // Directory might not exist, continue searching
        continue;
      }
    }

    return res.status(404).json({ error: "File not found for hash" });
  } catch (error) {
    console.error("Error in /ipfs/resolve:", error);
    return res.status(500).json({ error: "Failed to resolve hash" });
  }
});

// Parcels endpoint used by `api.getParcels` – for now we expose all local listings
// as "parcels" so discovery and details pages have something to render.
app.get("/parcels", (req: Request, res: Response) => {
  try {
    const statusQuery = typeof req.query.status === "string" ? req.query.status : undefined;
    const listings = dbHelpers.getAllListings();

    // Map our listing shape into a generic parcel shape that the UI can handle.
    const parcelsAll = listings.map((l) => ({
      landId: l.id,
      title: l.title,
      size: l.size,
      price: l.price,
      location: l.location,
      description: l.description,
      landType: l.landType,
      zoning: l.zoning,
      utilities: l.utilities,
      nearbyAmenities: l.nearbyAmenities,
      seller: l.seller,
      metadataHash: l.metadataHash,
      status: l.status,
      images: l.images,
      documents: l.documents,
      createdAt: l.createdAt,
      submittedAt: l.createdAt, // Alias for compatibility
      updatedAt: l.updatedAt,
    }));

    // Optional filtering to mimic Mantle service behavior
    const parcels = statusQuery
      ? parcelsAll.filter((p) => {
          const s = String(p.status || "").toLowerCase();
          const q = statusQuery.toLowerCase();
          if (q === "pending") return s === "pending" || s === "pending_verification";
          if (q === "minted") return s === "minted" || s === "verified";
          return s === q;
        })
      : parcelsAll;

    // Return in a Mantle-like envelope so existing frontend code that expects
    // `res.items` continues to work, while components that accept a bare array
    // (and check `Array.isArray(res)`) also still work.
    res.json({ items: parcels });
  } catch (error) {
    console.error("Error in /parcels:", error);
    res.status(500).json({ error: "Failed to fetch parcels" });
  }
});

// Stub endpoint so `api.getListingsByIndex` does not 404 in development
app.get("/listings/by-index", (req: Request, res: Response) => {
  res.json({ items: [] });
});

// ---------- Original /api/* Bima listing routes ----------

// Get all listings
app.get("/api/listings", (req: Request, res: Response) => {
  try {
    const listings = dbHelpers.getAllListings();
    res.json(listings);
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// Get single listing by ID
app.get("/api/listings/:id", (req: Request, res: Response) => {
  try {
    console.log("Fetching listing with ID:", req.params.id);
    const listing = dbHelpers.getListingById(req.params.id);
    console.log("Found listing:", listing ? "Yes" : "No");

    if (!listing) {
      console.log("Listing not found, returning 404");
      return res.status(404).json({ error: "Listing not found" });
    }

    console.log("Returning single listing with price:", listing.price);
    res.json(listing);
  } catch (error) {
    console.error("Error in /api/listings/:id:", error);
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// Create new listing
app.post(
  "/api/listings",
  upload.fields([
    { name: "images", maxCount: 4 },
    { name: "titleDeed", maxCount: 1 },
    { name: "surveyReport", maxCount: 1 },
    { name: "taxCertificate", maxCount: 1 },
  ]),
  (req: Request, res: Response) => {
    try {
      const {
        title,
        location,
        size,
        price,
        description,
        landType,
        zoning,
        utilities,
        accessibility,
        nearbyAmenities,
        sellerName,
        sellerPhone,
        sellerEmail,
        metadataHash,
      } = req.body;

      // Validate required fields
      if (!title || !location || !size || !price) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Process uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const images = files.images
        ? files.images.map((file) => ({
            filename: file.filename,
            originalName: file.originalname,
            path: `/storage/uploads/images/${file.filename}`,
          }))
        : [];

      const documents: ListingInput["documents"] = {
        titleDeed: files.titleDeed
          ? {
              filename: files.titleDeed[0].filename,
              originalName: files.titleDeed[0].originalname,
              path: `/storage/uploads/documents/${files.titleDeed[0].filename}`,
            }
          : undefined,
        surveyReport: files.surveyReport
          ? {
              filename: files.surveyReport[0].filename,
              originalName: files.surveyReport[0].originalname,
              path: `/storage/uploads/documents/${files.surveyReport[0].filename}`,
            }
          : undefined,
        taxCertificate: files.taxCertificate
          ? {
              filename: files.taxCertificate[0].filename,
              originalName: files.taxCertificate[0].originalname,
              path: `/storage/uploads/documents/${files.taxCertificate[0].filename}`,
            }
          : undefined,
      };

      // Create new listing data
      const listingData: ListingInput & {
        id: string;
        createdAt: string;
        updatedAt: string;
        status: string;
      } = {
        id: uuidv4(),
        title,
        location,
        size,
        price: parseFloat(price),
        description,
        landType,
        zoning,
        utilities: utilities ? utilities.split(",").map((u: string) => u.trim()) : [],
        accessibility,
        nearbyAmenities: nearbyAmenities
          ? nearbyAmenities.split(",").map((a: string) => a.trim())
          : [],
        images,
        documents,
        sellerName,
        sellerPhone,
        sellerEmail,
        metadataHash: metadataHash || undefined,
        status: "pending_verification",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to database using SQLite
      const newListing = dbHelpers.createListing(listingData);

      res.status(201).json({
        message: "Listing created successfully",
        listing: newListing,
      });
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  }
);

// Update listing status (for verification)
app.patch("/api/listings/:id/status", (req: Request, res: Response) => {
  try {
    const { status, verificationStatus } = req.body;
    const statusData: StatusUpdate = {};

    if (status) {
      statusData.status = status;
    }

    if (verificationStatus) {
      statusData.verificationStatus = verificationStatus;
    }

    const updatedListing = dbHelpers.updateListingStatus(req.params.id, statusData);

    res.json({
      message: "Listing updated successfully",
      listing: updatedListing,
    });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({ error: "Failed to update listing" });
  }
});

// Delete listing
app.delete("/api/listings/:id", (req: Request, res: Response) => {
  try {
    const listing = dbHelpers.deleteListing(req.params.id);
    
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Remove associated files
    if (listing.images && listing.images.length > 0) {
      listing.images.forEach((image) => {
        const imagePath = path.join(
          __dirname,
          "..",
          "storage",
          "uploads",
          "images",
          image.filename
        );
        if (fs.existsSync(imagePath)) {
          fs.removeSync(imagePath);
        }
      });
    }

    if (listing.documents) {
      Object.values(listing.documents).forEach((doc) => {
        if (doc) {
          const docPath = path.join(
            __dirname,
            "..",
            "storage",
            "uploads",
            "documents",
            doc.filename
          );
          if (fs.existsSync(docPath)) {
            fs.removeSync(docPath);
          }
        }
      });
    }

    res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 10MB." });
    }
  }

  res.status(500).json({ error: error.message || "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bima Backend Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, "..", "uploads")}`);
  console.log(`💾 Database: SQLite (storage/data/bima.db)`);
});

