  /* ===================== capas propias del relato =====================
     Solo esta página: el visor de la principal no cambia. Terreno vestido con la imagen
     satelital y relieve iluminado; el relleno con la forma que declara el titular en la
     Tabla 30 del Capítulo 1 (11 niveles de 10 m, taludes 1V:3H, retranqueos de 5 m,
     coronamiento en la cota 350); deslinde como cinta; piscinas de lixiviados como agua. */
  var MEJOR={listo:false, actualizarMasa:function(){}};
  /* superficie final del relleno según el titular: plano 3.8 «Manto general» del Anexo 1.5, georreferenciado
     por geometria_titular.py. La pide solo el relato (40 KB); si no llega, se usa la masa estimada. */
  /* y las obras (geometria_obras.py, 14 KB): edificios, piscinas, bandejas, antorchas y chimeneas */
  var MANTO=null, OBRAS=null, mantoListo=false, alManto=[];
  function mantoHecho(){ mantoListo=true; alManto.splice(0).forEach(function(f){ f() }) }
  function pedirJSON(u){ return fetch(u).then(function(r){ return r.ok?r.json():null }).catch(function(){ return null }) }
  try{ Promise.all([pedirJSON('manto.json'),pedirJSON('obras.json')])
         .then(function(a){ MANTO=a[0]; OBRAS=a[1]; mantoHecho() },function(){ mantoHecho() }) }
  catch(e){ mantoHecho() }
  function mejorarEscena(){
    var I=VISOR.internos(), T=I.THREE, sc=I.sc, K=I.K, hAt=I.hAt, uv=I.uv, wx=I.wx, wz=I.wz;
    var chico=angosto()||(devicePixelRatio||1)*Math.max(innerWidth,innerHeight)<1500;
    /* sin las capas planas de la principal que esta página reemplaza */
    ['L-masa','L-predio','L-lix','L-exca','L-corta'].concat(OBRAS?['L-inst']:[]).forEach(function(id){ VISOR.capa(id,false) });
    sc.add(new T.HemisphereLight(0xdfe7ee,0x3b3226,.28));

    /* ---------- terreno satelital ---------- */
    var VS=[
      'attribute float ao; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vAo;',
      'void main(){ vUv=uv; vN=normal; vW=(modelMatrix*vec4(position,1.0)).xyz; vAo=ao;',
      '  gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.0); }'].join('\n');
    var FS=[
      'uniform sampler2D map; uniform vec3 sol; uniform vec3 niebla; uniform float exag; uniform float lejos;',
      'varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vAo;',
      'void main(){',
      '  vec3 c=texture2D(map,vUv).rgb;',
      '  float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,1.14); c=(c-.5)*1.1+.5;',
      '  vec3 n=normalize(vN); float dif=max(dot(n,normalize(sol)),0.0); float hemi=.5+.5*n.y;',
      '  c*=(.36*hemi+.86*dif)*vAo*1.12;',
      '  float q=vW.y/exag/25.0; float f=abs(fract(q-.5)-.5); float w=fwidth(q);',
      '  c=mix(c,c*.55,(1.0-smoothstep(0.0,w*1.4,f))*.28);',
      '  float d=distance(vW,cameraPosition); c=mix(c,niebla,smoothstep(lejos*.22,lejos,d)*.6);',
      '  gl_FragColor=vec4(clamp(c,0.0,1.0),1.0); }'].join('\n');
    var matSat=null;
    function vestir(terr){
      if(!matSat||!terr) return;
      var g=terr.geometry, p=g.attributes.position, n=Math.round(Math.sqrt(p.count));
      if(!g.attributes.ao){
        /* oclusión barata: cuánto más bajo está cada punto que su entorno (quebradas más oscuras) */
        var ao=new Float32Array(p.count), R=Math.max(2,Math.round(n/85)), k=K();
        for(var j=0;j<n;j++) for(var i=0;i<n;i++){
          var s=0,c=0;
          for(var dj=-R;dj<=R;dj+=R) for(var di=-R;di<=R;di+=R){
            var ii=Math.min(n-1,Math.max(0,i+di)), jj=Math.min(n-1,Math.max(0,j+dj)); s+=p.getY(jj*n+ii); c++ }
          var dlt=(p.getY(j*n+i)-s/c)/k;
          ao[j*n+i]=Math.max(.62,Math.min(1.08,1+dlt*.012));
        }
        g.setAttribute('ao',new T.BufferAttribute(ao,1));
      }
      terr.material=matSat;
    }
    VISOR.alTerreno=vestir;
    var src=chico?(WEBP?'textura-1024.webp':'textura-1024.jpg'):'textura.jpg';
    new T.TextureLoader().load(src,function(tex){
      tex.anisotropy=I.ren.capabilities.getMaxAnisotropy?I.ren.capabilities.getMaxAnisotropy():1;
      tex.minFilter=T.LinearMipmapLinearFilter;
      matSat=new T.ShaderMaterial({uniforms:{map:{value:tex},sol:{value:new T.Vector3(-1,1.5,.7)},
        niebla:{value:new T.Color(0x7c8789)},exag:{value:K()},lejos:{value:I.S*1.6}},
        vertexShader:VS,fragmentShader:FS,extensions:{derivatives:true}});
      vestir(VISOR.internos().terr);
      var fd=VISOR.internos().falda; if(fd) fd.material=new T.MeshLambertMaterial({color:0x2c2620,side:T.DoubleSide});
      if(!chico) VISOR.malla(512);
      document.body.classList.add('sat');
    });

    /* ---------- relleno escalonado ---------- */
    var Rz=L.residuos.g, anillos=Rz.type==='Polygon'?[Rz.coordinates]:Rz.coordinates;
    var polis=[], borde=[];
    anillos.forEach(function(pl){ pl.forEach(function(ring,ri){
      var pts=ring.map(function(c){ var u=uv(c[0],c[1]); return [wx(u[0]),wz(u[1]),u[0],u[1]] });
      polis.push({ext:ri===0,p:pts});
      for(var a=0;a<pts.length-1;a++){
        var A=pts[a],B=pts[a+1],L0=Math.hypot(B[0]-A[0],B[1]-A[1]),m=Math.max(1,Math.ceil(L0/14));
        for(var t=0;t<m;t++){ var f=t/m, u=A[2]+(B[2]-A[2])*f, v=A[3]+(B[3]-A[3])*f;
          borde.push([A[0]+(B[0]-A[0])*f, A[1]+(B[1]-A[1])*f, hAt(u,v)]) }
      }
    }) });
    /* grilla del titular: un byte por celda (z0 + dz·valor), 255 = fuera de la huella */
    var mz=null;
    if(MANTO&&MANTO.z){ var bin=atob(MANTO.z); mz=new Uint8Array(bin.length); for(var q0=0;q0<bin.length;q0++) mz[q0]=bin.charCodeAt(q0) }
    function mantoAt(u,v){
      if(!mz) return null;
      var c=(u-MANTO.u0)/(MANTO.u1-MANTO.u0)*(MANTO.nu-1), r=(v-MANTO.v0)/(MANTO.v1-MANTO.v0)*(MANTO.nv-1);
      if(!(c>=0&&r>=0&&c<=MANTO.nu-1&&r<=MANTO.nv-1)) return null;
      var c0=c|0,r0=r|0,c1=Math.min(MANTO.nu-1,c0+1),r1=Math.min(MANTO.nv-1,r0+1),fc=c-c0,fr=r-r0,n=MANTO.nu;
      var a=mz[r0*n+c0],b=mz[r0*n+c1],d=mz[r1*n+c0],e=mz[r1*n+c1];
      if(a===255||b===255||d===255||e===255) return null;
      return MANTO.z0+MANTO.dz*((a*(1-fc)+b*fc)*(1-fr)+(d*(1-fc)+e*fc)*fr);
    }
    /* forma final: la superficie del titular (mantoAt). Solo donde no hay grilla, o si no cargó, se estima:
       perfil del titular: cada nivel sube 10 m en 30 m de talud (1V:3H) y deja 5 m de retranqueo.
       Se calcula una superficie continua a 1V:3,5H desde el borde (35 m por cada 10 m) y se escalona en
       cotas absolutas: las plataformas quedan horizontales, a 200, 210, 220… como en un relleno real. */
    /* (las plataformas se dibujan en el shader, como bermas cada 10 m de cota) */
    var x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    borde.forEach(function(b){ x0=Math.min(x0,b[0]); x1=Math.max(x1,b[0]); z0=Math.min(z0,b[1]); z1=Math.max(z1,b[1]) });
    var cs=chico?5:3, nx=Math.ceil((x1-x0)/cs)+3, nz=Math.ceil((z1-z0)/cs)+3;
    x0-=cs; z0-=cs;
    var NV=nx*nz, gro=new Float32Array(NV), sup=new Float32Array(NV), ins=new Uint8Array(NV);
    var S=I.S;
    /* «dentro» por filas: los cruces de cada fila con el borde se calculan una vez (la misma expresión que
       usaba la prueba por celda), y una celda está dentro si a su derecha quedan cruces impares. Mismo resultado, sin recorrer
       los lados del polígono por cada una de las ~86 mil celdas */
    for(var j=0;j<nz;j++){
      var zf=z0+j*cs, cruces=[];
      polis.forEach(function(P){ var pt=P.p;
        for(var a=0,b=pt.length-1;a<pt.length;b=a++)
          if((pt[a][1]>zf)!==(pt[b][1]>zf)) cruces.push((pt[b][0]-pt[a][0])*(zf-pt[a][1])/(pt[b][1]-pt[a][1])+pt[a][0]) });
      cruces.sort(function(p1,p2){ return p1-p2 });
      for(var i=0,kc=0;i<nx;i++){
      var x=x0+i*cs, z=zf, id=j*nx+i, u=x/S+.5, v=-z/S+.5;
      gro[id]=hAt(u,v);
      while(kc<cruces.length&&!(x<cruces[kc])) kc++;
      if(!((cruces.length-kc)&1)){ sup[id]=-1e9; continue }
      ins[id]=1;
      /* con la superficie del titular cargada, la masa va solo dentro de su borde (44 ha) */
      if(mz){ var mt=mantoAt(u,v); if(mt!==null) sup[id]=mt; else { sup[id]=-1e9; ins[id]=0 } continue }
      var best=1e9;
      for(var e=0;e<borde.length;e++){ var b=borde[e], h=b[2]+Math.hypot(x-b[0],z-b[1])/3.5; if(h<best) best=h }
      sup[id]=best;
    } }
    /* volumen sobre el terreno natural para cada cota de coronamiento: así cada año la
       masa sube hasta la cota que reparte el tonelaje acumulado */
    /* solo las celdas con basura, en el mismo orden: la suma da exactamente lo mismo */
    var conBasura=[]; for(var q0=0;q0<NV;q0++) if(ins[q0]) conBasura.push(q0);
    function vol(c){ var V=0; for(var r=0;r<conBasura.length;r++){ var q=conBasura[r], t=Math.min(sup[q],c)-gro[q]; if(t>0) V+=t } return V*cs*cs }
    var V350=vol(350), corona=[0];
    for(var y=1;y<=25;y++){
      var meta=V350*P.acumulado_t[y-1]/P.acumulado_t[24], lo=150, hi=350;
      for(var it=0;it<22;it++){ var mid=(lo+hi)/2; if(vol(mid)<meta) lo=mid; else hi=mid }
      corona.push(hi);
    }
    MEJOR.v350=V350;
    var gm=new T.BufferGeometry(), pos=new Float32Array(NV*3), col=new Float32Array(NV*3), idx=[];
    for(var q=0;q<NV;q++){ pos[q*3]=x0+(q%nx)*cs; pos[q*3+2]=z0+Math.floor(q/nx)*cs }
    for(var j2=0;j2<nz-1;j2++) for(var i2=0;i2<nx-1;i2++){
      var a=j2*nx+i2,b=a+1,c2=a+nx,d2=c2+1;
      if(ins[a]||ins[b]||ins[c2]||ins[d2]) idx.push(a,c2,b, b,c2,d2);
    }
    gm.setAttribute('position',new T.BufferAttribute(pos,3));
    gm.setAttribute('color',new T.BufferAttribute(col,3));
    gm.setIndex(idx);
    var matMasa=new T.ShaderMaterial({uniforms:{sol:{value:new T.Vector3(-1,1.5,.7)},niebla:{value:new T.Color(0x7c8789)},lejos:{value:S*1.6},exag:{value:K()}},
      vertexShader:['varying vec3 vC; varying vec3 vN; varying vec3 vW;',
        'void main(){ vC=color; vN=normal; vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.0); }'].join('\n'),
      fragmentShader:['uniform vec3 sol; uniform vec3 niebla; uniform float lejos; uniform float exag; varying vec3 vC; varying vec3 vN; varying vec3 vW;',
        'void main(){ vec3 n=normalize(vN); float dif=max(dot(n,normalize(sol)),0.0); float hemi=.5+.5*n.y;',
        '  vec3 c=vC*(.34*hemi+.9*dif);',
        '  float z=(vW.y/exag-200.0)/10.0; float f=fract(z); float w=fwidth(z);',
        '  c=mix(c,vec3(.86,.74,.6),(1.0-smoothstep(0.0,w*1.6+.035,f))*.75);',
        '  c*=1.0-(smoothstep(.06,.06+w*1.6,f)*(1.0-smoothstep(.12,.12+w*1.6,f)))*.18;',
        '  float d=distance(vW,cameraPosition); c=mix(c,niebla,smoothstep(lejos*.22,lejos,d)*.6);',
        '  gl_FragColor=vec4(c,1.0); }'].join('\n'),
      vertexColors:true,extensions:{derivatives:true},polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    var masa=new T.Mesh(gm,matMasa);
    masa.renderOrder=4; sc.add(masa);
    var ruido=function(q){ var x=pos[q*3], z=pos[q*3+2]; var s=Math.sin(x*12.9898+z*78.233)*43758.5453; return s-Math.floor(s) };
    /* ---------- la huella: dónde irá la basura, visible antes de que exista ---------- */
    var hp=new Float32Array(NV*3), k0=K();
    for(var qh=0;qh<NV;qh++){ hp[qh*3]=pos[qh*3]; hp[qh*3+1]=(gro[qh]+5)*k0; hp[qh*3+2]=pos[qh*3+2] }
    var gh=new T.BufferGeometry(); gh.setAttribute('position',new T.BufferAttribute(hp,3)); gh.setIndex(idx);
    var matH=new T.MeshBasicMaterial({color:0xff5a2a,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide});
    var huella=new T.Mesh(gh,matH); huella.renderOrder=3; sc.add(huella);
    var contorno=new T.Group();
    polis.forEach(function(P){ if(!P.ext) return;
      var cp=P.p.map(function(q){ return new T.Vector3(q[0],hAt(q[2],q[3])*k0+7,q[1]) });
      contorno.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cp,true),cp.length*3,4.5,5,true),
        new T.MeshBasicMaterial({color:0xff6a3d,transparent:true,opacity:.95,depthWrite:false}))) });
    contorno.renderOrder=6; sc.add(contorno);
    var cx0=0,cz0=0,cn=0; for(var qc=0;qc<NV;qc++) if(ins[qc]){ cx0+=pos[qc*3]; cz0+=pos[qc*3+2]; cn++ }
    MEJOR.centro=new T.Vector3(cx0/cn, 0, cz0/cn);
    MEJOR.centro.y=(hAt(MEJOR.centro.x/S+.5,-MEJOR.centro.z/S+.5)+40)*k0;
    MEJOR.pulso=function(t){ if(huella.visible) matH.opacity=.3+.18*(.5+.5*Math.sin(t/650)) };
    MEJOR.actualizarMasa=function(yr){
      var cy=corona[Math.max(0,Math.min(25,yr))], k=K();
      masa.visible=yr>0; huella.visible=!yr;
      if(MEJOR.obras) MEJOR.obras.visible=yr>0;
      if(!yr) return;
      if(MEJOR.chim){ var C=MEJOR.chim, mt=new T.Matrix4(), ce=new T.Matrix4().makeScale(0,0,0);
        C.p.forEach(function(q,i){ var sF=mantoAt(q.u,q.v);
          if(sF!==null&&cy>=sF-.5){ mt.makeScale(1,k,1); mt.setPosition(q.x,(sF+3)*k,q.z); C.m.setMatrixAt(i,mt) } else C.m.setMatrixAt(i,ce) });
        C.m.instanceMatrix.needsUpdate=true }
      for(var q=0;q<NV;q++){
        var top=ins[q]?Math.min(sup[q],cy):-1e9, h=top>gro[q]+.3?top:gro[q]-2.5;
        pos[q*3+1]=h*k;
      }
      gm.attributes.position.needsUpdate=true; gm.computeVertexNormals();
      var nr=gm.attributes.normal.array;
      for(var q2=0;q2<NV;q2++){
        var r=(ruido(q2)-.5)*.05, t=ins[q2]?Math.min(sup[q2],cy)-gro[q2]:0;
        var cr, cg, cb;
        if(Math.abs(Math.min(sup[q2],cy)-cy)<.6&&t>0){ cr=.6; cg=.44; cb=.34 }          /* coronamiento: frente de trabajo y cubierta */
        else { cr=.8; cg=.43; cb=.25 }                                                    /* taludes: tierra y basura removida */
        col[q2*3]=cr+r; col[q2*3+1]=cg+r*.8; col[q2*3+2]=cb+r*.6;
      }
      gm.attributes.color.needsUpdate=true;
    };

    /* ---------- deslinde: una cinta sobre el terreno ---------- */
    var Pr=L.predio.g, rp=(Pr.type==='Polygon'?Pr.coordinates[0]:Pr.coordinates[0][0]);
    var pts=rp.map(function(c){ var u=uv(c[0],c[1]); return new T.Vector3(wx(u[0]),hAt(u[0],u[1])*K()+5,wz(u[1])) });
    var cinta=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),pts.length*4,3,5,true),
      new T.MeshBasicMaterial({color:0xf6f3ea,transparent:true,opacity:.9}));
    cinta.renderOrder=5; sc.add(cinta);
    MEJOR.cinta=cinta;

    /* ---------- piscinas de lixiviados: agua a nivel ---------- */
    var Lx=!OBRAS&&L.lixiviados&&L.lixiviados.g;
    if(Lx){ (Lx.type==='Polygon'?[Lx.coordinates]:Lx.coordinates).forEach(function(pl){
      var r0=pl[0], mn=1e9, sh=new T.Shape();
      r0.forEach(function(c,ii){ var u=uv(c[0],c[1]); mn=Math.min(mn,hAt(u[0],u[1]));
        if(ii) sh.lineTo(wx(u[0]),-wz(u[1])); else sh.moveTo(wx(u[0]),-wz(u[1])) });
      var g=new T.ShapeGeometry(sh); g.rotateX(-Math.PI/2);
      var m=new T.Mesh(g,new T.MeshLambertMaterial({color:0x1d4a5e,emissive:0x04121a,side:T.DoubleSide,
        transparent:true,opacity:.92,polygonOffset:true,polygonOffsetFactor:-3}));
      m.position.y=(mn+2)*K(); m.renderOrder=6; sc.add(m);
    }) }
    /* ---------- obras del titular (geometria_obras.py): aparecen con la operación ----------
       Rendimiento: cada pieza se arma con su forma y su transformación ya aplicadas, y todas las que comparten
       material se juntan en una sola malla. Eran ~180 objetos y ~180 llamadas de dibujo por cuadro; son 14. El
       color de cada pieza va por vértice, con el material en blanco, así que la luz da el mismo resultado. */
    var obras=new T.Group(); obras.visible=false; sc.add(obras); MEJOR.chim=null;
    if(OBRAS){
      var XZ=function(c){ var u=uv(c[0],c[1]); return {x:wx(u[0]),z:wz(u[1]),h:hAt(u[0],u[1])} };
      /* junta geometrías con los mismos atributos en una sola, indexada */
      function juntar(lista,nombres){
        var out=new T.BufferGeometry(), idx=[], base=0;
        nombres.forEach(function(a){
          var n=lista[0].attributes[a].itemSize, len=0, o=0;
          lista.forEach(function(g){ len+=g.attributes[a].count*n });
          var arr=new Float32Array(len);
          lista.forEach(function(g){ var A2=g.attributes[a]; for(var i=0;i<A2.count;i++) for(var c=0;c<n;c++) arr[o++]=A2.array[i*n+c] });
          out.setAttribute(a,new T.BufferAttribute(arr,n)) });
        lista.forEach(function(g){ var cnt=g.attributes.position.count;
          if(g.index){ var ix=g.index.array; for(var i=0;i<ix.length;i++) idx.push(ix[i]+base) } else for(var i2=0;i2<cnt;i2++) idx.push(i2+base);
          base+=cnt });
        out.setIndex(idx); return out }
      /* color fijo por vértice; con «grupos» (cara de arriba, muros…), un color por grupo */
      function pintar(g,colores){
        var n=g.attributes.position.count, col=new Float32Array(n*3), c0=new T.Color(colores[0]);
        for(var i=0;i<n;i++){ col[i*3]=c0.r; col[i*3+1]=c0.g; col[i*3+2]=c0.b }
        (g.groups||[]).forEach(function(G){ var c=new T.Color(colores[G.materialIndex]);
          for(var k2=G.start;k2<G.start+G.count;k2++){ var v=g.index?g.index.array[k2]:k2; col[v*3]=c.r; col[v*3+1]=c.g; col[v*3+2]=c.b } });
        g.setAttribute('color',new T.BufferAttribute(col,3)); return g }
      /* una línea quebrada, como pares de segmentos */
      function segmentos(pts,color,lista){
        var pos=[], c=new T.Color(color), col=[];
        for(var i=0;i<pts.length-1;i++){ pos.push(pts[i].x,pts[i].y,pts[i].z,pts[i+1].x,pts[i+1].y,pts[i+1].z); col.push(c.r,c.g,c.b,c.r,c.g,c.b) }
        var g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('color',new T.Float32BufferAttribute(col,3));
        lista.push(g) }
      var mallaDe=function(lista,mat,orden){ if(!lista.length) return; var m=new T.Mesh(juntar(lista,['position','normal'].concat(mat.vertexColors?['color']:[])),mat);
        if(orden) m.renderOrder=orden; obras.add(m); return m };
      var lineasDe=function(lista,mat,orden){ if(!lista.length) return; var m=new T.LineSegments(juntar(lista,['position','color']),mat);
        if(orden) m.renderOrder=orden; obras.add(m); return m };
      /* piscinas: el borde de coronamiento del plano 3.6, con la cota de su tabla. El modelo de terreno no tiene
         la excavación, así que se dibujan a la altura del coronamiento (el fondo, de 195 a 198 m, no se ve);
         adentro, el polígono del fondo como lámina de agua */
      var coronas=[], aguas=[], bordesP=[], bandejas=[];
      OBRAS.piscinas.forEach(function(Pc){
        var k=K(), zc=0, sh=new T.Shape(), anillo=[];
        Pc.borde.forEach(function(c,ii){ var q=XZ(c); zc=Math.max(zc,c[2],q.h); anillo.push(q); if(ii) sh.lineTo(q.x,-q.z); else sh.moveTo(q.x,-q.z) });
        var g=new T.ShapeGeometry(sh); g.rotateX(-Math.PI/2); g.translate(0,(zc+1)*k,0); coronas.push(g);
        var sf=new T.Shape(); Pc.fondo.forEach(function(c,ii){ var q=XZ(c); if(ii) sf.lineTo(q.x,-q.z); else sf.moveTo(q.x,-q.z) });
        var gf=new T.ShapeGeometry(sf); gf.rotateX(-Math.PI/2); gf.translate(0,(zc+1.4)*k,0); aguas.push(gf);
        var pts=anillo.map(function(q){ return new T.Vector3(q.x,(zc+1.6)*k,q.z) }); pts.push(pts[0].clone());
        segmentos(pts,0xe8e4da,bordesP);
      });
      /* bandejas de evaporación: agua a nivel del terreno */
      OBRAS.bandejas.forEach(function(B){
        var mn=-1e9, sh=new T.Shape();   /* a la altura del punto más alto: el terreno no tiene la plataforma */
        B.forEach(function(c,ii){ var q=XZ(c); mn=Math.max(mn,q.h); if(ii) sh.lineTo(q.x,-q.z); else sh.moveTo(q.x,-q.z) });
        var g=new T.ShapeGeometry(sh); g.rotateX(-Math.PI/2); g.translate(0,(mn+1)*K(),0); bandejas.push(g);
      });
      mallaDe(coronas,new T.MeshLambertMaterial({color:0x2a2d31,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3}));
      mallaDe(aguas,new T.MeshLambertMaterial({color:0x1d4a5e,emissive:0x04121a,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4}));
      lineasDe(bordesP,new T.LineBasicMaterial({vertexColors:true}));
      mallaDe(bandejas,new T.MeshLambertMaterial({color:0x2b6a80,emissive:0x061a22,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3}));
      /* superficies sobre el terreno, trianguladas con sus bordes exactos (geometria_obras.py): calzada asfaltada
         del acceso y de estabilizado en el interior (Cap. 1, pp. 169 y 174), sus cortes y terraplenes, plataformas
         y patios. Cada vértice se apoya en el relieve */
      var COLOR={asfalto:0x3f4245,ripio:0xb1aa9b,talud:0x7a6b56,plataforma:0x8e8471,patio:0x9f9b91,tierra:0x6f5d48};
      var ALTO={asfalto:1.8,ripio:1.6,talud:1.0,plataforma:1.2,patio:1.4,tierra:1.3};
      var BORDE={asfalto:0xefe9dc,ripio:0xd9d0bd,plataforma:0x6e6455,patio:0x8a857b,tierra:0x5b4b39};
      function apoyar(lon,lat,dh){ var u=uv(lon,lat); return [wx(u[0]),(hAt(u[0],u[1])+dh)*K(),wz(u[1])] }
      var sups=[], bordesA=[], bordesS=[];
      OBRAS.superficies.forEach(function(S2){
        var pos=[], idx=[], dh=ALTO[S2.t], X=0, Y=0;
        /* vértices e índices vienen en diferencias con el anterior (geometria_obras.py) */
        for(var q=0;q<S2.v.length;q+=2){ X+=S2.v[q]; Y+=S2.v[q+1];
          var p=apoyar(S2.o[0]+S2.di[0]*X+S2.dj[0]*Y, S2.o[1]+S2.di[1]*X+S2.dj[1]*Y, dh); pos.push(p[0],p[1],p[2]) }
        for(var q3=0,ac=0;q3<S2.i.length;q3++){ ac+=S2.i[q3]; idx.push(ac) }
        /* un poco de variación de tono por vértice, para que la tierra compactada no se vea plástica */
        var base=new T.Color(COLOR[S2.t]), cols=[];
        for(var q2=0;q2<pos.length;q2+=3){ var r=Math.sin(pos[q2]*12.9898+pos[q2+2]*78.233)*43758.5453; r=(r-Math.floor(r)-.5)*(S2.t==='asfalto'?.04:.12);
          cols.push(base.r*(1+r),base.g*(1+r),base.b*(1+r)) }
        var g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('color',new T.Float32BufferAttribute(cols,3));
        g.setIndex(idx); g.computeVertexNormals(); sups.push(g);
        if(BORDE[S2.t]) (S2.b||[]).forEach(function(B){
          var pts=B.map(function(c){ var p=apoyar(c[0],c[1],dh+.3); return new T.Vector3(p[0],p[1],p[2]) });
          segmentos(pts,BORDE[S2.t],S2.t==='asfalto'?bordesA:bordesS) });
      });
      mallaDe(sups,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),3);
      lineasDe(bordesA,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.95}),4);
      lineasDe(bordesS,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.6}),4);
      /* edificios: la huella del shapefile, extruida, con techo y muros de distinto tono y aristas marcadas.
         8 m en los galpones con altura declarada; el resto, esquemático. Las aristas se calculan antes de escalar
         la altura, como cuando cada edificio era un objeto con su propia escala */
      var cuerpos=[], aristas=[], Mx=new T.Matrix4(), Sx=new T.Matrix4();
      OBRAS.edificios.forEach(function(E){
        var mn=1e9, sh=new T.Shape();
        E.p.forEach(function(c,ii){ var q=XZ(c); mn=Math.min(mn,q.h); if(ii) sh.lineTo(q.x,-q.z); else sh.moveTo(q.x,-q.z) });
        var g=new T.ExtrudeGeometry(sh,{depth:E.alto+2,bevelEnabled:false}); g.rotateX(-Math.PI/2); g.translate(0,-2,0);
        var e=new T.EdgesGeometry(g,30);
        Mx.makeTranslation(0,mn*K(),0).multiply(Sx.makeScale(1,K(),1));
        pintar(g,[E.esq?0xb5bcc3:0x8494a1,0xe7e4dd]).applyMatrix4(Mx); cuerpos.push(g);
        e.applyMatrix4(Mx); var ne=e.attributes.position.count, ce=new Float32Array(ne*3).fill(1); e.setAttribute('color',new T.BufferAttribute(ce,3)); aristas.push(e);
      });
      mallaDe(cuerpos,new T.MeshLambertMaterial({vertexColors:true}));
      lineasDe(aristas,new T.LineBasicMaterial({color:0x34383d,vertexColors:true,transparent:true,opacity:.55}));
      /* antorchas: cilindros de 2,3 m de diámetro y 8,2 m, medidos en la elevación del plano 10.2; remate oscuro */
      var A=OBRAS.antorchas, cil=[];
      A.p.forEach(function(c){ var q=XZ(c);
        var g=pintar(new T.CylinderGeometry(A.diam/2,A.diam/2,A.alto,20),[0xa2a9b0,0x26282b,0xa2a9b0]);
        g.applyMatrix4(Mx.makeTranslation(q.x,(q.h+A.alto/2)*K(),q.z).multiply(Sx.makeScale(1,K(),1))); cil.push(g) });
      mallaDe(cil,new T.MeshLambertMaterial({vertexColors:true}));
      /* gases de combustión: una pluma tenue y quieta que sale del remate y se inclina hacia donde sopla el
         viento predominante del Anexo 4.2 (hacia el rumbo 10°). Es una antorcha cerrada: no tiene llama visible,
         y lo que sale es gas caliente, por eso la pluma es apenas un velo. Es ilustrativa: el expediente no
         modela su forma. Las 56 partículas van en una sola malla; el shader hace lo mismo que SpriteMaterial:
         cada cuadro mira a la cámara, con su escala, su giro y su opacidad */
      var lienzo=document.createElement('canvas'); lienzo.width=lienzo.height=64;
      var cx2=lienzo.getContext('2d'), gr=cx2.createRadialGradient(32,32,0,32,32,32);
      gr.addColorStop(0,'rgba(246,244,240,1)'); gr.addColorStop(.45,'rgba(232,229,224,.55)'); gr.addColorStop(1,'rgba(225,222,216,0)');
      cx2.fillStyle=gr; cx2.fillRect(0,0,64,64);
      var texHumo=new T.CanvasTexture(lienzo), rumbo=10*Math.PI/180, hx=Math.sin(rumbo), hz=-Math.cos(rumbo);
      var hP=[], hE=[], hS=[], hR=[], hA=[], hU=[], hI=[], nh=0;
      A.p.forEach(function(c,n){ var q=XZ(c), k=K();
        for(var s3=0;s3<14;s3++){ var f=s3/13, d=f*f*90, sub=A.alto+1+f*55, tam=5+f*48;
          var px=q.x+hx*d+Math.sin(n+s3)*1.2, py=(q.h+sub)*k, pz=q.z+hz*d+Math.cos(n*2+s3)*1.2;
          [[-.5,-.5,0,0],[.5,-.5,1,0],[.5,.5,1,1],[-.5,.5,0,1]].forEach(function(v){
            hP.push(px,py,pz); hE.push(v[0],v[1]); hS.push(tam,tam*.8); hR.push((n*1.7+s3)*.9); hA.push(.62*(1-f*.8)); hU.push(v[2],v[3]) });
          hI.push(nh,nh+1,nh+2, nh,nh+2,nh+3); nh+=4 } });
      var gh=new T.BufferGeometry();
      gh.setAttribute('position',new T.Float32BufferAttribute(hP,3)); gh.setAttribute('esq',new T.Float32BufferAttribute(hE,2));
      gh.setAttribute('esc',new T.Float32BufferAttribute(hS,2)); gh.setAttribute('rot',new T.Float32BufferAttribute(hR,1));
      gh.setAttribute('alfa',new T.Float32BufferAttribute(hA,1)); gh.setAttribute('uv',new T.Float32BufferAttribute(hU,2)); gh.setIndex(hI);
      var humo=new T.Mesh(gh,new T.ShaderMaterial({uniforms:{map:{value:texHumo}},transparent:true,depthWrite:false,
        vertexShader:['attribute vec2 esq; attribute vec2 esc; attribute float rot; attribute float alfa; varying vec2 vUv; varying float vA;',
          'void main(){ vUv=uv; vA=alfa; vec4 mv=modelViewMatrix*vec4(position,1.0); vec2 p=esq*esc;',
          '  mv.xy+=vec2(cos(rot)*p.x-sin(rot)*p.y, sin(rot)*p.x+cos(rot)*p.y); gl_Position=projectionMatrix*mv; }'].join('\n'),
        fragmentShader:['uniform sampler2D map; varying vec2 vUv; varying float vA;',
          'void main(){ vec4 t=texture2D(map,vUv); gl_FragColor=vec4(t.rgb,t.a*vA); }'].join('\n')}));
      humo.renderOrder=7; humo.frustumCulled=false; obras.add(humo);
      /* chimeneas: 81, una sola malla instanciada. Se dibujan de 6 m (el expediente no da la altura sobre la
         cobertura) y aparecen cuando la masa llega a su cota final en ese punto */
      var CH=OBRAS.chimeneas, ci=new T.InstancedMesh(new T.CylinderGeometry(.7,.7,6,8),new T.MeshLambertMaterial({color:0xe8e4da}),CH.length);
      ci.instanceMatrix.setUsage(T.DynamicDrawUsage); obras.add(ci);
      MEJOR.chim={m:ci,p:CH.map(function(c){ var u=uv(c[0],c[1]); return {x:wx(u[0]),z:wz(u[1]),u:u[0],v:u[1]} })};
    }
    MEJOR.obras=obras;

    /* ---------- áreas protegidas: pintadas sobre el terreno, con rótulo ---------- */
    var TONO={palmar:0x8fd18a,botanico:0xb9a8e0,humedal:0x8fc4d6,penuelas:0x7fa7b8};
    var NOM={palmar:'Sitio Prioritario<small>Palmar Las Siete Hermanas · 255 m</small>',humedal:'Humedal Estero Quilpué<small>1,43 km</small>',
             botanico:'Jardín Botánico Nacional<small>1,75 km</small>',penuelas:'R.N. Lago Peñuelas<small>2,16 km</small>'};
    var grupoAreas=new T.Group(); grupoAreas.visible=false; sc.add(grupoAreas);
    MEJOR.rotulos=[];
    (D.areas||[]).forEach(function(A){
      var g=A.g, pls=g.type==='Polygon'?[g.coordinates]:g.coordinates, rings=[];
      pls.forEach(function(pl){ pl.forEach(function(r,ri){ rings.push({ext:ri===0,p:r.map(function(c){ var u=uv(c[0],c[1]); return [wx(u[0]),wz(u[1])] })}) }) });
      var ax0=1e9,ax1=-1e9,az0=1e9,az1=-1e9;
      rings.forEach(function(R){ R.p.forEach(function(q){ ax0=Math.min(ax0,q[0]); ax1=Math.max(ax1,q[0]); az0=Math.min(az0,q[1]); az1=Math.max(az1,q[1]) }) });
      var H=S*.49; ax0=Math.max(ax0,-H); ax1=Math.min(ax1,H); az0=Math.max(az0,-H); az1=Math.min(az1,H);
      if(ax1<=ax0||az1<=az0) return;
      function den(x,z){ var o=false; rings.forEach(function(R){ var pt=R.p;
        for(var a=0,b=pt.length-1;a<pt.length;b=a++) if(((pt[a][1]>z)!==(pt[b][1]>z))&&(x<(pt[b][0]-pt[a][0])*(z-pt[a][1])/(pt[b][1]-pt[a][1])+pt[a][0])) o=!o }); return o }
      var c=Math.max(8,Math.min(60,Math.sqrt((ax1-ax0)*(az1-az0)/9000))), mx=Math.ceil((ax1-ax0)/c)+1, mz=Math.ceil((az1-az0)/c)+1;
      var P2=new Float32Array(mx*mz*3), dn=new Uint8Array(mx*mz), ix=[], k=K(), sx=0,sz=0,sn=0, cxs=0,czs=0,cns=0;
      for(var j=0;j<mz;j++) for(var i=0;i<mx;i++){ var x=ax0+i*c, z=az0+j*c, q=j*mx+i;
        P2[q*3]=x; P2[q*3+1]=(hAt(x/S+.5,-z/S+.5)+6)*k; P2[q*3+2]=z;
        if(den(x,z)){ dn[q]=1; cxs+=x; czs+=z; cns++;
          /* el rótulo va en el punto del área más cercano al relleno: ahí se mide la distancia */
          var dd=Math.hypot(x-MEJOR.centro.x,z-MEJOR.centro.z); if(dd<(sn||1e12)){ sn=dd; sx=x; sz=z } } }
      for(var j2=0;j2<mz-1;j2++) for(var i2=0;i2<mx-1;i2++){ var a=j2*mx+i2,b=a+1,c2=a+mx,d2=c2+1;
        if(dn[a]+dn[b]+dn[c2]+dn[d2]>=2) ix.push(a,c2,b,b,c2,d2) }
      if(!ix.length) return;
      var gg=new T.BufferGeometry(); gg.setAttribute('position',new T.BufferAttribute(P2,3)); gg.setIndex(ix);
      var m=new T.Mesh(gg,new T.MeshBasicMaterial({color:TONO[A.id]||0x8fd18a,transparent:true,opacity:.34,depthWrite:false}));
      m.renderOrder=2; grupoAreas.add(m);
      rings.forEach(function(R){ if(!R.ext) return;
        var pts=R.p.filter(function(q){ return Math.abs(q[0])<H&&Math.abs(q[1])<H })
                  .map(function(q){ return new T.Vector3(q[0],(hAt(q[0]/S+.5,-q[1]/S+.5)+8)*k,q[1]) });
        if(pts.length>2) grupoAreas.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({color:TONO[A.id]||0x8fd18a,transparent:true,opacity:.95}))) });
      var cx=sx, cz=sz, el=document.createElement('p'); el.className='rot-area'; el.innerHTML=NOM[A.id]||A.n;
      el.setAttribute('aria-hidden','true'); document.body.appendChild(el);
      /* dos anclas: el centro del área, si cae en pantalla; si no, el punto más cercano al relleno */
      var gx=cxs/cns, gz=czs/cns;
      MEJOR.rotulos.push({el:el,p:new T.Vector3(gx,(hAt(gx/S+.5,-gz/S+.5)+30)*k,gz),
                          p2:new T.Vector3(cx,(hAt(cx/S+.5,-cz/S+.5)+30)*k,cz)});
    });
    MEJOR.areas=function(on){ grupoAreas.visible=on; if(!on) MEJOR.rotulos.forEach(function(r){ r.el.classList.remove('on') }) };
    /* ---------- etapa 09: lo que el plan de seguimiento no mide, en el lugar donde ocurre ----------
       Cifras del titular: Cap. 1 pp. 104, 116-117 y 166-167 · Cap. 3.8 p. 70 · Anexo 4.1 (planilla del año 25)
       · Resumen Ejecutivo p. 23. Anclas: polígonos del proyecto y el pozo P-5 de la Tabla 49 del Cap. 1. */
    var EMIS=[
      ['Gases del biogás','metano y ácido sulfhídrico',-71.48431,-33.08096,350],
      ['Olores','evaluados con una norma de Lombardía, Italia',-71.48897,-33.07808],
      ['Lixiviados','hasta 724 m³ en un día de lluvia',-71.48433,-33.07721],
      ['Agua subterránea','5 pozos sin umbrales',-71.47994,-33.08256],
      ['Ruido','significativo para reptiles y aves, según su estudio',-71.48655,-33.08223],
      ['Camiones','294 al día en el año 25',-71.48706,-33.07692]];
    MEJOR.emis=EMIS.map(function(E){
      var u=uv(E[2],E[3]), x=wx(u[0]), z=wz(u[1]), y=Math.max(hAt(u[0],u[1]),E[4]||0);
      var el=document.createElement('p'); el.className='rot-emi'; el.innerHTML=E[0]+'<small>'+E[1]+'</small>';
      var ln=document.createElement('i'); ln.className='rot-emi-l';
      var pt=document.createElement('i'); pt.className='rot-emi-p';
      [el,ln,pt].forEach(function(x){ x.setAttribute('aria-hidden','true'); document.body.appendChild(x) });
      return {el:el,ln:ln,pt:pt,p:new T.Vector3(x,(y+8)*K(),z)};
    });
    MEJOR.emisVer=function(on){ if(!on) MEJOR.emis.forEach(function(r){ [r.el,r.ln,r.pt].forEach(function(x){ x.classList.remove('on') }) }) };
    MEJOR.listo=true;
  }
