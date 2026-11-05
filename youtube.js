(() => {
  let enabled=false,loader,current=null,requested=null,visible=false,generation=0;
  const carousel=document.querySelector('.carousel');
  function loadAPI(){
    if(window.YT?.Player)return Promise.resolve();
    if(loader)return loader;
    loader=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('YouTube non risponde')),12000);
      window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve();};
      const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
      script.onerror=()=>{clearTimeout(timeout);reject(Error('YouTube non disponibile'));};document.head.append(script);
    }).catch(error=>{loader=null;throw error;});return loader;
  }
  function resetCard(card){
    const stage=card.querySelector('.youtube-stage');stage.replaceChildren();
    const placeholder=document.createElement('div');placeholder.className='youtube-placeholder';
    const title=document.createElement('strong');title.textContent='5 secondi.';
    const button=document.createElement('button');button.type='button';button.className='enable-youtube';button.textContent=enabled?'Riproduci demo':'Attiva video YouTube';
    placeholder.append(title,button);stage.append(placeholder);
  }
  function stop(){
    generation++;requested=null;
    if(current){const old=current;current=null;old.player.destroy();resetCard(old.card);}
  }
  async function sync(card,settled){
    if(!enabled||!visible||document.hidden||!settled){current?.player.pauseVideo?.();return;}
    if(current?.card===card){if(current.ready&&current.player.getPlayerState()!==YT.PlayerState.PLAYING)current.player.playVideo();return;}
    if(requested===card)return;
    stop();requested=card;const token=++generation;
    try{
      await loadAPI();if(token!==generation||!visible)return;
      const stage=card.querySelector('.youtube-stage');const mount=document.createElement('div');stage.replaceChildren(mount);
      const start=Number(card.dataset.start);
      const entry={card,ready:false,player:null,start};current=entry;
      entry.player=new YT.Player(mount,{width:652,height:367,host:'https://www.youtube-nocookie.com',videoId:card.dataset.youtube,
        playerVars:{origin:location.origin,playsinline:1,controls:1,rel:0,start},events:{
          onReady:event=>{entry.ready=true;event.target.mute();if(current===entry&&visible)event.target.loadVideoById({videoId:card.dataset.youtube,startSeconds:start,endSeconds:start+5});else event.target.pauseVideo();},
          onStateChange:event=>{if(current!==entry)return;if(event.data===YT.PlayerState.ENDED&&visible&&!document.hidden)event.target.loadVideoById({videoId:card.dataset.youtube,startSeconds:start,endSeconds:start+5});},
          onAutoplayBlocked:()=>{card.querySelector('.youtube-source').textContent='Premi Play nel video · apri su YouTube ↗';},
          onError:()=>{stop();card.querySelector('.youtube-source').textContent='Demo non disponibile · apri su YouTube ↗';}
        }});
    }catch(error){if(token===generation){requested=null;resetCard(card);card.querySelector('.youtube-source').textContent='YouTube non disponibile · apri il video ↗';}}
  }
  window.syncCarouselVideo=sync;
  new IntersectionObserver(entries=>{visible=entries[0].intersectionRatio>=.5;if(!visible)current?.player.pauseVideo?.();else sync(document.querySelector('.showcase-card.is-active'),true);},{threshold:[0,.5,1]}).observe(carousel);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)current?.player.pauseVideo?.();else sync(document.querySelector('.showcase-card.is-active'),true);});
  carousel.addEventListener('click',event=>{if(!event.target.closest('.enable-youtube'))return;enabled=true;sync(document.querySelector('.showcase-card.is-active'),true);});
})();
