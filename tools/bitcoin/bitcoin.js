/*
 Bitcoin Cold Wallet Generator
 v0.2

 Design:
 - Offline first
 - No network request
 - Browser Web Crypto API

 Next:
 - secp256k1
 - Base58Check
 - Bech32/Bech32m
 - BIP39/BIP32/BIP84/BIP86
*/

function randomBytes(length=32){
    const data=new Uint8Array(length);
    crypto.getRandomValues(data);
    return data;
}

function hex(data){
    return Array.from(data)
        .map(x=>x.toString(16).padStart(2,'0'))
        .join('');
}

function generate(){
    const key=randomBytes(32);
    const type=document.getElementById('type').value;

    document.getElementById('priv').value=hex(key);
    document.getElementById('addr').value=
        'Address engine pending: '+type+'\n'+
        '当前仅生成安全随机私钥测试数据，请勿用于存储资产。';
}

function copyAll(){
    navigator.clipboard.writeText(
        'Private Key:\n'+document.getElementById('priv').value+
        '\nAddress:\n'+document.getElementById('addr').value
    );
}
