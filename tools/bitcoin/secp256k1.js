const SECP256K1={
 p:0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn,
 n:0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n,
 gx:0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
 gy:0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n
};
const mod=(a,m=SECP256K1.p)=>{const r=a%m;return r>=0n?r:r+m};
function inv(a,m=SECP256K1.p){
 let t=0n,newT=1n,r=m,newR=mod(a,m);
 while(newR!==0n){
  const q=r/newR;
  [t,newT]=[newT,t-q*newT];
  [r,newR]=[newR,r-q*newR];
 }
 if(r!==1n)throw Error('inverse');
 return mod(t,m);
}
function pointAdd(P,Q){
 if(!P)return Q;if(!Q)return P;
 if(P.x===Q.x){if(mod(P.y+Q.y)===0n)return null;return pointDouble(P);}
 const s=mod((Q.y-P.y)*inv(Q.x-P.x));
 const x=mod(s*s-P.x-Q.x);
 return {x,y:mod(s*(P.x-x)-P.y)};
}
function pointDouble(P){
 if(!P||P.y===0n)return null;
 const s=mod(3n*P.x*P.x*inv(2n*P.y));
 const x=mod(s*s-2n*P.x);
 return {x,y:mod(s*(P.x-x)-P.y)};
}
function jDouble(P){
 if(P.Z===0n||P.Y===0n)return {X:0n,Y:1n,Z:0n};
 const Y2=mod(P.Y*P.Y), S=mod(4n*P.X*Y2), M=mod(3n*P.X*P.X);
 const X3=mod(M*M-2n*S);
 const Y4=mod(Y2*Y2);
 const Y3=mod(M*(S-X3)-8n*Y4);
 const Z3=mod(2n*P.Y*P.Z);
 return {X:X3,Y:Y3,Z:Z3};
}
function jAdd(P,Q){
 if(P.Z===0n)return Q;if(Q.Z===0n)return P;
 const Z1Z1=mod(P.Z*P.Z), Z2Z2=mod(Q.Z*Q.Z);
 const U1=mod(P.X*Z2Z2), U2=mod(Q.X*Z1Z1);
 const S1=mod(P.Y*Q.Z*Z2Z2), S2=mod(Q.Y*P.Z*Z1Z1);
 if(U1===U2){if(S1!==S2)return {X:0n,Y:1n,Z:0n};return jDouble(P);}
 const H=mod(U2-U1), I=mod((2n*H)*(2n*H)), J=mod(H*I), R=mod(2n*(S2-S1)), V=mod(U1*I);
 const X3=mod(R*R-J-2n*V);
 const Y3=mod(R*(V-X3)-2n*S1*J);
 const Z3=mod(((P.Z+Q.Z)*(P.Z+Q.Z)-Z1Z1-Z2Z2)*H);
 return {X:X3,Y:Y3,Z:Z3};
}
function toJacobian(P){return P?{X:P.x,Y:P.y,Z:1n}:{X:0n,Y:1n,Z:0n}}
function fromJacobian(P){
 if(P.Z===0n)return null;
 const z2=inv(mod(P.Z*P.Z)), z3=mod(z2*inv(P.Z));
 return {x:mod(P.X*z2),y:mod(P.Y*z3)};
}
function pointMul(k,P={x:SECP256K1.gx,y:SECP256K1.gy}){
 k=mod(k,SECP256K1.n);
 let R={X:0n,Y:1n,Z:0n}, N=toJacobian(P);
 while(k){if(k&1n)R=jAdd(R,N);N=jDouble(N);k>>=1n}
 return fromJacobian(R);
}
function isValidPrivateKeyHex(h){if(!/^[0-9a-fA-F]{64}$/.test(h))return false;const k=BigInt('0x'+h);return k>0n&&k<SECP256K1.n}
function bigint32(n){const h=n.toString(16).padStart(64,'0');return Uint8Array.from(h.match(/../g).map(x=>parseInt(x,16)))}
function publicKeyFromPrivateHex(h,compressed=true){
 if(!isValidPrivateKeyHex(h))throw Error('Invalid private key');
 const P=pointMul(BigInt('0x'+h));
 if(compressed){const out=new Uint8Array(33);out[0]=(P.y&1n)?3:2;out.set(bigint32(P.x),1);return out}
 const out=new Uint8Array(65);out[0]=4;out.set(bigint32(P.x),1);out.set(bigint32(P.y),33);return out;
}
