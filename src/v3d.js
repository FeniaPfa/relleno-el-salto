/* ================= visor 3D del terreno ================= */
(function(){
/* sin Three.js o sin WebGL, el lienzo explica por qué está vacío y la página sigue */
function sinWebGL(c){
  c.innerHTML='<p class="sinwebgl">Tu navegador no puede mostrar el modelo 3D. '+
    'Lo esencial está en el texto, en las cifras y en los mapas de esta página.</p>';
}
var cv=$('#cv');
if(typeof THREE==='undefined'){ sinWebGL(cv); return; }
var M=D.terr, S=M.ancho_m, N=M.n;
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
var ren;
/* en celulares de pantalla densa el antialias y la densidad 2 cuestan mucho y no se notan */
var DENSO=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)&&(devicePixelRatio||1)>=2;
try { ren=new THREE.WebGLRenderer({antialias:!DENSO}); }
catch(e){ sinWebGL(cv); return; }
ren.setPixelRatio(Math.min(devicePixelRatio,DENSO?1.5:2));
cv.appendChild(ren.domElement);
/* el lienzo tiene nombre, recibe foco y se mueve con teclado */
ren.domElement.setAttribute('role','img'); ren.domElement.tabIndex=0;
ren.domElement.setAttribute('aria-label','Maqueta 3D del relleno sobre el terreno de la quebrada de El Salto: '+
  'la masa de residuos, el deslinde del predio y las comunidades más cercanas con su distancia. '+
  'Las cifras del año elegido están debajo del visor.');
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
  mobiliario();
}

/* ---------- mobiliario: norte, escala y atribución ---------- */
/* el norte y la escala se calculan proyectando desde el punto que mira la cámara:
   en perspectiva la escala solo vale a esa distancia, como en cualquier visor 3D */
