/* ================= visor 3D del terreno ================= */
(function(){
if(typeof THREE==='undefined'){ return; }
var M=D.terr, S=M.ancho_m, N=M.n;
var cv=$('#cv');
var my=function(lat){return Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))};
var MY0=my(M.lat0), MY1=my(M.lat1);
function uv(lon,lat){return [(lon-M.lon0)/(M.lon1-M.lon0),(my(lat)-MY0)/(MY1-MY0)]}
function wx(u){return (u-0.5)*S}
function wz(v){return -(v-0.5)*S}

var EX=1.6, exOn=true, K=function(){return exOn?EX:1};
var H=null;
function hAt(u,v){
  if(!H) return 0;
  var c=Math.min(N-1,Math.max(0,u*(N-1))), r=Math.min(N-1,Math.max(0,(1-v)*(N-1)));
  var c0=c|0,r0=r|0,c1=Math.min(N-1,c0+1),r1=Math.min(N-1,r0+1),fc=c-c0,fr=r-r0;
  var a=H[r0*N+c0],b=H[r0*N+c1],d=H[r1*N+c0],e=H[r1*N+c1];
  return (a*(1-fc)+b*fc)*(1-fr)+(d*(1-fc)+e*fc)*fr;
}
function hWorld(x,z){return hAt(x/S+0.5,-z/S+0.5)}

/* ---------- renderer ---------- */
var ren=new THREE.WebGLRenderer({antialias:true});
ren.setPixelRatio(Math.min(devicePixelRatio,2));
cv.appendChild(ren.domElement);
var sc=new THREE.Scene();

/* cielo en degradé: da horizonte y despega el terreno del fondo */
(function(){
  var c=document.createElement('canvas'); c.width=4; c.height=256;
  var g=c.getContext('2d'), lg=g.createLinearGradient(0,0,0,256);
  lg.addColorStop(0,'#1d2a33'); lg.addColorStop(.52,'#36454b');
  lg.addColorStop(.78,'#6c7566'); lg.addColorStop(1,'#8d8f78');
  g.fillStyle=lg; g.fillRect(0,0,4,256);
  var t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter;
  sc.background=t;
})();

var cam=new THREE.PerspectiveCamera(40,16/10,8,S*6);
var target=new THREE.Vector3(0,0,0);
var th=-0.78, ph=0.80, rad=S*0.42;

function place(){
  cam.position.set(
    target.x+rad*Math.sin(ph)*Math.sin(th),
    target.y+rad*Math.cos(ph),
    target.z+rad*Math.sin(ph)*Math.cos(th));
  cam.lookAt(target);
}

/* ---------- terreno como bloque ---------- */
var terr=null, falda=null, texSat=null, texAlt=null, matC=null;
var cicatriz=null, texCic=null, cuenca=null, texCue=null;
var modo='carto';
var G=256;
function construirTerreno(){
  var pos=[],uvs=[],idx=[],k=K();
  for(var j=0;j<G;j++) for(var i=0;i<G;i++){
    var u=i/(G-1),v=j/(G-1);
    pos.push(wx(u),hAt(u,v)*k,wz(v)); uvs.push(u,v);
  }
  for(var j2=0;j2<G-1;j2++) for(var i2=0;i2<G-1;i2++){
    var a=j2*G+i2,b=a+1,c=a+G,d=c+1; idx.push(a,b,c, b,d,c);
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(idx); g.computeVertexNormals();
  if(terr){sc.remove(terr);terr.geometry.dispose();}
  if(!matC) matC=matCarto();
  matC.uniforms.exag.value=k;
  terr=new THREE.Mesh(g, modo==='sat'&&texSat ? new THREE.MeshBasicMaterial({map:texSat}) : matC);
  sc.add(terr);

  /* falda vertical + base: el terreno lee como bloque, no como papel */
  var base=(M.emin-70)*k, fp=[];
  function borde(getU,getV,inv){
    for(var i=0;i<G-1;i++){
      var u0=getU(i/(G-1)),v0=getV(i/(G-1)),u1=getU((i+1)/(G-1)),v1=getV((i+1)/(G-1));
      var x0=wx(u0),z0=wz(v0),y0=hAt(u0,v0)*k,x1=wx(u1),z1=wz(v1),y1=hAt(u1,v1)*k;
      if(inv) fp.push(x0,y0,z0,x1,y1,z1,x0,base,z0, x1,y1,z1,x1,base,z1,x0,base,z0);
      else    fp.push(x0,y0,z0,x0,base,z0,x1,y1,z1, x1,y1,z1,x0,base,z0,x1,base,z1);
    }
  }
  borde(function(t){return t},function(){return 0},true);
  borde(function(t){return t},function(){return 1},false);
  borde(function(){return 0},function(t){return t},false);
  borde(function(){return 1},function(t){return t},true);
  var gf=new THREE.BufferGeometry();
  gf.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));
  gf.computeVertexNormals();
  if(falda){sc.remove(falda);falda.geometry.dispose();}
  falda=new THREE.Mesh(gf,new THREE.MeshLambertMaterial({color:0x33302a,side:THREE.DoubleSide}));
  sc.add(falda);
  construirCicatriz(pos,uvs,idx);
  construirCuenca(pos,uvs,idx);
}

