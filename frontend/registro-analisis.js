"use strict";
(() => {
    const U=Estudios;
    let opciones=null,page=0;
    const calificacion=()=>({habilidad:'D',esfuerzo:'D',condiciones:'D',consistencia:'D'});
    const initial={titulo:'Ejemplo de estudio de tiempos',unidad:'min',modo:'vuelta_cero',valoracion_modo:'westinghouse_elemento',valoracion_global:100,calificacion_global:calificacion(),suplemento_modo:'tabla',suplemento_pct:9,confianza:95.45,error_pct:5,lectura_inicial:0,tiempo_antes:0,tiempo_despues:0,tiempo_transcurrido:null,elementos:[{id:'E1',nombre:'Preparar pieza',calificacion:calificacion(),suplementos:{}}],observaciones:[0.5,0.55,0.48].map((lectura,i)=>({elemento_id:'E1',ciclo:i+1,lectura,valoracion:100,tipo:'normal',motivo:''}))};
    const validate=s=>{if(s.elementos.length>200||s.observaciones.length>5000)throw new Error('El estudio admite hasta 200 elementos y 5000 observaciones.');if(!s.elementos.every(x=>Object.values(x.suplementos).every(v=>typeof v==='string')))throw new Error('Suplementos inválidos.');};
    const c=U.init('estudio-tiempos',initial,render,validate);
    const set=(s,key,v)=>{s[key]=v;c.changed();};
    function west(codes,change){return U.grid(...Object.entries(opciones.westinghouse).map(([key,values])=>U.campo(key.charAt(0).toUpperCase()+key.slice(1),U.select(codes[key],Object.entries(values).map(([k,v])=>[k,v.etiqueta]),v=>{codes[key]=v;change();}))));}
    function render(c){
        const s=c.state;
        const number=(key,label,attrs={})=>U.campo(label,U.input(s[key],v=>set(s,key,v),{type:'number',step:'any',label,...attrs}));
        const method=U.grid(U.campo('Método de cronometraje',U.select(s.modo,[['vuelta_cero','Vuelta a cero (duraciones)'],['continuo','Continuo (lecturas acumuladas)']],v=>{set(s,'modo',v);c.render();})),
            U.campo('Unidad de captura',U.select(s.unidad,[['min','Minutos'],['seg','Segundos'],['centimin','Centésimas de minuto']],v=>{const f={min:1,seg:1/60,centimin:.01};const ratio=f[s.unidad]/f[v];for(const o of s.observaciones)if(o.lectura!==null)o.lectura=Number((o.lectura*ratio).toPrecision(12));for(const k of ['lectura_inicial','tiempo_antes','tiempo_despues','tiempo_transcurrido'])if(s[k]!==null)s[k]=Number((s[k]*ratio).toPrecision(12));set(s,'unidad',v);c.render();})),
            U.campo('Método de valoración',U.select(s.valoracion_modo,[['westinghouse_elemento','Westinghouse por elemento'],['westinghouse_global','Westinghouse global'],['porcentaje_global','Porcentaje global'],['porcentaje_observacion','Porcentaje por observación']],v=>{set(s,'valoracion_modo',v);c.render();})),
            U.campo('Suplementos',U.select(s.suplemento_modo,[['tabla','Tabla actual de suplementos'],['manual','Porcentaje manual sobre TN']],v=>{set(s,'suplemento_modo',v);c.render();})));
        const extras=[];
        if(s.modo==='continuo')extras.push(number('lectura_inicial','Lectura inicial del cronómetro',{min:0}));
        if(s.valoracion_modo==='porcentaje_global')extras.push(number('valoracion_global','Valoración global (%)',{min:.01,max:300}));
        if(s.suplemento_modo==='manual')extras.push(number('suplemento_pct','Suplementos sobre tiempo normal (%)',{min:0,max:100}));
        const config=U.panel('Configuración del estudio',method,U.grid(...extras),
            U.ayuda('En modo continuo, captura las lecturas en orden cronológico, también las excluidas. El cronómetro no se reinicia entre ciclos. La duración se obtiene por diferencia. Cambiar el método conserva los valores; cambiar la unidad los convierte.'),
            s.valoracion_modo==='westinghouse_global'&&opciones?west(s.calificacion_global,()=>c.changed()):null);
        const elements=s.elementos.map((el,i)=>{
            const details=[];
            if(opciones&&s.valoracion_modo==='westinghouse_elemento')details.push(U.node('h3',{text:'Westinghouse'}),west(el.calificacion,()=>c.changed()));
            if(opciones&&s.suplemento_modo==='tabla'){
                const constant=Object.values(opciones.suplementos.constantes).reduce((a,x)=>a+x.valor,0)*100;
                details.push(U.node('h3',{text:'Suplementos'}),U.ayuda(`Se suma ${U.fmt(constant,1)} % constante. Ajusta los suplementos variables que correspondan.`),U.grid(...Object.entries(opciones.suplementos.variables).map(([k,v])=>U.campo(v.etiqueta,U.select(el.suplementos[k]??'',[['','Sin suplemento adicional (0 %)'],...Object.entries(v.opciones).map(([a,b])=>[a,`${b.etiqueta} (${U.fmt(b.valor*100,1)} %)`])],x=>{if(x)el.suplementos[k]=x;else delete el.suplementos[k];c.changed();},v.etiqueta)))));
            }
            return U.node('article',{class:'panel'},[U.grid(U.campo('Identificador',U.node('span',{class:'etiqueta',text:el.id})),U.campo('Nombre del elemento',U.input(el.nombre,v=>{el.nombre=v;c.changed();},{label:'Nombre del elemento '+el.id}))),
                U.button('Eliminar elemento',()=>{if(!s.observaciones.some(o=>o.elemento_id===el.id)||confirm('También se eliminarán las observaciones de este elemento. ¿Continuar?')){s.elementos.splice(i,1);s.observaciones=s.observaciones.filter(o=>o.elemento_id!==el.id);c.changed();c.render();}},'peligro'),
                details.length?U.node('details',{},[U.node('summary',{text:'Valoración y suplementos del elemento'}),...details]):null]);
        });
        const perObs=s.valoracion_modo==='porcentaje_observacion';
        page=Math.max(0,Math.min(page,Math.ceil(s.observaciones.length/100)-1));
        const rows=s.observaciones.slice(page*100,page*100+100).map((o,j)=>{
            const i=j+page*100;
            const edit=(key,type='text',opts={})=>U.input(o[key],v=>{o[key]=v;c.changed();},{type,label:`${key} observación ${i+1}`,step:'any',...opts});
            const row=[i+1,edit('ciclo','number',{min:1,step:1}),U.select(o.elemento_id,s.elementos.map(x=>[x.id,`${x.id}: ${x.nombre}`]),v=>{o.elemento_id=v;c.changed();},`Elemento de observación ${i+1}`),edit('lectura','number',{min:0})];
            if(perObs)row.push(edit('valoracion','number',{min:.01,max:300}));
            row.push(U.select(o.tipo,[['normal','Normal'],['atipica','Atípica (excluir)'],['ajena','Ajena (excluir)']],v=>{o.tipo=v;c.changed();},`Tipo observación ${i+1}`),edit('motivo','text',{placeholder:'Motivo si se excluye'}),U.button('Quitar',()=>{s.observaciones.splice(i,1);c.changed();c.render();},'peligro'));
            return row;
        });
        const add=(all)=>{if(!s.elementos.length){c.message('Agrega un elemento primero.',true);return;}const ciclo=Math.max(0,...s.observaciones.map(x=>x.ciclo||0))+1;for(const el of (all?s.elementos:[s.elementos[0]]))s.observaciones.push({elemento_id:el.id,ciclo,lectura:null,valoracion:100,tipo:'normal',motivo:''});page=Math.floor((s.observaciones.length-1)/100);c.changed();c.render();};
        const observations=U.panel('Observaciones',U.ayuda(`Unidad: ${s.unidad}. Las marcas de exclusión conservan la lectura original y exigen un motivo. No se excluyen valores automáticamente.`),
            U.table(['#','Ciclo','Elemento',s.modo==='continuo'?'Lectura acumulada':'Duración',...(perObs?['Valoración (%)']:[]),'Tipo','Motivo',''],rows),
            U.actions(U.button('+ Observación',()=>add(false)),U.button('+ Ciclo completo',()=>add(true)),U.button('Página anterior',()=>{page=Math.max(0,page-1);c.render();}),U.node('span',{text:`Página ${page+1} · ${s.observaciones.length} observaciones`}),U.button('Página siguiente',()=>{page++;c.render();})));
        const control=U.panel('Precisión y control de tiempos',U.grid(number('confianza','Confianza para estimar lecturas (%)',{min:80,max:99.9}),number('error_pct','Error relativo permitido (%)',{min:.01,max:50}),number('tiempo_antes','Tiempo antes de las lecturas (unidad elegida)',{min:0}),number('tiempo_despues','Tiempo después de las lecturas (unidad elegida)',{min:0}),number('tiempo_transcurrido','Duración total del estudio (opcional)',{min:.000001})),U.ayuda('La duración total permite conciliar el tiempo registrado. Los tiempos ajenos y atípicos se contabilizan una sola vez en el control, pero no en el promedio normal. Los resultados se presentan en minutos.'));
        U.$('module-form').replaceChildren(config,U.node('h2',{text:'Elementos de la operación'}),...elements,U.button('+ Agregar elemento',()=>{let i=1;while(s.elementos.some(x=>x.id==='E'+i))i++;s.elementos.push({id:'E'+i,nombre:'',calificacion:calificacion(),suplementos:{}});c.changed();c.render();}),observations,control);
    }
    U.$('calcular').onclick=()=>{
        const {titulo,...payload}=c.state;
        c.run('/api/estudio-tiempos',payload,r=>{
            const x=r.control;
            U.$('module-results').replaceChildren(U.panel('Tiempo estándar',U.metrics([['Total por operación',U.fmt(r.total_estandar_min)+' min']]),
                U.table(['Elemento','Lecturas','TO (min)','Desv. (min)','Factor equivalente','TN (min)','Suplementos','TS (min)','N recomendado'],r.elementos.map(e=>[e.nombre,e.n,U.fmt(e.observado_min),U.fmt(e.desviacion_min),U.fmt(e.factor_equivalente),U.fmt(e.normal_min),U.fmt(e.suplementos_pct,1)+' %',U.fmt(e.estandar_min),e.n_recomendado===null?'Se requieren ≥ 2 lecturas':`${e.n_recomendado}${e.muestra_suficiente?'':' · faltan lecturas'}`])),
                U.ayuda('TS = TN × (1 + suplementos). Con valoración por observación se promedian los tiempos normales individuales; el factor equivalente es TN/TO.'),
                U.button('Enviar tiempos a Balanceo de líneas',()=>{const data={titulo:c.state.titulo,modo:'ciclo',ciclo_min:Math.max(...r.elementos.map(x=>x.estandar_min)),jornada_min:480,demanda:480,tareas:r.elementos.map(x=>({id:x.id,nombre:x.nombre,tiempo_min:x.estandar_min,predecesoras:[],incompatibles:[]}))};try{localStorage.setItem('ingenieria.transferencia.balanceo',JSON.stringify(data));c.save();location.href='balanceo-lineas.html';}catch{c.message('No se pudieron transferir los tiempos. Guarda el estudio antes de continuar.',true);}})),
                U.panel('Conciliación del tiempo registrado',U.table(['Concepto','Minutos'],[['Observaciones normales',U.fmt(x.normal_min)],['Observaciones atípicas',U.fmt(x.atipica_min)],['Elementos ajenos',U.fmt(x.ajena_min)],['Total registrado (incluye antes y después)',U.fmt(x.registrado_min)],['Duración total indicada',U.fmt(x.transcurrido_min)],['Registrado − duración indicada',U.fmt(x.diferencia_min)],['Diferencia relativa',x.error_pct===null?'—':U.fmt(x.error_pct,2)+' %']])));
        });
    };
    async function cargar(){
        U.$('calcular').disabled=true;
        try{if(location.protocol==='file:')throw new Error('Abre el estudio desde el servidor local para cargar las tablas y calcular.');const response=await fetch('/api/opciones');if(!response.ok)throw new Error('No se pudieron cargar las tablas.');opciones=await response.json();c.render();U.$('calcular').disabled=false;}
        catch(e){c.message(e.message,true);U.$('module-form').prepend(U.actions(U.button('Reintentar conexión',()=>cargar())));}
    }
    cargar();
})();
