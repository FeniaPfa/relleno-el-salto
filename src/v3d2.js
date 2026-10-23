/* ============ corte del subsuelo: las 11 secciones geofísicas ============ */
(function(){
var cv=document.getElementById('cv2'); if(!cv||!D.sub||!D.terr) return;
function sinWebGL(c){
  c.innerHTML='<p class="sinwebgl">Tu navegador no puede mostrar el corte del subsuelo. '+
    'La sección geofísica elegida se muestra más abajo como imagen.</p>';
}
if(typeof THREE==='undefined'){ sinWebGL(cv); return; }
var S=D.sub, M=D.terr, N=M.n, EX=1.5, BASE=70;

/* ---------- ventana: el predio con holgura ---------- */
var bb=[180,90,-180,-90]; bboxOf(L.predio.g,bb);
var mx=(bb[2]-bb[0])*.22, mi=(bb[3]-bb[1])*.22;
bb=[bb[0]-mx,bb[1]-mi,bb[2]+mx,bb[3]+mi];
var my=function(lat){return Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))};
var Y0=my(bb[1]), Y1=my(bb[3]);
var LATM=111320, LONM=LATM*Math.cos((bb[1]+bb[3])/2*Math.PI/180);
var ANCHO=(bb[2]-bb[0])*LONM, ALTO=(bb[3]-bb[1])*LATM;
function px(lon,lat){return [(lon-bb[0])/(bb[2]-bb[0]), (my(lat)-Y0)/(Y1-Y0)]}
function wx(u){return (u-.5)*ANCHO}
function wz(v){return -(v-.5)*ALTO}
function mundo(lon,lat){var p=px(lon,lat);return [wx(p[0]),wz(p[1])]}

/* ---------- altura, del mismo modelo que el visor de arriba ---------- */
var H=null;
function hGlobal(lon,lat){
  if(!H) return M.emin;
  var mg=function(l){return Math.log(Math.tan(Math.PI/4+l*Math.PI/360))};
  var u=(lon-M.lon0)/(M.lon1-M.lon0), v=(mg(lat)-mg(M.lat0))/(mg(M.lat1)-mg(M.lat0));
  var c=Math.min(N-1,Math.max(0,u*(N-1))), r=Math.min(N-1,Math.max(0,(1-v)*(N-1)));
  var c0=c|0,r0=r|0,c1=Math.min(N-1,c0+1),r1=Math.min(N-1,r0+1),fc=c-c0,fr=r-r0;
  return (H[r0*N+c0]*(1-fc)+H[r0*N+c1]*fc)*(1-fr)+(H[r1*N+c0]*(1-fc)+H[r1*N+c1]*fc)*fr;
}
function hUV(u,v){return hGlobal(bb[0]+u*(bb[2]-bb[0]),
  2*(Math.atan(Math.exp(Y0+v*(Y1-Y0)))-Math.PI/4)*180/Math.PI)}

/* ---------- escena ---------- */
var ren;
var DENSO=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)&&(devicePixelRatio||1)>=2;
try { ren=new THREE.WebGLRenderer({antialias:!DENSO,alpha:false}); }
catch(e){ sinWebGL(cv); return; }
ren.setPixelRatio(Math.min(devicePixelRatio,DENSO?1.5:2));
ren.localClippingEnabled=true;
/* el bloque se abre justo en el perfil elegido */
var corte=new THREE.Plane(new THREE.Vector3(1,0,0),1e6), CORTE=[corte];
cv.appendChild(ren.domElement);
ren.domElement.setAttribute('role','img'); ren.domElement.tabIndex=0;
ren.domElement.setAttribute('aria-label','Bloque 3D del subsuelo del predio con el vaso del relleno, la capa de maicillo '+
  'permeable, la roca y la sección geofísica elegida en su posición real. La misma sección se muestra como imagen más abajo.');
var sc=new THREE.Scene();
(function(){
  var c=document.createElement('canvas'); c.width=4; c.height=256;
  var g=c.getContext('2d'), lg=g.createLinearGradient(0,0,0,256);
  lg.addColorStop(0,'#141a20'); lg.addColorStop(.6,'#232c31'); lg.addColorStop(1,'#39403a');
  g.fillStyle=lg; g.fillRect(0,0,4,256);
  var t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter; sc.background=t;
})();
sc.add(new THREE.AmbientLight(0xffffff,.82));
var dl=new THREE.DirectionalLight(0xfff4e6,.55); dl.position.set(-1,1.6,.8); sc.add(dl);

