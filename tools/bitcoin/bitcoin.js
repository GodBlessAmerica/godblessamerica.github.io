function randomBytes(length=32){
 const a=new Uint8Array(length); crypto.getRandomValues(a); return a;
}
function hex(bytes){return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')}
function concatBytes(...xs){const n=xs.reduce((s,x)=>s+x.length,0),o=new Uint8Array(n);let p=0;for(const x of xs){o.set(x,p);p+=x.length}return o}
function u8hex(h){return Uint8Array.from(h.match(/../g).map(x=>parseInt(x,16)))}
async function taggedHash(tag,msg){
 const t=await sha256(new TextEncoder().encode(tag));
 return sha256(concatBytes(t,t,msg));
}
async function makeWallet(privHex){
 const pub=publicKeyFromPrivateHex(privHex,true);
 const h160=await hash160(pub);
 const legacy=await base58Check(0x00,h160);

 const redeem=concatBytes(Uint8Array.of(0x00,0x14),h160);
 const nested=await base58Check(0x05,await hash160(redeem));
 const native=bech32Encode('bc',0,h160,false);

 const P=pointMul(BigInt('0x'+privHex));
 const internal=(P.y&1n)?{x:P.x,y:mod(-P.y)}:P;
 const tweakBytes=await taggedHash('TapTweak',bigint32(internal.x));
 const tweak=BigInt('0x'+hex(tweakBytes));
 if(tweak>=SECP256K1.n) throw Error('Invalid TapTweak');
 const Q=pointAdd(internal,pointMul(tweak));
 const taproot=bech32Encode('bc',1,bigint32(Q.x),true);

 const wifPayload=concatBytes(u8hex(privHex),Uint8Array.of(1));
 const wif=await base58Check(0x80,wifPayload);
 return {pub:hex(pub),legacy,nested,native,taproot,wif};
}
function securePrivateKey(){
 while(true){
   const h=hex(randomBytes(32));
   if(isValidPrivateKeyHex(h)) return h;
 }
}
async function generate(){
 const btn=document.getElementById('generateBtn');
 btn.disabled=true;
 try{
   const priv=securePrivateKey(), w=await makeWallet(priv);
   document.getElementById('priv').value=priv;
   document.getElementById('pub').value=w.pub;
   document.getElementById('wif').value=w.wif;
   document.getElementById('legacy').value=w.legacy;
   document.getElementById('segwit').value=w.nested;
   document.getElementById('native').value=w.native;
   document.getElementById('taproot').value=w.taproot;
 }catch(e){alert('生成失败：'+e.message)}
 finally{btn.disabled=false}
}
async function selfTest(){
 const p='0000000000000000000000000000000000000000000000000000000000000001';
 const w=await makeWallet(p);
 const okPub=w.pub==='0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
 const okLegacy=w.legacy==='1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH';
 const okNested=w.nested==='3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN';
 const okNative=w.native==='bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
 const el=document.getElementById('selftest');
 el.textContent=(okPub&&okLegacy&&okNested&&okNative)?'✓ 核心自检通过':'✗ 核心自检失败，请勿使用';
 el.className=(okPub&&okLegacy&&okNested&&okNative)?'ok':'bad';
}
window.addEventListener('DOMContentLoaded',selfTest);