/* ambas capas nacen apagadas: la imagen se pide recién al encenderlas */
function cargaCic(){
  if(!texCic){ texCic=tl.load('cicatriz.png');
    texCic.minFilter=THREE.LinearFilter; texCic.generateMipmaps=false }
  return texCic;
}
function cargaCue(){
  if(!texCue){ texCue=tl.load('cuenca.png');
    texCue.minFilter=THREE.LinearFilter; texCue.generateMipmaps=false }
  return texCue;
}
function enciende(malla,tex){
  if(!malla) return;
  if(!malla.material.map){ malla.material.map=tex(); malla.material.needsUpdate=true }
  malla.visible=true;
}

/* ---------- cicatriz del megaincendio de febrero 2024 ---------- */
function construirCicatriz(pos,uvs,idx){
  if(cicatriz){sc.remove(cicatriz);cicatriz.geometry.dispose()}
  var p2=pos.slice();
  for(var i=1;i<p2.length;i+=3) p2[i]+=9;        /* 9 m sobre el terreno */
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p2,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs.slice(),2));
  g.setIndex(idx.slice());
  cicatriz=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:chkOn('L-cicatriz')?cargaCic():null,
    transparent:true,depthWrite:false,opacity:.62}));
  cicatriz.renderOrder=1;
  cicatriz.visible=chkOn('L-cicatriz');
  sc.add(cicatriz);
}

/* ---------- cuenca visual: desde dónde se verá el macizo ---------- */
function construirCuenca(pos,uvs,idx){
  if(cuenca){sc.remove(cuenca);cuenca.geometry.dispose()}
  var p2=pos.slice();
  for(var i=1;i<p2.length;i+=3) p2[i]+=14;
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(p2,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs.slice(),2));
  g.setIndex(idx.slice());
  cuenca=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:chkOn('L-cuenca')?cargaCue():null,
    transparent:true,depthWrite:false,opacity:.75}));
  cuenca.renderOrder=1;
  cuenca.visible=chkOn('L-cuenca');
  sc.add(cuenca);
}

/* ---------- capas drapeadas ---------- */
var L3={};
function anillos(g){return g.type==='Polygon'?[g.coordinates]:g.coordinates}
function formaDe(geom){
  var out=[];
  anillos(geom).forEach(function(pl){
    var sh=null;
    pl.forEach(function(ring,ri){
      var pts=ring.map(function(c){var p=uv(c[0],c[1]);return new THREE.Vector2(wx(p[0]),wz(p[1]))});
      if(ri===0) sh=new THREE.Shape(pts); else sh.holes.push(new THREE.Path(pts));
    });
    if(sh) out.push(sh);
  });
  return out;
}
function drapeado(geom,color,op,alto){
  var sh=formaDe(geom); if(!sh.length) return null;
  var g=new THREE.ShapeGeometry(sh), p=g.attributes.position, k=K();
  for(var i=0;i<p.count;i++){
    var x=p.getX(i),y=p.getY(i);
    p.setXYZ(i,x,hWorld(x,y)*k+alto,y);
  }
  p.needsUpdate=true;
  var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:color,transparent:true,
    opacity:op,side:THREE.DoubleSide,depthWrite:false}));
  m.renderOrder=2; sc.add(m); return m;
}
function contorno(geom,color,alto,op){
  var gr=new THREE.Group(),k=K();
  anillos(geom).forEach(function(pl){pl.forEach(function(ring){
    var pts=ring.map(function(c){
      var p=uv(c[0],c[1]),x=wx(p[0]),z=wz(p[1]);
      return new THREE.Vector3(x,hWorld(x,z)*k+alto,z);
    });
    gr.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:color,transparent:true,opacity:op==null?.95:op})));
  })});
  gr.renderOrder=3; sc.add(gr); return gr;
}

/* ---------- manchas urbanas: los mismos límites del mapa de anillos ---------- */
function urbano(){
  var gr=new THREE.Group(), k=K(), seg=[];
  (D.residencial||[]).forEach(function(r){
    var bb=bboxOf(r.g,[180,90,-180,-90]);
    var a=uv(bb[0],bb[1]), b=uv(bb[2],bb[3]);
    if(b[0]<-0.01||a[0]>1.01||b[1]<-0.01||a[1]>1.01) return;   /* fuera del bloque */
    anillos(r.g).forEach(function(pl){pl.forEach(function(ring){
      for(var j=0;j<ring.length-1;j++){
        var p=uv(ring[j][0],ring[j][1]), q=uv(ring[j+1][0],ring[j+1][1]);
        seg.push(wx(p[0]),hAt(p[0],p[1])*k+12,wz(p[1]),
                 wx(q[0]),hAt(q[0],q[1])*k+12,wz(q[1]));
      }
    })});
  });
  if(!seg.length) return gr;
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));
  gr.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xbfc9d6,
    transparent:true,opacity:.55})));
  gr.renderOrder=3; sc.add(gr); return gr;
}