var _mobN=null,_mobB=null,_mobT=null,_mobA=null;
function mobiliario(){
  if(!_mobN){ _mobN=document.getElementById('norteG'); _mobB=document.getElementById('esb');
              _mobT=document.getElementById('est'); _mobA=document.getElementById('atrib'); }
  if(!_mobN) return;
  var w=cv.clientWidth,h=cv.clientHeight; if(!w||!h) return;
  cam.updateMatrixWorld();
  var o=target.clone().project(cam);
  var n=target.clone().add(new THREE.Vector3(0,0,-1000)).project(cam);
  var e=target.clone().add(new THREE.Vector3(1000,0,0)).project(cam);
  var nx=(n.x-o.x)*w/2, ny=-(n.y-o.y)*h/2;
  var ang=Math.atan2(nx,-ny)*180/Math.PI;
  if(isFinite(ang))   /* antes del primer cuadro la cámara aún no proyecta: daba NaN */
    _mobN.setAttribute('transform','rotate('+ang.toFixed(1)+' 22 22)');
  var px=Math.hypot((e.x-o.x)*w/2,-(e.y-o.y)*h/2);
  if(px>0){
    var mpp=1000/px, L=100, opciones=[100,200,500,1000,2000,5000];
    for(var i=0;i<opciones.length;i++) if(opciones[i]/mpp<=130) L=opciones[i];
    _mobB.style.width=(L/mpp).toFixed(0)+'px';
    _mobT.textContent=L>=1000?(L/1000)+' km':L+' m';
  }
  _mobA.textContent = modo==='sat'
    ? 'Esri, Maxar, Earthstar Geographics · Elevación: Mapzen'
    : 'Elevación: Terrain Tiles, Mapzen/AWS';
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
  /* el relato puede vestir el terreno con su propio material; en la principal no hay gancho */
  if(window.VISOR&&VISOR.alTerreno) VISOR.alTerreno(terr);

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
  if(!texCic){ texCic=tl.load(ras('cicatriz.png'));
    texCic.minFilter=THREE.LinearFilter; texCic.generateMipmaps=false }
  return texCic;
}
function cargaCue(){
  if(!texCue){ texCue=tl.load(ras('cuenca.png'));
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
var masa=null, masaBase=0, masaShapes=null, centroU=[0.5,0.5], masaCima=-1e9;
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
  masaCima=-1e9;
  if(esp<=0.5||!masaShapes) return;
  var k=K(), topY=(masaBase+esp)*k, gr=new THREE.Group();
  masaCima=topY;
  var gc=new THREE.ShapeGeometry(masaShapes), p=gc.attributes.position;
  for(var i=0;i<p.count;i++) p.setXYZ(i,p.getX(i),topY,p.getY(i));
  /* la forma vive en XY y se tumba al plano XZ: eso invierte el giro de cada triángulo
     y la tapa queda mirando hacia abajo, invisible desde arriba. Se devuelve el giro. */
  var ix=gc.index.array;
  for(var t=0;t<ix.length;t+=3){var tmp=ix[t+1];ix[t+1]=ix[t+2];ix[t+2]=tmp}
  gc.index.needsUpdate=true;
  p.needsUpdate=true; gc.computeVertexNormals();
  /* naranjo terroso: saturado, pero del color de la tierra removida y no de un rotulador */
  gr.add(new THREE.Mesh(gc,new THREE.MeshLambertMaterial({color:0xb8491f,
    emissive:0x160602,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})));
  var pos=[], borde=[];
  anillos(L.residuos.g).forEach(function(pl){pl.forEach(function(ring){
    for(var j=0;j<ring.length-1;j++){
      var A=uv(ring[j][0],ring[j][1]),B=uv(ring[j+1][0],ring[j+1][1]);
      var ax=wx(A[0]),az=wz(A[1]),bx=wx(B[0]),bz=wz(B[1]);
      var ay=Math.min(hAt(A[0],A[1])*k,topY-2),by=Math.min(hAt(B[0],B[1])*k,topY-2);
      pos.push(ax,ay,az,bx,by,bz,ax,topY,az, bx,by,bz,bx,topY,bz,ax,topY,az);
      borde.push(ax,topY+1.5,az, bx,topY+1.5,bz);
    }
  })});
  var gw=new THREE.BufferGeometry();
  gw.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  gw.computeVertexNormals();
  /* las paredes dejan ver algo del terreno que tapan: la masa se asienta en vez de flotar */
  gr.add(new THREE.Mesh(gw,new THREE.MeshLambertMaterial({color:0x9a3a16,
    emissive:0x1c0702,transparent:true,opacity:.86,side:THREE.DoubleSide,
    polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1})));
  /* borde superior oscuro: separa la coronación del terreno y de la pared */
  var gb=new THREE.BufferGeometry();
  gb.setAttribute('position',new THREE.Float32BufferAttribute(borde,3));
  var rim=new THREE.LineSegments(gb,new THREE.LineBasicMaterial({color:0x4a1707,
    transparent:true,opacity:.9}));
  rim.renderOrder=5; gr.add(rim);
  masa=gr; masa.renderOrder=4; sc.add(gr);
  masa.visible=chkOn('L-masa');
}
function chkOn(id){var e=document.getElementById(id);return !e||e.checked}

sc.add(new THREE.AmbientLight(0xffffff,.74));
var dl=new THREE.DirectionalLight(0xfff2e2,.62); dl.position.set(-1,1.5,.7); sc.add(dl);

/* ---------- marcas: un punto por comunidad, rótulo para las que quepan ---------- */
/* desvíos que se prueban para el rótulo, en orden: pegado al punto y luego
   alejándose arriba y abajo, con la línea guía uniéndolo. */
var DESVIOS=[0,-20,20,-40,40,-62,62,-86,86];
/* Las que quedan bajo la pluma con el viento vigente. Es el mismo conjunto que
   lista el panel: así lo que se lee en la lista es lo que se nombra en el mapa,
   y el resto se queda en punto. */
var bajoPluma={}, conMarca=null;
/* De las 168 del catastro solo 115 caen dentro del recuadro de terreno que se
   dibuja; el resto queda fuera del mapa aunque esté a sotavento. Hay que decirlo:
   si no, la lista promete 44 y el mapa enseña 7, y parece que falta algo. */
var conMarcaN=-1;
function tieneMarca(n){
  /* se reconstruye si cambió el número de marcas: cacheado a secas, la primera
     llamada ocurría antes de construirMarcas() y dejaba el mapa vacío para siempre,
     con lo que TODAS salían como «fuera del recuadro» */
  if(!conMarca || conMarcaN!==marcas.length){
    conMarca={}; conMarcaN=marcas.length;
    marcas.forEach(function(m){ conMarca[m.n]=1 });
  }
  return !!conMarca[n];
}
function marcarPluma(){
  bajoPluma={};
  (typeof aSotavento==='function' ? aSotavento(vientoHacia) : []).forEach(function(b){ bajoPluma[b.n]=1 });
  marcas.forEach(function(m){
    var antes=!!m.sot; m.sot=!!bajoPluma[m.n];
    if(antes!==m.sot){
      m.el.classList.toggle('sot',m.sot);
      m.wtx=null;   /* «sot» cambia el cuerpo de letra: el ancho cacheado ya no vale */
    }
  });
}
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
    if(p[0]<0.03||p[0]>0.97||p[1]<0.03||p[1]>0.97) return;   /* fuera del terreno dibujado */
    var corr = b.rb!=null && enCorredor(b.rb);
    /* Antes aquí se descartaba todo lo que no entrara en los dos cupos, y el
       conjunto quedaba en 26 marcas, todas al norte: al girar la cámara hacia
       el noreste o el noroeste el terreno aparecía sin un solo nombre.
       Ahora entran las 115 que caen dentro del recuadro, y lo que evita el
       amontonamiento es el cupo de rótulos en pantalla, no el tamaño del
       conjunto. Las que exceden los cupos originales son «fondo»: punto más
       discreto y, por su orden, últimas en recibir rótulo. */
    var fondo=false;
    if(nCerca<CERCANAS) nCerca++;
    else if(corr && nCorr<CORREDOR) nCorr++;
    else fondo=true;
    vistos[b.n]=1;
    var orden=marcas.length;
    var el=document.createElement('div');
    el.className='marca'+(b.d<2.6?' cerca':'')+(orden>=6?' lejos':'')+
                 (corr?' eje':'')+(fondo?' fondo':'');
    el.innerHTML='<i class="ln"></i><i class="lnh"></i><i class="pt"></i><span class="tx">'+b.n+
      ' <span class="km">'+b.d.toFixed(2).replace('.',',')+' km</span></span>';
    cv.appendChild(el);
    marcas.push({el:el,u:p,d:b.d,n:b.n,orden:orden,corr:corr,fondo:fondo,
                 v3:new THREE.Vector3(), ln:el.querySelector('.ln'),
                 lnh:el.querySelector('.lnh')});
  });
}
/* cuántos rótulos caben: más cerca la cámara, más nombres */
function cupoRotulos(w){
  var z=Math.max(0,Math.min(1,(S*0.62-rad)/(S*0.5)));   /* 0 lejos · 1 cerca */
  var base=w<560?6:14;
  return Math.round(base + z*(w<560?6:14));
}
function ubicarMarcas(){
  var w=cv.clientWidth,h=cv.clientHeight,on=chkOn('L-barrios');
  var flota = !(window.matchMedia&&window.matchMedia('(max-width:900px)').matches);
  var reserva = flota?226:10, ANCHO=210;
  /* huecos donde no se escribe: la rosa de los vientos (si flota) y el mobiliario */
  var huecos=[], bcv=cv.getBoundingClientRect();
  function hueco(id,m){
    var e=document.getElementById(id); if(!e) return;
    var a=e.getBoundingClientRect();
    huecos.push([a.left-bcv.left-m,a.top-bcv.top-m,a.right-bcv.left+m,a.bottom-bcv.top+m]);
  }
  if(flota) hueco('vbox',8);
  hueco('mob',6);
  function choca(x0,x1,y){
    for(var i=0;i<huecos.length;i++){ var q=huecos[i];
      if(x1>q[0]&&x0<q[2]&&y>q[1]&&y<q[3]) return true }
    return false;
  }
  var enPantalla=[];
  marcas.forEach(function(m){
    if(!on){ m.el.className=m.el.className.replace(/ (vis|rot)\b/g,''); return }
    m.v3.set(wx(m.u[0]),hAt(m.u[0],m.u[1])*K()+16,wz(m.u[1]));
    var q=m.v3.clone().project(cam);
    var x=(q.x*.5+.5)*w, y=(-q.y*.5+.5)*h;
    if(q.z>=1||x<8||x>w-8||y<10||y>h-10){ apaga(m); return }
    /* el texto va al lado donde cabe; si no cabe en ninguno, al que tiene más espacio */
    /* el ancho real del rótulo, medido una vez: con 210 px supuestos para todos,
       los nombres largos se pisaban aunque la prueba de cajas dijera que no */
    if(m.wtx==null){ var tx=m.el.querySelector('.tx'); m.wtx=Math.ceil(tx.offsetWidth)+10 }
    var an=m.wtx||ANCHO;
    m.x=x; m.y=y; m.izq = (x > w-reserva-an) && (x-an > 0 || x > w/2);
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
                       /* bajo la pluma primero: es lo que el panel está listando */
                       var pa=a.orden-(a.corr?6:0)-(a.sot?400:0),
                           pb=b.orden-(b.corr?6:0)-(b.sot?400:0);
                       return pa-pb;
                     }).slice(0,cupo);
  /* Colocación por cajas reales. Antes esto apilaba por «y» y empujaba hacia
     abajo de 18 en 18 confiando en que no se tocaran; con 26 marcas colaba, con
     115 no: medido, aparecían 22 textos pisados al girar una vuelta. Ahora cada
     rótulo propone su caja, se prueba contra las ya aceptadas y contra los
     huecos del mobiliario, y si choca se descarta. El límite deja de ser una
     heurística y pasa a ser el espacio que de verdad hay. */
  /* 23 px, no 19: la caja real del texto mide algo más que el cuerpo de letra y
     dos filas contiguas se tocaban por un píxel. Deja además un respiro visible. */
  var ALTO_TX=23, cajas=[], conRotulo={};
  function libre(x0,x1,y0,y1){
    if(choca(x0,x1,(y0+y1)/2)) return false;
    for(var i=0;i<cajas.length;i++){ var c=cajas[i];
      if(x1>c[0]&&x0<c[2]&&y1>c[1]&&y0<c[3]) return false }
    return true;
  }
  /* bordes a los que puede saltar un rótulo que cae debajo del mobiliario */
  var escapes=huecos.map(function(q){ return q[2]+12 }).sort(function(a,b){return a-b});
  function pone(it,iz,dx,dy){
    var an=it.wtx||ANCHO, bx=it.x+dx;
    var x0=iz?bx-an:bx, x1=iz?bx:bx+an, ty=it.y+dy;
    if(x0<4||x1>w-4||ty<14||ty>h-10) return false;
    if(!libre(x0,x1,ty-ALTO_TX/2,ty+ALTO_TX/2)) return false;
    cajas.push([x0,ty-ALTO_TX/2,x1,ty+ALTO_TX/2]);
    conRotulo[it.n]=1;
    it.el.classList.toggle('izq',iz);
    it.el.classList.add('rot');
    it.el.style.setProperty('--dy',dy.toFixed(0)+'px');
    it.el.style.setProperty('--dx',dx.toFixed(0)+'px');
    if(it.ln){ it.ln.style.height=Math.max(0,Math.abs(dy)-5).toFixed(0)+'px';
               it.ln.style.top=(dy<0?dy+5:0).toFixed(0)+'px' }
    if(it.lnh){ it.lnh.style.width=Math.max(0,Math.abs(dx)-4).toFixed(0)+'px';
                it.lnh.style.left=(dx<0?dx+4:0).toFixed(0)+'px' }
    return true;
  }
  cand.forEach(function(it){
    /* 1) pegado al punto, a un lado o al otro, subiendo o bajando */
    var lados = it.izq ? [true,false] : [false,true];
    for(var li=0; li<lados.length; li++)
      for(var k=0;k<DESVIOS.length;k++)
        if(pone(it,lados[li],0,DESVIOS[k])) return;
    /* 2) si no cupo, suele ser porque el punto está debajo de un panel: el
       rótulo salta al borde de ese panel y la guía horizontal lo ata */
    for(var e=0;e<escapes.length;e++){
      var dx=escapes[e]-it.x;
      if(dx<=12||dx>460) continue;
      for(var k2=0;k2<DESVIOS.length;k2++)
        if(pone(it,false,dx,DESVIOS[k2])) return;
    }
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
    /* el visor del subsuelo usa el mismo modelo: se decodifica una sola vez */
    D._H=H; (D._Hcbs||[]).forEach(function(f){f()}); D._Hcbs=null;
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
  /* en celular basta la mitad de resolución: 0,34 MB en vez de 1,78 */
  var grande=cv.clientWidth*Math.min(devicePixelRatio||1,2)>1200;
  var src=grande?'textura.jpg':(WEBP?'textura-1024.webp':'textura-1024.jpg');
  texSat=tl.load(src,function(){
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
  crearPluma(); crearFlujo(); crearArcos(); rosaViento(); aplicarSim();
  /* con las marcas ya construidas: antes el mando flotante se llenaba al cargar el
     script, sin marcas, y decía «0 en el mapa»; y el resaltado de sotavento no se
     aplicaba hasta tocar un modo */
  marcarPluma(); ecoFlotante(); valorRumbo(vientoHacia); colocarMob();
  resize(); place(); animar();
  VISOR.listo=true;
  try{ window.dispatchEvent(new Event('visor-listo')) }catch(e){}
}

/* ---------- tiempo ---------- */
var P3=D.proy;
function aplicarAnio(y){
  $('#tl-yr').textContent=y===0?'Antes de operar':'Año '+y;
  $('#tl').setAttribute('aria-valuetext',y===0?'Antes de operar':'Año '+y+' de 25');
  var ton=y?P3.acumulado_t[y-1]:0, esp=y?P3.altura_m[y-1]:0,
      ch4=y?P3.ch4_m3_anio[y-1]:0, cm=y&&D.vial&&D.vial.flota?D.vial.flota.necesarios_dia[y-1]:0;
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
var dom=ren.domElement; dom.style.touchAction='pan-y pinch-zoom'; dom.style.cursor='grab';
/* teclado y botones: girar con flechas, acercar con + y − */
function orbita(q){
  if(q==='izq') th+=0.12; if(q==='der') th-=0.12;
  if(q==='mas') rad=Math.max(S*0.08,rad*0.85); if(q==='menos') rad=Math.min(S*1.1,rad*1.18);
  place();
}
dom.addEventListener('keydown',function(e){
  var m={ArrowLeft:'izq',ArrowRight:'der','+':'mas','=':'mas','-':'menos'}[e.key];
  if(e.key==='ArrowUp'){ ph=Math.max(0.22,ph-0.06); place(); e.preventDefault(); return }
  if(e.key==='ArrowDown'){ ph=Math.min(1.08,ph+0.06); place(); e.preventDefault(); return }
  if(m){ orbita(m); e.preventDefault() }
});
Array.prototype.forEach.call(document.querySelectorAll('[data-orb]'),function(b){
  b.addEventListener('click',function(){ orbita(b.getAttribute('data-orb')) });
});
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
    modo='sat'; construirTerreno(); mobiliario();
    b.setAttribute('aria-pressed','true'); $('#b-rel').setAttribute('aria-pressed','false');
  });
});
$('#b-rel').addEventListener('click',function(){
  modo='carto'; construirTerreno(); mobiliario();
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
var modoViento='pri';                        /* pri · sec · man */
var vientoHacia=V.hacia, vientoVel=V.media;
function dirViento(){
  var r=vientoHacia*Math.PI/180;
  return new THREE.Vector3(Math.sin(r),0,-Math.cos(r));
}

/* ---------- pluma de gases ---------- */
/* cada partícula nace pequeña y densa sobre la fuente y se expande mientras se diluye:
   el tamaño y la opacidad van por edad, en el shader, para que lea como gas y no como chispas */
var NP=1600, pluma=null, pPos=null, pEd=null, pDat=[], plumaMat=null;
var PLUMA_VS=[
  'uniform float esc; attribute float ed; varying float vE;',
  'void main(){ vE=ed; vec4 mv=modelViewMatrix*vec4(position,1.0);',
  '  float tam=mix(110.0,520.0,sqrt(ed));',
  '  gl_PointSize=min(tam*esc/-mv.z,260.0); gl_Position=projectionMatrix*mv; }'].join('\n');
var PLUMA_FS=[
  'uniform sampler2D map; varying float vE;',
  'void main(){ float a=texture2D(map,gl_PointCoord).a;',
  '  float f=pow(1.0-vE,1.4)*0.55;',
  '  vec3 c=mix(vec3(0.98,0.72,0.46),vec3(0.80,0.62,0.50),vE);',
  '  gl_FragColor=vec4(c*a*f,a*f); }'].join('\n');
function crearPluma(){
  pPos=new Float32Array(NP*3); pEd=new Float32Array(NP);
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pPos,3));
  g.setAttribute('ed',new THREE.BufferAttribute(pEd,1));
  plumaMat=new THREE.ShaderMaterial({
    uniforms:{map:{value:sprite('rgba(255,255,255,1)','rgba(255,255,255,.4)')},esc:{value:300}},
    vertexShader:PLUMA_VS, fragmentShader:PLUMA_FS,
    /* mezcla normal y no aditiva: humo que vela el terreno, no una luz que lo enciende */
    transparent:true,depthWrite:false,premultipliedAlpha:true,blending:THREE.NormalBlending});
  pluma=new THREE.Points(g,plumaMat);
  pluma.frustumCulled=false; pluma.renderOrder=6; sc.add(pluma);
  for(var i=0;i<NP;i++) pDat.push(nacerP(Math.random()*13));
  pluma.visible=chkOn('L-pluma');
  escalaPluma();
}
/* la atenuación por distancia se calcula como en PointsMaterial: media altura del lienzo en píxeles reales */
function escalaPluma(){
  if(plumaMat) plumaMat.uniforms.esc.value=cv.clientHeight*0.5*ren.getPixelRatio();
}
function nacerP(edad){
  var e=D.emis[(Math.random()*D.emis.length)|0], p=uv(e[0],e[1]);
  /* el gas sale de la superficie del relleno: sobre la masa cuando la hay, si no del suelo */
  return {u:p[0],v:p[1],x:wx(p[0]),z:wz(p[1]),
          y:Math.max(hAt(p[0],p[1])*K(),masaCima)+8+Math.random()*25,
          t:edad||0, vida:9+Math.random()*7,
          lat:(Math.random()-.5), sube:.5+Math.random()*1.3};
}
function pasoPluma(dt){
  if(!pluma||!pluma.visible) return;
  var d=dirViento(), per=new THREE.Vector3(-d.z,0,d.x), k=K();
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
    pEd[i]=Math.min(q.t/q.vida,1);
  }
  pluma.geometry.attributes.position.needsUpdate=true;
  pluma.geometry.attributes.ed.needsUpdate=true;
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
  if(modoViento==='man')                            /* el supuesto del lector, en otro color */
    sector((vientoHacia+145)%360,(vientoHacia+215)%360,'#8fb8d4',.30);
  var a=(vientoHacia-90)*Math.PI/180;
  var fl=E('path',{d:'M'+cx+' '+cy+'L'+(cx+Math.cos(a)*(R-4))+' '+(cy+Math.sin(a)*(R-4)),
    stroke:'#fff','stroke-width':1.6});
  svg.appendChild(fl);
  svg.appendChild(E('circle',{cx:cx+Math.cos(a)*(R-4),cy:cy+Math.sin(a)*(R-4),r:2.6,fill:'#fff'}));
  textoViento();
}
/* Todas las comunidades del catastro, una por nombre y quedándose con la más cercana.
   OJO: aquí NO sirve D.rumbos. Esas son sólo las catorce más próximas, y están todas
   al norte; contando sobre ellas el panel decía «ninguna población» mirando al este,
   donde en realidad hay 44. Al oeste y al noroeste pasaba lo mismo con 6 y 19. */
