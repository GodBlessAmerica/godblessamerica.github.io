let SELF_TEST_OK=false;
let SELF_TEST_ERROR='自检尚未完成';
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
async function makeWallet(privHex,network='mainnet'){
 const pub=publicKeyFromPrivateHex(privHex,true);
 const h160=await hash160(pub);
 const test=network==='testnet';
 const legacy=await base58Check(test?0x6f:0x00,h160);

 const redeem=concatBytes(Uint8Array.of(0x00,0x14),h160);
 const nested=await base58Check(test?0xc4:0x05,await hash160(redeem));
 const hrp=test?'tb':'bc';
 const native=bech32Encode(hrp,0,h160,false);

 const P=pointMul(BigInt('0x'+privHex));
 const internal=(P.y&1n)?{x:P.x,y:mod(-P.y)}:P;
 const tweakBytes=await taggedHash('TapTweak',bigint32(internal.x));
 const tweak=BigInt('0x'+hex(tweakBytes));
 if(tweak>=SECP256K1.n) throw Error('Invalid TapTweak');
 const Q=pointAdd(internal,pointMul(tweak));
 const taproot=bech32Encode(hrp,1,bigint32(Q.x),true);

 const wifPayload=concatBytes(u8hex(privHex),Uint8Array.of(1));
 const wif=await base58Check(test?0xef:0x80,wifPayload);
 return {pub:hex(pub),legacy,nested,native,taproot,wif};
}
function securePrivateKey(){
 while(true){
   const h=hex(randomBytes(32));
   if(isValidPrivateKeyHex(h)) return h;
 }
}
async function generateSingle(){
 const btn=document.getElementById('generateBtn');
 btn.disabled=true;
 try{
   const network=document.getElementById('network')?.value||'mainnet';
   const priv=securePrivateKey(), w=await makeWallet(priv,network);
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
 const el=document.getElementById('selftest');
 const btn=document.getElementById('generateBtn');
 btn.disabled=true;
 try{
   const checks=[];

   const p='0000000000000000000000000000000000000000000000000000000000000001';
   const w=await makeWallet(p);
   checks.push(
     w.pub==='0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
     w.legacy==='1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
     w.nested==='3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN',
     w.native==='bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
   );

   const zeroEntropy=new Uint8Array(16);
   const mnemonic=await entropyToMnemonic(zeroEntropy);
   const expectedMnemonic='abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
   checks.push(mnemonic===expectedMnemonic);

   const seed=await mnemonicToSeed(expectedMnemonic);
   const n84=await derivePath(seed,"m/84'/0'/0'/0/0");
   const w84=await makeWallet(hex(n84.key),'mainnet');
   checks.push(w84.native==='bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu');

   const ok=checks.every(Boolean);
   SELF_TEST_OK=ok;
   SELF_TEST_ERROR=ok?'':('测试结果：'+checks.map((v,i)=>'#'+(i+1)+'='+v).join(', '));
   el.textContent=ok?'✓ 核心自检通过：secp256k1 / Base58Check / Bech32 / BIP39 / BIP32 / BIP84':'✗ 自检失败：'+SELF_TEST_ERROR;
   el.className=ok?'ok':'bad';
   btn.disabled=false;
 }catch(e){
   SELF_TEST_OK=false;
   SELF_TEST_ERROR=e&&e.message?e.message:String(e);
   el.textContent='✗ 自检异常：'+SELF_TEST_ERROR+'。请勿使用。';
   el.className='bad';
   btn.disabled=false;
 }
}
window.addEventListener('DOMContentLoaded',async()=>{
 document.getElementById('generateBtn')?.addEventListener('click',generateAll);
 document.getElementById('restoreBtn')?.addEventListener('click',restoreFromMnemonic);
 document.getElementById('jsonBtn')?.addEventListener('click',downloadJSON);
 document.getElementById('csvBtn')?.addEventListener('click',downloadCSV);
 document.getElementById('printBtn')?.addEventListener('click',()=>window.print());
 document.querySelectorAll('.copy-btn').forEach(btn=>{
   btn.addEventListener('click',()=>copyField(btn.dataset.copy));
 });
 await selfTest();
});

async function generateAll(){
 const btn=document.getElementById('generateBtn');
 if(!SELF_TEST_OK){alert('当前不能生成钱包：'+SELF_TEST_ERROR);return;}
 btn.disabled=true;
 try{
   const count=parseInt(document.getElementById('words').value,10);
   const network=document.getElementById('network').value;
   const mnemonic=await generateMnemonic(count);
   document.getElementById('mnemonic').value=mnemonic;

   const priv=securePrivateKey(), w=await makeWallet(priv,network);
   document.getElementById('priv').value=priv;
   document.getElementById('pub').value=w.pub;
   document.getElementById('wif').value=w.wif;
   document.getElementById('legacy').value=w.legacy;
   document.getElementById('segwit').value=w.nested;
   document.getElementById('native').value=w.native;
   document.getElementById('taproot').value=w.taproot;

   const hd=await deriveStandardWallets(mnemonic,'',network);
   document.getElementById('bip44').value=hd.bip44.wallet.legacy+"\nPrivate: "+hd.bip44.privateKey;
   document.getElementById('bip49').value=hd.bip49.wallet.nested+"\nPrivate: "+hd.bip49.privateKey;
   document.getElementById('bip84').value=hd.bip84.wallet.native+"\nPrivate: "+hd.bip84.privateKey;
   document.getElementById('bip86').value=hd.bip86.wallet.taproot+"\nPrivate: "+hd.bip86.privateKey;
   renderAddressCards(w,hd);
 }catch(e){alert('生成失败：'+e.message)}
 finally{btn.disabled=false}
}

function currentData(){
 const ids=['network','mnemonic','priv','wif','pub','legacy','segwit','native','taproot','bip44','bip49','bip84','bip86'];
 const o={}; for(const id of ids)o[id]=document.getElementById(id)?.value||'';
 return o;
}
async function copyField(id){
 const el=document.getElementById(id); if(!el||!el.value)return;
 await navigator.clipboard.writeText(el.value);
}
function downloadBlob(name,type,text){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadJSON(){downloadBlob('bitcoin-wallet-backup.json','application/json',JSON.stringify(currentData(),null,2))}
function csvEscape(v){return '"'+String(v).replace(/"/g,'""')+'"'}
function downloadCSV(){
 const d=currentData(), rows=[['field','value'],...Object.entries(d)];
 downloadBlob('bitcoin-wallet-backup.csv','text/csv;charset=utf-8',rows.map(r=>r.map(csvEscape).join(',')).join('\n'));
}

function drawQR(canvas,text,size=168,margin=4){
 const qr=qrcode(0,'M'); qr.addData(text,'Byte'); qr.make();
 const count=qr.getModuleCount(), total=count+margin*2, cell=Math.max(1,Math.floor(size/total)), actual=total*cell;
 canvas.width=actual; canvas.height=actual;
 const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#fff'; ctx.fillRect(0,0,actual,actual); ctx.fillStyle='#000';
 for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(qr.isDark(r,c))ctx.fillRect((c+margin)*cell,(r+margin)*cell,cell,cell);
}
function renderAddressCards(w,hd){
 const area=document.getElementById('qrArea');
 area.innerHTML='';
 const items=[
  ['Legacy',w.legacy],['Nested SegWit',w.nested],['Native SegWit',w.native],['Taproot',w.taproot],
  ['BIP44',hd.bip44.wallet.legacy],['BIP49',hd.bip49.wallet.nested],['BIP84',hd.bip84.wallet.native],['BIP86',hd.bip86.wallet.taproot]
 ];
 for(const [name,value] of items){
  const card=document.createElement('div');card.className='addr-card';
  const t=document.createElement('strong');t.textContent=name;
  const canvas=document.createElement('canvas');canvas.className='addr-qr';
  const v=document.createElement('code');v.textContent=value;
  const btn=document.createElement('button');btn.className='small';btn.textContent='复制地址';btn.addEventListener('click',()=>navigator.clipboard.writeText(value));
  card.append(t,canvas,v,btn); area.appendChild(card); drawQR(canvas,value);
 }
}

async function restoreFromMnemonic(){
 const status=document.getElementById('restoreStatus');
 const network=document.getElementById('network').value;
 const mnemonic=document.getElementById('restoreMnemonic').value.trim().toLowerCase().replace(/\s+/g,' ');
 if(!(await validateMnemonic(mnemonic))){
   status.textContent='助记词无效：单词、数量或校验和不正确。'; status.className='bad'; return;
 }
 try{
   const hd=await deriveStandardWallets(mnemonic,'',network);
   document.getElementById('mnemonic').value=mnemonic;
   document.getElementById('bip44').value=hd.bip44.wallet.legacy+"\nPrivate: "+hd.bip44.privateKey;
   document.getElementById('bip49').value=hd.bip49.wallet.nested+"\nPrivate: "+hd.bip49.privateKey;
   document.getElementById('bip84').value=hd.bip84.wallet.native+"\nPrivate: "+hd.bip84.privateKey;
   document.getElementById('bip86').value=hd.bip86.wallet.taproot+"\nPrivate: "+hd.bip86.privateKey;
   renderAddressCards({legacy:hd.bip44.wallet.legacy,nested:hd.bip49.wallet.nested,native:hd.bip84.wallet.native,taproot:hd.bip86.wallet.taproot},hd);
   status.textContent='✓ 助记词有效，HD 地址已重新派生。'; status.className='ok';
 }catch(e){status.textContent='恢复失败：'+e.message;status.className='bad'}
}