/* ---------- masa de residuos ---------- */
var masa=null, masaBase=0, masaShapes=null, centroU=[0.5,0.5];
function prepararMasa(){
  masaShapes=formaDe(L.residuos.g);
  var s=0,n=0,su=0,sv=0;
  anillos(L.residuos.g).forEach(function(pl){pl[0].forEach(function(c){
    var p=uv(c[0],c[1]); s+=hAt(p[0],p[1]); su+=p[0]; sv+=p[1]; n++;
  })});
  masaBase=s/Math.max(n,1); centroU=[su/n,sv/n];
}
function dibujarMasa(esp){
  if(masa){sc.remove(masa);masa.traverse(function(o){if(o.geometry)o.geometry.dispose()});masa=null}
  if(esp<=0.5||!masaShapes) return;
  var k=K(), topY=(masaBase+esp)*k, gr=new THREE.Group();
  var gc=new THREE.ShapeGeometry(masaShapes), p=gc.attributes.position;
  for(var i=0;i<p.count;i++) p.setXYZ(i,p.getX(i),topY,p.getY(i));
  p.needsUpdate=true; gc.computeVertexNormals();
  gr.add(new THREE.Mesh(gc,new THREE.MeshLambertMaterial({color:0xff7a45,
    emissive:0x3a1206})));
  var pos=[];
  anillos(L.residuos.g).forEach(function(pl){pl.forEach(function(ring){
    for(var j=0;j<ring.length-1;j++){
      var A=uv(ring[j][0],ring[j][1]),B=uv(ring[j+1][0],ring[j+1][1]);
      var ax=wx(A[0]),az=wz(A[1]),bx=wx(B[0]),bz=wz(B[1]);
      var ay=Math.min(hAt(A[0],A[1])*k,topY-2),by=Math.min(hAt(B[0],B[1])*k,topY-2);
      pos.push(ax,ay,az,bx,by,bz,ax,topY,az, bx,by,bz,bx,topY,bz,ax,topY,az);
    }
  })});
  var gw=new THREE.BufferGeometry();
  gw.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  gw.computeVertexNormals();
  gr.add(new THREE.Mesh(gw,new THREE.MeshLambertMaterial({color:0xd44f24,
    emissive:0x2a0c03})));
  masa=gr; masa.renderOrder=4; sc.add(gr);
  masa.visible=chkOn('L-masa');
}
function chkOn(id){var e=document.getElementById(id);return !e||e.checked}

sc.add(new THREE.AmbientLight(0xffffff,.74));
var dl=new THREE.DirectionalLight(0xfff2e2,.62); dl.position.set(-1,1.5,.7); sc.add(dl);

/* ---------- marcas: un punto por comunidad, rótulo para las que quepan ---------- */
var marcas=[], CERCANAS=16, CORREDOR=10;
/* el corredor norte, 350°–20°, es el eje del viento que declara el titular:
   ahí viven Paso Hondo, Estrella Polar y Angamos, lejos pero a sotavento directo */
