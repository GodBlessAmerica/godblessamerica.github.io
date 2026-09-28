# USDT / USD₮0 Wallet — Arbitrum One

Offline/download release of the single-file self-custody wallet.

## Download and use

1. Download `usdt-wallet-arbitrum-v2.3-offline.zip` from this directory.
2. Verify its SHA-256 before use.
3. Extract the ZIP locally.
4. For generating/restoring a wallet, importing a private key, or signing with meaningful funds, open `index.html` locally and preferably disconnect networking first.
5. Only connect an RPC when balance lookup, transaction preparation, or broadcasting is needed.

## SHA-256

- ZIP: `9276a34ee9883f8711efae9470c6b7ad6067a3690453d3e2e6691c8a7179a82b`
- `index.html` inside ZIP: `24be97bcc1c34dd0afbe56153dd851ca2e36a304f01edaf456014c4b74eb7239`

## Security notes

- Never publish or commit a real private key, recovery phrase, BIP39 passphrase, or authenticated/private RPC URL.
- The test vectors embedded in the source are public cryptographic test data, not wallet secrets.
- This project is self-custody software and has not undergone a professional third-party security audit. Test recovery and sending with a tiny amount before using larger value.