var COMUNIDADES=(function(){
  var por={};
  (D.barrios||[]).forEach(function(b){
    if(!(b.n in por) || b.d<por[b.n].d) por[b.n]=b;
  });
  return Object.keys(por).map(function(k){return por[k]});
})();

/* Cuántas caen en la pluma de ±35° para un rumbo dado. El ancho es el mismo
   supuesto que declara la sección «Quién queda a sotavento». */
function aSotavento(rumbo){
  var dentro=COMUNIDADES.filter(function(b){
    var d=Math.abs(((b.rb-rumbo+540)%360)-180);   /* separación angular, 0..180 */
    return d<=35;
  });
  dentro.sort(function(a,b){return a.d-b.d});
  return dentro;
}
/* Pinta la lista completa. El botón conserva su estado abierto/cerrado entre
   movimientos del deslizador, porque vive fuera del innerHTML que se reescribe. */
function listaSotavento(li){
  var bt=$('#w-mas'), ul=$('#vlist');
  if(!bt||!ul) return;
  /* Nada aquí puede cambiar el alto del panel: si lo cambia, el panel scrollea
     y el deslizador salta bajo el dedo. Por eso el botón sigue presente aunque
     no haya nadie (deshabilitado) y la lista conserva su caja aunque esté vacía. */
  var n = li ? li.length : 0;
  var abierta = bt.getAttribute('aria-expanded')==='true';
  bt.hidden=false; bt.disabled = n===0;
  bt.textContent = n===0 ? 'nadie a sotavento aquí'
                 : abierta ? 'ocultar la lista' : 'ver las '+n+' completas';
  ul.hidden = !abierta;
  ul.innerHTML = n ? li.map(function(b){
      var en=tieneMarca(b.n);
      return '<li'+(en?'':' class="afuera" title="queda fuera del recuadro del mapa"')+'>'+
             b.n+'<span>'+b.d.toFixed(2).replace('.',',')+' km'+(en?'':' ·')+'</span></li>';
    }).join('')
    : '<li class="vacia">ninguna en este rumbo</li>';
}
$('#w-mas') && $('#w-mas').addEventListener('click',function(){
  var abierta=this.getAttribute('aria-expanded')==='true';
  this.setAttribute('aria-expanded',String(!abierta));
  listaSotavento(aSotavento(vientoHacia));
});

