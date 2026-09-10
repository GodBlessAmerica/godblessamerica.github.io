/*
 Bitcoin SHA256 helper
 Uses browser native Web Crypto API.
 No network required.
*/

async function sha256(data){
    const buffer = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return new Uint8Array(hash);
}

async function doubleSha256(data){
    return sha256(await sha256(data));
}
