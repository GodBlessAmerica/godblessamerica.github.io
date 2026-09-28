# USDT / USD₮0 Wallet — Arbitrum One

Offline/download release of the single-file self-custody wallet.

## Important checksum notice

The ZIP-level SHA-256 value previously shown here was incorrect. It was calculated from a locally re-packed ZIP, not from the exact ZIP bytes already stored on GitHub. That value has been withdrawn and must not be used to validate the GitHub download.

The `index.html` payload inside the release has been independently verified against the source used to build this release:

`24be97bcc1c34dd0afbe56153dd851ca2e36a304f01edaf456014c4b74eb7239  index.html`

A ZIP-level checksum should only be trusted once calculated from the exact downloadable GitHub artifact bytes.

## Download and use

1. Download `usdt-wallet-arbitrum-v2.3-offline.zip` from this directory.
2. Extract it locally.
3. Verify the extracted `index.html` SHA-256 against the value above.
4. For generating/restoring a wallet, importing a private key, or signing with meaningful funds, open `index.html` locally and preferably disconnect networking first.
5. Only connect an RPC when balance lookup, transaction preparation, or broadcasting is needed.

## Security notes

- Never publish or commit a real private key, recovery phrase, BIP39 passphrase, or authenticated/private RPC URL.
- The test vectors embedded in the source are public cryptographic test data, not wallet secrets.
- This project is self-custody software and has not undergone a professional third-party security audit. Test recovery and sending with a tiny amount before using larger value.