function textoViento(){
  var e=$('#vtxt'); if(!e) return;
  /* el título dice de quién es el rumbo: del titular, o de quien lee */
  var tt=$('#vtit'); if(tt) tt.textContent = modoViento==='man' ? 'Viento · rumbo elegido por ti' : 'Viento · WRF del titular';
  if(modoViento==='man'){
    var li=aSotavento(vientoHacia), n=li.length, T=COMUNIDADES.length;
    var fuera=li.filter(function(b){ return !tieneMarca(b.n) }).length;
    /* Un dato por línea: junto en un párrafo, el ancho del rumbo (5° frente a
       355°) hacía saltar el salto de línea y el bloque crecía 20 px. */
    e.innerHTML='Sopla hacia <b>'+vientoHacia+'°</b><br><i>supuesto tuyo, no del expediente</i>'+
      /* Sin la antesala de tres nombres: variaba de alto según lo largos que
         fueran y movía los controles de abajo. Los nombres van en la lista.
         Las dos frases van en paralelo —misma forma, mismo número de líneas—
         porque si una ocupa más que la otra, el deslizador salta al cruzar un
         rumbo donde el conteo cae a cero. */
      '<br>A sotavento: <b>'+(n || 'ninguna')+'</b> de '+T+' comunidades' +
      (fuera ? '<br><span class="vq">'+fuera+' quedan fuera del recuadro del mapa</span>' : '') +
      '<br><span class="vq">pluma de ±35°, supuesto de esta página · catastro abierto, radio de 6 km</span>';
    listaSotavento(li);
    return;
  }
  /* la cifra que importa —cuántas quedan a sotavento— también en los modos del
     titular, no solo en Manual; con su supuesto declarado y la lista a un toque */
  var li2=aSotavento(vientoHacia);
  e.innerHTML = (modoViento==='pri'
    ? 'Proviene de <b>'+V.desde_min+'°–'+V.desde_max+'°</b> (S–SSO)<br>sopla hacia <b>'+V.hacia+'°</b> · '+
      String(V.media).replace('.',',')+' m/s'
    : 'Proviene de <b>'+V.sec_min+'°–'+V.sec_max+'°</b> (NO)<br>sopla hacia <b>'+V.sec_hacia+'°</b> · secundario')+
    '<br>A sotavento: <b>'+(li2.length||'ninguna')+'</b> de '+COMUNIDADES.length+' comunidades'+
    '<br><span class="vq">pluma de ±35°, supuesto de esta página</span>';
  listaSotavento(li2);
}
/* ojo: `modo` ya existe en este ámbito (el basemap carto/sat de más arriba);
   los tres scripts se empalman en un solo IIFE y comparten variables. */
