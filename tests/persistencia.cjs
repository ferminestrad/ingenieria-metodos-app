/* Pruebas de persistencia y adaptadores; almacenamiento y ciclo de vida simulados. */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const {Element, tick, page} = require('./frontend-estudios.cjs');
const frontend = path.resolve(__dirname, '../frontend');

function app(module, storage = new Map(), failStorage = false) {
    const ids = {}, docEvents = {}, winEvents = {}, timers = new Set(), downloads = [];
    for (const id of ['guardar','cargar','nuevo','archivo-estudio','persistencia-estado']) ids[id] = new Element('div');
    const entries = {
        pareto: {filas:[{id:2,causa:'Rayado',frecuencia:''}],umbral:'75'},
        recorrido: {estaciones:[{id:3,nombre:'Área <A>',simbolo:'transporte',x:150,y:215}],escala:'2.5'},
        'diagrama-flujo': {tabActiva:'propuesto',color:'#123456',producto:'Producto A',ubicacion:'Norte',actividad:'Ensamble',fecha:'2026-11-09',operador:'A',analista:'B',tipo:'Máquina',maquina:'M1',comentarios:'Nota',
            actual:[{id:2,descripcion:'Cortar',simbolo:'operacion',tiempo:1.5,distancia:'',metodo:'Proteger'}],
            propuesto:[{id:3,descripcion:'Transportar',simbolo:'transporte',tiempo:'',distancia:2,metodo:''}]},
        ishikawa:{problema:'Defecto <X>',causas:{'mano-obra':['A',''],maquinaria:['B'],metodos:['C'],materiales:['D'],medicion:['E'],'medio-ambiente':['F']}}
    };
    const original = structuredClone(entries[module]);
    const body = new Element('body');
    function id(key,value='') { ids[key] = new Element('div');ids[key].value=value;return ids[key]; }
    const document = {body, visibilityState:'visible',getElementById:key=>ids[key]||null,createElement:tag=>new Element(tag),
        addEventListener:(e,f)=>(docEvents[e]??=[]).push(f),
        querySelectorAll:selector=>selector==='.tab-btn'?[]:ids[selector.split(' ')[0].slice(1)].children};
    const ctx = vm.createContext({document,window:{addEventListener:(e,f)=>(winEvents[e]??=[]).push(f)},
        localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(failStorage)throw new Error('QuotaExceeded');storage.set(k,v);}},
        structuredClone,queueMicrotask,Blob,confirm:()=>true,
        setTimeout:f=>{timers.add(f);return f;},clearTimeout:f=>timers.delete(f),
        URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test';},revokeObjectURL(){}},
        renderizarTabla(){},renderizarGrafico(){},renderizarLienzo(){},renderizarLista(){},renderizarResumen(){},generarDiagrama(){},
        contador:0,contadorFilas:0,arrastrando:null});
    if(module==='pareto'){id('grafico-pareto');id('umbral',original.umbral);ctx.filas=original.filas;}
    if(module==='recorrido'){id('lienzo');id('escala',original.escala);ctx.estaciones=original.estaciones;}
    if(module==='diagrama-flujo'){
        id('tabla-pasos-body');ctx.estado=original;
        for(const key of ['producto','ubicacion','actividad','fecha','operador','analista','tipo','maquina','comentarios','color'])id('meta-'+key,original[key]);
    }
    if(module==='ishikawa'){
        id('ishikawa');id('problema',original.problema);
        ctx.CATEGORIAS=Object.keys(original.causas).map(key=>({id:key,nombre:key}));
        for(const [key,values] of Object.entries(original.causas))id('inputs-'+key).append(...values.map(value=>{const e=new Element('input');e.value=value;return e;}));
    }
    for(const file of ['persistencia.js','persistencia-diagramas.js'])vm.runInContext(fs.readFileSync(path.join(frontend,file),'utf8'),ctx);
    const event=async(target,name)=>{for(const fn of (target==='window'?winEvents:docEvents)[name]||[])fn();await tick();};
    const flush=()=>{for(const fn of [...timers]){timers.delete(fn);fn();}};
    const snapshot=()=>JSON.parse(storage.get('ingenieria.estudio.v1.'+module));
    async function load(data,other=module){ids['archivo-estudio'].files=[{size:100,text:async()=>JSON.stringify({version:1,modulo:other,datos:data})}];await ids['archivo-estudio'].emit('change');}
    async function save(){await ids.guardar.click();return JSON.parse(await downloads.at(-1).text());}
    return {ctx,ids,storage,event,flush,snapshot,load,save,original};
}

