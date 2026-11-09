"use strict";
(() => {
    const U=Estudios;
    const initial={titulo:'',modo:'ciclo',ciclo_min:2,jornada_min:480,demanda:240,tareas:[{id:'A',nombre:'Preparar pieza',tiempo_min:0.8,predecesoras:[],incompatibles:[]},{id:'B',nombre:'Ensamblar',tiempo_min:1.2,predecesoras:['A'],incompatibles:[]},{id:'C',nombre:'Inspeccionar',tiempo_min:0.6,predecesoras:['B'],incompatibles:[]},{id:'D',nombre:'Empacar',tiempo_min:0.7,predecesoras:['C'],incompatibles:[]}]};
    const validate=s=>{if(s.tareas.length>200)throw new Error('Máximo 200 tareas por estudio.');for(const t of s.tareas)for(const k of ['predecesoras','incompatibles'])if(!t[k].every(x=>typeof x==='string'))throw new Error('Las referencias de tareas deben ser identificadores.');};
    const c=U.init('balanceo-lineas',initial,render,validate);
    let recibidos=null;
    try{const x=JSON.parse(localStorage.getItem('ingenieria.transferencia.balanceo'));if(x){U.shape(x,initial);validate(x);recibidos=x;}}catch{}
    if(recibidos)U.$('servidor-aviso').append(U.node('div',{class:'aviso'},['Hay tiempos estándar enviados desde el estudio de tiempos. ',U.button('Cargar tiempos recibidos',()=>{if(confirm('¿Reemplazar las tareas actuales por los tiempos recibidos?')){c.replace(recibidos);localStorage.removeItem('ingenieria.transferencia.balanceo');recibidos=null;U.$('servidor-aviso').replaceChildren();}})]));
    function render(c){
        const s=c.state;
        const update=(key,v)=>{s[key]=v;c.changed();};
        const controls=U.grid(U.campo('Definir ciclo mediante',U.select(s.modo,[['ciclo','Tiempo de ciclo'],['demanda','Demanda por jornada']],v=>{update('modo',v);c.render();})),
            U.campo('Tiempo disponible por jornada (min)',U.input(s.jornada_min,v=>update('jornada_min',v),{type:'number',min:.000001,label:'Minutos por jornada'})),
            s.modo==='ciclo'?U.campo('Ciclo objetivo (min/pieza)',U.input(s.ciclo_min,v=>update('ciclo_min',v),{type:'number',min:.000001,step:.01,label:'Ciclo objetivo'})):U.campo('Demanda de piezas por jornada',U.input(s.demanda,v=>update('demanda',v),{type:'number',min:1,step:1,label:'Demanda'})));
        const rows=s.tareas.map((t,i)=>{
            const edit=(key,type='text')=>U.input(t[key],v=>{t[key]=v;c.changed();},{type,step:.01,min:0.000001,label:`${key} de tarea ${i+1}`});
            const refs=key=>U.input(t[key].join(', '),v=>{t[key]=v.split(',').map(x=>x.trim()).filter(Boolean);c.changed();},{label:`${key} de tarea ${i+1}`,placeholder:'Ej. A, B'});
            return [edit('id'),edit('nombre'),edit('tiempo_min','number'),refs('predecesoras'),refs('incompatibles'),U.button('Eliminar',()=>{s.tareas.splice(i,1);c.changed();c.render();},'peligro')];
        });
        U.$('module-form').replaceChildren(U.panel('Producción y ciclo',controls),U.panel('Tareas y secuencia',
            U.ayuda('Identifica cada tarea con una clave única. En precedencias escribe las tareas que deben terminar antes. En incompatibles indica las que no pueden compartir estación, separadas por comas.'),
            U.table(['Clave','Tarea','Tiempo (min)','Predecesoras','Incompatibles',''],rows),
            U.button('+ Agregar tarea',()=>{let k=1;while(s.tareas.some(t=>t.id==='T'+k))k++;s.tareas.push({id:'T'+k,nombre:'',tiempo_min:1,predecesoras:[],incompatibles:[]});c.changed();c.render();}),
            U.ayuda('La asignación usa pesos posicionales: tiempo de cada tarea más el de sus sucesoras, sin contarlas dos veces. Es una propuesta heurística; el mínimo teórico no siempre es alcanzable.')));
    }
    U.$('calcular').onclick=()=>{
        const {titulo,...data}=c.state;
        c.run('/api/balanceo-lineas',data,r=>{
            const names=new Map(data.tareas.map(x=>[x.id,x.nombre]));
            U.$('module-results').replaceChildren(U.panel('Propuesta de balanceo',
                U.metrics([['Estaciones propuestas',r.estaciones.length],['Mínimo teórico',r.minimo_teorico],['Eficiencia',U.fmt(r.eficiencia_pct,1)+' %'],['Retraso de balance',U.fmt(r.retraso_pct,1)+' %']]),
                U.ayuda(`Ciclo disponible: ${U.fmt(r.ciclo_min)} min/pieza. Producción objetivo: ${r.produccion_objetivo} piezas por jornada.`),
                U.barras(r.estaciones,r.ciclo_min),
                U.table(['Estación','Tareas en orden','Carga (min)','Ocio (min)'],r.estaciones.map(x=>[x.numero,x.tareas.map(id=>`${id}: ${names.get(id)}`).join(' → '),U.fmt(x.carga_min),U.fmt(x.ocio_min)]))),
                U.panel('Pesos utilizados',U.table(['Tarea','Peso posicional (min)'],Object.entries(r.pesos).sort((a,b)=>b[1]-a[1]).map(([id,v])=>[`${id}: ${names.get(id)}`,U.fmt(v)]))));
        });
    };
})();
