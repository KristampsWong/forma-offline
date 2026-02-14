import crypto from "crypto"

/**
 * SSN Encryption Utilities
 *
 * Provides secure encryption/decryption for Social Security Numbers
 * using AES-256-GCM with authentication tags.
 *
 * Security Features:
 * - AES-256-GCM encryption (FIPS 140-2 compliant)
 * - Random IV for each encryption (prevents pattern analysis)
 * - Authentication tag (prevents tampering)
 * - Masked display format (shows only last 4 digits)
 *
 * Environment Variable Required:
 * SSN_ENCRYPTION_KEY - 32-byte hex string (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.SSN_ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      "SSN_ENCRYPTION_KEY environment variable is required. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    )
  }

  if (key.length !== 64) {
    throw new Error(
      "SSN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    )
  }

  return Buffer.from(key, "hex")
}

/**
 * Encrypt SSN for storage in database
 *
 * @param ssn - Plain text SSN (XXX-XX-XXXX or XXXXXXXXX)
 * @returns Encrypted string in format: iv:authTag:encrypted
 *
 * @example
 * const encrypted = encryptSSN("123-45-6789")
 * // Returns: "a1b2c3...iv:d4e5f6...tag:g7h8i9...encrypted"
 */
export function encryptSSN(ssn: string): string {
  // Remove hyphens for consistent storage
  const cleaned = ssn.replace(/-/g, "")

  // Validate format
  if (!/^\d{9}$/.test(cleaned)) {
    throw new Error("Invalid SSN format. Expected 9 digits.")
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(cleaned, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

/**
 * Decrypt SSN from database
 *
 * @param encryptedSSN - Encrypted string from database
 * @returns Plain text SSN in XXX-XX-XXXX format
 *
 * @example
 * const decrypted = decryptSSN("a1b2c3...iv:d4e5f6...tag:g7h8i9...encrypted")
 * // Returns: "123-45-6789"
 */
export function decryptSSN(encryptedSSN: string): string {
  const parts = encryptedSSN.split(":")

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted SSN format. Expected format: iv:authTag:encrypted"
    )
  }

  const [ivHex, authTagHex, encrypted] = parts

  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, "hex")
  )

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"))

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  // Format as XXX-XX-XXXX
  return `${decrypted.slice(0, 3)}-${decrypted.slice(3, 5)}-${decrypted.slice(5)}`
}

/**
 * Mask SSN for display (shows only last 4 digits)
 *
 * @param ssn - Plain text SSN (XXX-XX-XXXX or XXXXXXXXX)
 * @returns Masked SSN in format: ***-**-1234
 *
 * @example
 * maskSSN("123-45-6789") // Returns: "***-**-6789"
 * maskSSN("123456789")   // Returns: "***-**-6789"
 */
export function maskSSN(ssn: string): string {
  const cleaned = ssn.replace(/-/g, "")

  if (!/^\d{9}$/.test(cleaned)) {
    throw new Error("Invalid SSN format. Expected 9 digits.")
  }

  return `***-**-${cleaned.slice(-4)}`
}

/**
 * Create SHA-256 hash of SSN for duplicate detection
 *
 * @param ssn - Plain text SSN (XXX-XX-XXXX or XXXXXXXXX)
 * @returns SHA-256 hash as hex string
 *
 * @example
 * const hash = hashSSN("123-45-6789")
 * // Returns: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
 */
export function hashSSN(ssn: string): string {
  // Remove hyphens for consistent hashing
  const cleaned = ssn.replace(/-/g, "")

  // Validate format
  if (!/^\d{9}$/.test(cleaned)) {
    throw new Error("Invalid SSN format. Expected 9 digits.")
  }

  // Create SHA-256 hash
  return crypto.createHash("sha256").update(cleaned).digest("hex")
}

/**
 * Check if a string is encrypted (contains encryption delimiters)
 *
 * @param value - String to check
 * @returns true if encrypted, false otherwise
 */
export function isEncrypted(value: string): boolean {
  // Encrypted format has exactly 2 colons (iv:authTag:encrypted)
  return value.split(":").length === 3
}

/**
 * Format SSN input with automatic hyphen insertion
 *
 * @param value - User input string (can contain digits and hyphens)
 * @returns Formatted SSN string (XXX-XX-XXXX format, max 11 chars)
 *
 * @example
 * formatSSNInput("123")       // Returns: "123"
 * formatSSNInput("12345")     // Returns: "123-45"
 * formatSSNInput("123456789") // Returns: "123-45-6789"
 * formatSSNInput("abc123xyz") // Returns: "123" (strips non-digits)
 */
export function formatSSNInput(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "")

  // Limit to 9 digits
  const limited = digits.slice(0, 9)

  // Add hyphens at appropriate positions
  if (limited.length <= 3) {
    return limited
  } else if (limited.length <= 5) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`
  } else {
    return `${limited.slice(0, 3)}-${limited.slice(3, 5)}-${limited.slice(5)}`
  }
}
