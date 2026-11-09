"use strict";
(() => {
    const U=Estudios;
    const dateText=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const today=new Date(),end=new Date(today);end.setDate(end.getDate()+6);
    const initial={titulo:'',plan:{inicio:dateText(today),fin:dateText(end),dias_semana:[0,1,2,3,4],jornada_inicio:'08:00',jornada_fin:'17:00',descansos:[{inicio:'12:00',fin:'12:30'}],probabilidad:.5,confianza:95,error_pp:5,cantidad:null,semilla:null},operadores:['Operador 1'],categorias:[{id:'C1',nombre:'Trabajo productivo',productiva:true},{id:'C2',nombre:'Espera',productiva:false},{id:'C3',nombre:'Otras actividades',productiva:false}],observaciones:[],agenda_parametros:'',n_requerido_generado:null};
    const validate=s=>{
        if(s.operadores.length>12||s.categorias.length>20||s.observaciones.length>60000)throw new Error('El archivo supera el tamaño admitido para este estudio.');
        for(const o of s.observaciones){if(!o||typeof o!=='object'||typeof o.momento!=='string'||typeof o.operador!=='string'||typeof o.nota!=='string'||typeof o.omitida!=='boolean'||(o.categoria!==null&&typeof o.categoria!=='string'))throw new Error('Una observación del archivo no es válida.');}
    };
    let page=0,filter='todos',filterOperator='',generating=false;
    const c=U.init('muestreo-trabajo',initial,render,validate);
    async function generate(){
        const s=c.state;
        if(generating)return;
        if(!s.operadores.length||new Set(s.operadores).size!==s.operadores.length||s.operadores.some(x=>!x.trim())||s.operadores.length>12){c.message('Escribe entre 1 y 12 operadores, sin nombres repetidos.',true);return;}
        if(s.observaciones.length&&!confirm('La nueva agenda reemplazará todas las visitas y sus registros actuales. ¿Continuar?'))return;
        const snapshot=JSON.stringify(s);
        generating=true;c.render();U.$('calcular').disabled=true;c.message('Generando agenda…');
        try{
            const r=await U.api('/api/muestreo/plan',s.plan);
            if(snapshot!==JSON.stringify(c.state)){c.message('La configuración cambió; genera de nuevo la agenda.');return;}
            s.observaciones=r.agenda.flatMap(momento=>s.operadores.map(operador=>({momento,operador,categoria:null,omitida:false,nota:''})));
            s.agenda_parametros=JSON.stringify(s.plan);s.n_requerido_generado=r.n_requerido;page=0;
            c.changed();c.save();c.render();c.message(`Agenda generada: ${r.visitas} visitas por operador. Referencia de planificación: ${r.n_requerido} observaciones por operador.`);
        }catch(e){c.message(e.message,true);}finally{generating=false;c.render();U.$('calcular').disabled=false;}
    }
    function render(c){
        const s=c.state,p=s.plan;
        const update=(key,value)=>{p[key]=value;c.changed();};
        const number=(key,label,opts={})=>U.campo(label,U.input(p[key],v=>update(key,v),{type:'number',step:'any',label,...opts}));
        const days=U.actions(...['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((day,i)=>{
            const box=U.node('input',{type:'checkbox'});box.checked=p.dias_semana.includes(i);box.onchange=()=>{p.dias_semana=box.checked?[...p.dias_semana,i].sort():p.dias_semana.filter(x=>x!==i);c.changed();};return U.node('label',{},[box,' '+day]);
        }));
        const opInput=U.input(s.operadores.join('\n'),v=>{s.operadores=v.split('\n').map(x=>x.trim()).filter(Boolean);c.changed();},{type:'textarea',label:'Operadores, uno por línea'});opInput.disabled=!!s.observaciones.length;
        const auto=U.node('input',{type:'checkbox'});auto.checked=p.cantidad===null;auto.onchange=()=>{p.cantidad=auto.checked?null:50;c.changed();c.render();};
        const settings=U.panel('Diseño del muestreo',
            U.grid(U.campo('Inicio del periodo',U.input(p.inicio,v=>update('inicio',v),{type:'date',label:'Inicio del periodo'})),U.campo('Fin del periodo',U.input(p.fin,v=>update('fin',v),{type:'date',label:'Fin del periodo'})),U.campo('Inicio de jornada',U.input(p.jornada_inicio,v=>update('jornada_inicio',v),{type:'time',label:'Inicio de jornada'})),U.campo('Fin de jornada',U.input(p.jornada_fin,v=>update('jornada_fin',v),{type:'time',label:'Fin de jornada'}))),days,
            U.grid(U.campo('Descansos: uno por línea, HH:MM-HH:MM',U.input(p.descansos.map(x=>`${x.inicio}-${x.fin}`).join('\n'),v=>{p.descansos=v.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const a=x.split('-');return {inicio:a[0]?.trim()||'',fin:a[1]?.trim()||''};});c.changed();},{type:'textarea',label:'Descansos',placeholder:'12:00-12:30'})),U.campo('Operadores: uno por línea',opInput)),
            U.ayuda('Las fechas y días elegidos corresponden al inicio de cada jornada. Si la hora final es anterior a la inicial, el turno termina al día siguiente. Las visitas se programan en minutos distintos, fuera de los descansos.'),
            U.grid(number('probabilidad','Proporción esperada de la actividad (0–1)',{min:.000001,max:.999999,step:.01}),number('confianza','Nivel de confianza (%)',{min:80,max:99.9}),number('error_pp','Error absoluto (puntos porcentuales)',{min:.01,max:50}),number('semilla','Semilla opcional para repetir la agenda',{min:0,step:1})),
            U.ayuda('Usa 0.5 cuando no tengas una estimación previa. El número requerido se refiere a cada operador; observar a varios a la vez no multiplica la muestra individual.'),
            U.node('label',{},[auto,' Usar el número de visitas calculado']),p.cantidad!==null?U.grid(number('cantidad','Visitas por operador para esta agenda',{min:1,max:5000,step:1})):null,
            U.ayuda('Puedes planificar menos visitas para un estudio piloto; el resumen mostrará las registradas frente a la referencia. Máximo: 5000 visitas por agenda y 91 días. Generar otra agenda reemplaza la anterior; guarda su archivo si deseas conservarla.'));
        const cats=s.categorias.map((cat,i)=>{
            const productive=U.node('input',{type:'checkbox','aria-label':'Productiva: '+cat.nombre});productive.checked=cat.productiva;productive.onchange=()=>{cat.productiva=productive.checked;c.changed();};
            return [cat.id,U.input(cat.nombre,v=>{cat.nombre=v;c.changed();},{label:'Nombre categoría '+cat.id}),productive,U.button('Eliminar',()=>{if(s.observaciones.some(x=>x.categoria===cat.id)){c.message('Reclasifica las observaciones de esta categoría antes de eliminarla.',true);return;}s.categorias.splice(i,1);c.changed();c.render();},'peligro')];
        });
        const create=U.button(generating?'Generando…':'Generar agenda',generate,'principal');create.disabled=generating;
        const sections=[settings,U.panel('Categorías de observación',U.ayuda('Registra una sola categoría por operador y visita. Marca las categorías que deben sumarse como trabajo productivo.'),U.table(['Clave','Categoría','Productiva',''],cats),U.actions(U.button('+ Categoría',()=>{let n=1;while(s.categorias.some(x=>x.id==='C'+n))n++;s.categorias.push({id:'C'+n,nombre:'',productiva:false});c.changed();c.render();}),create))];
        if(s.observaciones.length){
            const indices=s.observaciones.map((x,i)=>i).filter(i=>(!filterOperator||s.observaciones[i].operador===filterOperator)&&(filter==='todos'||(!s.observaciones[i].omitida&&s.observaciones[i].categoria===null)));
            page=Math.max(0,Math.min(page,Math.ceil(indices.length/50)-1));
            const rows=indices.slice(page*50,page*50+50).map(i=>{
                const o=s.observaciones[i];return[U.node('span',{class:'fecha-control',text:o.momento.replace('T',' ')}),o.operador,U.select(o.omitida?'__omitida__':(o.categoria||''),[['','Pendiente'],['__omitida__','Visita omitida'],...s.categorias.map(x=>[x.id,x.nombre])],v=>{o.omitida=v==='__omitida__';o.categoria=v&&v!=='__omitida__'?v:null;c.changed();c.render();},`Observación ${i+1}`),U.input(o.nota,v=>{o.nota=v;c.changed();},{label:`Nota de visita ${i+1}`,placeholder:'Nota opcional'})];
            });
            const count=s.observaciones.filter(x=>x.categoria&&!x.omitida).length;
            sections.push(U.panel('Agenda y captura',U.ayuda(`${count} registros capturados de ${s.observaciones.length} oportunidades (todos los operadores). Se conservan las horas de la agenda generada; cambiar la configuración no mueve visitas existentes.`),
                U.actions(U.select(filter,[['todos','Todas las visitas'],['pendientes','Solo pendientes']],v=>{filter=v;page=0;c.render();},'Filtrar visitas'),U.select(filterOperator,[['','Todos los operadores'],...s.operadores.map(x=>[x,x])],v=>{filterOperator=v;page=0;c.render();},'Filtrar operador')),
                U.table(['Fecha y hora local','Operador','Estado observado','Nota'],rows),
                U.actions(U.button('Anterior',()=>{page=Math.max(0,page-1);c.render();}),U.node('span',{text:`Página ${page+1} de ${Math.max(1,Math.ceil(indices.length/50))}`}),U.button('Siguiente',()=>{page++;c.render();}),U.button('Borrar agenda',()=>{if(confirm('¿Borrar todas las visitas y registros? Podrás editar los operadores y generar otra agenda.')){s.observaciones=[];s.agenda_parametros='';s.n_requerido_generado=null;page=0;filterOperator='';c.changed();c.render();}},'peligro'))));
        }
        U.$('module-form').replaceChildren(...sections);
    }
    U.$('calcular').onclick=()=>{
        const s=c.state;
        const payload={operadores:s.operadores,categorias:s.categorias,observaciones:s.observaciones,confianza:s.plan.confianza,probabilidad:s.plan.probabilidad,error_pp:s.plan.error_pp};
        c.run('/api/muestreo/resumen',payload,r=>{
            const interval=x=>x?`${U.fmt(x[0],2)}–${U.fmt(x[1],2)} %`:'—';
            U.$('module-results').replaceChildren(U.panel('Resultados por operador',
                U.ayuda(`Referencia de planificación: ${r.n_requerido} registros por operador, con ${s.plan.confianza} % de confianza y ±${s.plan.error_pp} puntos porcentuales. Las visitas pendientes y omitidas se excluyen del denominador.`),
                U.table(['Operador','Registradas / referencia','Pendientes','Omitidas','Productivo','Intervalo de productividad'],r.operadores.map(o=>[o.nombre,`${o.registradas} / ${r.n_requerido}`,o.pendientes,o.omitidas,o.productividad_pct===null?'—':U.fmt(o.productividad_pct,2)+' %',interval(o.intervalo_productividad)])),
                U.ayuda('Los intervalos Wilson se calculan por operador y suponen observaciones representativas e independientes. La planificación aproxima el tamaño de muestra; no garantiza la precisión obtenida.')),
                ...r.operadores.map(o=>U.panel(o.nombre,U.table(['Categoría','Conteo','Porcentaje','Intervalo de confianza'],o.categorias.map(x=>[x.nombre,x.n,x.porcentaje===null?'—':U.fmt(x.porcentaje,2)+' %',interval(x.intervalo)])))));
        });
    };
})();