function enCorredor(rb){ return rb>=350 || rb<=20 }
function construirMarcas(){
  var lista=(D.barrios||[]).slice().sort(function(a,b){return a.d-b.d});
  var vistos={}, nCerca=0, nCorr=0;
  lista.forEach(function(b){
    if(vistos[b.n]) return;
    var p=uv(b.x,b.y);
    if(p[0]<0.03||p[0]>0.97||p[1]<0.03||p[1]>0.97) return;
    var corr = b.rb!=null && enCorredor(b.rb);
    if(nCerca<CERCANAS) nCerca++;              /* cupo por cercanía */
    else if(corr && nCorr<CORREDOR) nCorr++;   /* cupo extra del eje del viento */
    else return;
    vistos[b.n]=1;
    var orden=marcas.length;
    var el=document.createElement('div');
    el.className='marca'+(b.d<2.6?' cerca':'')+(orden>=6?' lejos':'')+(corr?' eje':'');
    el.innerHTML='<i class="ln"></i><i class="pt"></i><span class="tx">'+b.n+
      ' <span class="km">'+b.d.toFixed(2).replace('.',',')+' km</span></span>';
    cv.appendChild(el);
    marcas.push({el:el,u:p,d:b.d,n:b.n,orden:orden,corr:corr,
                 v3:new THREE.Vector3(), ln:el.querySelector('.ln')});
  });
}
/* cuántos rótulos caben: más cerca la cámara, más nombres */
function cupoRotulos(w){
  var z=Math.max(0,Math.min(1,(S*0.62-rad)/(S*0.5)));   /* 0 lejos · 1 cerca */
  var base=w<560?4:8;
  return Math.round(base + z*(w<560?5:11));
}
function ubicarMarcas(){
  var w=cv.clientWidth,h=cv.clientHeight,on=chkOn('L-barrios');
  var flota = !(window.matchMedia&&window.matchMedia('(max-width:900px)').matches);
  var reserva = flota?226:10, ANCHO=210;
  var hueco=null;
  if(flota){
    var vb=document.getElementById('vbox');
    if(vb){ var a=vb.getBoundingClientRect(), b=cv.getBoundingClientRect();
      hueco=[a.left-b.left-8,a.top-b.top-6,a.right-b.left+8,a.bottom-b.top+6] }
  }
  var enPantalla=[];
  marcas.forEach(function(m){
    if(!on){ m.el.className=m.el.className.replace(/ (vis|rot)\b/g,''); return }
    m.v3.set(wx(m.u[0]),hAt(m.u[0],m.u[1])*K()+16,wz(m.u[1]));
    var q=m.v3.clone().project(cam);
    var x=(q.x*.5+.5)*w, y=(-q.y*.5+.5)*h;
    if(q.z>=1||x<8||x>w-8||y<10||y>h-10){ apaga(m); return }
    m.x=x; m.y=y; m.izq = x > w-reserva-ANCHO;
    enPantalla.push(m);
  });
  if(!on) return;
  /* el punto se muestra siempre que esté en pantalla */
  enPantalla.forEach(function(m){
    m.el.style.transform='translate('+m.x.toFixed(0)+'px,'+m.y.toFixed(0)+'px)';
    m.el.classList.add('vis');
  });
  /* los rótulos: por cercanía, los que quepan y no choquen */
  var cupo=cupoRotulos(w);
  var cand=enPantalla.filter(function(m){ return m.x<w-reserva })
                     .sort(function(a,b){
                       var pa=a.orden-(a.corr?6:0), pb=b.orden-(b.corr?6:0);
                       return pa-pb;
                     }).slice(0,cupo);
  cand.sort(function(a,b){return a.y-b.y});
  var alto=18, DERIVA=60, prev=-1e9;
  cand.forEach(function(it){ it.ty=Math.max(it.y,prev+alto); prev=it.ty });
  var racimos=[], cur=cand.length?[cand[0]]:[];
  for(var i=1;i<cand.length;i++){
    if(cand[i].ty>cand[i].y+0.5) cur.push(cand[i]);
    else { racimos.push(cur); cur=[cand[i]] }
  }
  if(cur.length) racimos.push(cur);
  racimos.forEach(function(r){
    if(r.length<2) return;
    var dd=0; r.forEach(function(it){dd+=it.ty-it.y}); dd/=r.length;
    r.forEach(function(it){it.ty-=dd});
  });
  var conRotulo={};
  cand.forEach(function(it){
    var x0=it.izq?it.x-ANCHO:it.x, x1=it.izq?it.x:it.x+ANCHO, dy=it.ty-it.y;
    if(dy>DERIVA||it.ty<14||it.ty>h-10||
       (hueco&&x1>hueco[0]&&x0<hueco[2]&&it.ty>hueco[1]&&it.ty<hueco[3])) return;
    conRotulo[it.n]=1;
    it.el.classList.toggle('izq',it.izq);
    it.el.classList.add('rot');
    it.el.style.setProperty('--dy',dy.toFixed(0)+'px');
    if(it.ln){ it.ln.style.height=Math.max(0,Math.abs(dy)-5).toFixed(0)+'px';
               it.ln.style.top=(dy<0?dy+5:0).toFixed(0)+'px' }
  });
  enPantalla.forEach(function(m){ if(!conRotulo[m.n]) m.el.classList.remove('rot') });
}
function apaga(m){ m.el.classList.remove('vis'); m.el.classList.remove('rot') }

/* al pasar el cursor, cualquier punto revela su nombre */
(function(){
  var dom=ren.domElement, ultimo=null;
  dom.addEventListener('pointermove',function(e){
    var r=dom.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top, mejor=null, md=16;
    for(var i=0;i<marcas.length;i++){
      var m=marcas[i];
      if(!m.el.classList.contains('vis')||m.x==null) continue;
      var d=Math.hypot(m.x-px,m.y-py);
      if(d<md){ md=d; mejor=m }
    }
    if(ultimo&&ultimo!==mejor) ultimo.el.classList.remove('hov');
    if(mejor) mejor.el.classList.add('hov');
    ultimo=mejor;
  });
  dom.addEventListener('pointerdown',function(e){
    var r=dom.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top, mejor=null, md=22;
    for(var i=0;i<marcas.length;i++){
      var m=marcas[i];
      if(!m.el.classList.contains('vis')||m.x==null) continue;
      var d=Math.hypot(m.x-px,m.y-py);
      if(d<md){ md=d; mejor=m }
    }
    if(ultimo&&ultimo!==mejor) ultimo.el.classList.remove('hov');
    if(mejor) mejor.el.classList.add('hov');
    ultimo=mejor;
  });
  dom.addEventListener('pointerleave',function(){
    if(ultimo){ ultimo.el.classList.remove('hov'); ultimo=null }
  });
})();

/* ---------- capas ---------- */
function construirCapas(){
  Object.keys(L3).forEach(function(k){if(L3[k])sc.remove(L3[k])});
  L3={};
  L3.predio=contorno(L.predio.g,0xf2f5ef,16,.9);
  L3.exca=contorno(L.excavacion.g,0xffc957,10,.95);
  L3.lix=drapeado(L.lixiviados.g,0x4fc3f7,.95,13);
  L3.corta=drapeado(L.cortafuegos.g,0x8fe07a,.9,11);
  L3.inst=drapeado(L.instalaciones.g,0xd8d8cf,.72,10);
  L3.urbano=urbano();
  aplicarCapas();
}
function aplicarCapas(){
  var m={'L-predio':'predio','L-exca':'exca','L-lix':'lix','L-corta':'corta',
         'L-inst':'inst','L-urbano':'urbano'};
  Object.keys(m).forEach(function(id){if(L3[m[id]])L3[m[id]].visible=chkOn(id)});
  if(masa) masa.visible=chkOn('L-masa');
}