var cam=new THREE.PerspectiveCamera(42,16/10,5,ANCHO*8);
var target=new THREE.Vector3(0,0,0), th=-0.62, ph=1.02, rad=ANCHO*1.05;
var cortePt=null, corteN=null;
function place(){
  cam.position.set(target.x+rad*Math.sin(ph)*Math.sin(th),
                   target.y+rad*Math.cos(ph),
                   target.z+rad*Math.sin(ph)*Math.cos(th));
  cam.lookAt(target);
  actualizarCorte();
}
/* deja a la vista la mitad que queda detrás del perfil */
function actualizarCorte(){
  if(!cortePt||!corteN){ corte.constant=1e6; corte.normal.set(1,0,0); return }
  var d=corteN.x*(cam.position.x-cortePt.x)+corteN.z*(cam.position.z-cortePt.z);
  var sg=d>0?-1:1;
  corte.normal.set(corteN.x*sg,0,corteN.z*sg);
  corte.constant=-(corte.normal.x*cortePt.x+corte.normal.z*cortePt.z)+1.5;
  if(planos[activo]){
    var m=planos[activo];
    m.position.x=cortePt.x - corte.normal.x*8;
    m.position.z=cortePt.z - corte.normal.z*8;
  }
  if(cara) cara.position.set(-corte.normal.x*4,0,-corte.normal.z*4);
}

/* ---------- el bloque: superficie + tres estratos en la falda ---------- */
var G=140, bloque=null, estratos={};
function construir(){
  if(bloque){sc.remove(bloque);bloque.traverse(function(o){if(o.geometry)o.geometry.dispose()})}
  bloque=new THREE.Group(); sc.add(bloque);
  var pos=[],col=[],idx=[],i,j;
  var cAlta=new THREE.Color(0x8d9484), cBaja=new THREE.Color(0x4d5a4c);
  for(j=0;j<G;j++) for(i=0;i<G;i++){
    var u=i/(G-1), v=j/(G-1), h=hUV(u,v);
    pos.push(wx(u),h*EX,wz(v));
    var t=Math.max(0,Math.min(1,(h-M.emin)/(M.emax-M.emin)));
    var c=cBaja.clone().lerp(cAlta,t); col.push(c.r,c.g,c.b);
  }
  for(j=0;j<G-1;j++) for(i=0;i<G-1;i++){
    var a=j*G+i,b=a+1,c2=a+G,d=c2+1; idx.push(a,b,c2,b,d,c2);
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx); g.computeVertexNormals();
  bloque.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,
    side:THREE.DoubleSide,clippingPlanes:CORTE})));

  /* la falda, en tres bandas: maicillo cierto, espesor variable, roca */
  function banda(d0,d1,color,op,nombre){
    var p=[];
    function borde(gu,gv,inv){
      for(var k=0;k<G-1;k++){
        var u0=gu(k/(G-1)),v0=gv(k/(G-1)),u1=gu((k+1)/(G-1)),v1=gv((k+1)/(G-1));
        var x0=wx(u0),z0=wz(v0),x1=wx(u1),z1=wz(v1);
        var s0=hUV(u0,v0), s1=hUV(u1,v1);
        var a0=(d0===null?BASE:Math.max(BASE,s0-d0))*EX, b0=(d1===null?BASE:Math.max(BASE,s0-d1))*EX;
        var a1=(d0===null?BASE:Math.max(BASE,s1-d0))*EX, b1=(d1===null?BASE:Math.max(BASE,s1-d1))*EX;
        if(inv) p.push(x0,a0,z0,x1,a1,z1,x0,b0,z0, x1,a1,z1,x1,b1,z1,x0,b0,z0);
        else    p.push(x0,a0,z0,x0,b0,z0,x1,a1,z1, x1,a1,z1,x0,b0,z0,x1,b1,z1);
      }
    }
    borde(function(t){return t},function(){return 0},true);
    borde(function(t){return t},function(){return 1},false);
    borde(function(){return 0},function(t){return t},false);
    borde(function(){return 1},function(t){return t},true);
    var gg=new THREE.BufferGeometry();
    gg.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    gg.computeVertexNormals();
    var m=new THREE.Mesh(gg,new THREE.MeshLambertMaterial({color:color,
      transparent:op<1,opacity:op,side:THREE.DoubleSide,clippingPlanes:CORTE}));
    m.name=nombre; bloque.add(m); estratos[nombre]=m; return m;
  }
  banda(0, S.maicillo[0], 0xc9a05a, 1, 'maicillo');
  banda(S.maicillo[0], S.maicillo[1], 0x9c7c4a, .9, 'variable');
  banda(S.maicillo[1], null, 0x4a4742, 1, 'roca');
  /* piso */
  var fp=[-ANCHO/2,BASE*EX,-ALTO/2, ANCHO/2,BASE*EX,-ALTO/2, ANCHO/2,BASE*EX,ALTO/2,
          -ANCHO/2,BASE*EX,-ALTO/2, ANCHO/2,BASE*EX,ALTO/2, -ANCHO/2,BASE*EX,ALTO/2];
  var gf=new THREE.BufferGeometry();
  gf.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));
  gf.computeVertexNormals();
  bloque.add(new THREE.Mesh(gf,new THREE.MeshLambertMaterial({color:0x33312c,
    side:THREE.DoubleSide,clippingPlanes:CORTE})));
}

