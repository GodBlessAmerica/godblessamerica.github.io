function bytesToBits(bytes){return [...bytes].map(b=>b.toString(2).padStart(8,'0')).join('')}
async function entropyToMnemonic(entropy){
 if(![16,20,24,28,32].includes(entropy.length))throw Error('Entropy must be 128-256 bits');
 const ent=bytesToBits(entropy);
 const cslen=entropy.length*8/32;
 const hash=await sha256(entropy);
 const bits=ent+bytesToBits(hash).slice(0,cslen);
 const out=[];
 for(let i=0;i<bits.length;i+=11)out.push(BIP39_ENGLISH[parseInt(bits.slice(i,i+11),2)]);
 return out.join(' ');
}
async function generateMnemonic(words=12){
 const bytes=words===24?32:16;
 return entropyToMnemonic(randomBytes(bytes));
}
async function mnemonicToSeed(mnemonic,passphrase=''){
 const enc=new TextEncoder();
 const m=enc.encode(mnemonic.normalize('NFKD'));
 const salt=enc.encode(('mnemonic'+passphrase.normalize('NFKD')));
 const key=await crypto.subtle.importKey('raw',m,'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-512',salt,iterations:2048},key,512);
 return new Uint8Array(bits);
}

async function validateMnemonic(mnemonic){
 const words=mnemonic.trim().toLowerCase().split(/\s+/);
 if(![12,15,18,21,24].includes(words.length))return false;
 const idx=[];
 for(const w of words){const i=BIP39_ENGLISH.indexOf(w);if(i<0)return false;idx.push(i)}
 const bits=idx.map(i=>i.toString(2).padStart(11,'0')).join('');
 const entLen=Math.floor(bits.length*32/33), csLen=bits.length-entLen;
 const entBits=bits.slice(0,entLen), cs=bits.slice(entLen);
 const bytes=new Uint8Array(entLen/8);
 for(let i=0;i<bytes.length;i++)bytes[i]=parseInt(entBits.slice(i*8,i*8+8),2);
 const hash=await sha256(bytes);
 return bytesToBits(hash).slice(0,csLen)===cs;
}