/* ---------- recursos ---------- */
function cargarAltura(cb){
  var im=new Image();
  im.onload=function(){
    var c=document.createElement('canvas');c.width=N;c.height=N;
    var x=c.getContext('2d');x.drawImage(im,0,0);
    var d=x.getImageData(0,0,N,N).data;
    H=new Float32Array(N*N); var rg=M.emax-M.emin;
    for(var i=0;i<N*N;i++){
      var q=(d[i*4]<<M.sh)|(d[i*4+1]>>(8-M.sh));
      H[i]=M.emin+(q/M.lv)*rg;
    }
    texAlt=new THREE.Texture(im);
    texAlt.minFilter=THREE.NearestFilter; texAlt.magFilter=THREE.NearestFilter;
    texAlt.generateMipmaps=false;
    texAlt.wrapS=texAlt.wrapT=THREE.ClampToEdgeWrapping;
    texAlt.needsUpdate=true;
    cb();
  };
  im.onerror=function(){H=new Float32Array(N*N);cb()};
  im.src='altura.png';
}
var tl=new THREE.TextureLoader();
function cargarSat(cb){
  if(texSat){cb&&cb();return}
  var b=$('#b-sat'); b.textContent='Cargando…';
  texSat=tl.load('textura.jpg',function(){
    b.textContent='Satélite';
    var an=ren.capabilities.getMaxAnisotropy?ren.capabilities.getMaxAnisotropy():1;
    texSat.generateMipmaps=true;
    texSat.minFilter=THREE.LinearMipmapLinearFilter;
    texSat.magFilter=THREE.LinearFilter;
    texSat.anisotropy=an; texSat.needsUpdate=true;
    cb&&cb();
  });
}
function arrancar(){
  construirTerreno(); prepararMasa(); construirCapas(); construirMarcas();
  target.set(wx(centroU[0]), hAt(centroU[0],centroU[1])*K()+40, wz(centroU[1]));
  aplicarAnio(+$('#tl').value);
  crearPluma(); crearFlujo(); crearArcos(); rosaViento();
  resize(); place(); animar();
}

/* ---------- tiempo ---------- */
var P3=D.proy;
function aplicarAnio(y){
  $('#tl-yr').textContent=y===0?'Antes de operar':'Año '+y;
  var ton=y?P3.acumulado_t[y-1]:0, esp=y?P3.altura_m[y-1]:0,
      ch4=y?P3.ch4_m3_anio[y-1]:0, cm=y?Math.round(P3.masa_anual_t[y-1]/3650)*2:0;
  $('#k-ton').textContent=ton?(ton/1e6).toFixed(1).replace('.',',')+' M t':'—';
  $('#k-esp').textContent=esp?esp.toFixed(1).replace('.',',')+' m':'—';
  $('#k-ch4').textContent=ch4?(ch4/1e6).toFixed(0)+' M m³':'—';
  $('#k-cam').textContent=cm||'—';
  dibujarMasa(esp);
}
$('#tl').addEventListener('input',function(){aplicarAnio(+this.value)});
var tmr=null,rep=false;
$('#tl-play').addEventListener('click',function(){
  var b=this,s=$('#tl');
  if(rep){clearInterval(tmr);rep=false;b.textContent='▶ Animar llenado';return}
  rep=true;b.textContent='❚❚ Pausar'; if(+s.value>=25) s.value=0;
  tmr=setInterval(function(){
    var v=+s.value+1;
    if(v>25){clearInterval(tmr);rep=false;b.textContent='▶ Animar llenado';return}
    s.value=v; aplicarAnio(v);
  },340);
});

/* ---------- controles ---------- */
var drag=false,lx=0,ly=0;
var dom=ren.domElement; dom.style.touchAction='none'; dom.style.cursor='grab';
dom.addEventListener('pointerdown',function(e){
  drag=true;lx=e.clientX;ly=e.clientY;dom.style.cursor='grabbing';
  dom.setPointerCapture(e.pointerId)});
dom.addEventListener('pointermove',function(e){
  if(!drag)return;
  th-=(e.clientX-lx)*0.005;
  ph=Math.max(0.22,Math.min(1.08,ph-(e.clientY-ly)*0.005));
  lx=e.clientX;ly=e.clientY;place()});
['pointerup','pointercancel','pointerleave'].forEach(function(ev){
  dom.addEventListener(ev,function(){drag=false;dom.style.cursor='grab'})});
dom.addEventListener('wheel',function(e){
  e.preventDefault();
  rad=Math.max(S*0.08,Math.min(S*1.1,rad*(1+(e.deltaY>0?.12:-.12))));place()},{passive:false});

['L-masa','L-predio','L-exca','L-lix','L-corta','L-inst','L-urbano'].forEach(function(id){
  var e=document.getElementById(id); if(e) e.addEventListener('change',aplicarCapas)});
(function(){var e=document.getElementById('L-cicatriz');
  if(e) e.addEventListener('change',function(){
    if(e.checked) enciende(cicatriz,cargaCic); else if(cicatriz) cicatriz.visible=false })})();
