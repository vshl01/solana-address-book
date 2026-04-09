import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { isValidSolanaAddress } from "../utils";

const router = Router();

// POST /api/derive-pda — Derive a Program Derived Address
router.post("/", (req: Request, res: Response) => {
  try {
    const { programId, seeds } = req.body;

    if (!programId) {
      return res
        .status(400)
        .json({ error: "Missing required field: programId" });
    }

    if (!seeds) {
      return res.status(400).json({ error: "Missing required field: seeds" });
    }

    if (!isValidSolanaAddress(programId)) {
      return res.status(400).json({ error: "Invalid programId" });
    }

    if (!Array.isArray(seeds)) {
      return res.status(400).json({ error: "Seeds must be an array" });
    }

    if (seeds.length === 0) {
      return res.status(400).json({ error: "Seeds array cannot be empty" });
    }

    const seedBuffers: Buffer[] = [];

    for (const seed of seeds) {
      if (typeof seed !== "string") {
        return res.status(400).json({ error: "All seeds must be strings" });
      }

      const seedBuffer = Buffer.from(seed, "utf-8");

      if (seedBuffer.length > 32) {
        return res.status(400).json({ error: "Seed exceeds 32 bytes" });
      }

      seedBuffers.push(seedBuffer);
    }

    const programPubkey = new PublicKey(programId);
    const [pda, bump] = PublicKey.findProgramAddressSync(
      seedBuffers,
      programPubkey,
    );

    return res.status(200).json({
      pda: pda.toBase58(),
      bump,
    });
  } catch {
    return res.status(400).json({ error: "Invalid programId" });
  }
});

export default router;
