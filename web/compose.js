// Line-for-line port of ArgonautsRendererV5._render (0xa135039c…a110). Pure: (art, traits[7], opts) -> SVG string.
// opts.dragon: use the Dragon's Breath vape sprite; opts.marks: [[x,y,'dark'|'light'],...] seeded variance marks.
(function(root){
function hex2(b){return (b<16?'0':'')+b.toString(16);}
function bytes(h){const u=new Uint8Array(h.length/2);for(let i=0;i<u.length;i++)u[i]=parseInt(h.substr(i*2,2),16);return u;}
function compose(art,t,opts){opts=opts||{};
 if(!art._b){art._b=art.blobs.map(bytes);art._l=bytes(art.layout);}
 const L=art._l;const blobId=(layer,idx)=>{let pos=0;for(let c=0;c<layer;c++)pos+=1+L[pos];if(idx>=L[pos])throw new Error('trait index out of range');return L[pos+1+idx];};
 const band=t[6]===art.band;const paint=band?[0,1,2,3,5,6,4]:[0,1,4,2,3,5,6];const vaped=t[5]===art.vapeIdx;
 const tone=art.smokerMouth[t[5]]?art.smokeTone[t[0]]:0;const smokeAt=band?5:4;
 const rects=(blob,tone)=>{let out='';const p=(blob[0]<<8)|blob[1];let off=2+p*4,pixel=0;
  while(off<blob.length){const ci=(blob[off]<<8)|blob[off+1],run=blob[off+2];
   if(ci!==0){const e=2+(ci-1)*4;let r=blob[e],g=blob[e+1],b=blob[e+2];const a=blob[e+3];
    if(tone!==0&&a!==0&&a!==255){r=(tone>>16)&255;g=(tone>>8)&255;b=tone&255;}
    out+='<rect x="'+(pixel%24)+'" y="'+Math.floor(pixel/24)+'" width="'+run+'" height="1" fill="#'+hex2(r)+hex2(g)+hex2(b)+(a===255?'"/>':'" fill-opacity="0.'+String(Math.floor(a*1000/255)).padStart(3,'0')+'"/>');}
   pixel+=run;off+=3;}return out;};
 const layerBlob=layer=>{if(layer===5&&t[5]===art.vapeIdx)return opts.dragon?art.vapeDragon:art.vapeBlue;const id=blobId(layer,t[layer]);
  if(layer===1&&t[6]===art.crownHead){const clip=art.crownClip[t[1]];if(clip!==0)return clip;}return id;};
 let body='';for(const layer of paint){if(vaped&&layer===smokeAt)body+=rects(art._b[art.vapeSmoke],tone);
  const id=layerBlob(layer);if(id===0xFF)continue;body+=rects(art._b[id],layer===5?tone:0);
  if(layer===1&&opts.marks)opts.marks.forEach((m,k)=>{body+='<rect x="'+m[0]+'" y="'+m[1]+'"'+(m[2]==='light'?' width="1" height="1" fill="#ffffff" fill-opacity="0.11"/>':' width="1" height="1" fill="#000000" fill-opacity="0.14"/>');});}
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges">'+body+'</svg>';}
root.ArgCompose=compose;if(typeof module!=='undefined')module.exports=compose;})(typeof window!=='undefined'?window:globalThis);
// Seeded variance marks, as ArgonautsRendererV5._marks: three distinct picks from the body's candidate list,
// mulberry32 seeded by the token id; two dark, then one light.
(function(root){function marks(art,tokenId,bodyIdx){const cand=art.variance[bodyIdx]||[];if(cand.length<9)return [];let a=tokenId>>>0;const picked=[],out=[];
 for(let mk=0;mk<3;mk++){let ci;do{a=(a+0x6D2B79F5)>>>0;let x=a;x=Math.imul(x^(x>>>15),x|1);x=(x+Math.imul(x^(x>>>7),x|61))^x;const r=(x^(x>>>14))>>>0;ci=Math.floor(r*cand.length/4294967296);}while(picked.includes(ci));picked.push(ci);out.push([cand[ci][0],cand[ci][1],mk===2?'light':'dark']);}return out;}
 root.ArgMarks=marks;if(typeof module!=='undefined')module.exports.marks=marks;})(typeof window!=='undefined'?window:globalThis);
