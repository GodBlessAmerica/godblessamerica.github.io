# Bitcoin Cold Wallet Generator Security Design

## Design goals

- Offline first
- No private key upload
- No remote API
- No blockchain query
- Browser Web Crypto random source

## Implementation roadmap

1. Random entropy generation
2. secp256k1 public key calculation
3. Base58Check encoding
4. Bech32 / Bech32m encoding
5. BIP39 mnemonic support
6. BIP32 HD derivation
7. BIP44/BIP49/BIP84/BIP86 paths

## Warning

Do not use development versions for real funds.
Always verify generated addresses and test with small amounts first.
