'use strict';
document.documentElement.classList.add('js');
const toggle=document.querySelector('.menu-toggle');
const menu=document.querySelector('#menu');
const closeMenu=()=>{menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');};
toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';menu.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle?.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}});
const catalog=document.querySelector('[data-catalog]');
if(catalog){
  const form=catalog.querySelector('form');
  const items=[...catalog.querySelectorAll('[data-item]')];
  const count=catalog.querySelector('[data-count]');
  const empty=catalog.querySelector('[data-empty]');
  const more=catalog.querySelector('[data-more]');
  const fields=[...form.querySelectorAll('input,select')];
  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
  const MAX_QUERY_LENGTH=300;
  // The catalog is static: normalize its text once, not for every input word.
  const searchIndex=new Map(items.map(item=>[item,normalize(item.dataset.search)]));
  let shown=24;
  const syncFromURL=()=>{
    const params=new URLSearchParams(location.search);
    for(const field of fields){
      const value=params.get(field.name)||'';
      field.value=field.name==='q'?value.slice(0,MAX_QUERY_LENGTH):value;
    }
  };
  const apply=(updateURL=true)=>{
    // maxlength is not enforced for URL values or programmatic assignments.
    form.elements.q.value=form.elements.q.value.slice(0,MAX_QUERY_LENGTH);
    const query=[...new Set(normalize(form.elements.q.value).split(/\s+/).filter(Boolean))];
    const filters=fields.filter(f=>f.name!=='q'&&f.value);
    const hits=items.filter(item=>query.every(word=>searchIndex.get(item).includes(word))&&filters.every(field=>{
      const value=item.dataset[field.name];
      return ['tema','autor'].includes(field.name)?JSON.parse(value||'[]').includes(field.value):value===field.value;
    }));
    const visible=new Set(hits.slice(0,shown));
    for(const item of items)item.hidden=!visible.has(item);
    count.textContent=hits.length===1?'1 publicação encontrada':`${hits.length} publicações encontradas`;
    empty.hidden=hits.length>0;
    more.hidden=hits.length<=shown;
    if(updateURL){const url=new URL(location.href);url.search='';for(const field of fields)if(field.value)url.searchParams.set(field.name,field.value);history.replaceState(null,'',url);}
  };
  form.addEventListener('submit',event=>{event.preventDefault();shown=24;apply();});
  form.addEventListener('input',()=>{shown=24;apply();});
  form.addEventListener('change',()=>{shown=24;apply();});
  form.addEventListener('reset',event=>{event.preventDefault();for(const field of fields)field.value='';shown=24;apply();form.elements.q.focus();});
  more.addEventListener('click',()=>{shown+=24;apply(false);});
  window.addEventListener('popstate',()=>{shown=24;syncFromURL();apply(false);});
  syncFromURL();apply(false);
}
