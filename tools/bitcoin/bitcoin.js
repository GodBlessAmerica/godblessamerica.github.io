function generate(){
 const a=new Uint8Array(32);
 crypto.getRandomValues(a);
 document.getElementById('priv').value=[...a].map(x=>x.toString(16).padStart(2,'0')).join('');
 document.getElementById('addr').value='下一版本生成真实Bitcoin地址';
}