function fijarViento(m,rumbo){
  modoViento=m; vientoHacia=rumbo;
  /* El deslizador sigue siempre al rumbo vigente: así «Manual» arranca donde
     quedó lo último que se miró, en vez de saltar a un valor viejo. */
  var sl=$('#w-dir'); if(sl && +sl.value!==rumbo) sl.value=rumbo;
  valorRumbo(rumbo);
  /* El ancho depende del MODO, no de si hay alguien a sotavento: atado al
     contenido, el panel se angostaba al cruzar un rumbo con cero, el texto
     reflui­a y el deslizador saltaba bajo el cursor. */
  var pn=$('#vbox'); if(pn) pn.classList.toggle('ancho', m==='man');
  /* el mando flotante existe en los tres modos: sirve para cambiar de modo sin
     bajar a los controles, que en estrecho están debajo del mapa */
  var fl=$('#vflot'); if(fl) fl.hidden=false;
  var md=$('#vflot-mando'); if(md) md.hidden = m!=='man';
  ['pri','sec','man'].forEach(function(k){
    var b=$('#w-'+k+'2'); if(b) b.setAttribute('aria-pressed',String(k===m));
  });
  var s2=$('#w-dir2'); if(s2 && +s2.value!==rumbo) s2.value=rumbo;
  marcarPluma(); ecoFlotante(); colocarMob();
  ['pri','sec','man'].forEach(function(k){
    var b=$('#w-'+k); if(b) b.setAttribute('aria-pressed',String(k===m));
  });
  var mv=$('#vman'); if(mv) mv.hidden = m!=='man';
  redibujarRosa();
}
$('#w-pri').addEventListener('click',function(){ fijarViento('pri',V.hacia) });
$('#w-sec').addEventListener('click',function(){ fijarViento('sec',V.sec_hacia) });
$('#w-man').addEventListener('click',function(){
  fijarViento('man', vientoHacia);   /* parte del rumbo que se está viendo */
});
(function(){
  var sl=$('#w-dir'); if(!sl) return;
  sl.addEventListener('input',function(){
    if(modoViento!=='man') fijarViento('man',+this.value);
    else { vientoHacia=+this.value; marcarPluma(); redibujarRosa(); valorRumbo(vientoHacia); }
    var s2=$('#w-dir2'); if(s2) s2.value=this.value;
  });
})();
function redibujarRosa(){ $('#rosa').innerHTML=''; rosaViento(); ecoFlotante(); }
/* el lector de pantalla oye el rumbo en palabras y cuántas quedan bajo la pluma */
function valorRumbo(r){
  var P=['norte','noreste','este','sureste','sur','suroeste','oeste','noroeste'], i=Math.round(((r%360)+360)%360/45)%8;
  var n=(typeof aSotavento==='function')?aSotavento(r).length:0;
  var t='sopla hacia '+r+' grados, '+P[i]+'; '+n+' comunidades a sotavento';
  ['#w-dir','#w-dir2'].forEach(function(id){ var s=$(id); if(s) s.setAttribute('aria-valuetext',t) });
}
/* en celular el mando flotante ocupa el pie del lienzo: el norte, la escala y la
   atribución de la imagen satelital, que es obligatoria, suben por encima de él */
