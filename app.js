const lessons = [...document.querySelectorAll('.tutorial-item')];
lessons.forEach(item => item.querySelector('button').addEventListener('click', () => {
  lessons.forEach(lesson => {
    const open = lesson === item;
    lesson.classList.toggle('is-open', open);
    lesson.querySelector('button').setAttribute('aria-expanded', String(open));
    lesson.querySelector('.tutorial-content').inert = !open;
  });
}));
const carousel = document.querySelector('.carousel');
const track = carousel.querySelector('.carousel-track');
const originals = [...track.children];
for(let run=0;run<2;run++) originals.forEach(card=>track.append(card.cloneNode(true)));
const cards=[...track.children];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let position=0,target=0,frame=0,dragging=false,lastX=0,snapTimer=0,dragDistance=0,pressedCard=null;
const stride=()=>originals[0].offsetWidth+24;
const cycle=()=>originals.length*stride();
const modulo=(n,m)=>((n%m)+m)%m;
function render(){
  const step=stride(),loop=cycle();
  // Normalize the animation coordinates, never the browser's native scroll position.
  const shift=Math.floor(position/loop)*loop;
  position-=shift;target-=shift;
  track.style.transform=`translate3d(${-loop-position-originals[0].offsetWidth/2}px,0,0)`;
  const active=originals.length+Math.round(position/step);
  cards.forEach((card,i)=>{
    card.classList.toggle('is-active',i===active);
    if(i!==active&&card.querySelector('.instagram-content')){
      const stage=card.querySelector('.instagram-stage');stage.replaceChildren();
      const button=document.createElement('button');button.type='button';button.className='load-instagram';button.textContent='Carica Instagram';
      const note=document.createElement('p');note.textContent='Il contenuto viene caricato da Meta.';
      const link=document.createElement('a');link.href=`https://www.instagram.com/reel/${card.dataset.instagram}/`;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Apri il Reel ↗';
      stage.append(button,note,link);
    }
  });
}
function animate(){
  frame=0;
  position+=reduced.matches ? target-position : (target-position)*.16;
  if(Math.abs(target-position)<.1)position=target;
  render();
  if(position!==target)frame=requestAnimationFrame(animate);
}
function snapToCard(){
  clearTimeout(snapTimer);
  target=Math.round(target/stride())*stride();
  if(!frame)frame=requestAnimationFrame(animate);
}
function move(delta){
  clearTimeout(snapTimer);
  target+=delta;
  if(!frame)frame=requestAnimationFrame(animate);
  snapTimer=setTimeout(snapToCard,160);
}
carousel.addEventListener('wheel',event=>{
  const delta=event.deltaX || (event.shiftKey?event.deltaY:0);
  if(!delta)return;
  event.preventDefault();move(delta*(event.deltaMode===1?16:event.deltaMode===2?carousel.clientWidth:1));
},{passive:false});
carousel.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();target=Math.round(target/stride())*stride();move((event.key==='ArrowRight'?1:-1)*stride());
});
carousel.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  if(event.target.closest('button,a,iframe'))return;
  clearTimeout(snapTimer);dragging=true;dragDistance=0;pressedCard=event.target.closest('.showcase-card');lastX=event.clientX;target=position;
  carousel.setPointerCapture(event.pointerId);carousel.classList.add('is-dragging');
});
carousel.addEventListener('pointermove',event=>{
  if(!dragging)return;
  const delta=lastX-event.clientX;lastX=event.clientX;
  dragDistance+=Math.abs(delta);position+=delta;target=position;render();
});
function endDrag(){if(!dragging)return;dragging=false;carousel.classList.remove('is-dragging');target=dragDistance<6&&pressedCard?(cards.indexOf(pressedCard)-originals.length)*stride():position;pressedCard=null;snapToCard();}
carousel.addEventListener('pointerup',endDrag);carousel.addEventListener('pointercancel',endDrag);
window.addEventListener('resize',render);render();
// Center the visible glyphs, including the title's negative letter spacing.
function alignHero(){
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  document.querySelectorAll('.hero h1,.hero h2,.hero p').forEach(element=>{
    const style=getComputedStyle(element);
    context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if('letterSpacing' in context)context.letterSpacing=style.letterSpacing==='normal'?'0px':style.letterSpacing;
    const text=style.textTransform==='uppercase'?element.textContent.toUpperCase():element.textContent;
    const metric=context.measureText(text);
    const correction=(metric.width-metric.actualBoundingBoxRight+metric.actualBoundingBoxLeft)/2;
    element.style.setProperty('--ink-shift',`${correction}px`);
  });
}
document.fonts.ready.then(alignHero);

// Side previews move to the centre; a drag must never count as a click.
track.addEventListener('click',event=>{
  const card=event.target.closest('.showcase-card');
  if(!card||dragDistance>6||event.target.closest('a,button,iframe'))return;
  const index=cards.indexOf(card);
  target=(index-originals.length)*stride();
  clearTimeout(snapTimer);if(!frame)frame=requestAnimationFrame(animate);
});
// Load Instagram's official embed renderer only after an explicit visitor action.
let instagramLoader;
function loadInstagramRenderer(){
  if(window.instgrm?.Embeds)return Promise.resolve();
  if(instagramLoader)return instagramLoader;
  instagramLoader=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.async=true;script.src='https://www.instagram.com/embed.js';
    const timer=setTimeout(()=>reject(Error('Instagram loading timed out')),10000);
    script.onload=()=>{clearTimeout(timer);window.instgrm?.Embeds?resolve():reject(Error('Instagram renderer unavailable'));};
    script.onerror=()=>{clearTimeout(timer);reject(Error('Instagram is blocked or unreachable'));};
    document.head.append(script);
  }).catch(error=>{instagramLoader=null;throw error;});
  return instagramLoader;
}
track.addEventListener('click',async event=>{
  const button=event.target.closest('.load-instagram');if(!button)return;
  const card=button.closest('.showcase-card'),stage=card.querySelector('.instagram-stage');
  const url=`https://www.instagram.com/reel/${card.dataset.instagram}/`;
  const mount=document.createElement('div');mount.className='instagram-content';
  const quote=document.createElement('blockquote');quote.className='instagram-media';
  quote.dataset.instgrmPermalink=url;quote.dataset.instgrmVersion='14';
  const source=document.createElement('a');source.href=url;source.target='_blank';source.rel='noopener noreferrer';source.textContent='Guarda il Reel su Instagram';quote.append(source);mount.append(quote);
  const fallback=document.createElement('a');fallback.className='instagram-fallback';fallback.href=url;fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.textContent='Apri su Instagram ↗';
  const status=document.createElement('p');status.className='instagram-status';status.setAttribute('role','status');status.textContent='Caricamento Instagram…';
  stage.replaceChildren(mount,status,fallback);
  try{
    await loadInstagramRenderer();
    if(!mount.isConnected)return;
    window.instgrm.Embeds.process();
    status.textContent='Se il video resta vuoto, aprilo su Instagram.';
  }catch(error){if(mount.isConnected){mount.remove();status.textContent='Instagram non è disponibile in questo browser. Usa il link qui sotto.';}}
});
