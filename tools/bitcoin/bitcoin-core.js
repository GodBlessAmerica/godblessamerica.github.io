/*
 Bitcoin core pipeline
 Offline wallet engine skeleton
*/

function privateKeyValid(key){
    if(!(key instanceof Uint8Array)) return false;
    if(key.length!==32) return false;
    return true;
}

function concatBytes(...arrays){
    let len=arrays.reduce((a,b)=>a+b.length,0);
    let out=new Uint8Array(len);
    let pos=0;
    for(const a of arrays){
        out.set(a,pos);
        pos+=a.length;
    }
    return out;
}

// secp256k1 public key calculation will be added here.
// Kept separate for auditing.
