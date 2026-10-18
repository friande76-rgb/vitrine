import http from "node:http";
import { Document, NodeIO } from "@gltf-transform/core";
const doc = new Document(); const buf = doc.createBuffer();
const pos = doc.createAccessor().setType("VEC3").setArray(new Float32Array([0,0,0, .2,0,0, .1,.1,.1])).setBuffer(buf);
doc.createScene().addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute("POSITION", pos))));
const glb = Buffer.from(await new NodeIO().writeBinary(doc));
const R={id:"3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90",name:"Tasca do Largo",slug:"tasca-do-largo",city:"Lisboa",default_lang:"pt"};
const D=[{id:"d1",name:"Robalo",name_fr:null,description:"teste",description_fr:null,category:"Pratos",price_cents:2400,width_cm:34,serves:2,photo_paths:[],model_url:"http://localhost:54321/storage/v1/object/public/models/p.glb"}];
http.createServer((q,s)=>{const u=new URL(q.url,"http://x");
 if(u.pathname.includes("/models/")){s.writeHead(200,{"content-type":"model/gltf-binary","access-control-allow-origin":"*"});return s.end(glb);}
 const single=(q.headers.accept||"").includes("vnd.pgrst.object");
 const body=u.pathname.endsWith("/restaurants")?(single?R:[R]):u.pathname.endsWith("/dishes")?D:[];
 s.writeHead(200,{"content-type":"application/json"});s.end(JSON.stringify(body));}).listen(54321);