/* ---------- el vaso: de la cota 200 a la 350 ---------- */
var vaso=null;
function anillos(g){return g.type==='Polygon'?[g.coordinates]:g.coordinates}
function construirVaso(){
  if(vaso){sc.remove(vaso);vaso.traverse(function(o){if(o.geometry)o.geometry.dispose()})}
  vaso=new THREE.Group(); sc.add(vaso);
  var V=S.vaso, y0=V.cmin*EX, y1=V.cmax*EX;
  var shapes=[];
  anillos(L.residuos.g).forEach(function(pl){
    var sh=null;
    pl.forEach(function(ring,ri){
      var pts=ring.map(function(c){var p=mundo(c[0],c[1]);return new THREE.Vector2(p[0],p[1])});
      if(ri===0) sh=new THREE.Shape(pts); else sh.holes.push(new THREE.Path(pts));
    });
    if(sh) shapes.push(sh);
  });
  function tapa(y,color,op){
    var g=new THREE.ShapeGeometry(shapes), p=g.attributes.position;
    for(var i=0;i<p.count;i++) p.setXYZ(i,p.getX(i),y,p.getY(i));
    p.needsUpdate=true; g.computeVertexNormals();
    var m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:color,transparent:true,
      opacity:op,side:THREE.DoubleSide,depthWrite:false,clippingPlanes:CORTE}));
    vaso.add(m);
  }
  tapa(y1,0xff7a45,.95); tapa(y0,0xffd166,.95);
  var p=[];
  anillos(L.residuos.g).forEach(function(pl){pl.forEach(function(ring){
    for(var j=0;j<ring.length-1;j++){
      var A=mundo(ring[j][0],ring[j][1]), B=mundo(ring[j+1][0],ring[j+1][1]);
      p.push(A[0],y0,A[1], B[0],y0,B[1], A[0],y1,A[1],
             B[0],y0,B[1], B[0],y1,B[1], A[0],y1,A[1]);
    }
  })});
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.computeVertexNormals();
  vaso.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0xe8602c,
    transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false,
    clippingPlanes:CORTE})));
  vaso.renderOrder=5;
  vaso.visible=chk('L2-vaso');
}
function chk(id){var e=document.getElementById(id);return !e||e.checked}

