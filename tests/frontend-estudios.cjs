/* Pruebas de eventos y estado con DOM mínimo; no sustituyen una revisión visual.
   Usan la API real en proceso (sin servidor ni dependencias de navegador). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const python = process.env.STUDY_TEST_PYTHON || path.join(root, 'backend/venv/bin/python');
class Element {
  constructor(tag) { this.tagName = tag; this.children=[];this.attrs={};this.listeners={};this.value='';this.disabled=false;this._text='';this.classList={toggle:()=>{}}; }
  set value(v) { this._value=String(v); }
  get value() { return this._value; }
  set textContent(v) { this._text=String(v);this.children=[]; }
  get textContent() { return this._text+this.children.map(x=>x.textContent).join(''); }
  setAttribute(k,v) { this.attrs[k]=String(v); }
  append(...nodes) { for(const n of nodes) { assert(n instanceof Element);n.parent=this;this.children.push(n); } }
  prepend(...nodes) { for(const n of nodes)n.parent=this;this.children.unshift(...nodes); }
  replaceChildren(...nodes) { this.children=[];this._text='';this.append(...nodes); }
  remove() { if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this); }
  addEventListener(type,fn) { (this.listeners[type]??=[]).push(fn); }
  async emit(type) { if(this.disabled)return;const e={target:this};if(this['on'+type])await this['on'+type](e);for(const fn of this.listeners[type]||[])await fn(e); }
  click() { return this.emit('click'); }
}
const tick=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
async function page(script, storage = new Map(), protocol = 'http:') {
  const body = new Element('body'), ids = {};
  for(const id of ['estado','study-title','module-form','module-results','guardar','cargar','nuevo','calcular','archivo-estudio','imprimir','servidor-aviso']) { ids[id]=new Element('div');ids[id].attrs.id=id;body.append(ids[id]); }
  const pendingTimers=new Set(), captures=[], requests=[];
  const context=vm.createContext({Node:Element,Blob,structuredClone,console,queueMicrotask,
    document:{body,addEventListener(){},getElementById:id=>ids[id],createElement:tag=>new Element(tag),createElementNS:(ns,tag)=>new Element(tag),createTextNode:text=>{const e=new Element('#text');e.textContent=text;return e;}},
    location:{protocol,pathname:'/'+script.replace('.js','.html'),href:''},
    window:{addEventListener(){},print(){context.printed=true;}},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
    setTimeout(fn){pendingTimers.add(fn);return fn;},clearTimeout(fn){pendingTimers.delete(fn);},
    confirm:()=>true,URL:{createObjectURL:blob=>{captures.push(blob);return 'blob:test';},revokeObjectURL(){}},
    fetch:async(url,opts)=>{const data=opts?.body?JSON.parse(opts.body):undefined;requests.push({url,data});const r=JSON.parse(execFileSync(python,[path.join(__dirname,'api_inprocess.py')],{input:JSON.stringify({path:url,data}),encoding:'utf8'}));return {ok:r.status===200,status:r.status,json:async()=>r.body};}
  });
  for(const file of ['persistencia.js','estudios-comun.js',script])vm.runInContext(fs.readFileSync(path.join(root,'frontend',file),'utf8'),context,{filename:file});
  await tick();
  const all=(e=body)=>[e,...e.children.flatMap(x=>all(x))];
  const button=text=>{const b=all().find(e=>e.tagName==='button'&&e.textContent===text);assert(b,`Falta botón ${text}`);return b;};
  const label=text=>{const e=all().find(e=>e.attrs['aria-label']===text);assert(e,`Falta control ${text}`);return e;};
  const selectLabel=text=>{const e=all().find(e=>e.tagName==='label'&&e.children[0]?.textContent===text)?.children[1];assert(e,`Falta campo ${text}`);return e;};
  async function value(e,v,type='input'){e.value=String(v);await e.emit(type);await tick();}
  async function calculate(){await ids.calcular.click();await tick();return ids['module-results'].textContent;}
  async function save(){await ids.guardar.click();return JSON.parse(await captures.at(-1).text());}
  async function load(x){ids['archivo-estudio'].files=[{size:JSON.stringify(x).length,text:async()=>JSON.stringify(x)}];await ids['archivo-estudio'].emit('change');await tick();}
  return {ids,context,storage,button,label,selectLabel,value,calculate,save,load,all,requests};
}
async function main(){
  let count=0;
  const ok=(label)=>{count++;console.log('OK '+label);};
  const op=await page('operador-maquina.js');
  assert.match(await op.calculate(),/36 piezas\/h/);ok('Operador–máquina: formulario → API → cronograma');
  const saved=await op.save();assert.equal(saved.modulo,'operador-maquina');assert.equal(saved.datos.maquinas,3);
  await op.value(op.label('Número de máquinas'),6);assert.equal(op.ids['module-results'].textContent,'');
  assert.match(await op.calculate(),/50 piezas\/h/);await op.load(saved);assert.equal(op.label('Número de máquinas').value,'3');ok('Edición invalida resultados; JSON restaura el estudio');
  const recovered=await page('operador-maquina.js',op.storage);assert.equal(recovered.label('Número de máquinas').value,'3');ok('Borrador recuperado al volver a abrir');
  await op.load({...saved,modulo:'balanceo-lineas'});assert.match(op.ids.estado.textContent,/otro módulo/);assert.equal(op.label('Número de máquinas').value,'3');ok('Importación de otro módulo rechazada sin perder datos');
  await op.value(op.label('Número de máquinas'),0);await op.calculate();assert.match(op.ids.estado.textContent,/Revisa/);ok('Errores del servidor visibles');
  const offline=await page('operador-maquina.js',new Map(),'file:');await offline.calculate();assert.match(offline.ids.estado.textContent,/servidor local/);assert.equal(offline.requests.length,0);ok('Apertura por archivo explica cómo activar cálculos');

  const times=await page('registro-analisis.js');
  assert.equal(times.ids.calcular.disabled,false);
  assert.match(await times.calculate(),/0[.,]5559 min/);ok('Estudio de tiempos: tablas reales y cálculo estándar');
  const original=await times.save();
  await times.value(times.selectLabel('Unidad de captura'),'seg','change');
  assert.equal(times.label('lectura observación 1').value,'30');
  assert.match(await times.calculate(),/0[.,]5559 min/);ok('Conversión de unidades conserva el resultado');
  await times.value(times.label('Proceso mental / esfuerzo mental'),'bastante_complejo','change');
  assert.match(await times.calculate(),/0[.,]561 min/);ok('Suplemento visible coincide con el aplicado');
  await times.load(original);await times.calculate();
  await times.button('Enviar tiempos a Balanceo de líneas').click();
  const transfer=JSON.parse(times.storage.get('ingenieria.transferencia.balanceo'));
  assert(Math.abs(transfer.tareas[0].tiempo_min-.5559)<1e-10);
  const balance=await page('balanceo-lineas.js',times.storage);
  await balance.button('Cargar tiempos recibidos').click();
  assert.equal(balance.label('tiempo_min de tarea 1').value,String(transfer.tareas[0].tiempo_min));
  assert.match(await balance.calculate(),/100 %/);ok('Transferencia de tiempos estándar y balanceo sin redondeo');
  await times.value(times.selectLabel('Método de cronometraje'),'continuo','change');
  await times.calculate();assert.match(times.ids.estado.textContent,/deben aumentar/);ok('Lecturas continuas fuera de orden se rechazan');
  const line=await page('balanceo-lineas.js');assert.match(await line.calculate(),/82[.,]5 %/);
  await line.value(line.label('predecesoras de tarea 1'),'D');await line.calculate();assert.match(line.ids.estado.textContent,/ciclo/);ok('Balanceo: carga y rechazo de precedencias circulares');

  const sampling=await page('muestreo-trabajo.js');
  await sampling.value(sampling.label('Semilla opcional para repetir la agenda'),42);
  await sampling.button('Generar agenda').click();await tick();
  assert.match(sampling.ids.estado.textContent,/385 visitas/);
  assert.equal(sampling.label('Operadores, uno por línea').disabled,true);
  await sampling.value(sampling.label('Observación 1'),'C1','change');
  await sampling.value(sampling.label('Observación 2'),'__omitida__','change');
  const survey=await sampling.save();
  assert.equal(survey.datos.observaciones.length,385);assert.equal(survey.datos.observaciones[0].categoria,'C1');assert.equal(survey.datos.observaciones[1].omitida,true);
  assert.match(await sampling.calculate(),/100 %/);ok('Muestreo: agenda, captura, visitas omitidas y resumen');
  const survey2=await page('muestreo-trabajo.js');await survey2.load(survey);
  assert.equal(survey2.label('Observación 1').value,'C1');assert.equal(survey2.label('Observación 2').value,'__omitida__');ok('Muestreo: archivo conserva categorías y visitas omitidas');
  await survey2.calculate();await survey2.ids.imprimir.click();assert.equal(survey2.context.printed,true);ok('Impresión disponible tras calcular');
  const bad=structuredClone(survey);bad.datos.observaciones[0].categoria={invalid:true};await survey2.load(bad);assert.match(survey2.ids.estado.textContent,/no es válida/);ok('Muestreo: archivo mal formado no reemplaza registros');
  console.log(`${count} comprobaciones de interacción correctas (DOM simulado, API real).`);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={page,Element,tick};
