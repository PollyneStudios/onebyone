const lessons = [...document.querySelectorAll('.tutorial-item')];
lessons.forEach(item => item.querySelector('button').addEventListener('click', () => {
  const collapse = matchMedia('(max-width:1100px)').matches && item.classList.contains('is-open');
  lessons.forEach(lesson => {
    const open = lesson === item && !collapse;
    lesson.classList.toggle('is-open', open);
    lesson.querySelector('button').setAttribute('aria-expanded', String(open));
    lesson.querySelector('.tutorial-content').inert = !open;
  });
  syncTutorialVideo();
}));
const carousel = document.querySelector('.carousel');
const track = carousel.querySelector('.carousel-track');
const originals = [...track.children];
for(let run=0;run<2;run++) originals.forEach(card=>track.append(card.cloneNode(true)));
const cards=[...track.children];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let position=0,target=0,frame=0,dragging=false,lastX=0,snapTimer=0,dragDistance=0,pressedCard=null;
const stride=()=>originals[0].offsetWidth+parseFloat(getComputedStyle(track).gap);
const cycle=()=>originals.length*stride();
const modulo=(n,m)=>((n%m)+m)%m;
// Each project owns one player, so looping clones share its buffer.
const projectVideos=new Map(originals.map(card=>{
  const video=card.querySelector('video');return [video.dataset.src,video];
}));
const videoSources=[...projectVideos.keys()];
let lastWarmIndex=-1;
function prepareVideo(source){
  const video=projectVideos.get(source);
  if(!video.getAttribute('src')){video.preload='auto';video.src=source;}
  return video;
}
function prioritizeVideos(index){
  if(index===lastWarmIndex)return;
  lastWarmIndex=index;
  prepareVideo(videoSources[index]);
  if(carouselVisible){
    prepareVideo(videoSources[modulo(index+1,originals.length)]);
    prepareVideo(videoSources[modulo(index-1,originals.length)]);
  }
}
function mountProjectVideo(card){
  const slot=card.querySelector('video');
  const video=projectVideos.get(slot.dataset.src);
  if(slot!==video){
    if(video.parentElement?.classList.contains('showcase-card')){
      const poster=video.cloneNode(false);
      poster.removeAttribute('src');poster.preload='none';
      video.replaceWith(poster);
    }
    slot.replaceWith(video);
  }
  return prepareVideo(video.dataset.src);
}
function warmRemainingVideos(){
  let index=0;
  function next(){
    if(document.hidden){setTimeout(next,1500);return;}
    const source=videoSources[index++];if(!source)return;
    const video=prepareVideo(source);
    if(video.readyState>=3){setTimeout(next,500);return;}
    let advanced=false;
    const advance=()=>{if(advanced)return;advanced=true;video.removeEventListener('canplaythrough',advance);setTimeout(next,500);};
    video.addEventListener('canplaythrough',advance,{once:true});setTimeout(advance,8000);
  }
  next();
}
if(document.readyState==='complete')warmRemainingVideos();
else window.addEventListener('load',warmRemainingVideos,{once:true});

