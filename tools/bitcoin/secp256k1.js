const SECP256K1={
 p:0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn,
 n:0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n,
 gx:0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
 gy:0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n
};
const mod=(a,m=SECP256K1.p)=>{const r=a%m;return r>=0n?r:r+m};
function inv(a,m=SECP256K1.p){let b=m,x=1n,y=0n;a=mod(a,m);while(a){const q=b/a;[b,a]=[a,b-q*a];[y,x]=[x,y-q*x]}if(b!==1n)throw Error('inverse');return mod(y,m)}
function pointAdd(P,Q){
 if(!P)return Q;if(!Q)return P;
 if(P.x===Q.x&&P.y!==Q.y)return null;
 let s;
 if(P.x===Q.x){
   if(P.y===0n)return null;
   s=mod((3n*P.x*P.x)*inv(2n*P.y));
 }else s=mod((Q.y-P.y)*inv(Q.x-P.x));
 const x=mod(s*s-P.x-Q.x), y=mod(s*(P.x-x)-P.y);
 return {x,y};
}
function pointMul(k,P={x:SECP256K1.gx,y:SECP256K1.gy}){
 k=mod(k,SECP256K1.n);let R=null,N=P;
 while(k){if(k&1n)R=pointAdd(R,N);N=pointAdd(N,N);k>>=1n}
 return R;
}
function isValidPrivateKeyHex(h){if(!/^[0-9a-fA-F]{64}$/.test(h))return false;const k=BigInt('0x'+h);return k>0n&&k<SECP256K1.n}
function bigint32(n){const h=n.toString(16).padStart(64,'0');return Uint8Array.from(h.match(/../g).map(x=>parseInt(x,16)))}
function publicKeyFromPrivateHex(h,compressed=true){
 if(!isValidPrivateKeyHex(h))throw Error('Invalid private key');
 const P=pointMul(BigInt('0x'+h));
 if(compressed){const out=new Uint8Array(33);out[0]=(P.y&1n)?3:2;out.set(bigint32(P.x),1);return out}
 const out=new Uint8Array(65);out[0]=4;out.set(bigint32(P.x),1);out.set(bigint32(P.y),33);return out;
}