/* ---------- las secciones geofísicas, en su sitio ---------- */
var planos={}, activo=null, cargador=new THREE.TextureLoader();
function lineaERT(p){
  var A=mundo(p.a[0],p.a[1]), B=mundo(p.b[0],p.b[1]);
  return {A:A,B:B,cx:(A[0]+B[0])/2,cz:(A[1]+B[1])/2,
          ang:Math.atan2(B[0]-A[0],B[1]-A[1]),
          largo:Math.hypot(B[0]-A[0],B[1]-A[1])};
}
function mostrarSeccion(id){
  S.ert.forEach(function(p){ if(planos[p.id]) planos[p.id].visible=false });
  activo=id;
  var p=null; S.ert.forEach(function(q){if(q.id===id)p=q});
  if(!p||!p.cal) return;
  if(planos[id]){
    planos[id].visible=true;
    var Lp=lineaERT(p);
    cortePt=new THREE.Vector3(Lp.cx,0,Lp.cz);
    corteN=new THREE.Vector3(Math.cos(Lp.ang),0,-Math.sin(Lp.ang)).normalize();
    construirCara(); mirarA(p); return;
  }
  var L1=lineaERT(p), alto=(p.cal.et-p.cal.eb)*EX;
  var g=new THREE.PlaneGeometry(L1.largo,alto);
  var tex=cargador.load(ras(p.cal.png));
  tex.minFilter=THREE.LinearFilter; tex.generateMipmaps=false;
  var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tex,transparent:true,
    side:THREE.DoubleSide,depthWrite:false,depthTest:false,alphaTest:.04}));
  m.position.set(L1.cx,(p.cal.et+p.cal.eb)/2*EX,L1.cz);
  m.rotation.y=L1.ang-Math.PI/2;
  m.renderOrder=20; planos[id]=m; sc.add(m);
  cortePt=new THREE.Vector3(L1.cx,0,L1.cz);
  corteN=new THREE.Vector3(Math.cos(L1.ang),0,-Math.sin(L1.ang)).normalize();
  construirCara(); mirarA(p);
}
function mirarA(p){
  var L1=lineaERT(p);
  target.set(L1.cx,(p.cal?(p.cal.et+p.cal.eb)/2*EX:260*EX),L1.cz);
  th=L1.ang+Math.PI/2; ph=1.00; rad=Math.max(L1.largo*1.9,ANCHO*.78); place();
}
/* trazas de los 11 perfiles sobre la superficie */
function trazas(){
  var gr=new THREE.Group();
  S.ert.forEach(function(p){
    var pts=[];
    for(var i=0;i<=24;i++){
      var s=i/24, lon=p.a[0]+(p.b[0]-p.a[0])*s, lat=p.a[1]+(p.b[1]-p.a[1])*s;
      var w=mundo(lon,lat); pts.push(new THREE.Vector3(w[0],hGlobal(lon,lat)*EX+6,w[1]));
    }
    gr.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0x7fe3ff,transparent:true,opacity:.85})));
  });
  gr.renderOrder=4; sc.add(gr); return gr;
}
/* contorno del predio */
function predio(){
  var gr=new THREE.Group();
  anillos(L.predio.g).forEach(function(pl){pl.forEach(function(ring){
    var pts=ring.map(function(c){
      var w=mundo(c[0],c[1]);
      return new THREE.Vector3(w[0],hGlobal(c[0],c[1])*EX+10,w[1]);
    });
    gr.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0xf2f5ef,transparent:true,opacity:.8})));
  })});
  sc.add(gr); return gr;
}

/* ---------- la cara del corte: terreno, maicillo y roca ---------- */
var cara=null;
function construirCara(){
  if(cara){sc.remove(cara);cara.traverse(function(o){if(o.geometry)o.geometry.dispose()});cara=null}
  if(!cortePt||!corteN) return;
  /* el plano del perfil cruzado con el rectángulo del bloque */
  var dx=-corteN.z, dz=corteN.x;                 /* dirección del perfil */
  var A=ANCHO/2, Z=ALTO/2, ts=[];
  [[-A,dx,cortePt.x],[A,dx,cortePt.x]].forEach(function(q){
    if(Math.abs(q[1])>1e-6){ var t=(q[0]-q[2])/q[1];
      var z=cortePt.z+dz*t; if(z>=-Z-1&&z<=Z+1) ts.push(t) }});
  [[-Z,dz,cortePt.z],[Z,dz,cortePt.z]].forEach(function(q){
    if(Math.abs(q[1])>1e-6){ var t=(q[0]-q[2])/q[1];
      var x=cortePt.x+dx*t; if(x>=-A-1&&x<=A+1) ts.push(t) }});
  if(ts.length<2) return;
  ts.sort(function(a,b){return a-b});
  var t0=ts[0], t1=ts[ts.length-1];
  cara=new THREE.Group();
  var K=140, xs=[], ss=[];
  for(var i=0;i<=K;i++){
    var t=t0+(t1-t0)*i/K, x=cortePt.x+dx*t, z=cortePt.z+dz*t;
    var u=x/ANCHO+.5, v=-z/ALTO+.5;
    xs.push([x,z]); ss.push(hUV(Math.max(0,Math.min(1,u)),Math.max(0,Math.min(1,v))));
  }
  function franja(d0,d1,color){
    var p=[];
    for(var i=0;i<K;i++){
      var a=xs[i], b=xs[i+1], sa=ss[i], sb=ss[i+1];
      var a0=(d0===null?BASE:Math.max(BASE,sa-d0))*EX, a1=(d1===null?BASE:Math.max(BASE,sa-d1))*EX;
      var b0=(d0===null?BASE:Math.max(BASE,sb-d0))*EX, b1=(d1===null?BASE:Math.max(BASE,sb-d1))*EX;
      p.push(a[0],a0,a[1], b[0],b0,b[1], a[0],a1,a[1],
             b[0],b0,b[1], b[0],b1,b[1], a[0],a1,a[1]);
    }
    var g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    g.computeVertexNormals();
    var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:color,side:THREE.DoubleSide}));
    m.renderOrder=1; cara.add(m);
  }
  franja(0,S.maicillo[0],0xc9a05a);
  franja(S.maicillo[0],S.maicillo[1],0x9c7c4a);
  franja(S.maicillo[1],null,0x565249);
  /* la cara se corre un poco hacia la cámara para no pelear con el recorte */
  cara.position.set(-corteN.x*3,0,-corteN.z*3);
  sc.add(cara);
}