(function(){var e=document.getElementById('L-cuenca');
  if(e) e.addEventListener('change',function(){
    if(e.checked) enciende(cuenca,cargaCue); else if(cuenca) cuenca.visible=false })})();

$('#b-sat').addEventListener('click',function(){
  var b=this;
  cargarSat(function(){
    modo='sat'; construirTerreno();
    b.setAttribute('aria-pressed','true'); $('#b-rel').setAttribute('aria-pressed','false');
  });
});
$('#b-rel').addEventListener('click',function(){
  modo='carto'; construirTerreno();
  this.setAttribute('aria-pressed','true'); $('#b-sat').setAttribute('aria-pressed','false');
});
var bc=document.getElementById('b-curv');
if(bc) bc.addEventListener('click',function(){
  var on=this.getAttribute('aria-pressed')!=='true';
  this.setAttribute('aria-pressed',on);
  if(matC) matC.uniforms.contorno.value=on?1.0:0.0;
});
$('#b-exa').addEventListener('click',function(){
  exOn=!exOn;this.setAttribute('aria-pressed',exOn);
  this.textContent=exOn?'Exagerar ×1,6':'Escala real';
  construirTerreno();construirCapas();
  target.y=hAt(centroU[0],centroU[1])*K()+40;
  aplicarAnio(+$('#tl').value);crearArcos();place()});

/* ================= partículas ================= */
function sprite(cen,bor){
  var c=document.createElement('canvas'); c.width=c.height=64;
  var g=c.getContext('2d'), rg=g.createRadialGradient(32,32,0,32,32,32);
  rg.addColorStop(0,cen); rg.addColorStop(.45,bor); rg.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=rg; g.fillRect(0,0,64,64);
  var t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter; return t;
}
var V=D.viento, ACC=45;                      /* tiempo acelerado 45× */
var vientoHacia=V.hacia, vientoVel=V.media;
function dirViento(){
  var r=vientoHacia*Math.PI/180;
  return new THREE.Vector3(Math.sin(r),0,-Math.cos(r));
}

/* ---------- pluma de gases ---------- */
var NP=1400, pluma=null, pPos=null, pDat=[];
function crearPluma(){
  pPos=new Float32Array(NP*3);
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pPos,3));
  var col=new Float32Array(NP*3);
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  pluma=new THREE.Points(g,new THREE.PointsMaterial({size:95,map:sprite(
    'rgba(255,214,160,.95)','rgba(255,150,70,.42)'),
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    sizeAttenuation:true,vertexColors:true,opacity:.62}));
  pluma.frustumCulled=false; pluma.renderOrder=6; sc.add(pluma);
  for(var i=0;i<NP;i++) pDat.push(nacerP(Math.random()*13));
  pluma.visible=chkOn('L-pluma');
}
function nacerP(edad){
  var e=D.emis[(Math.random()*D.emis.length)|0], p=uv(e[0],e[1]);
  return {u:p[0],v:p[1],x:wx(p[0]),z:wz(p[1]),
          y:hAt(p[0],p[1])*K()+8+Math.random()*25,
          t:edad||0, vida:9+Math.random()*7,
          lat:(Math.random()-.5), sube:.5+Math.random()*1.3};
}
function pasoPluma(dt){
  if(!pluma||!pluma.visible) return;
  var d=dirViento(), per=new THREE.Vector3(-d.z,0,d.x), k=K();
  var col=pluma.geometry.attributes.color.array;
  for(var i=0;i<NP;i++){
    var q=pDat[i]; q.t+=dt;
    if(q.t>q.vida){ pDat[i]=nacerP(0); q=pDat[i]; }
    var v=vientoVel*ACC*dt;
    q.x+=d.x*v + per.x*q.lat*v*0.26;
    q.z+=d.z*v + per.z*q.lat*v*0.26;
    q.y+=q.sube*ACC*dt*0.22;
    var uu=q.x/S+0.5, vv=-q.z/S+0.5;
    if(uu<0.01||uu>0.99||vv<0.01||vv>0.99){ pDat[i]=nacerP(0); q=pDat[i]; }
    var suelo=hWorld(q.x,q.z)*k+6;
    if(q.y<suelo) q.y=suelo;
    pPos[i*3]=q.x; pPos[i*3+1]=q.y; pPos[i*3+2]=q.z;
    var f=1-q.t/q.vida;                       /* se diluye al alejarse */
    col[i*3]=f*1.0; col[i*3+1]=f*0.62; col[i*3+2]=f*0.32;
  }
  pluma.geometry.attributes.position.needsUpdate=true;
  pluma.geometry.attributes.color.needsUpdate=true;
}

