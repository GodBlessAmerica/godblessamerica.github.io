function ser32(i){return Uint8Array.of((i>>>24)&255,(i>>>16)&255,(i>>>8)&255,i&255)}
async function hmacSha512(key,data){
 const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-512'},false,['sign']);
 return new Uint8Array(await crypto.subtle.sign('HMAC',k,data));
}
async function bip32Master(seed){
 const I=await hmacSha512(new TextEncoder().encode('Bitcoin seed'),seed);
 const key=I.slice(0,32), chain=I.slice(32);
 const n=BigInt('0x'+hex(key));
 if(n===0n||n>=SECP256K1.n)throw Error('Invalid master key');
 return {key,chain};
}
async function ckdPriv(node,index){
 const hardened=index>=0x80000000;
 const k=BigInt('0x'+hex(node.key));
 const data=hardened?concatBytes(Uint8Array.of(0),node.key,ser32(index)):concatBytes(publicKeyFromPrivateHex(hex(node.key),true),ser32(index));
 const I=await hmacSha512(node.chain,data), IL=BigInt('0x'+hex(I.slice(0,32)));
 if(IL>=SECP256K1.n)throw Error('Invalid child');
 const child=mod(IL+k,SECP256K1.n);
 if(child===0n)throw Error('Invalid child');
 return {key:bigint32(child),chain:I.slice(32)};
}
async function derivePath(seed,path){
 let node=await bip32Master(seed);
 for(const part of path.split('/').slice(1)){
   if(!part)continue;
   const hard=part.endsWith("'"), num=parseInt(part,10);
   node=await ckdPriv(node,(num+(hard?0x80000000:0))>>>0);
 }
 return node;
}
async function deriveStandardWallets(mnemonic,passphrase=''){
 const seed=await mnemonicToSeed(mnemonic,passphrase);
 const paths={
   bip44:"m/44'/0'/0'/0/0",
   bip49:"m/49'/0'/0'/0/0",
   bip84:"m/84'/0'/0'/0/0",
   bip86:"m/86'/0'/0'/0/0"
 };
 const out={};
 for(const [name,path] of Object.entries(paths)){
   const node=await derivePath(seed,path);
   const w=await makeWallet(hex(node.key));
   out[name]={path,privateKey:hex(node.key),wallet:w};
 }
 return out;
}