function colocarMob(){
  var fl=$('#vflot'), mb=$('#mob'), hint=$('#cv .vhint'); if(!fl||!mb) return;
  var visible=!fl.hidden&&fl.offsetHeight>0;
  mb.style.bottom = visible ? (fl.offsetHeight+16)+'px' : '';
  if(hint) hint.style.display = visible ? 'none' : '';
}
addEventListener('resize',function(){ clearTimeout(colocarMob._t); colocarMob._t=setTimeout(colocarMob,120) });
(function(){ var fl=$('#vflot'); if(fl) fl.hidden=false; ecoFlotante(); })();
/* el duplicado que flota sobre el mapa en pantallas estrechas */
function ecoFlotante(){
  var et=$('#vflot-et'), nm=$('#vflot-n');
  if(et) et.textContent=vientoHacia+'°';
  if(nm){
    var li=(typeof aSotavento==='function') ? aSotavento(vientoHacia) : [];
    var enMapa=li.filter(function(b){ return tieneMarca(b.n) }).length;
    nm.innerHTML = (li.length ? '<b>'+li.length+'</b> a sotavento'+
                                (enMapa<li.length ? ' · '+enMapa+' en el mapa' : '')
                              : 'nadie a sotavento') +
                   (modoViento==='man' ? ' · rumbo supuesto tuyo' : '')+' · pluma de ±35°, supuesto de esta página';
  }
}
(function(){
  var b;
  if((b=$('#w-pri2'))) b.addEventListener('click',function(){ fijarViento('pri',V.hacia) });
  if((b=$('#w-sec2'))) b.addEventListener('click',function(){ fijarViento('sec',V.sec_hacia) });
  if((b=$('#w-man2'))) b.addEventListener('click',function(){ fijarViento('man',vientoHacia) });
})();
(function(){
  var s2=$('#w-dir2'); if(!s2) return;
  s2.addEventListener('input',function(){
    var sl=$('#w-dir'); if(sl) sl.value=this.value;
    if(modoViento!=='man') fijarViento('man',+this.value);
    else { vientoHacia=+this.value; marcarPluma(); redibujarRosa(); valorRumbo(vientoHacia); }
  });
})();