/* ---------- escorrentía ---------- */
var NF=900, flujo=null, fPos=null, fDat=[], FF=null, FN=D.flujo.f;
function cargarFlujo(cb){
  var im=new Image();
  im.onload=function(){
    var c=document.createElement('canvas'); c.width=c.height=FN;
    var x=c.getContext('2d'); x.drawImage(im,0,0);
    FF=x.getImageData(0,0,FN,FN).data; cb();
  };
  im.onerror=function(){cb()};
  im.src='flujo.png';
}
function campo(u,v){
  if(!FF) return [0,0,0];
  var c=Math.min(FN-1,Math.max(0,Math.round(u*(FN-1))));
  var r=Math.min(FN-1,Math.max(0,Math.round((1-v)*(FN-1))));
  var i=(r*FN+c)*4;
  return [FF[i]/127.5-1, FF[i+1]/127.5-1, FF[i+2]/255];
}
function crearFlujo(){
  fPos=new Float32Array(NF*3);
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(fPos,3));
  flujo=new THREE.Points(g,new THREE.PointsMaterial({size:58,map:sprite(
    'rgba(200,245,255,.95)','rgba(70,190,240,.5)'),
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    sizeAttenuation:true,opacity:.8}));
  flujo.frustumCulled=false; flujo.renderOrder=6; sc.add(flujo);
  for(var i=0;i<NF;i++) fDat.push(nacerF(Math.random()*20));
  flujo.visible=chkOn('L-flujo');
}
function nacerF(edad){
  var src = Math.random()<0.4 ? D.emisLix : D.emis;
  var e=src[(Math.random()*src.length)|0], p=uv(e[0],e[1]);
  return {u:p[0],v:p[1],t:edad||0,vida:26+Math.random()*16};
}
function pasoFlujo(dt){
  if(!flujo||!flujo.visible||!FF) return;
  var k=K();
  for(var i=0;i<NF;i++){
    var q=fDat[i]; q.t+=dt;
    var f=campo(q.u,q.v);
    var pend=Math.max(f[2],0.06);
    var paso=dt*0.010*(0.35+pend);
    q.u+=f[0]*paso; q.v-=f[1]*paso;            /* fila+ = sur = v- */
    if(q.t>q.vida||q.u<0.01||q.u>0.99||q.v<0.01||q.v>0.99||f[2]<0.02){
      fDat[i]=nacerF(0); q=fDat[i];
    }
    fPos[i*3]=wx(q.u); fPos[i*3+1]=hAt(q.u,q.v)*k+9; fPos[i*3+2]=wz(q.v);
  }
  flujo.geometry.attributes.position.needsUpdate=true;
}

/* ---------- arcos a comunidades ---------- */
var arcos=null, pulsos=[];
function crearArcos(){
  if(arcos) sc.remove(arcos);
  arcos=new THREE.Group(); pulsos=[];
  var k=K();
  var o=new THREE.Vector3(wx(centroU[0]),hAt(centroU[0],centroU[1])*k+120,wz(centroU[1]));
  var quiero=['Botania','Pompeya Sur','Comunidad Alto Valencia','Nuevo Horizonte',
              'Población Esperanza','Los Fundadores 2'];
  var rum={}; D.rumbos.forEach(function(r){rum[r.n]=r});
  quiero.forEach(function(nom){
    var b=null; for(var i=0;i<D.barrios.length;i++) if(D.barrios[i].n===nom){b=D.barrios[i];break}
    if(!b) return;
    var p=uv(b.x,b.y);
    if(p[0]<0.02||p[0]>0.98||p[1]<0.02||p[1]>0.98) return;
    var dst=new THREE.Vector3(wx(p[0]),hAt(p[0],p[1])*k+70,wz(p[1]));
    var mid=o.clone().lerp(dst,.5); mid.y+=o.distanceTo(dst)*0.30;
    var cur=new THREE.QuadraticBezierCurve3(o,mid,dst);
    var enPluma=rum[nom]&&rum[nom].desvio<=35;
    var color=enPluma?0xff9a6b:0x9fb0a4;
    var g=new THREE.BufferGeometry().setFromPoints(cur.getPoints(48));
    arcos.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:color,
      transparent:true,opacity:enPluma?.85:.4})));
    var s=new THREE.Mesh(new THREE.SphereGeometry(26,10,8),
      new THREE.MeshBasicMaterial({color:color}));
    arcos.add(s); pulsos.push({m:s,c:cur,t:Math.random()});
  });
  arcos.renderOrder=5; sc.add(arcos);
  arcos.visible=chkOn('L-arcos');
}
function pasoArcos(dt){
  if(!arcos||!arcos.visible) return;
  pulsos.forEach(function(p){
    p.t=(p.t+dt*0.26)%1; p.m.position.copy(p.c.getPoint(p.t));
  });
}

