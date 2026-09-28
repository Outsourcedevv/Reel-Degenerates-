'use strict';
// Space Goobers gun redesigns. Procedural geometry keeps browser/file:// and desktop
// startup synchronous. Design space: +X forward, Y up; build() maps it to -Z forward
// and the existing right-hand grip. Materials use the game's shared toon palette.
const GunDesigns = (() => {
const T = THREE;
function material(color, options = {}) {
  const { metalness, roughness, ...opts } = options;
  if (opts.transparent) opts.side = T.DoubleSide;
  return M(color, opts);
}
const C={red:'#ed6151',cream:'#f6db9c',dark:'#303543',steel:'#77818f',edge:'#b5bfcc',cyan:'#44e3ea',orange:'#c96b2d',wood:'#80502f',tape:'#527f9f',silver:'#969caa',brass:'#dba443',purple:'#7148aa',deep:'#44316d',yellow:'#f2c44e',goo:'#fa4ebe'};
let group;
function mesh(name,geo,col,pos=[0,0,0],rot=[0,0,0],opt={}){
 if (geo.index) { const indexed = geo; geo = geo.toNonIndexed(); indexed.dispose(); } geo.computeVertexNormals();
 const m=new T.Mesh(geo,material(col, opt));m.name=name;m.position.set(...pos);m.rotation.set(rot[0]||0,rot[1]||0,rot[2]||0);group.add(m);return m;
}
function box(name,size,col,pos,rot=[0,0,0],bevel=.008){
 const [w,h,d]=size,b=Math.min(bevel,w/5,h/5,d/5),s=new T.Shape();
 s.moveTo(-w/2+b,-h/2);s.lineTo(w/2-b,-h/2);s.lineTo(w/2,-h/2+b);s.lineTo(w/2,h/2-b);s.lineTo(w/2-b,h/2);s.lineTo(-w/2+b,h/2);s.lineTo(-w/2,h/2-b);s.lineTo(-w/2,-h/2+b);s.closePath();
 const geo=new T.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b/2,bevelSegments:1,steps:1,curveSegments:1});geo.translate(0,0,-d/2+b);return mesh(name,geo,col,pos,rot);
}
function ball(name,r,col,pos,scale=[1,1,1],opt={}){const g=new T.SphereGeometry(r,12,8);g.scale(...scale);return mesh(name,g,col,pos,[0,0,0],opt);}
function cyl(name,r,len,col,pos,axis='x',r2=r,n=12,opt={}){return mesh(name,new T.CylinderGeometry(r,r2,len,n),col,pos,axis==='x'?[0,0,-Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0],opt);}
function ring(name,r,t,col,pos,axis='x',opt={}){return mesh(name,new T.TorusGeometry(r,t,4,16),col,pos,axis==='x'?[0,Math.PI/2,0]:[0,0,0],opt);}
function plate(name,points,depth,col,z=0){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.005,bevelSize:.006,bevelSegments:1,curveSegments:1});g.translate(0,0,z-depth/2);return mesh(name,g,col);}
function rod(name,a,b,r,col,n=8){const A=new T.Vector3(...a),B=new T.Vector3(...b),d=B.clone().sub(A);const m=mesh(name,new T.CylinderGeometry(r,r,d.length(),n),col,A.clone().add(B).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
function bolt(name,x,y,z,col=C.brass,r=.014){cyl(name,r,.013,col,[x,y,z],'z',r,6,{metalness:.45});box(name+' slot',[r,.003,.002],C.dark,[x,y,z+.008],[0,0,.4],.0004);}
function grip(x=0,col=C.dark){plate('Sculpted grip',[[x-.13,-.025],[x+.02,-.025],[x+.005,-.105],[x-.045,-.235],[x-.012,-.29],[x-.045,-.322],[x-.145,-.306],[x-.165,-.26],[x-.105,-.1]],.09,col);for(let i=0;i<4;i++)box('Grip ridge '+i,[.068,.011,.099],C.dark,[x-.083-i*.008,-.13-i*.034,0],[0,0,-.28],.003);}
function zapper(){group=new T.Group();group.name='Pew Pew Zapper';grip(-.095);ball('Coral egg housing',.155,C.red,[-.1,.07,0],[1.45,1,.8]);
 cyl('Cream barrel',.046,.41,C.cream,[.235,.06,0]);for(let i=0;i<3;i++){const x=.105+i*.113;ring('Coral energy fin '+i,.083-i*.012,.018,C.red,[x,.06,0]);cyl('Fin hub '+i,.053-i*.004,.027,C.red,[x,.06,0]);}
 cyl('Muzzle collar',.056,.055,C.cream,[.455,.06,0]);cyl('Dark muzzle inset',.036,.001,C.dark,[.484,.06,0]);ring('Muzzle rim',.042,.007,C.edge,[.486,.06,0]);
 plate('Cream dorsal fin',[[-.245,.183],[-.118,.323],[-.116,.201]],.018,C.cream);
 for(const s of [-1,1]){box('Energy window bezel',[.18,.079,.022],C.dark,[-.04,.065,s*.12],[0,0,0],.012);box('Energy window glass',[.146,.047,.012],'#173c4b',[-.04,.065,s*.137]);for(let i=0;i<4;i++)box('Cyan charge cell '+s+' '+i,[.02,.037,.012],C.cyan,[-.094+i*.036,.065,s*.146],[0,0,0],.004);
 cyl('Badge disk',.044,.012,C.cream,[-.215,.072,s*.107],'z');plate('Lightning badge',[[-.219,.104],[-.235,.073],[-.218,.073],[-.224,.043],[-.197,.08],[-.214,.08],[-.203,.104]],.008,C.dark,s*.119);}
 box('Toy trigger',[.018,.052,.028],C.red,[.025,-.066,0],[0,0,-.22]);rod('Trigger guard front',[.065,-.025,0],[.058,-.115,0],.009,C.dark);rod('Trigger guard bottom',[.058,-.115,0],[-.055,-.115,0],.009,C.dark);
 for(let i=0;i<3;i++)box('Rear cooling vent '+i,[.007,.05,.012],C.dark,[-.27+i*.025,.075,.094],[0,0,-.2],.001);
 return group;}
function scatter(){group=new T.Group();group.name='Scrap Scattergun';grip(-.16);box('Scrap receiver',[.35,.17,.19],C.orange,[-.11,.04,0],[],.018);box('Raised top patch',[.24,.022,.165],'#e18b43',[-.12,.137,0],[0,0,.035]);
 for(const s of [-1,1]){cyl('Pipe barrel '+s,.047,.44,C.steel,[.265,.051,s*.054]);cyl('Black bore '+s,.037,.002,'#141b26',[.487,.051,s*.054]);ring('Pipe muzzle lip '+s,.043,.007,C.edge,[.49,.051,s*.054]);cyl('Barrel rear sleeve '+s,.054,.045,C.silver,[.07,.051,s*.054]);}
 box('Pump metal rail',[.24,.041,.16],C.dark,[.25,-.026,0]);box('Wooden pump',[.22,.061,.159],C.wood,[.25,-.063,0],[],.009);for(let i=0;i<5;i++)box('Pump groove '+i,[.007,.065,.165],'#543726',[.16+i*.045,-.063,0],[],.001);
 box('Duct tape band',[.053,.184,.206],C.silver,[-.035,.04,0],[],.005);for(let i=0;i<3;i++)box('Tape seam '+i,[.002,.165,.002],'#707581',[-.052+i*.015,.041,.105],[],.0003);
 for(const s of [-1,1])for(let i=0;i<2;i++)bolt('Receiver bolt '+s+' '+i,-.23+i*.095,.055,s*.101,C.brass,.022);
 box('Stock neck',[.13,.07,.08],C.dark,[-.325,.012,0]);box('Crooked wood stock',[.125,.165,.115],C.wood,[-.426,.035,0],[0,0,-.08],.008);box('Stock blue wrap',[.028,.178,.125],C.tape,[-.408,.035,0],[0,0,-.08]);
 for(let i=0;i<3;i++)box('Stock wood seam '+i,[.119,.003,.003],'#392c25',[-.433,-.015+i*.045,.06],[0,0,.03],.0003);
 box('Grip tape',[.1,.055,.108],C.tape,[-.26,-.215,0],[0,0,-.23]);box('Rear sight',[.026,.042,.031],C.dark,[-.005,.153,0]);box('Front sight',[.018,.026,.016],C.brass,[.412,.111,0]);
 box('Trigger',[.014,.04,.025],C.silver,[-.057,-.082,0],[0,0,-.3]);rod('Guard down',[-.012,-.047,0],[-.025,-.126,0],.009,C.dark);rod('Guard bottom',[-.025,-.126,0],[-.165,-.13,0],.009,C.dark);
 for(let i=0;i<5;i++)box('Paint chip '+i,[.026,.003,.003],C.steel,[-.265+i*.025,.112-(i%2)*.018,.101],[0,0,-.12+i*.04],.0005);return group;}
function goo(){group=new T.Group();group.name='Goo Lobber';grip(-.16,C.deep);cyl('Purple pressure shell',.137,.53,C.purple,[.015,.075,0],'x',.146,12);cyl('Rear cap',.145,.053,C.deep,[-.267,.075,0]);
 for(const x of [-.16,.195]){cyl('Yellow body band '+x,.149,.034,C.yellow,[x,.075,0]);for(let i=0;i<6;i++){const a=i*Math.PI/3;ball('Band rivet',.009,C.brass,[x,.075+Math.cos(a)*.151,Math.sin(a)*.151]);}}
 cyl('Muzzle collar',.164,.077,C.deep,[.302,.075,0]);ring('Purple muzzle lip',.14,.024,C.purple,[.344,.075,0]);cyl('Dark goo bore',.12,.003,'#28153e',[.344,.075,0]);cyl('Loaded goo',.101,.004,C.goo,[.347,.075,0],'x',.101,12,{emissive:'#5b073a',emissiveIntensity:.35});
 ball('Goo lip spill',.036,C.goo,[.365,-.043,.042],[.7,.8,.65]);rod('Goo drip neck',[.366,-.045,.042],[.368,-.118,.042],.009,C.goo);ball('Goo droplet',.021,C.goo,[.368,-.141,.042],[.75,1.5,.8]);
 box('Tank mount rear',[.08,.065,.07],C.deep,[-.13,.225,0]);box('Tank mount front',[.08,.065,.07],C.deep,[.16,.225,0]);
 cyl('Transparent goo reservoir',.091,.315,'#d8efff',[.022,.322,0],'x',.091,16,{transparent:true,opacity:.2,depthWrite:false,roughness:.17});
 cyl('Magenta reservoir liquid',.069,.285,C.goo,[.022,.31,0],'x',.069,12,{emissive:'#65104b',emissiveIntensity:.25});
 for(const x of [-.15,.194]){ring('Tank yellow rim '+x,.086,.017,C.yellow,[x,.322,0]);cyl('Tank cap '+x,.084,.021,C.yellow,[x,.322,0]);}
 for(let i=0;i<7;i++)ball('Goo bubble '+i,.009+(i%3)*.004,'#ffb2e5',[-.1+i*.038,.318+(i%2)*.025,.06],[1,1,1]);
 const hose=[[-.164,.323,0],[-.23,.333,0],[-.29,.302,0],[-.326,.246,0],[-.318,.183,0],[-.277,.133,0]];for(let i=0;i<hose.length-1;i++){rod('Hose segment '+i,hose[i],hose[i+1],.033,C.dark);ball('Hose elbow '+i,.035,C.dark,hose[i]);}
 for(const s of [-1,1]){cyl('Gauge dark rim',.048,.028,C.dark,[-.092,.101,s*.143],'z');cyl('Cream gauge face',.04,.003,C.cream,[-.092,.101,s*.16],'z');rod('Gauge needle',[-.092,.101,s*.163],[-.113,.128,s*.163],.003,C.red);ball('Gauge hub',.006,C.dark,[-.092,.101,s*.164]);
 for(let i=0;i<5;i++){const a=i*Math.PI/4;box('Gauge tick',[.003,.007,.002],C.dark,[-.092+Math.cos(a)*.03,.101+Math.sin(a)*.03,s*.164],[0,0,a-Math.PI/2],.0003);}
 plate('Warning triangle',[[.035,.039],[.13,.039],[.082,.126]],.008,C.yellow,s*.14);box('Warning mark',[.006,.027,.005],C.deep,[.082,.079,s*.148],[],.001);ball('Warning dot',.005,C.deep,[.082,.052,s*.148]);}
 box('Purple trigger',[.014,.05,.028],C.purple,[-.034,-.104,0],[0,0,-.3]);return group;}
function squirt(){group=new T.Group();group.name='Squirt Pistol';grip(-.12,C.orange);box('Orange plastic shell',[.34,.135,.125],'#ff8a28',[-.08,.035,0],[],.02);box('Blue side panel',[.19,.064,.137],'#22a7d6',[-.065,.04,0],[],.01);
 cyl('Blue water nozzle',.033,.18,'#23b8dc',[.185,.035,0]);cyl('White nozzle rim',.036,.032,C.cream,[.288,.035,0]);cyl('Nozzle opening',.014,.002,C.dark,[.305,.035,0]);
 box('Tank support',[.145,.028,.1],C.cream,[-.115,.118,0]);ball('Transparent bottle',.085,'#b7edff',[-.115,.196,0],[1.2,1.1,.75],{transparent:true,opacity:.28,depthWrite:false});ball('Water inside bottle',.068,'#3eacec',[-.115,.18,0],[1.15,.8,.66]);cyl('Bottle screw cap',.033,.036,C.cream,[-.115,.288,0],'y');for(let i=0;i<8;i++){const a=i*Math.PI/4;box('Cap knurl '+i,[.008,.029,.007],C.edge,[-.115+Math.cos(a)*.031,.288,Math.sin(a)*.031],[],.001);}
 box('White trigger',[.016,.048,.03],C.cream,[.055,-.064,0],[0,0,-.35]);rod('Plastic guard',[.086,-.03,0],[.071,-.106,0],.008,'#22a7d6');rod('Guard return',[.071,-.106,0],[-.065,-.106,0],.008,'#22a7d6');for(const s of [-1,1]){bolt('Plastic screw',-.205,.043,s*.066,C.cream,.01);ball('Water droplet badge',.021,C.cream,[-.06,.04,s*.074],[.7,1.1,.2]);}return group;}
function jackpot(){group=new T.Group();group.name='Jackpot Blaster';grip(-.14,'#512944');ball('Golden housing',.16,'#daa736',[-.09,.06,0],[1.4,1,.88]);box('Gold receiver rim',[.27,.147,.207],C.brass,[-.08,.025,0],[],.018);cyl('Gold barrel',.045,.34,'#a9812b',[.235,.06,0]);for(let i=0;i<3;i++)ring('Pink neon collar '+i,.062,.014,'#ff57cc',[.115+i*.102,.06,0]);cyl('Muzzle gold crown',.064,.045,C.yellow,[.43,.06,0]);cyl('Dark muzzle',.039,.002,C.dark,[.454,.06,0]);
 for(const s of [-1,1]){box('Reel display bezel',[.225,.103,.027],C.dark,[-.075,.065,s*.146],[],.01);for(let i=0;i<3;i++){const x=-.148+i*.072;box('Cream reel '+i,[.055,.071,.012],C.cream,[x,.065,s*.165],[],.005);const colors=[C.red,C.yellow,C.cyan];ball('Reel symbol '+i,.017,colors[i],[x,.065,s*.176],[1,1,.28]);}for(const x of [-.204,.055])for(const y of [.01,.124])bolt('Bezel rivet',x,y,s*.15,C.yellow,.009);}
 box('Coin slot bezel',[.092,.012,.06],C.yellow,[-.11,.217,0]);box('Coin slot',[.067,.005,.009],C.dark,[-.11,.226,0]);rod('Pull handle',[-.2,.1,.176],[-.22,.275,.18],.012,C.edge);ball('Red pull knob',.031,C.red,[-.22,.28,.18]);box('Trigger',[.019,.048,.03],C.yellow,[.027,-.07,0],[0,0,-.2]);return group;}
function cryo(){group=new T.Group();group.name='Cryo Beam';grip(-.17,'#285375');box('Ivory insulated housing',[.35,.15,.18],'#e3eff4',[-.09,.045,0],[],.018);box('Blue housing spine',[.28,.04,.09],'#358ac2',[-.11,.144,0]);cyl('Ice conduit',.028,.34,C.cyan,[.245,.05,0]);for(let i=0;i<4;i++){ring('Blue cryo coil '+i,.064,.013,'#389cdb',[.08+i*.074,.05,0]);cyl('Coil white spacer '+i,.035,.018,C.cream,[.095+i*.074,.05,0]);}
 const crystal=new T.OctahedronGeometry(.084);crystal.scale(1.65,.67,.67);mesh('Ice crystal emitter',crystal,'#a3f4ff',[.427,.05,0]);for(const s of [-1,1]){box('Cold vent backing',[.19,.07,.012],'#183849',[-.095,.041,s*.098]);for(let i=0;i<5;i++)box('Radiator slat '+i,[.014,.063,.016],'#a9c8d9',[-.169+i*.036,.04,s*.108]);box('Blue battery pod',[.105,.076,.036],'#358ac2',[-.18,-.04,s*.081],[],.01);}
 cyl('Coolant canister',.046,.18,'#84def8',[-.13,.214,0]);for(const x of [-.225,-.035])cyl('Coolant cap',.051,.018,'#e3eff4',[x,.214,0]);box('Trigger',[.016,.05,.032],C.cyan,[-.014,-.067,0],[0,0,-.25]);for(let i=0;i<3;i++)box('Cold indicator '+i,[.018,.012,.006],C.cyan,[.007,.093-i*.02,.101],[],.001);return group;}
function wisp(){group=new T.Group();group.name='Wisp Caller';grip(-.22,'#483749');box('Antique dark stock',[.43,.066,.095],'#473b50',[-.07,-.02,0]);box('Lantern floor',[.245,.035,.225],'#292d36',[.045,.026,0]);box('Lantern roof',[.28,.035,.25],'#353341',[.045,.271,0]);
 for(const x of [-.057,.147])for(const z of [-.091,.091]){rod('Iron lantern pillar',[x,.034,z],[x,.266,z],.012,C.dark);ball('Brass pillar foot',.017,C.brass,[x,.054,z]);}
 box('Glass lantern chamber',[.182,.202,.162],'#b9e6ca',[.045,.146,0],[],.008).material = material('#b9e6ca', {transparent:true,opacity:.16,depthWrite:false});ball('Captured ghost',.065,'#93f5b0',[.048,.16,0],[.86,1.15,.78]);plate('Ghost tail',[[.001,.132],[.002,.07],[.021,.086],[.035,.063],[.05,.088],[.072,.081],[.079,.13]],.05,'#93f5b0');for(const s of [-1,1])for(const x of [.026,.062])ball('Ghost eye',.01,'#193c37',[x,.178,s*.045],[.7,1.25,.45]);
 cyl('Lantern roof peak',.042,.055,C.dark,[.045,.316,0],'y',.135,4);ring('Lantern carry ring',.045,.009,C.brass,[.045,.39,0],'z');cyl('Ghost nozzle',.04,.16,'#38333f',[.257,.096,0],'x',.065,8);ring('Brass nozzle lip',.04,.008,C.brass,[.34,.096,0]);cyl('Spectral aperture',.031,.002,'#93f5b0',[.341,.096,0]);
 box('Wood butt',[.09,.135,.12],C.wood,[-.338,.008,0],[0,0,.08]);for(const s of [-1,1])bolt('Stock brass screw',-.285,-.021,s*.052,C.brass,.012);box('Old trigger',[.013,.05,.025],C.brass,[-.107,-.079,0],[0,0,-.3]);return group;}
function storm(){group=new T.Group();group.name='Storm Caller';grip(-.2,'#263e61');box('Navy power housing',[.3,.153,.18],'#263e61',[-.135,.031,0],[],.018);cyl('Central insulator',.036,.33,C.cream,[.178,.06,0]);for(let i=0;i<6;i++)ring('Copper coil '+i,.079-i*.005,.013,'#be773e',[.031+i*.048,.06,0]);
 for(const s of [-1,1]){rod('Fork arm '+s,[.256,.06,s*.044],[.343,.06,s*.116],.017,C.steel);rod('Electrode '+s,[.343,.06,s*.116],[.455,.06,s*.071],.014,C.edge);ball('Electrode end '+s,.019,C.edge,[.455,.06,s*.071]);}
 mesh('Lightning core',new T.IcosahedronGeometry(.046,0),'#bdeaff',[.414,.06,0]);for(const s of [-1,1]){rod('Static arc '+s,[.454,.06,s*.071],[.426,.078,s*.036],.003,C.cyan,5);rod('Static arc inner '+s,[.426,.078,s*.036],[.414,.06,0],.003,C.cyan,5);box('Copper side vent',[.18,.068,.014],C.dark,[-.15,.024,s*.097]);for(let i=0;i<4;i++)box('Copper vent bar '+i,[.014,.06,.018],'#be773e',[-.218+i*.043,.024,s*.108]);}
 box('Yellow battery',[.11,.056,.125],C.yellow,[-.203,.14,0],[],.01);box('Battery terminals',[.06,.016,.06],C.dark,[-.203,.176,0]);for(const s of [-1,1])bolt('Case fastener',-.017,.065,s*.1,C.brass,.013);plate('Warning badge',[[-.206,.127],[-.168,.127],[-.187,.16]],.008,C.dark,.066);box('Power trigger',[.018,.048,.025],C.yellow,[-.044,-.068,0],[0,0,-.3]);return group;}
function launcher(){group=new T.Group();group.name='Same-Day Launcher';grip(-.22,C.dark);cyl('Cardboard delivery tube',.146,.73,'#bd9362',[0,.075,0]);for(const x of [-.353,.35]){cyl('Reinforced tube rim',.157,.042,'#7b593d',[x,.075,0]);ring('Cardboard rolled edge',.144,.012,'#e3bd87',[x+.023,.075,0]);}
 cyl('Dark tube interior',.131,.002,'#352b24',[.377,.075,0]);box('Loaded parcel',[.145,.175,.176],'#d3aa70',[.398,.075,0],[],.007);box('Parcel tape vertical',[.149,.18,.035],'#f2d49a',[.398,.075,0],[],.002);box('Parcel tape horizontal',[.149,.032,.18],'#f2d49a',[.398,.075,0],[],.002);
 for(const x of [-.21,.19])ring('Packing strap',.147,.008,C.tape,[x,.075,0]);for(const s of [-1,1]){box('Shipping label',[.235,.091,.008],'#f3e8cf',[-.055,.08,s*.146],[],.002);for(let i=0;i<13;i++)box('Barcode stripe '+i,[i%3===0?.008:.003,.034,.002],C.dark,[-.135+i*.012,.082,s*.152],[],.0001);box('Label address line',[.11,.004,.002],C.dark,[-.074,.049,s*.152],[],.0001);}
 box('Top carry handle',[.17,.03,.06],C.dark,[-.185,.299,0]);for(const x of [-.256,-.112])box('Handle stand',[.022,.066,.05],C.dark,[x,.262,0]);box('Tracking screen',[.065,.035,.042],C.cyan,[.025,.234,0],[0,0,.13]);box('Trigger',[.02,.05,.025],C.orange,[-.061,-.102,0],[0,0,-.2]);box('Support grip',[.095,.092,.084],C.dark,[.184,-.098,0],[],.01);return group;}
function pizza(){group=new T.Group();group.name='Pizza Cutter';grip(-.18,'#96382a');box('Motor housing',[.31,.105,.142],C.red,[-.13,.033,0],[],.016);box('Cream delivery stripe',[.26,.022,.148],C.cream,[-.13,.044,0],[],.002);box('Blade support rail',[.45,.055,.07],C.dark,[.047,.046,0]);
 cyl('Steel cutter wheel',.187,.018,C.edge,[.28,.1,0],'z',.187,32,{metalness:.65,roughness:.32});cyl('Recessed blade face',.143,.024,C.steel,[.28,.1,0],'z',.143,24,{metalness:.65,roughness:.38});ring('Polished cutting edge',.182,.006,'#e4edf2',[.28,.1,0],'z',{metalness:.75,roughness:.24});
 for(const s of [-1,1]){cyl('Red axle hub',.046,.021,C.red,[.28,.1,s*.029],'z');cyl('Hub bolt',.017,.012,C.brass,[.28,.1,s*.045],'z',.017,6);box('Axle bracket',[.162,.034,.016],C.steel,[.208,.103,s*.051]);for(let i=0;i<6;i++){const a=i*Math.PI/3;ball('Blade recess '+i,.012,C.dark,[.28+Math.cos(a)*.106,.1+Math.sin(a)*.106,s*.014],[1,1,.12]);}}
 const arc=new T.TorusGeometry(.205,.019,4,20,Math.PI*.8);mesh('Upper red blade guard',arc,C.red,[.28,.1,0],[0,0,.1*Math.PI]);box('Grease shield',[.065,.086,.19],C.red,[.068,.107,0]);for(const s of [-1,1]){plate('Pizza badge',[[-.241,.086],[-.176,.086],[-.209,.011]],.006,C.yellow,s*.08);for(const [x,y]of[[-.217,.062],[-.202,.041],[-.196,.07]])ball('Pepperoni badge dot',.006,C.red,[x,y,s*.086],[1,1,.2]);}
 box('Pizza trigger',[.018,.047,.028],C.cream,[-.015,-.066,0],[0,0,-.27]);return group;}

// [builder, design grip-center X, muzzle X, muzzle Y, optional support X/Y/radius/width]
const specs = {
  bolt: [zapper, -.185, .49, .06],
  spread: [scatter, -.25, .5, .051, [.25, -.063, .041, .08]],
  lob: [goo, -.25, .36, .075, [.08, .075, .15, .12]],
  squirt: [squirt, -.21, .306, .035],
  jackpot: [jackpot, -.23, .456, .06],
  beam: [cryo, -.26, .566, .05, [.04, .045, .075, .09]],
  homing: [wisp, -.31, .35, .096],
  chain: [storm, -.29, .49, .06, [-.02, .031, .08, .09]],
  rocket: [launcher, -.31, .48, .075, [.184, -.098, .048, .046]],
  cutter: [pizza, -.27, .28, .1, [.012, .046, .028, .036]],
};
// the bits that move on their own when it reloads (see GunReload in reloads.js): name: [which parts, design
// pivot x, y, z, each (keep every piece apart, to move them one at a time)]
const moving = {
  bolt: { cells: [/^Cyan charge cell/, -.04, .065, 0, true] },
  spread: { pump: [/^(Wooden pump|Pump groove)/, .25, -.063] },
  lob: { mag: [/^(Transparent goo reservoir|Magenta reservoir liquid|Tank yellow rim|Tank cap|Goo bubble)/, .022, .322] },
  squirt: { cap: [/^(Bottle screw cap|Cap knurl)/, -.115, .288], water: [/^Water inside bottle/, -.115, .127] },
  jackpot: { lever: [/^(Pull handle|Red pull knob)/, -.2, .1, .176], reels: [/^Reel symbol/, -.075, .065, 0, true] },
  beam: { mag: [/^(Coolant canister|Coolant cap)/, -.13, .214] },
  homing: { ghost: [/^(Captured ghost|Ghost tail|Ghost eye)/, .048, .16] },
  chain: { mag: [/^(Yellow battery|Battery terminals|Warning badge)/, -.203, .14] },
  rocket: { mag: [/^(Loaded parcel|Parcel tape)/, .398, .075] },
};
function build(type) {
  const spec = specs[type] || specs.squirt, scale = .65;
  const point = (x, y, z = 0) => new V3(z * scale, y * scale + .017, .08 - scale * (x - spec[1]));
  const design = spec[0](), root = new T.Group();
  root.name = design.name;
  design.rotation.y = Math.PI / 2;
  design.scale.setScalar(scale);
  design.position.set(0, .017, .08 + scale * spec[1]);
  design.updateMatrixWorld(true);
  let wheel = null;
  if (type === 'cutter') { wheel = new T.Group(); wheel.name = 'Animated cutter wheel'; wheel.position.copy(point(.28, .1)); root.add(wheel); }
  const mv = moving[type] || {}, parts = {};
  for (const [k, [, x, y, z, each]] of Object.entries(mv)) {
    const g = new T.Group(); g.name = k; g.position.copy(point(x, y, z)); g.userData.each = !!each;
    root.add(g); parts[k] = g;
  }
  for (const part of [...design.children]) {
    part.geometry.applyMatrix4(part.matrixWorld);
    part.position.set(0, 0, 0); part.rotation.set(0, 0, 0); part.scale.setScalar(1);
    const k = Object.keys(mv).find((n) => mv[n][0].test(part.name));
    if (k) {
      const g = parts[k];
      part.geometry.translate(-g.position.x, -g.position.y, -g.position.z);
      g.add(part);
    } else if (wheel && /^(Steel cutter wheel|Recessed blade face|Polished cutting edge|Red axle hub|Hub bolt|Blade recess)/.test(part.name)) {
      part.geometry.translate(-wheel.position.x, -wheel.position.y, -wheel.position.z);
      wheel.add(part);
    } else root.add(part);
  }
  const muzzle = new T.Group(); muzzle.name = 'Muzzle'; muzzle.position.copy(point(spec[2], spec[3])); root.add(muzzle);
  const handSpec = { grip: HAND_SPEC.zap.grip };
  if (spec[4]) { const [x, y, radius, width] = spec[4]; handSpec.support = [...point(x, y).toArray(), radius * scale, width * scale]; }
  root.userData = { tip: null, muzzle, wheel, handSpec, parts };
  mergeLocal(root, [wheel, ...Object.values(parts)].filter(Boolean));
  if (wheel) mergeLocal(wheel);
  for (const g of Object.values(parts)) { if (!g.userData.each) mergeLocal(g); g.userData.home = g.position.clone(); }
  return root;
}
return { build };
})();
