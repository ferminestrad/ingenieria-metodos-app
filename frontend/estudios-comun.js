"use strict";
const Estudios = (() => {
    const $ = id => document.getElementById(id);
    const node = (tag, attrs={}, children=[]) => {
        const e=document.createElement(tag);
        Object.entries(attrs).forEach(([k,v])=>{if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!==undefined&&v!==null)e.setAttribute(k,v);});
        for(const c of children.flat())if(c!==null&&c!==undefined)e.append(c instanceof Node?c:document.createTextNode(String(c)));
        return e;
    };
    const num = x => x.value.trim()===''?null:Number(x.value);
    function input(value,fn,opts={}) {
        const e=node(opts.type==='textarea'?'textarea':'input',{type:opts.type||'text','aria-label':opts.label||'Valor',...opts});
        e.value=value??'';
        e.addEventListener('input',()=>fn(opts.type==='number'?num(e):e.value));
        return e;
    }
    function select(value,choices,fn,label='Opción') {
        const e=node('select',{'aria-label':label},choices.map(([v,t])=>node('option',{value:v,text:t})));
        e.value=value;e.addEventListener('change',()=>fn(e.value));return e;
    }
    const campo=(label,control)=>node('label',{class:'campo'},[node('span',{text:label}),control]);
    const grid=(...children)=>node('div',{class:'fields'},children);
    const actions=(...children)=>node('div',{class:'acciones'},children);
    const button=(label,fn,kind='')=>node('button',{type:'button',class:'btn '+kind,text:label,onclick:fn});
    const ayuda=text=>node('p',{class:'ayuda',text});
    const panel=(title,...children)=>node('section',{class:'panel'},[node('h2',{text:title}),...children]);
    function table(headers,rows) {
        return node('div',{class:'tabla-scroll'},[node('table',{class:'tabla-estudio'},[
            node('thead',{},[node('tr',{},headers.map(t=>node('th',{scope:'col',text:t})))]),
            node('tbody',{},rows.map(row=>node('tr',{},row.map(c=>node('td',{},[c??'—'])))))])]);
    }
    const fmt=(x,d=4)=>x===null||x===undefined?'—':Number(x).toLocaleString('es-MX',{maximumFractionDigits:d});
    const metrics=items=>node('div',{class:'metricas'},items.map(([label,value])=>node('div',{class:'metrica'},[node('span',{text:label}),node('strong',{text:value})])));
    function svg(tag,attrs={},text) {const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
    const palette={servicio:'#30343b',automatico:'#77828e',traslado:'#aaa',espera:'#e6e6e6'};
    function timeline(rows,total,segments) {
        const g=svg('svg',{viewBox:`0 0 1050 ${rows.length*48+72}`,role:'img','aria-label':'Cronograma de ocupación por recurso'});
        for(let k=0;k<=5;k++){const x=170+840*k/5;g.append(svg('line',{x1:x,y1:16,x2:x,y2:rows.length*48+35,stroke:'#ddd'}),svg('text',{x,y:rows.length*48+57,'font-size':12,'text-anchor':'middle','font-family':'Arial'},fmt(total*k/5,2)));}
        rows.forEach((r,i)=>{g.append(svg('text',{x:10,y:i*48+40,'font-size':14,'font-family':'Arial'},r));for(const s of segments.filter(s=>s.recurso===r)){const rect=svg('rect',{x:170+s.inicio/total*840,y:20+i*48,width:Math.max(.1,(s.fin-s.inicio)/total*840),height:28,fill:palette[s.estado]||'#555',stroke:'white','stroke-width':1});rect.append(svg('title',{},`${r}: ${s.detalle}; ${fmt(s.inicio)}–${fmt(s.fin)} min`));g.append(rect);}});
        return node('div',{class:'grafico'},[g]);
    }
    function barras(estaciones,ciclo){
        const g=svg('svg',{viewBox:`0 0 1050 ${estaciones.length*54+64}`,role:'img','aria-label':'Carga y ocio por estación'});
        estaciones.forEach((s,i)=>{g.append(svg('text',{x:10,y:i*54+40,'font-size':14,'font-family':'Arial'},`Estación ${s.numero}`),svg('rect',{x:155,y:i*54+20,width:700,height:27,fill:'#eee'}),svg('rect',{x:155,y:i*54+20,width:700*s.carga_min/ciclo,height:27,fill:'#333'}),svg('text',{x:870,y:i*54+39,'font-size':13,'font-family':'Arial'},`${fmt(s.carga_min,3)} / ${fmt(ciclo,3)} min`));});
        return node('div',{class:'grafico'},[g]);
    }
    async function api(path,data){
        if(location.protocol==='file:')throw new Error('Para calcular, abre esta página desde el servidor local de la aplicación.');
        const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        const body=await r.json();
        if(!r.ok){
            const fields=Array.isArray(body.detail)?[...new Set(body.detail.slice(0,3).map(x=>(x.loc||[]).filter(k=>k!=='body').map(k=>typeof k==='number'?`fila ${k+1}`:String(k).replaceAll('_',' ')).join(' → ')))].join('; '):'';
            throw new Error(typeof body.detail==='string'?body.detail:`Revisa ${fields||'los valores numéricos y campos obligatorios'}. Comprueba que estén completos y dentro de los límites indicados.`);
        }
        return body;
    }
    const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
    function shape(x,reference,path='datos') {
        if(reference===null){if(x!==null&&(typeof x!=='number'||!Number.isFinite(x)))throw new Error(`Valor inválido en ${path}.`);return;}
        if(Array.isArray(reference)){if(!Array.isArray(x)||x.length>60000)throw new Error(`Lista inválida en ${path}.`);if(reference.length)for(const y of x)shape(y,reference[0],path);return;}
        if(object(reference)){if(!object(x))throw new Error(`Estructura inválida en ${path}.`);for(const k of Object.keys(reference)){if(!(k in x))throw new Error(`Falta ${k} en el archivo.`);shape(x[k],reference[k],path+'.'+k);}return;}
        if(typeof reference==='number'){if(x!==null&&(typeof x!=='number'||!Number.isFinite(x)))throw new Error(`Número inválido en ${path}.`);}
        else if(typeof x!==typeof reference||(typeof x==='string'&&x.length>10000))throw new Error(`Valor inválido en ${path}.`);
    }
    function init(module,initial,render,validate=()=>{},migrate=x=>x){
        const c={state:structuredClone(initial),result:null};
        c.message=(text,error=false)=>{$('estado').textContent=text;$('estado').classList.toggle('error',error);};
        c.render=()=>{$('study-title').value=c.state.titulo;render(c);};
        const invalidar=()=>{c.result=null;$('module-results').replaceChildren();};
        const persistence=Persistencia.iniciar({
            modulo:module,inicial:initial,leer:()=>c.state,migrar:migrate,
            validar:next=>{shape(next,initial);validate(next);},
            aplicar:(next,inicio)=>{c.state=structuredClone(next);invalidar();if(!inicio)c.render();},
            mensaje:c.message
        });
        c.save=()=>persistence.guardar(true);
        c.changed=()=>{invalidar();persistence.cambiado();c.message('Vuelve a calcular los resultados.');};
        c.replace=next=>persistence.reemplazar(next);
        c.run=async(path,payload,show)=>{
            const snapshot=JSON.stringify(c.state),b=$('calcular');
            b.disabled=true;c.message('Calculando…');
            try{
                const result=await api(path,payload);
                if(snapshot!==JSON.stringify(c.state)){c.message('Los datos cambiaron durante el cálculo. Calcula de nuevo.');return;}
                c.result=result;show(result);
                if(c.state.titulo)$('module-results').prepend(node('h2',{text:c.state.titulo}));
                c.message('Resultados actualizados.');
            }catch(e){c.message(e.message,true);}finally{b.disabled=false;}
        };
        $('study-title').addEventListener('input',e=>{c.state.titulo=e.target.value;c.changed();});
        $('imprimir').onclick=()=>{if(!c.result){c.message('Calcula los resultados antes de imprimir.',true);return;}window.print();};
        c.render();
        if(location.protocol==='file:')$('servidor-aviso').append(node('p',{class:'aviso'},['Los cálculos necesitan el servidor de la aplicación. ',node('a',{href:'http://127.0.0.1:8000/'+location.pathname.split('/').pop(),text:'Abrir en el servidor local'})]));
        return c;
    }
    return {$,node,num,input,select,campo,grid,actions,button,ayuda,panel,table,fmt,metrics,svg,timeline,barras,palette,api,shape,init};
})();