/* ---------- controles ---------- */
var drag=false,lx=0,ly=0,dom=ren.domElement;
dom.style.touchAction='pan-y pinch-zoom'; dom.style.cursor='grab';
function orbita(q){
  if(q==='izq') th+=0.12; if(q==='der') th-=0.12;
  if(q==='mas') rad=Math.max(ANCHO*.15,rad*0.85); if(q==='menos') rad=Math.min(ANCHO*2.4,rad*1.18);
  place();
}
dom.addEventListener('keydown',function(e){
  var m={ArrowLeft:'izq',ArrowRight:'der','+':'mas','=':'mas','-':'menos'}[e.key];
  if(e.key==='ArrowUp'){ ph=Math.max(.16,ph-0.06); place(); e.preventDefault(); return }
  if(e.key==='ArrowDown'){ ph=Math.min(1.42,ph+0.06); place(); e.preventDefault(); return }
  if(m){ orbita(m); e.preventDefault() }
});
Array.prototype.forEach.call(document.querySelectorAll('[data-orb2]'),function(b){
  b.addEventListener('click',function(){ orbita(b.getAttribute('data-orb2')) });
});
dom.addEventListener('pointerdown',function(e){drag=true;lx=e.clientX;ly=e.clientY;
  dom.style.cursor='grabbing';dom.setPointerCapture(e.pointerId)});
dom.addEventListener('pointermove',function(e){
  if(!drag)return;
  th-=(e.clientX-lx)*.005;
  ph=Math.max(.16,Math.min(1.42,ph-(e.clientY-ly)*.005));
  lx=e.clientX;ly=e.clientY;place()});
['pointerup','pointercancel','pointerleave'].forEach(function(ev){
  dom.addEventListener(ev,function(){drag=false;dom.style.cursor='grab'})});
dom.addEventListener('wheel',function(e){
  e.preventDefault();
  rad=Math.max(ANCHO*.15,Math.min(ANCHO*2.4,rad*(1+(e.deltaY>0?.12:-.12))));place()},
  {passive:false});

function resize(){
  var w=cv.clientWidth,h=cv.clientHeight;
  if(!w||!h) return;
  ren.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix();
}
addEventListener('resize',resize);

var vis=false;
if('IntersectionObserver' in window)
  new IntersectionObserver(function(es){vis=es[0].isIntersecting},{rootMargin:'250px'}).observe(cv);
else vis=true;
/* el bloque no tiene nada animado: se dibuja cuando la cámara o el corte cambian,
   y a dos cuadros por segundo para las texturas que llegan tarde */