/* ---------- rosa de los vientos ---------- */
function rosaViento(){
  var svg=$('#rosa'); if(!svg) return;
  var NS='http://www.w3.org/2000/svg', cx=43,cy=43,R=31;
  function E(t,a){var n=document.createElementNS(NS,t);for(var k in a)n.setAttribute(k,a[k]);return n}
  svg.appendChild(E('circle',{cx:cx,cy:cy,r:R,fill:'none',stroke:'#3c4740','stroke-width':1}));
  svg.appendChild(E('circle',{cx:cx,cy:cy,r:R*.55,fill:'none',stroke:'#2f3831','stroke-width':1}));
  [['N',0],['E',90],['S',180],['O',270]].forEach(function(d){
    var a=(d[1]-90)*Math.PI/180;
    var t=E('text',{x:cx+Math.cos(a)*(R+7),y:cy+Math.sin(a)*(R+7)+3,
      'font-size':7.5,'font-family':'var(--cart)',fill:'#7f8c85','text-anchor':'middle'});
    t.textContent=d[0]; svg.appendChild(t);
  });
  function sector(a0,a1,col,op){
    var r0=(a0-90)*Math.PI/180, r1=(a1-90)*Math.PI/180;
    var d='M'+cx+' '+cy+'L'+(cx+Math.cos(r0)*R)+' '+(cy+Math.sin(r0)*R)+
      'A'+R+' '+R+' 0 0 1 '+(cx+Math.cos(r1)*R)+' '+(cy+Math.sin(r1)*R)+'Z';
    svg.appendChild(E('path',{d:d,fill:col,'fill-opacity':op}));
  }
  sector(V.desde_min,V.desde_max,'#ffb067',.85);      /* de dónde viene */
  sector(V.sec_min,V.sec_max,'#ffb067',.26);
  var a=(vientoHacia-90)*Math.PI/180;
  var fl=E('path',{d:'M'+cx+' '+cy+'L'+(cx+Math.cos(a)*(R-4))+' '+(cy+Math.sin(a)*(R-4)),
    stroke:'#fff','stroke-width':1.6});
  svg.appendChild(fl);
  svg.appendChild(E('circle',{cx:cx+Math.cos(a)*(R-4),cy:cy+Math.sin(a)*(R-4),r:2.6,fill:'#fff'}));
  textoViento();
}
function textoViento(){
  var e=$('#vtxt'); if(!e) return;
  var pri = vientoHacia===V.hacia;
  e.innerHTML = pri
    ? 'Proviene de <b>'+V.desde_min+'°–'+V.desde_max+'°</b> (S–SSO)<br>sopla hacia <b>'+V.hacia+'°</b> · '+
      String(V.media).replace('.',',')+' m/s'
    : 'Proviene de <b>'+V.sec_min+'°–'+V.sec_max+'°</b> (NO)<br>sopla hacia <b>'+V.sec_hacia+'°</b> · secundario';
}
$('#w-pri').addEventListener('click',function(){
  vientoHacia=V.hacia; this.setAttribute('aria-pressed','true');
  $('#w-sec').setAttribute('aria-pressed','false'); redibujarRosa();});
$('#w-sec').addEventListener('click',function(){
  vientoHacia=V.sec_hacia; this.setAttribute('aria-pressed','true');
  $('#w-pri').setAttribute('aria-pressed','false'); redibujarRosa();});
function redibujarRosa(){ $('#rosa').innerHTML=''; rosaViento(); }

/* ---------- recorrido de cámara ---------- */
var TOUR=[
  {th:2.45,ph:0.52,rad:0.80,d:0},
  {th:2.10,ph:0.72,rad:0.46,d:4.5},
  {th:1.25,ph:0.95,rad:0.21,d:4.5},
  {th:0.10,ph:0.88,rad:0.24,d:5.0},
  {th:-0.78,ph:0.80,rad:0.42,d:4.0}
];
var tourOn=false,tourI=0,tourT=0,tourDesde=null;
$('#b-tour').addEventListener('click',function(){
  tourOn=!tourOn; this.setAttribute('aria-pressed',tourOn);
  this.textContent=tourOn?'■ Detener':'▶ Recorrido';
  if(tourOn){ tourI=0; tourT=0; tourDesde={th:th,ph:ph,rad:rad/S}; }
});
function pasoTour(dt){
  if(!tourOn) return;
  var k=TOUR[tourI], dur=k.d||0.001;
  tourT+=dt;
  var f=Math.min(tourT/dur,1), e=f<.5?4*f*f*f:1-Math.pow(-2*f+2,3)/2;
  th=tourDesde.th+(k.th-tourDesde.th)*e;
  ph=tourDesde.ph+(k.ph-tourDesde.ph)*e;
  rad=(tourDesde.rad+(k.rad-tourDesde.rad)*e)*S;
  place();
  if(f>=1){
    tourDesde={th:k.th,ph:k.ph,rad:k.rad}; tourT=0; tourI++;
    if(tourI>=TOUR.length){ tourOn=false;
      var b=$('#b-tour'); b.setAttribute('aria-pressed','false'); b.textContent='▶ Recorrido'; }
  }
}

['L-pluma','L-flujo','L-arcos'].forEach(function(id){
  var e=document.getElementById(id);
  if(e) e.addEventListener('change',function(){
    if(id==='L-pluma'&&pluma) pluma.visible=e.checked;
    if(id==='L-flujo'&&flujo) flujo.visible=e.checked;
    if(id==='L-arcos'&&arcos) arcos.visible=e.checked;
  });
});

function resize(){
  var w=cv.clientWidth,h=cv.clientHeight; if(!w||!h)return;
  ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
}
addEventListener('resize',resize);
var vis=true;
if('IntersectionObserver' in window)
  new IntersectionObserver(function(es){vis=es[0].isIntersecting},{rootMargin:'200px'}).observe(cv);

var ult=performance.now();
function animar(){
  requestAnimationFrame(animar);
  var ahora=performance.now(), dt=Math.min((ahora-ult)/1000,0.05); ult=ahora;
  if(!vis) return;
  pasoTour(dt); pasoPluma(dt); pasoFlujo(dt); pasoArcos(dt);
  ren.render(sc,cam); ubicarMarcas();
}
cargarAltura(function(){ cargarFlujo(arrancar) });
})();