/* ---------- recorrido de cámara ---------- */
var TOUR=[
  {th:2.45,ph:0.52,rad:0.80,d:0},
  {th:2.10,ph:0.72,rad:0.46,d:4.5},
  {th:1.25,ph:0.95,rad:0.21,d:4.5},
  {th:0.10,ph:0.88,rad:0.24,d:5.0},
  {th:-0.78,ph:0.80,rad:0.42,d:4.0}
];
var tourOn=false,tourI=0,tourT=0,tourDesde=null;
/* en la principal el botón de recorrido pasó a ser un enlace al relato: el recorrido interno
   queda disponible solo si existe un botón #b-tour */
var bTour=document.getElementById('b-tour');
if(bTour&&bTour.tagName==='BUTTON') bTour.addEventListener('click',function(){
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
      var b=$('#b-tour'); if(b){ b.setAttribute('aria-pressed','false'); b.textContent='▶ Recorrido'; } }
  }
}

/* ---------- control externo ----------
   Lo usa la página del relato (relato.html) para mover la cámara, el año y las capas
   al bajar. En la principal nadie lo llama. Las posiciones van en las mismas unidades
   que el recorrido: th y ph en radianes, rad en fracción del ancho del terreno, y el
   centro desplazado (dx, dz) en fracción del ancho desde el centro del relleno. */
var vuelo=null;
function pasoVuelo(dt){
  if(!vuelo) return;
  /* tiempo real, no el dt con tope del bucle: en un equipo lento el vuelo dura lo mismo */
  vuelo.t=(performance.now()-vuelo.t0)/1000;
  var f=Math.min(vuelo.t/vuelo.d,1), e=f<.5?4*f*f*f:1-Math.pow(-2*f+2,3)/2, a=vuelo.a, b=vuelo.b;
  th=a.th+(b.th-a.th)*e; ph=a.ph+(b.ph-a.ph)*e; rad=(a.rad+(b.rad-a.rad)*e)*S;
  var tx=a.tx+(b.tx-a.tx)*e, tz=a.tz+(b.tz-a.tz)*e;
  target.set(tx, hWorld(tx,tz)*K()+40, tz);
  place();
  if(f>=1) vuelo=null;
}
/* el recorrido principal de la escorrentía como un tubo sobre el terreno: a la distancia
   del relato las partículas no se ven. Sólo lo enciende el relato. */
var troncal=null;
function crearTroncal(){
  /* los esteros, en celeste, y encima, más delgado y en naranja como en el mapa de la principal, el recorrido
     del agua que sale del relleno: así se lee que lo que escurre baja SOBRE los cauces, no que un estero
     cruce el predio. Ambos van sobre todo (sin prueba de profundidad), para que los cerros no los corten */
  var E=D.escorrentia; if(!E||!E.troncal) return null;
  var gr=new THREE.Group(), k=K();
  function tubo(geom,alto,radio,color,op,orden){
    var partes=geom.type==='LineString'?[geom.coordinates]:geom.coordinates;
    partes.forEach(function(c){
      var pts=[]; c.forEach(function(q){ var u=uv(q[0],q[1]); if(u[0]<0.01||u[0]>0.99||u[1]<0.01||u[1]>0.99) return;
        pts.push(new THREE.Vector3(wx(u[0]),hAt(u[0],u[1])*k+alto,wz(u[1]))) });
      if(pts.length<2) return;
      var g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),pts.length*6,radio,6,false);
      var m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:op,depthTest:false}));
      m.renderOrder=orden; gr.add(m) }) }
  Object.keys(E.cauces||{}).forEach(function(n){ tubo(E.cauces[n],14,12,0x5ad7f5,.85,7) });
  tubo(E.troncal,16,5.5,0xff8a5c,.97,8);
  sc.add(gr); return gr;
}
var VISOR=window.VISOR={
  listo:false,
  volar:function(k,seg){
    var cx=wx(centroU[0]), cz=wz(centroU[1]);
    /* el giro va por el camino corto */
    var dth=k.th-th; while(dth>Math.PI) dth-=2*Math.PI; while(dth<-Math.PI) dth+=2*Math.PI;
    tourOn=false;
    vuelo={a:{th:th,ph:ph,rad:rad/S,tx:target.x,tz:target.z},
           b:{th:th+dth,ph:k.ph,rad:k.rad,tx:cx+(k.dx||0)*S,tz:cz-(k.dz||0)*S},
           t:0,t0:performance.now(),d:RM?0.001:(seg||2.4)};
  },
  anio:function(y){ var s=$('#tl'); if(s){ s.value=y } aplicarAnio(+y) },
  capa:function(id,on){ var e=document.getElementById(id);
    if(e&&e.checked!==on){ e.checked=on; e.dispatchEvent(new Event('change')) } },
  viento:function(m){ var b=$('#w-'+m); if(b) b.click() },
  /* corre la imagen sin achicar el lienzo: fx a la derecha, fy hacia arriba (fracción) */
  volando:function(){ return !!vuelo },
  /* acceso a los objetos del visor, para que el relato construya capas propias sobre la
     misma escena. La principal no lo usa. */
  internos:function(){ return {THREE:THREE,sc:sc,cam:cam,ren:ren,terr:terr,falda:falda,K:K,S:S,N:N,
    hAt:hAt,hWorld:hWorld,uv:uv,wx:wx,wz:wz,M:M,G:G} },
  malla:function(n){ if(n===G) return; G=n; construirTerreno(); construirCapas(); firmaAnt='' },
  /* pone la cámara sin animar: el relato la interpola con el scroll */
  poner:function(k){
    vuelo=null; tourOn=false;
    var cx=wx(centroU[0]), cz=wz(centroU[1]), tx=cx+(k.dx||0)*S, tz=cz-(k.dz||0)*S;
    th=k.th; ph=k.ph; rad=k.rad*S; target.set(tx, hWorld(tx,tz)*K()+40, tz); place();
  },
  /* la cámara que mira el relleno desde un punto del terreno, a `alto` metros sobre el suelo */
  ojo:function(lon,lat,alto){
    var u=uv(lon,lat), x=wx(u[0]), z=wz(u[1]), cx=wx(centroU[0]), cz=wz(centroU[1]);
    var ty=hWorld(cx,cz)*K()+40, cy=hAt(u[0],u[1])*K()+(alto||40)*K();
    var dx=x-cx, dz=z-cz, hd=Math.hypot(dx,dz), dy=cy-ty;
    return {th:Math.atan2(dx,dz), ph:Math.atan2(hd,dy), rad:Math.hypot(hd,dy)/S};
  },
  troncal:function(on){ if(on&&!troncal) troncal=crearTroncal(); if(troncal) troncal.visible=!!on; firmaAnt='' },
  correr:function(fx,fy){ corrX=fx||0; corrY=fy||0; resize(); firmaAnt='' },
  /* --- solo el modo foto --- */
  /* la cámara actual, en los mismos términos que poner(); y el punto que mira, para la escala */
  estado:function(){ var cx=wx(centroU[0]), cz=wz(centroU[1]);
    return {th:th, ph:ph, rad:rad/S, dx:(target.x-cx)/S, dz:-(target.z-cz)/S, fov:cam.fov, target:target.clone()} },
  fov:function(v){ cam.fov=v; cam.updateProjectionMatrix(); firmaAnt='' },
  /* dibuja un cuadro a `f` veces la densidad de la pantalla y lo devuelve en un lienzo 2D. El tamaño en CSS no
     cambia: la proyección, y por lo tanto dónde cae cada rótulo, es la misma que se ve */
  captura:function(f){
    var pr=ren.getPixelRatio(), w=cv.clientWidth, h=cv.clientHeight;
    ren.setPixelRatio(f); resize();
    ren.render(sc,cam);
    var c=document.createElement('canvas'); c.width=ren.domElement.width; c.height=ren.domElement.height;
    c.getContext('2d').drawImage(ren.domElement,0,0);
    ren.setPixelRatio(pr); resize(); ren.render(sc,cam); firmaAnt='';
    return {lienzo:c, escala:c.width/w, w:w, h:h};
  },
  maxPixeles:function(){ var g=ren.getContext(); return Math.min(g.getParameter(g.MAX_RENDERBUFFER_SIZE),g.getParameter(g.MAX_TEXTURE_SIZE)) }
};

