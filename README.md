# Solana Address Book API

A REST API for managing Solana addresses with cryptographic operations including address type detection, ATA derivation, signature verification, and PDA derivation.

---

## Folder Structure

```
solana-address-book/
├── src/
│   ├── index.ts              # App entry point — mounts routes, starts server
│   ├── constants.ts          # TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, PORT
│   ├── types.ts              # ContactType and Contact interface
│   ├── store.ts              # In-memory contacts array and ID counter
│   ├── utils.ts              # isValidSolanaAddress, detectAddressType, helpers
│   └── routes/
│       ├── contacts.ts       # CRUD + ATA derivation for /api/contacts
│       ├── verify.ts         # Ed25519 signature verification /api/verify-ownership
│       └── pda.ts            # PDA derivation /api/derive-pda
├── tests/
│   └── test-api.sh           # Automated bash test suite (47+ cases)
├── docs/
│   ├── TEST_CASES.md         # Full test case documentation
│   └── EDGE_CASES.md         # Edge case handling guide
├── package.json
├── tsconfig.json
└── README.md
```

---

## Features

- Full CRUD Operations for contact management
- Automatic Address Type Detection (wallet vs PDA using Ed25519 curve)
- Associated Token Account (ATA) Derivation
- Ed25519 Signature Verification
- Program Derived Address (PDA) Generation
- Comprehensive Input Validation (150+ edge cases handled)
- In-Memory Storage (no database required)

---

## Installation & Running

```bash
npm install
npm start
```

Server starts at `http://localhost:3000`

---

## API Reference

### 1. Add Contact

**POST** `/api/contacts`

Adds a new contact. Address type (`wallet` or `pda`) is auto-detected.

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "address": "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T"}'
```

**Response `201`:**
```json
{
  "id": 1,
  "name": "Alice",
  "address": "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T",
  "type": "wallet",
  "createdAt": "2026-04-09T10:30:00.000Z"
}
```

| Status | Meaning |
|--------|---------|
| `201`  | Contact created |
| `400`  | Missing or invalid `name` / `address` |
| `409`  | Address already exists |

---

### 2. List All Contacts

**GET** `/api/contacts`

Returns all contacts sorted by ID. Optionally filter by `type`.

```bash
# All contacts
curl http://localhost:3000/api/contacts

# Only wallets
curl "http://localhost:3000/api/contacts?type=wallet"

# Only PDAs
curl "http://localhost:3000/api/contacts?type=pda"
```

**Response `200`:**
```json
[
  {
    "id": 1,
    "name": "Alice",
    "address": "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T",
    "type": "wallet",
    "createdAt": "2026-04-09T10:30:00.000Z"
  }
]
```

| Status | Meaning |
|--------|---------|
| `200`  | Success (empty array if no contacts) |
| `400`  | Invalid `type` query parameter |

---

### 3. Get Contact by ID

**GET** `/api/contacts/:id`

```bash
curl http://localhost:3000/api/contacts/1
```

**Response `200`:**
```json
{
  "id": 1,
  "name": "Alice",
  "address": "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T",
  "type": "wallet",
  "createdAt": "2026-04-09T10:30:00.000Z"
}
```

| Status | Meaning |
|--------|---------|
| `200`  | Contact found |
| `404`  | Contact not found |

---

### 4. Update Contact Name

**PUT** `/api/contacts/:id`

Only the `name` field can be updated.

```bash
curl -X PUT http://localhost:3000/api/contacts/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated"}'
```

**Response `200`:**
```json
{
  "id": 1,
  "name": "Alice Updated",
  "address": "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T",
  "type": "wallet",
  "createdAt": "2026-04-09T10:30:00.000Z"
}
```

| Status | Meaning |
|--------|---------|
| `200`  | Contact updated |
| `400`  | Missing or invalid `name` |
| `404`  | Contact not found |

---

### 5. Delete Contact

**DELETE** `/api/contacts/:id`

```bash
curl -X DELETE http://localhost:3000/api/contacts/1
```

**Response `200`:**
```json
{ "message": "Contact deleted" }
```

| Status | Meaning |
|--------|---------|
| `200`  | Contact deleted |
| `404`  | Contact not found |

---

### 6. Derive Associated Token Account (ATA)

**POST** `/api/contacts/:id/derive-ata`

Derives the ATA for a contact's address and the given token mint.

```bash
curl -X POST http://localhost:3000/api/contacts/1/derive-ata \
  -H "Content-Type: application/json" \
  -d '{"mintAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}'
```

**Response `200`:**
```json
{
  "ata": "7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi",
  "owner": "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T",
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

The ATA is derived as:
```
findProgramAddressSync(
  [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
  ASSOCIATED_TOKEN_PROGRAM_ID
)
```

| Status | Meaning |
|--------|---------|
| `200`  | ATA derived |
| `400`  | Missing or invalid `mintAddress` |
| `404`  | Contact not found |

---

### 7. Verify Ownership

**POST** `/api/verify-ownership`

Verifies an Ed25519 signature to prove ownership of a Solana address.

```bash
curl -X POST http://localhost:3000/api/verify-ownership \
  -H "Content-Type: application/json" \
  -d '{
    "address": "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T",
    "message": "I own this wallet",
    "signature": "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJwgtYRtmJPzRv1wJcPk8YGBbMc8iFN8f9dYPnLw1NJ5g"
  }'
```

**Response `200`:**
```json
{ "valid": true }
```

The signature is verified using `nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)`. An invalid or non-matching signature returns `{ "valid": false }` with status `200`.

| Status | Meaning |
|--------|---------|
| `200`  | Verification ran (check `valid` field) |
| `400`  | Missing fields or invalid input format |

---

### 8. Derive Program Derived Address (PDA)

**POST** `/api/derive-pda`

Derives a PDA from a program ID and an array of string seeds.

```bash
curl -X POST http://localhost:3000/api/derive-pda \
  -H "Content-Type: application/json" \
  -d '{
    "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "seeds": ["metadata", "treasury"]
  }'
```

**Response `200`:**
```json
{
  "pda": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
  "bump": 255
}
```

Seed constraints:
- Must be a non-empty array of strings
- Each seed must be ≤ 32 bytes when UTF-8 encoded

| Status | Meaning |
|--------|---------|
| `200`  | PDA derived |
| `400`  | Invalid `programId`, missing/invalid seeds, or seed exceeds 32 bytes |

---

## Running Tests

```bash
# Make executable
chmod +x tests/test-api.sh

# Start server in one terminal
npm start

# Run tests in another terminal
./tests/test-api.sh
```

---

## Tech Stack

| Package | Purpose |
|---------|---------|
| `express` | REST API framework |
| `@solana/web3.js` | Solana PublicKey, PDA derivation |
| `bs58` | Base58 encode/decode |
| `tweetnacl` | Ed25519 signature verification |
| `typescript` + `tsx` | Type safety and direct TS execution |

---

## License

MIT