let carouselVisible=false;
let playingVideo=null;
function syncVideo(){
  const card=cards.find(card=>card.classList.contains('is-active'));
  const video=card?mountProjectVideo(card):null;
  const ready=carouselVisible&&!document.hidden&&!dragging&&Math.abs(target-position)<1;
  if(playingVideo && (playingVideo!==video||!ready)){playingVideo.pause();playingVideo=null;}
  if(!ready||!video||playingVideo===video)return;
  
  video.muted=true;
  playingVideo=video;
  const button=card.querySelector('.video-play');
  video.play().then(()=>{button.hidden=true;}).catch(()=>{if(playingVideo===video){playingVideo=null;button.hidden=false;}});
}
const visibilityObserver=new IntersectionObserver(entries=>{carouselVisible=entries[0].isIntersecting;if(carouselVisible){lastWarmIndex=-1;prioritizeVideos(modulo(Math.round(position/stride()),originals.length));}syncVideo();},{threshold:.25});
visibilityObserver.observe(carousel);
document.addEventListener('visibilitychange',syncVideo);
cards.forEach(card=>card.querySelector('.video-play')?.addEventListener('click',()=>{
  const video=card.querySelector('video');video.muted=true;
  video.play().then(()=>{playingVideo=video;card.querySelector('.video-play').hidden=true;}).catch(()=>{});
}));
function render(){
  const step=stride(),loop=cycle();
  // Normalize the animation coordinates, never the browser's native scroll position.
  const shift=Math.floor(position/loop)*loop;
  position-=shift;target-=shift;
  track.style.transform=`translate3d(${-loop-position-originals[0].offsetWidth/2}px,0,0)`;
  const active=originals.length+Math.round(position/step);
  cards.forEach((card,i)=>card.classList.toggle('is-active',i===active));
  prioritizeVideos(modulo(active-originals.length,originals.length));
  syncVideo();
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
  clearTimeout(snapTimer);dragging=true;syncVideo();dragDistance=0;pressedCard=event.target.closest('.showcase-card');lastX=event.clientX;target=position;
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
// The split hero uses normal text flow rather than glyph-position corrections.
document.addEventListener('click',event=>{if(matchMedia('(max-width: 1100px)').matches&&event.target.closest('[data-download]'))event.preventDefault();},true);

// Tutorial players only load when opened, and pause outside the section.
const tutorialSection=document.querySelector('.tutorial');
const tutorialVideos=[...document.querySelectorAll('.tutorial-video')];
function prepareTutorial(video,preload='auto'){
  if(!video)return;
  video.preload=preload;
  if(!video.getAttribute('src'))video.src=video.dataset.src;
}
new IntersectionObserver(entries=>{
  if(!entries[0].isIntersecting)return;
  const open=document.querySelector('.tutorial-item.is-open .tutorial-video')||tutorialVideos[0];
  prepareTutorial(open);
  prepareTutorial(tutorialVideos[tutorialVideos.indexOf(open)+1]);
},{rootMargin:'600px 0px'}).observe(tutorialSection);
let tutorialVisible=false;
let activeTutorialVideo=null;
function syncTutorialVideo(){
  const video=document.querySelector('.tutorial-item.is-open .tutorial-video');
  if(activeTutorialVideo&&(activeTutorialVideo!==video||!tutorialVisible||document.hidden)){
    activeTutorialVideo.pause();activeTutorialVideo=null;
  }
  if(!video||!tutorialVisible||document.hidden||activeTutorialVideo===video)return;
  prepareTutorial(video);
  activeTutorialVideo=video;
  prepareTutorial(tutorialVideos[tutorialVideos.indexOf(video)+1]);
  video.play().catch(()=>{ /* Native controls remain available if autoplay is blocked. */ });
}
const tutorialObserver=new IntersectionObserver(entries=>{
  tutorialVisible=entries[0].isIntersecting;syncTutorialVideo();
},{threshold:.15});
tutorialObserver.observe(tutorialSection);
document.addEventListener('visibilitychange',syncTutorialVideo);

document.querySelectorAll('.tutorial-player').forEach(player=>{
  const video=player.querySelector('video'),button=player.querySelector('.tutorial-play'),seek=player.querySelector('.tutorial-seek');
  let progressFrame=0,scrubbing=false,resumeAfterSeek=false,seekFrame=0;
  seek.step='any';
  function paintProgress(){
    if(!scrubbing&&Number.isFinite(video.duration)&&video.duration>0)seek.value=String(video.currentTime/video.duration*1000);
  }
  function animateProgress(){
    progressFrame=0;paintProgress();
    if(!video.paused&&!video.ended)progressFrame=requestAnimationFrame(animateProgress);
  }
  function update(){
    button.textContent=video.paused?'▶':'Ⅱ';
    button.setAttribute('aria-label',video.paused?'Play tutorial':'Pause tutorial');
    cancelAnimationFrame(progressFrame);progressFrame=0;paintProgress();
    if(!video.paused)progressFrame=requestAnimationFrame(animateProgress);
  }
  function commitSeek(){
    seekFrame=0;
    if(Number.isFinite(video.duration))video.currentTime=Number(seek.value)/1000*video.duration;
  }
  button.addEventListener('click',()=>{if(video.paused)video.play().catch(()=>{});else video.pause();});
  ['play','pause','ended'].forEach(event=>video.addEventListener(event,update));
  ['loadedmetadata','seeked','timeupdate'].forEach(event=>video.addEventListener(event,paintProgress));
  seek.addEventListener('pointerdown',()=>{
    scrubbing=true;resumeAfterSeek=!video.paused;video.pause();
  });
  function finishSeek(){
    if(!scrubbing)return;
    commitSeek();scrubbing=false;
    if(resumeAfterSeek)video.play().catch(()=>{});
    resumeAfterSeek=false;
  }
  seek.addEventListener('input',()=>{if(!seekFrame)seekFrame=requestAnimationFrame(commitSeek);});
  seek.addEventListener('change',finishSeek);
  seek.addEventListener('pointerup',finishSeek);
  seek.addEventListener('pointercancel',finishSeek);
});
const scanStack=document.querySelector('.scan-stack');
if(scanStack){
  const sheets=[...scanStack.querySelectorAll('.scan-pile img')];
  const toggle=scanStack.querySelector('.scan-stack-toggle');
  const count=scanStack.querySelector('.scan-stack-count');
  let sheetIndex=0,stackTimer=0,stackVisible=false,stackLoaded=false;
  let stackPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  sheets.forEach((sheet,index)=>{
    const offsets=[0,4,-4,7,-7];
    sheet.style.setProperty('--paper-x',offsets[index%5]+'px');
    sheet.style.setProperty('--paper-y',offsets[(index*2)%5]+'px');
    sheet.style.zIndex=String(index);
  });
  function showSheet(){
    sheets.forEach((sheet,index)=>sheet.classList.toggle('is-shown',index<=sheetIndex));
    count.textContent=String(sheetIndex+1).padStart(2,'0')+' / '+sheets.length;
  }
  function syncStack(){
    clearInterval(stackTimer);stackTimer=0;
    const open=scanStack.closest('.tutorial-item').classList.contains('is-open');
    if(open&&!stackLoaded){
      stackLoaded=true;
      sheets.forEach(sheet=>{sheet.src=sheet.dataset.src;});
      showSheet();
    }
    toggle.textContent=stackPaused?'▶':'Ⅱ';
    toggle.setAttribute('aria-label',stackPaused?'Play scan animation':'Pause scan animation');
    if(!open||!stackVisible||document.hidden||stackPaused)return;
    stackTimer=setInterval(()=>{
      const next=(sheetIndex+1)%sheets.length;
      if(!sheets[next].complete||!sheets[next].naturalWidth)return;
      sheetIndex=next;showSheet();
    },1000);
  }
  toggle.addEventListener('click',()=>{stackPaused=!stackPaused;syncStack();});
  new IntersectionObserver(entries=>{stackVisible=entries[0].isIntersecting;syncStack();},{threshold:.15}).observe(scanStack);
  new MutationObserver(syncStack).observe(scanStack.closest('.tutorial-item'),{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',syncStack);
}

// Keep in-page navigation scrollable without changing the shareable URL.
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const hash = link.getAttribute('href');
  if (!hash || hash === '#') return;
  let id;
  try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
  const section = document.getElementById(id);
  if (!section) return;
  event.preventDefault();
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
});


// Keep the mobile FAQ short while retaining every answer in the page.
const faqSection=document.querySelector('.obo-faq');
const faqToggle=faqSection.querySelector('.faq-toggle');
const mobileLayout=matchMedia('(max-width:1100px)');
faqSection.classList.add('faq-ready');
function syncFaqToggle(){faqToggle.hidden=!mobileLayout.matches;}
syncFaqToggle();
mobileLayout.addEventListener('change',syncFaqToggle);
faqToggle.addEventListener('click',()=>{
  const expanded=faqSection.classList.toggle('is-expanded');
  faqToggle.setAttribute('aria-expanded',String(expanded));
  faqToggle.innerHTML=expanded?'Show fewer questions <span aria-hidden="true">−</span>':'See all questions <span aria-hidden="true">+</span>';
});


// Pause the decorative cover off screen and respect reduced motion.
const heroCover=document.querySelector('.hero-cover-video');
if(heroCover){
 let heroOnScreen=false;
 const heroMotion=matchMedia('(prefers-reduced-motion:reduce)');
 function syncHeroCover(){
  if(heroMotion.matches||!heroOnScreen||document.hidden){heroCover.pause();return;}
  heroCover.play().catch(()=>{ /* The poster remains visible when playback is unavailable. */ });
 }
 new IntersectionObserver(entries=>{heroOnScreen=entries[0].isIntersecting;syncHeroCover();},{threshold:.05}).observe(heroCover);
 document.addEventListener('visibilitychange',syncHeroCover);
 heroMotion.addEventListener('change',syncHeroCover);
}