/* pausa: detiene y oculta las partículas; con «reducir movimiento» del sistema arranca pausado */
var simOn=!RM;
function aplicarSim(){
  if(pluma) pluma.visible=simOn&&chkOn('L-pluma');
  if(flujo) flujo.visible=simOn&&chkOn('L-flujo');
  if(arcos) arcos.visible=simOn&&chkOn('L-arcos');
  var b=$('#b-sim'); if(b){
    var et=simOn?'Pausar la simulación del viento':'Reanudar la simulación del viento';
    b.setAttribute('aria-label',et); b.title=et;
    b.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">'+(simOn?
      '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>':
      '<path d="M7 5l12 7-12 7z" fill="currentColor"/>')+'</svg>'; }
}
(function(){ var b=$('#b-sim'); if(b) b.addEventListener('click',function(){ simOn=!simOn; aplicarSim() }) })();
['L-pluma','L-flujo','L-arcos'].forEach(function(id){
  var e=document.getElementById(id);
  if(e) e.addEventListener('change',function(){
    aplicarSim();
  });
});

var corrX=0, corrY=0;   /* corrimiento del centro óptico, lo fija el relato */
function resize(){
  var w=cv.clientWidth,h=cv.clientHeight; if(!w||!h)return;
  ren.setSize(w,h,false);cam.aspect=w/h;
  if(corrX||corrY) cam.setViewOffset(w,h,-w*corrX,h*corrY,w,h); else cam.clearViewOffset();
  cam.updateProjectionMatrix();
  escalaPluma(); mobiliario();
}
addEventListener('resize',resize);
var vis=true;
if('IntersectionObserver' in window)
  new IntersectionObserver(function(es){vis=es[0].isIntersecting},{rootMargin:'200px'}).observe(cv);

var ult=performance.now(), firmaAnt='', ultRender=0;
/* Una firma barata del estado que mueve los rótulos. Con 168 comunidades, recolocarlos
   en cada cuadro —proyectar, medir paneles, probar cajas, reescribir estilos— era el
   mayor costo del visor; ahora solo se hace cuando algo cambió. */
function firmaMarcas(){
  var e=cam.matrixWorld.elements, vb=document.getElementById('vbox'), mb=document.getElementById('mob');
  return [e[0].toFixed(4),e[2].toFixed(4),e[5].toFixed(4),e[12].toFixed(1),e[13].toFixed(1),e[14].toFixed(1),
          cv.clientWidth,cv.clientHeight,chkOn('L-barrios'),vientoHacia,modoViento,marcas.length,
          vb?vb.offsetHeight:0,mb?mb.style.bottom:''].join('|');
}
function animar(){
  requestAnimationFrame(animar);
  var ahora=performance.now(), dt=Math.min((ahora-ult)/1000,0.05); ult=ahora;
  if(!vis) return;
  pasoTour(dt); pasoVuelo(dt);
  var anima=simOn&&((pluma&&pluma.visible)||(flujo&&flujo.visible)||(arcos&&arcos.visible));
  if(anima){ pasoPluma(dt); pasoFlujo(dt); pasoArcos(dt); }
  var f=firmaMarcas(), cambio=f!==firmaAnt;
  /* quieto y sin simulación: dos cuadros por segundo bastan para que aparezcan las
     texturas que llegan tarde (satélite, cicatriz) sin quemar batería */
  if(anima||cambio||tourOn||vuelo||ahora-ultRender>500){ ren.render(sc,cam); ultRender=ahora; }
  if(cambio){ ubicarMarcas(); firmaAnt=f; }
}
cargarAltura(function(){ cargarFlujo(arrancar) });
})();