async function main(){
    let tests=0;
    for(const module of ['ishikawa','pareto','diagrama-flujo','recorrido']) {
        const a=app(module);
        const file=await a.save();assert.equal(file.modulo,module);assert.equal(file.version,1);
        const b=app(module,a.storage);assert.match(b.ids['persistencia-estado'].textContent,/recuperado/);
        assert.deepEqual((await b.save()).datos,file.datos);
        if(module==='ishikawa')assert.equal(b.ids['inputs-mano-obra'].children[1].value,'');
        if(module==='diagrama-flujo')assert.equal(b.ids['meta-tipo'].value,'Máquina');
        if(module==='recorrido')assert.equal(b.ctx.estaciones[0].x,150);
        const empty=app(module);await empty.load(file.datos);assert.deepEqual((await empty.save()).datos,file.datos);
        const before=JSON.stringify(empty.snapshot());
        await empty.load({invalid:true});assert.match(empty.ids['persistencia-estado'].textContent,/inválidos/);assert.equal(JSON.stringify(empty.snapshot()),before);
        await empty.load(file.datos,'otro');assert.match(empty.ids['persistencia-estado'].textContent,/otro módulo/);assert.equal(JSON.stringify(empty.snapshot()),before);
        tests++;console.log('OK archivo, recarga, estructura completa y rechazo seguro: '+module);
    }
    const a=app('pareto');a.ctx.filas[0].frecuencia='25';await a.event('document','input');
    assert.equal(a.storage.size,0);await a.event('window','pagehide');assert.equal(a.snapshot().filas[0].frecuencia,'25');
    tests++;console.log('OK navegación antes de terminar el guardado diferido');
    a.ctx.filas[0].frecuencia='';await a.event('document','input');a.flush();assert.equal(a.snapshot().filas[0].frecuencia,'');
    tests++;console.log('OK campo incompleto preservado en el borrador');
    a.ctx.filas.push({id:4,causa:'Nueva',frecuencia:7});await a.event('document','click');a.flush();assert.equal(a.snapshot().filas.length,2);
    tests++;console.log('OK filas agregadas con botones se guardan automáticamente');
    const b=app('recorrido');b.ctx.estaciones[0].x=450;await b.event('document','pointerup');b.flush();assert.equal(b.snapshot().estaciones[0].x,450);
    tests++;console.log('OK posiciones del recorrido conservadas');
    const c=app('diagrama-flujo');c.ctx.estado.comentarios='Cambio reciente';c.ctx.document.visibilityState='hidden';await c.event('document','visibilitychange');assert.equal(c.snapshot().comentarios,'Cambio reciente');
    tests++;console.log('OK guardado al dejar la pestaña');
    const corrupt=new Map([['ingenieria.estudio.v1.pareto','{no-json']]);const d=app('pareto',corrupt);await d.event('window','pagehide');assert.equal(corrupt.values().next().value,'{no-json');
    tests++;console.log('OK un borrador ilegible no se sobrescribe sin cambios');
    const quota=app('pareto',new Map(),true);const backup=await quota.save();assert.equal(backup.modulo,'pareto');assert.match(quota.ids['persistencia-estado'].textContent,/No se pudo guardar/);
    tests++;console.log('OK descarga disponible aunque falle el almacenamiento local');

    const legacy={titulo:'Estudio anterior',maquinas:4,servicio_min:2,automatico_min:8,traslado_min:.5};
    const h=await page('operador-maquina.js',new Map([['ingenieria.estudio.v1.operador-maquina',JSON.stringify(legacy)]]));
    assert.equal(h.label('Número de máquinas').value,'4');assert.equal(h.label('Carga y descarga L (min)').value,'2');
    const saved=await h.save();assert.equal(saved.datos.modelo,'sincronico');assert(saved.datos.aleatorio);assert(saved.datos.complejo);
    await h.button('Servicio aleatorio').click();assert.match(await h.calculate(),/155[.,]04 piezas\/h/);
    await h.button('Relaciones complejas').click();assert.match(await h.calculate(),/34[.,]7662 min/);
    await h.load({version:1,modulo:'operador-maquina',datos:legacy});assert.equal(h.label('Número de máquinas').value,'4');
    tests++;console.log('OK migración de borrador y archivo anteriores; tres herramientas operativas');
    console.log(tests+' pruebas de persistencia correctas.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
