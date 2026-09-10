// Base58 alphabet used by Bitcoin
const BASE58_ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes){
 let hex='';
 for(const b of bytes) hex+=b.toString(16).padStart(2,'0');
 let num=BigInt('0x'+hex);
 let out='';
 while(num>0n){
  const r=num%58n;
  out=BASE58_ALPHABET[Number(r)]+out;
  num=num/58n;
 }
 for(const b of bytes){
  if(b===0) out='1'+out; else break;
 }
 return out;
}