var firma2='', ult2=0;
function animar(){
  requestAnimationFrame(animar);
  if(!vis) return;
  var p=cam.position, f=[p.x.toFixed(1),p.y.toFixed(1),p.z.toFixed(1),cv.clientWidth,cv.clientHeight,activo,
      ['L2-vaso','L2-mai','L2-roca'].map(function(i){var e=document.getElementById(i);return e&&e.checked?1:0}).join('')].join('|'),
      t=performance.now();
  if(f!==firma2||t-ult2>500){ ren.render(sc,cam); firma2=f; ult2=t; }
}

/* ---------- arranque ---------- */
function arrancar(){
  construir(); construirVaso(); trazas(); predio();
  var p0=S.ert[0];
  target.set(0,hUV(.5,.5)*EX,0); place();
  resize();
  /* la primera sección (174 KB) se pide cuando el visor se acerca a la pantalla */
  difiere(cv,function(){ if(p0&&p0.cal) mostrarSeccion(p0.id) });
  animar();
  /* botones de perfil */
  var cont=document.getElementById('ert-btns');
  if(cont) S.ert.forEach(function(p,i){
    var b=document.createElement('button');
    b.className='tg'; b.textContent=p.id.replace('ERT-',''); b.setAttribute('aria-label','Perfil '+p.id+', '+p.L+' m de largo');
    b.setAttribute('aria-pressed',i===0?'true':'false');
    b.title=p.id+' · '+p.L+' m'+(p.rho?' · '+p.rho[0]+'–'+p.rho[1]+' Ω·m':'');
    b.addEventListener('click',function(){
      [].forEach.call(cont.children,function(x){x.setAttribute('aria-pressed','false')});
      b.setAttribute('aria-pressed','true');
      mostrarSeccion(p.id); pieSeccion(p);
    });
    cont.appendChild(b);
  });
  if(p0) pieSeccion(p0);
  ['L2-vaso','L2-mai','L2-roca'].forEach(function(id){
    var e=document.getElementById(id);
    if(e) e.addEventListener('change',function(){
      if(id==='L2-vaso'&&vaso) vaso.visible=e.checked;
      if(id==='L2-mai'){ if(estratos.maicillo)estratos.maicillo.visible=e.checked;
                         if(estratos.variable)estratos.variable.visible=e.checked }
      if(id==='L2-roca'&&estratos.roca) estratos.roca.visible=e.checked;
    });
  });
}
function pieSeccion(p){
  var e=document.getElementById('ert-pie'); if(!e) return;
  e.innerHTML='<b>'+p.id+'</b> · '+p.L+' m de largo, rumbo '+
    p.rb.toFixed(0).replace('.',',')+'°'+
    (p.rho?' · resistividad de <b>'+p.rho[0].toLocaleString('es-CL')+'</b> a <b>'+
      p.rho[1].toLocaleString('es-CL')+' Ω·m</b>':'')+
    (p.cal?' · la sección llega a la cota '+Math.round(p.cal.eb)+' m.s.n.m.':'');
  var im=document.getElementById('ert-img');
  if(im&&p.img){ im.src=p.img; im.alt='Sección de resistividad eléctrica '+p.id+
    ', del estudio geofísico del titular.'; }
}

/* el modelo de elevación ya lo cargó el visor de arriba; si no, lo pide */
function conAltura(cb){
  /* si el visor del terreno ya lo decodificó, se usa ese; si lo está cargando, se espera */
  if(D._H){ H=D._H; cb(); return }
  if(document.getElementById('cv')&&D._Hcbs!==null){
    (D._Hcbs=D._Hcbs||[]).push(function(){ H=D._H; cb() });
    /* por si el visor del terreno no llega a cargarlo */
    setTimeout(function(){ if(!H){ D._Hcbs=null; cargarPropio(cb) } },8000);
    return;
  }
  cargarPropio(cb);
}
function cargarPropio(cb){
  var im=new Image();
  im.onload=function(){
    var c=document.createElement('canvas');c.width=N;c.height=N;
    var x=c.getContext('2d');x.drawImage(im,0,0);
    var d=x.getImageData(0,0,N,N).data;
    H=new Float32Array(N*N); var rg=M.emax-M.emin;
    for(var i=0;i<N*N;i++) H[i]=M.emin+(((d[i*4]<<M.sh)|(d[i*4+1]>>(8-M.sh)))/M.lv)*rg;
    cb();
  };
  im.onerror=function(){H=new Float32Array(N*N);cb()};
  im.src='altura.png';
}
conAltura(arrancar);
})();
